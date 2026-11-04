import { lazy, Suspense, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { ProjectStore } from './core/store';
import { sampleProject } from './core/sample';
import { elements, getElement, nodeAtOffset, sourceText } from './core/source';
import { ownStyle, sourceAttribute } from './core/commands';
import { download, exportWebsite, parseProjectJson, projectFromFiles, readZip, saveProject } from './core/io';
import { BUILTINS, installModule, insertModule, moduleFromZip } from './core/modules';
import { STYLE_FILE, type EditCommand, type Project, type StudioModule } from './core/types';
import Canvas, { type Inspection } from './components/Canvas';
import { previewTree } from './preview/document';
const CodeEditor=lazy(()=>import('./components/CodeEditor'));
const store=new ProjectStore(sampleProject);
const storageKey='mws-project-v1';

export default function App(){
  const state=useSyncExternalStore(store.subscribe,store.getSnapshot);const {project,draft,revision,diagnostics}=state;
  const [selected,setSelected]=useState(''),[file,setFile]=useState(project.entry),[mode,setMode]=useState('structure'),[view,setView]=useState('split');
  const [left,setLeft]=useState('layers'),[width,setWidth]=useState(900),[zoom,setZoom]=useState(.8),[inspection,setInspection]=useState<Inspection|null>(null),[notice,setNotice]=useState('准备就绪'),[ready,setReady]=useState(false),[plain,setPlain]=useState(false),[query,setQuery]=useState('');
  const input=useRef<HTMLInputElement>(null),folder=useRef<HTMLInputElement>(null),moduleInput=useRef<HTMLInputElement>(null);
  const nodes=useMemo(()=>elements(sourceText(project)),[project]);const current=nodes.find(n=>n.id===selected);const warnings=useMemo(()=>previewTree(project).warnings,[project]);
  const busy=diagnostics.length>0;
  const run=(fn:()=>void)=>{try{fn();}catch(e){setNotice((e as Error).message);}};
  const dispatch=(commands:EditCommand[],r=store.getSnapshot().revision)=>run(()=>store.dispatch(commands,r));
  const select=(id:string)=>{setSelected(id);setFile(project.entry);};
  const edit=(value:string)=>store.editFile(file,value);
  useEffect(()=>{if(!project.files[file])setFile(project.entry);if(selected&&!nodes.some(n=>n.id===selected))setSelected('');},[project]);
  useEffect(()=>{const key=(e:KeyboardEvent)=>{
    const target=e.target as HTMLElement;if(target.closest('input,textarea,[contenteditable="true"],.monaco-editor'))return;
    if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='z'){e.preventDefault();e.shiftKey?store.redo():store.undo();}
    if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='y'){e.preventDefault();store.redo();}
    if(e.key==='Delete'&&selected)dispatch([{type:'delete',id:selected}]);
  };window.addEventListener('keydown',key);return()=>window.removeEventListener('keydown',key);},[selected]);
  function save(){if(busy){setNotice('请先修复错误再保存，或下载草稿保留当前输入。');return;}
    const data=saveProject(project);let persisted=true;try{localStorage.setItem(storageKey,data);}catch{persisted=false;}
    download(data,'website.mws.json','application/json');setNotice(persisted?'已保存到浏览器，并下载完整项目文件。':'已下载项目文件；浏览器存储空间不足。');}
  async function openFiles(files:FileList|null){if(!files?.length)return;try{
    const list=Array.from(files);const first=list[0];let p:Project;
    if(list.length===1&&first.name.endsWith('.mws.json'))p=parseProjectJson(await first.text());
    else if(list.length===1&&/\.zip$/i.test(first.name))p=projectFromFiles(readZip(new Uint8Array(await first.arrayBuffer())),first.name.replace('.zip',''));
    else {const data=Object.fromEntries(await Promise.all(list.map(async f=>[f.webkitRelativePath||f.name,new Uint8Array(await f.arrayBuffer())])));p=projectFromFiles(data,first.name);}
    store.replace(p);setFile(p.entry);setSelected('');setNotice('项目已打开。导入脚本在编辑模式不会执行。');
  }catch(e){setNotice((e as Error).message);}finally{if(input.current)input.current.value='';if(folder.current)folder.current.value='';}}
  function useModule(module:StudioModule){run(()=>{
    const p=store.getSnapshot().project;
    const parent=current&&current.loc.endTag&&!['h1','h2','h3','p','button','span','a'].includes(current.tag)?current:nodes.find(n=>n.tag==='main')||nodes[0];
    if(!parent)throw new Error('没有可插入的容器。');
    // Module registration, CSS and DOM insertion form one history transaction.
    store.replace(insertModule(p,module,parent.id),'添加模块');setNotice(`已添加「${module.name}」`);
  });}
  function moveSibling(direction:number){if(!current)return;const siblings=nodes.filter(n=>n.parentId===current.parentId);const i=siblings.findIndex(n=>n.id===selected);if(!current.parentId||i+direction<0||i+direction>=siblings.length)return;dispatch([{type:'move',id:selected,parentId:current.parentId,beforeId:direction<0?siblings[i-1].id:siblings[i+2]?.id}]);}
  const style=(property:string,value:string)=>dispatch([{type:'style',id:selected,property,value}]);
  const setAttribute=(name:string,value:string)=>dispatch([{type:'attribute',id:selected,name,value}]);
  return <div className={`studio view-${view}`}>
    <header className="topbar"><div className="brand"><span className="brand-symbol">▦</span><div>MODULAR<span>WEBSITE STUDIO <em>0.1 ALPHA</em></span></div></div><div className="project-name">{project.name}</div>
      <nav className="view-switch" aria-label="工作区模式">{[['visual','画布'],['split','分屏'],['code','代码'],['preview','预览']].map(([key,label])=><button key={key} className={view===key?'active':''} onClick={()=>setView(key)}>{label}</button>)}</nav>
      <button onClick={save} disabled={busy}>保存项目</button><button className="primary" disabled={busy} onClick={()=>run(()=>{download(exportWebsite(project),'website-export.zip','application/zip');setNotice('已导出独立 HTML/CSS/JS 网站 ZIP。');})}>导出网站 ↗</button>
    </header>
    <div className="toolbar"><div className="tools-left"><button aria-label="新建项目" onClick={()=>run(()=>{store.replace({...sampleProject,name:'Untitled website'});setSelected('');setFile('index.html');setNotice('已创建示例项目，可撤销返回原项目。');})}>＋ 新建</button><button onClick={()=>input.current?.click()}>打开项目</button><button onClick={()=>folder.current?.click()}>导入文件夹</button><button onClick={()=>run(()=>{const raw=localStorage.getItem(storageKey);if(!raw)throw new Error('浏览器中还没有保存的项目。');store.replace(parseProjectJson(raw));setNotice('已重新打开上次保存的项目。');})}>重新打开已保存</button><span className="divider"/><button title="撤销 Ctrl+Z" disabled={!state.canUndo&&!busy} onClick={()=>store.undo()}>↶ 撤销</button><button disabled={!state.canRedo||busy} onClick={()=>store.redo()}>↷ 重做</button></div>
      <div className="tools-right"><select aria-label="布局模式" value={mode} onChange={e=>setMode(e.target.value)}><option value="structure">结构化布局</option><option value="free">自由布局</option></select><select aria-label="设备宽度" value={width} onChange={e=>setWidth(+e.target.value)}><option value={900}>桌面 900</option><option value={768}>平板 768</option><option value={390}>手机 390</option></select><select aria-label="画布缩放" value={zoom} onChange={e=>setZoom(+e.target.value)}>{[.5,.65,.8,1,1.25].map(z=><option key={z} value={z}>{Math.round(z*100)}%</option>)}</select></div>
    </div>
    <input ref={input} hidden type="file" multiple accept=".html,.htm,.css,.js,.json,.zip,.mws.json" onChange={e=>void openFiles(e.target.files)}/><input ref={folder} hidden type="file" multiple {...({webkitdirectory:''} as object)} onChange={e=>void openFiles(e.target.files)}/>
    <input ref={moduleInput} hidden type="file" accept=".zip" onChange={async e=>{const f=e.target.files?.[0];if(f)try{const m=moduleFromZip(new Uint8Array(await f.arrayBuffer()));store.replace(installModule(project,m),'安装模块');setNotice(`已安装 ${m.name}`);}catch(err){setNotice((err as Error).message);}e.target.value='';}}/>
    <div className="workspace">
      <aside className="sidebar"><div className="panel-tabs">{[['layers','图层'],['files','文件'],['modules','模块']].map(([key,label])=><button key={key} className={left===key?'active':''} onClick={()=>setLeft(key)}>{label}</button>)}</div>
        {left==='layers'&&<><div className="panel-heading">DOCUMENT <span>{nodes.length} ELEMENTS</span></div><div className="tree" role="tree">{nodes.map(n=><button role="treeitem" aria-selected={selected===n.id} key={n.id} className={selected===n.id?'selected':''} style={{paddingLeft:12+Math.max(0,n.depth-1)*12}} onClick={()=>select(n.id)}><span className="node-icon">{['h1','h2','p','span'].includes(n.tag)?'T':'◇'}</span>{n.label}</button>)}</div><div className="sidebar-foot">真实 DOM · 源码位置关联<br/>可视化命令与代码共享项目状态</div></>}
        {left==='files'&&<><div className="panel-heading">PROJECT FILES</div><input className="file-search" aria-label="搜索文件与内容" placeholder="搜索文件与内容…" value={query} onChange={e=>setQuery(e.target.value)}/>{Object.entries(draft.files).filter(([name,f])=>!query||name.includes(query)||(f.kind==='text'&&f.content.includes(query))).map(([name,f])=><button className={`file-item ${file===name?'selected':''}`} key={name} onClick={()=>{if(f.kind==='text')setFile(name);else setNotice('二进制资源会随项目保存和导出。');}}><span>{f.kind==='asset'?'▧':'⌘'}</span>{name}</button>)}<div className="sidebar-foot">切换页面<select aria-label="当前页面" value={project.entry} onChange={e=>run(()=>{store.replace({...project,entry:e.target.value},'切换页面');setFile(e.target.value);setSelected('');})}>{Object.keys(project.files).filter(p=>/\.html?$/.test(p)).map(p=><option key={p}>{p}</option>)}</select></div></>}
        {left==='modules'&&<><div className="panel-heading">LOCAL MODULES <span>HTML + CSS</span></div><button className="install" disabled={busy} onClick={()=>moduleInput.current?.click()}>＋ 安装模块 ZIP</button>{[...BUILTINS,...project.modules.filter(m=>!BUILTINS.some(b=>b.id===m.id))].map(m=><div className="module-card" key={m.id}><div className="module-icon">▦</div><strong>{m.name}</strong><p>{m.description}</p><button disabled={busy} onClick={()=>useModule(m)}>＋ 添加到页面</button>{project.modules.some(x=>x.id===m.id)&&<button className="subtle" disabled={busy} onClick={()=>run(()=>{store.replace({...project,modules:project.modules.filter(x=>x.id!==m.id)},'卸载模块');setNotice('模块已从库卸载；已插入的独立 HTML/CSS 保留。');})}>从库卸载</button>}</div>)}<div className="sidebar-foot">脚本、依赖解析与版本升级计划在后续版本提供。</div></>}
      </aside>
      <main className="center">
        {view!=='code'&&<Canvas project={project} revision={revision} selected={selected} mode={mode} width={width} zoom={zoom} preview={view==='preview'} locked={busy} onSelect={select} onInspect={setInspection} onCommands={dispatch} onHistory={action=>action==='undo'?store.undo():store.redo()} onReady={()=>setReady(true)}/>}
        {(view==='split'||view==='code')&&<section className="code-panel"><div className="code-tabs">{Object.entries(draft.files).filter(([,f])=>f.kind==='text').map(([path])=><button key={path} className={file===path?'active':''} onClick={()=>setFile(path)}>{path}</button>)}<button className="plain-toggle" onClick={()=>setPlain(!plain)}>{plain?'Monaco':'纯文本'}</button></div>
          <div className="editor-body">{plain?<textarea spellCheck={false} aria-label="源代码文本" value={sourceText(draft,file)} onChange={e=>edit(e.target.value)} onSelect={e=>{if(file===project.entry&&!busy){const n=nodeAtOffset(sourceText(project),e.currentTarget.selectionStart);if(n)setSelected(n.id);}}}/>:<Suspense fallback={<div className="empty">加载代码编辑器…</div>}><CodeEditor file={file} content={sourceText(draft,file)} onChange={edit} onCursor={offset=>{if(file===project.entry&&!busy){const n=nodeAtOffset(sourceText(project),offset);if(n)setSelected(n.id);}}} selection={file===project.entry?current:undefined} diagnostics={diagnostics}/></Suspense>}</div>
          {busy&&<div className="diagnostics" role="alert"><strong>保留最后有效画布</strong><span>{diagnostics[0].file}:{diagnostics[0].line}:{diagnostics[0].column} {diagnostics[0].message}</span><button onClick={()=>store.discardDraft()}>放弃错误草稿</button><button onClick={()=>download(saveProject(draft),'website-draft.mws.json','application/json')}>下载草稿</button></div>}
        </section>}
      </main>
      <aside className="inspector"><div className="panel-heading">INSPECTOR <span>源代码写回</span></div>{current?<>
        <div className="selection-label"><span>◇ {current.tag}</span><code>{current.id}</code></div><div className="row-actions"><button disabled={busy} onClick={()=>dispatch([{type:'duplicate',id:selected}])}>复制</button><button disabled={busy} onClick={()=>moveSibling(-1)}>上移</button><button disabled={busy} onClick={()=>moveSibling(1)}>下移</button><button disabled={busy||current.tag==='body'} onClick={()=>dispatch([{type:'delete',id:selected}])}>删除</button></div>
        <fieldset disabled={busy}><legend>元素属性</legend><Field key={selected+'id'} label="id" value={sourceAttribute(project,selected,'id')} onCommit={v=>setAttribute('id',v)}/><Field key={selected+'class'} label="class" value={sourceAttribute(project,selected,'class')} onCommit={v=>setAttribute('class',v)}/>
          {!current.node.childNodes?.some(n=>n.tagName)&&current.loc.endTag&&<Field key={selected+'text'} label="文字" value={current.node.childNodes?.map(n=>n.value||'').join('')||''} onCommit={text=>dispatch([{type:'text',id:selected,text}])}/>}<label className="field"><span>移入容器</span><select aria-label="移入容器" value="" onChange={e=>{if(e.target.value)dispatch([{type:'move',id:selected,parentId:e.target.value}]);}}><option value="">选择目标…</option>{nodes.filter(n=>n.loc.endTag&&['body','div','section','main','article','nav','header','footer','aside'].includes(n.tag)&&n.id!==selected&&!(n.loc.startOffset>current.loc.startOffset&&n.loc.endOffset<=current.loc.endOffset)).map(n=><option key={n.id} value={n.id}>{n.label} · {n.id.slice(-4)}</option>)}</select></label>
        </fieldset>
        <fieldset disabled={busy}><legend>样式覆盖 → studio.css</legend><p className="hint">空值移除覆盖；内联样式和更高优先级规则可能覆盖此值。</p><div className="style-fields">{['display','width','height','color','background-color','font-size','padding','margin','gap','border-radius','translate','rotate','scale'].map(prop=><Field key={selected+prop} label={prop} value={ownStyle(project,selected,prop)} placeholder={inspection?.id===selected?inspection.computed[prop]||'—':'—'} onCommit={v=>style(prop,v)}/>)}</div></fieldset>
        {inspection?.id===selected&&<><div className="panel-heading">BOX MODEL <span>计算值 · 只读</span></div><div className="box-model"><span>margin {inspection.computed.margin}</span><div>padding {inspection.computed.padding}<strong>{Math.round(inspection.rect.width)} × {Math.round(inspection.rect.height)}</strong></div></div><details><summary>浏览器计算样式</summary><div className="computed">{Object.entries(inspection.computed).map(([key,value])=><p key={key}><span>{key}</span><code>{value}</code></p>)}</div></details></>}
      </>:<div className="empty"><div className="empty-icon">⌖</div><strong>选择网页中的元素</strong><p>点击画布或左侧 DOM 图层<br/>开始编辑属性、文字与布局</p></div>}
        <details className="limitations"><summary>当前页面的兼容性提示</summary>{warnings.map(w=><p key={w}>{w}</p>)}<p>首版：静态 HTML/CSS 与普通 JavaScript。React/Vue、JSX、TS 构建、动态 DOM、复杂资源路径需要适配器。</p></details>
      </aside>
    </div>
    <footer className="statusbar"><span className={busy?'status-error':'status-good'}>● {busy?'源码待修复':ready?'画布已同步':'画布连接中'}</span><span role="status">{notice==='准备就绪'?state.label:notice}</span><span className="revision">REV {revision.toString().padStart(3,'0')} · {project.files[STYLE_FILE]?'SOURCE + OVERRIDES':'SOURCE FIRST'}</span></footer>
  </div>;
}
function Field({label,value,placeholder,onCommit}:{label:string;value:string;placeholder?:string;onCommit:(value:string)=>void}){
  const [local,setLocal]=useState(value);useEffect(()=>setLocal(value),[value]);
  return <label className="field"><span>{label}</span><input aria-label={label} value={local} placeholder={placeholder} onChange={e=>setLocal(e.target.value)} onBlur={()=>{if(local!==value)onCommit(local);}} onKeyDown={e=>{if(e.key==='Enter')e.currentTarget.blur();if(e.key==='Escape'){setLocal(value);}}}/></label>;
}
