import { lazy, Suspense, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { ProjectStore } from './core/store';
import { sampleProject } from './core/sample';
import { attr, elements, getElement, nodeAtOffset, sourceText } from './core/source';
import { ownStyle, sourceAttribute } from './core/commands';
import { download, exportWebsite, parseProjectJson, projectFromFiles, readZip, saveProject } from './core/io';
import { BUILTINS, installModule, insertModule, moduleFromZip } from './core/modules';
import { STYLE_FILE, type EditCommand, type Project, type StudioModule } from './core/types';
import Canvas, { type Inspection } from './components/Canvas';
import { previewTree } from './preview/document';
import StartScreen from './components/StartScreen';
import {ArrowLeft,FolderOpen,Plus,Undo2,Redo2,Monitor,Smartphone,PanelLeftClose,PanelLeftOpen,PanelRightClose,PanelRightOpen,Maximize2,Sun,Moon,Code2,Save,Download,PanelsTopLeft,CheckCircle2} from 'lucide-react';
import {CreativeInspector,CreativeLibrary,type InspectorSection} from './components/CreativePanels';
import {createPortfolio,createBlank} from './core/catalog';
import {applyTheme,replaceCover,replaceUploadedImage,linkToSection,insertResource,insertionPoint} from './core/workbench';
import {readRecent} from './core/recent';
import {saveLocalDraft} from './core/drafts';
import {applyStudentProfile} from './core/profile';
import {replaceSolidCover,setCoverCrop,setCoverFit} from './core/covers';
import {randomId} from './core/id';
import {importImages,deleteImage} from './core/assets';
import {replaceCoverSource} from './core/covers';
import {assetUrl,resolvePath} from './core/io';
import {applyCroppedImage} from './core/image-crop';
const ImageCropDialog=lazy(()=>import('./components/ImageCropDialog'));
const GradientDialog=lazy(()=>import('./components/GradientDialog'));
import {exportSingleHtml,SingleHtmlExportError} from './core/export-html';
import {setInteractionDefault,setAccordionMultiple} from './core/interactions';
import ExportNotice from './components/ExportNotice';
import ExportPanel from './components/ExportPanel';
import StudentGuide from './components/StudentGuide';
const CodeEditor=lazy(()=>import('./components/CodeEditor'));
const store=new ProjectStore(sampleProject);
const storageKey='mws-project-v1';

export default function App(){
  const state=useSyncExternalStore(store.subscribe,store.getSnapshot);const {project,draft,revision,diagnostics}=state;
  const [selected,setSelected]=useState(''),[file,setFile]=useState(project.entry),[mode,setMode]=useState('structure'),[view,setView]=useState('visual');
  const [left,setLeft]=useState('layers'),[width,setWidth]=useState(900),[zoom,setZoom]=useState(.8),[inspection,setInspection]=useState<Inspection|null>(null),[notice,setNotice]=useState('准备就绪'),[ready,setReady]=useState(false),[plain,setPlain]=useState(false),[query,setQuery]=useState('');
  const [start,setStart]=useState(true),[advanced,setAdvanced]=useState(false),[creativeTab,setCreativeTab]=useState('pages'),[recent,setRecent]=useState(()=>{try{return readRecent(localStorage);}catch{return [];}}),[replay,setReplay]=useState(0),[jump,setJump]=useState(0),[focusToken,setFocusToken]=useState(0);
  const [exportIssues,setExportIssues]=useState<string[]>([]),[delivery,setDelivery]=useState(false),[draftStatus,setDraftStatus]=useState('尚未保存草稿');
  const [inspectorSection,setInspectorSection]=useState<InspectorSection>('content'),[libraryOpen,setLibraryOpen]=useState(true),[inspectorOpen,setInspectorOpen]=useState(true),[autoFit,setAutoFit]=useState(true);
  const [uiTheme,setUiTheme]=useState<'light'|'dark'>(()=>{try{return localStorage.getItem('mws-ui-theme')==='dark'?'dark':'light';}catch{return 'light';}});
  useEffect(()=>{try{localStorage.setItem('mws-ui-theme',uiTheme);}catch{/* Appearance preferences must not block editing. */}},[uiTheme]);
  const lastSaved=useRef<Project|null>(null);
  const [transformHandle,setTransformHandle]=useState('resize');
  const [multi,setMulti]=useState<string[]>([]),[align,setAlign]=useState<{axis:string;token:number}>();
  const [visualTool,setVisualTool]=useState<{kind:'crop'|'gradient';project:Project;id:string;revision:number;value:string}|null>(null);
  function openVisualTool(kind:'crop'|'gradient'){run(()=>{const snapshot=store.getSnapshot();if(snapshot.diagnostics.length)throw new Error('请先修复代码。');const n=getElement(snapshot.project,selected);let value=ownStyle(snapshot.project,selected,'background-image');if(kind==='crop'){const path=resolvePath(snapshot.project.entry,attr(n.node,'src')||'');if(n.tag!=='img'||!path||!snapshot.project.files[path])throw new Error('请先上传或选择工程中的本地图片。');value=assetUrl(snapshot.project,snapshot.project.entry,attr(n.node,'src')||'');}setVisualTool({kind,project:snapshot.project,id:selected,revision:snapshot.revision,value});});}
  function applyVisualTool(value:string|Uint8Array){if(!visualTool)return;const latest=store.getSnapshot();if(latest.revision!==visualTool.revision||latest.diagnostics.length)throw new Error('页面已改变，请取消并重新打开工具。');if(visualTool.kind==='crop'){store.replace(applyCroppedImage(latest.project,visualTool.id,value as Uint8Array),'裁剪图片');}else{store.dispatch([{type:'style',id:visualTool.id,property:'background-image',value:value as string}],visualTool.revision);}setVisualTool(null);}
  const imageInput=useRef<HTMLInputElement>(null);
  const input=useRef<HTMLInputElement>(null),folder=useRef<HTMLInputElement>(null),moduleInput=useRef<HTMLInputElement>(null);
  const nodes=useMemo(()=>elements(sourceText(project)),[project]);const current=nodes.find(n=>n.id===selected);const warnings=useMemo(()=>previewTree(project).warnings,[project]);
  const busy=diagnostics.length>0;
  const run=(fn:()=>void)=>{try{fn();}catch(e){setNotice((e as Error).message);}};
  const dispatch=(commands:EditCommand[],r=store.getSnapshot().revision)=>run(()=>store.dispatch(commands,r));
  const select=(id:string)=>{setSelected(id);setFile(project.entry);setInspectorOpen(true);if(id!==selected&&nodes.find(n=>n.id===id)?.tag==='img')setInspectorSection('content');};
  const edit=(value:string)=>store.editFile(file,value);
  useEffect(()=>{if(!project.files[file])setFile(project.entry);if(selected&&!nodes.some(n=>n.id===selected))setSelected('');},[project]);
  useEffect(()=>{const key=(e:KeyboardEvent)=>{
    const target=e.target as HTMLElement;if(target.closest('input,textarea,select,[contenteditable="true"],.monaco-editor,dialog[open]'))return;
    if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='z'){e.preventDefault();e.shiftKey?store.redo():store.undo();}
    if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='y'){e.preventDefault();store.redo();}
    if(e.key==='Delete'&&mode==='design'&&multi.length)dispatch(multi.map(id=>({type:'delete' as const,id})));else if(e.key==='Delete'&&selected)dispatch([{type:'delete',id:selected}]);
  };window.addEventListener('keydown',key);return()=>window.removeEventListener('keydown',key);},[selected,mode,multi]);
  function persistDraft(p:Project){
    if(!p.id)return false;
    try{setRecent(saveLocalDraft(localStorage,p));lastSaved.current=p;setDraftStatus('草稿已保存在此浏览器');return true;}
    catch(error){setDraftStatus('草稿未保存，请下载工程备份');setNotice((error as Error).message);return false;}
  }
  useEffect(()=>{
    if(start||!project.id)return;
    if(busy){setDraftStatus('代码待修复，保留上次草稿');return;}
    if(lastSaved.current===project){setDraftStatus('草稿已保存在此浏览器');return;}
    setDraftStatus('正在保存草稿…');
    const timer=window.setTimeout(()=>persistDraft(project),600);
    return()=>window.clearTimeout(timer);
  },[project,start,busy]);
  useEffect(()=>{
    const flush=()=>{if(start)return;const latest=store.getSnapshot();if(!latest.diagnostics.length&&latest.project!==lastSaved.current)persistDraft(latest.project);};
    window.addEventListener('pagehide',flush);const visibility=()=>{if(document.visibilityState==='hidden')flush();};document.addEventListener('visibilitychange',visibility);
    return()=>{window.removeEventListener('pagehide',flush);document.removeEventListener('visibilitychange',visibility);};
  },[start]);
  function archive(){const p=store.getSnapshot().project;return !p.id||persistDraft(p);}
  function enterProject(p:Project,example=false){
    if(!start&&!archive())return;
    store.load({...p,id:p.id||randomId()});setStart(false);setAdvanced(example);setInspectorSection('content');setAutoFit(true);setLibraryOpen(true);setInspectorOpen(true);setView(example?'split':'visual');setMode('structure');setCreativeTab('pages');setSelected(example?'':elements(sourceText(p)).find(n=>n.tag==='h1')?.id||'');setInspection(null);setFile(p.entry);setWidth(900);setZoom(.8);setNotice('双击文字开始修改，点击图片更换封面。');
  }
  function addResource(id:string,parentId?:string,beforeId?:string,expected=store.getSnapshot().revision){run(()=>{
    if(busy)throw new Error('请先修复代码错误。');if(expected!==store.getSnapshot().revision)throw new Error('页面已改变，请重新拖入。');
    const p=store.getSnapshot().project,old=new Set(elements(sourceText(p)).map(n=>n.id));
    const next=insertResource(p,id,parentId?{parentId,beforeId}:insertionPoint(p,selected));store.replace(next,'插入区块');
    const nextNodes=elements(sourceText(next)),body=nextNodes.find(n=>n.tag==='body');
    const added=nextNodes.find(n=>!old.has(n.id)&&n.tag!=='script'&&body&&n.loc.startOffset>body.loc.startOffset&&n.loc.endOffset<body.loc.endOffset);
    if(added){setSelected(added.id);setInspectorSection('content');setInspectorOpen(true);}setNotice('已插入，可一次撤销；在画布中继续修改。');
  });}
  async function uploadImage(f:File|undefined){if(!f)return;const before=store.getSnapshot(),id=selected;try{
    const bytes=new Uint8Array(await f.arrayBuffer());if(store.getSnapshot().revision!==before.revision)throw new Error('读取图片时页面已改变，请重新选择图片。');
    store.replace(replaceUploadedImage(before.project,id,bytes,f.name),'替换图片');setNotice('图片已加入项目，布局和动效保留。请在右侧填写图片说明；同一作品的封面会同步更新。');
  }catch(e){setNotice((e as Error).message);}finally{if(imageInput.current)imageInput.current.value='';}}
  function exportZip(){run(()=>{const p=store.getSnapshot().project;download(exportWebsite(p),'website-export.zip','application/zip');setExportIssues([]);setDelivery(false);setNotice(`网站已导出：解压后打开 ${p.files['index.html']?'index.html':p.entry}。继续修改请保留可编辑工程。`);});}
  function exportHtml(){
    setDelivery(false);
    try{const p=store.getSnapshot().project;download(exportSingleHtml(p),p.entry.split('/').pop()||'index.html','text/html;charset=utf-8');setNotice('已导出单文件 HTML，包含当前页的样式、交互和可内嵌素材。');}
    catch(error){if(error instanceof SingleHtmlExportError)setExportIssues(error.issues);else setNotice((error as Error).message);}
  }
  function saveDraft(){if(busy)return;if(persistDraft(store.getSnapshot().project))setNotice('草稿已保存。下次在首页的最近草稿中继续，无需下载或传文件。');}
  function downloadProject(){if(busy)return;run(()=>{download(saveProject(store.getSnapshot().project),'website.mws.json','application/json');setNotice('可编辑工程已下载。下次点击「打开项目文件」选择它；交付作品请用「导出网站」。');});}
  function guideSelect(kind:'cover'|'effect'){
    const p=store.getSnapshot().project,home=p.files['index.html']?{...p,entry:'index.html'}:p;
    if(home.entry!==p.entry)store.replace(home,'返回首页');
    const list=elements(sourceText(home));
    const target=kind==='effect'?list.find(n=>n.tag==='h1'):list.find(n=>n.tag==='img'&&attr(n.node,'data-mws-cover')?.startsWith('work-'))||list.find(n=>n.tag==='img');
    setFile(home.entry);setSelected(target?.id||'');setInspectorOpen(true);setInspectorSection(kind==='effect'?'effects':'content');setFocusToken(n=>n+1);setView('visual');setCreativeTab('pages');
    setNotice(kind==='effect'?'在右侧选择适用于标题的特效，可随时重播或移除。':'点击右侧上传图片；同一作品的首页和详情页封面会一起更新。');
  }
  async function openFiles(files:FileList|null){if(!files?.length)return;try{
    const list=Array.from(files);const first=list[0];let p:Project;
    if(list.length===1&&first.name.endsWith('.mws.json'))p=parseProjectJson(await first.text());
    else if(list.length===1&&/\.zip$/i.test(first.name))p=projectFromFiles(readZip(new Uint8Array(await first.arrayBuffer())),first.name.replace('.zip',''));
    else {const data=Object.fromEntries(await Promise.all(list.map(async f=>[f.webkitRelativePath||f.name,new Uint8Array(await f.arrayBuffer())])));p=projectFromFiles(data,first.name);}
    enterProject(p,!start&&advanced);setNotice('项目已打开。导入脚本在编辑模式不会执行。');
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
  if(start)return <><StartScreen theme={uiTheme} recent={recent} notice={notice==='准备就绪'?'选择模板，开始第一件作品。':notice} onCreate={()=>enterProject(createPortfolio('我的作品集 '+(recent.length+1)))} onBrowse={kind=>{enterProject(createPortfolio('我的作品集 '+(recent.length+1)));setCreativeTab(kind==='components'?'basics':'pages');if(kind==='effects'){setInspectorSection('effects');setFocusToken(n=>n+1);}}} onOpen={()=>input.current?.click()} onBlank={()=>enterProject(createBlank())} onExample={()=>enterProject({...sampleProject,id:randomId()},true)} onRecent={id=>{const p=recent.find(r=>r.id===id)?.project;if(p)enterProject(p);}}/><input ref={input} hidden type="file" multiple accept=".html,.htm,.css,.js,.json,.zip,.mws.json" onChange={e=>void openFiles(e.target.files)}/></>;
  return <div className={`studio view-${view} ${advanced?'advanced':'creative'} ${libraryOpen?'':'library-closed'} ${inspectorOpen?'':'inspector-closed'}`} data-ui-theme={uiTheme}>

    <header className="topbar">
      <div className="brand"><span className="brand-symbol"><PanelsTopLeft size={23}/></span><div>Modular<span>创作工作台</span></div></div>
      <div className="project-heading"><input className="project-name" aria-label="项目名称" title="点击修改项目名称" value={project.name} onChange={e=>run(()=>store.replace({...project,name:e.target.value},'项目名称'))}/><span className="project-save-hint"><CheckCircle2 size={12}/>{draftStatus.includes('未保存')?'请备份工程':'本地工程'}</span></div>
      <nav className="view-switch" aria-label="工作区模式">{(advanced?[['visual','画布'],['split','分屏'],['code','代码'],['preview','预览']]:[['visual','画布'],['preview','预览']]).map(([key,label])=><button key={key} className={view===key?'active':''} aria-pressed={view===key} onClick={()=>setView(key)}>{label}</button>)}</nav>
      <div className="project-actions"><button className="icon-button appearance-button" title={uiTheme==='light'?'切换到深色界面':'切换到浅色界面'} aria-label={uiTheme==='light'?'切换到深色界面':'切换到浅色界面'} onClick={()=>setUiTheme(uiTheme==='light'?'dark':'light')}>{uiTheme==='light'?<Moon size={17}/>:<Sun size={17}/>}</button>
      <button className="advanced-toggle" aria-label="高级编辑" title="打开源码与高级属性" aria-pressed={advanced} disabled={busy} onClick={()=>{setAdvanced(!advanced);setView(advanced?'visual':'split');}}><Code2 size={16}/><span>高级编辑</span></button>
      <button aria-label="保存草稿" title="只保存在当前浏览器" onClick={saveDraft} disabled={busy}><Save size={16}/><span>保存草稿</span></button>
      <button aria-label="下载可编辑工程" disabled={busy} title="下载可编辑工程备份" onClick={downloadProject}><Download size={16}/><span>下载工程</span></button>
      <button className="primary" disabled={busy} onClick={()=>setDelivery(true)}>导出网站 ↗</button></div>
    </header>
    {!advanced&&<StudentGuide project={project} locked={busy} onName={name=>run(()=>{store.replace(applyStudentProfile(project,name),'填写姓名');setNotice('姓名已更新到作品集页面，可一次撤销。');})} onCover={()=>guideSelect('cover')} onEffect={()=>guideSelect('effect')} onMobile={()=>{setWidth(390);setView('preview');}}/>}
    <div className="toolbar"><div className="tools-left">
      <button disabled={busy} onClick={()=>{if(archive()){setStart(true);setNotice('已保留当前作品，可继续创建新的项目。');}}}><ArrowLeft size={15}/><span>返回开始</span></button>
      <button className="icon-button" title="新建项目" aria-label="新建项目" disabled={busy} onClick={()=>run(()=>{if(archive())setStart(true);})}><Plus size={17}/></button>
      <button className="icon-button" title="打开项目" aria-label="打开项目" disabled={busy} onClick={()=>input.current?.click()}><FolderOpen size={17}/></button>
      {advanced&&<><button disabled={busy} onClick={()=>folder.current?.click()}>导入文件夹</button><button disabled={busy} onClick={()=>run(()=>{const saved=readRecent(localStorage)[0]?.project;const raw=!saved?localStorage.getItem(storageKey):null;if(!saved&&!raw)throw new Error('浏览器中还没有保存的项目。');enterProject(saved||parseProjectJson(raw!));setNotice('已重新打开上次保存的项目。');})}>重新打开已保存</button></>}
      <span className="divider"/><button className="icon-button" aria-label="↶ 撤销" title="撤销 · Ctrl+Z" disabled={!state.canUndo&&!busy} onClick={()=>store.undo()}><Undo2 size={17}/></button><button className="icon-button" aria-label="↷ 重做" title="重做 · Ctrl+Shift+Z" disabled={!state.canRedo||busy} onClick={()=>store.redo()}><Redo2 size={17}/></button>
      <span className="divider"/><button className="icon-button" title={libraryOpen?'隐藏资源面板':'显示资源面板'} aria-label={libraryOpen?'隐藏资源面板':'显示资源面板'} aria-expanded={libraryOpen} onClick={()=>setLibraryOpen(!libraryOpen)}>{libraryOpen?<PanelLeftClose size={17}/>:<PanelLeftOpen size={17}/>}</button>
    </div><div className="tools-right">
      <div className="device-switch"><button title="桌面 · 900px" aria-label="桌面" aria-pressed={width===900} onClick={()=>setWidth(900)}><Monitor size={16}/></button><button title="手机 · 390px" aria-label="手机" aria-pressed={width===390} onClick={()=>setWidth(390)}><Smartphone size={16}/></button></div>
      <select aria-label="布局模式" title="拖动方式" value={mode} onChange={e=>setMode(e.target.value)}><option value="structure">结构化布局</option><option value="free">自由布局</option><option value="design">多选变换</option></select>
      <select aria-label="设备宽度" value={width} onChange={e=>setWidth(+e.target.value)}><option value={900}>900px</option><option value={768}>768px</option><option value={390}>390px</option></select>
      <select aria-label="画布缩放" value={autoFit?'fit':String(zoom)} onChange={e=>{setAutoFit(e.target.value==='fit');setZoom(e.target.value==='fit'?1:+e.target.value);}}><option value="fit">适应宽度</option>{[.5,.65,.8,1,1.25].map(z=><option key={z} value={z}>{Math.round(z*100)}%</option>)}</select>
      <button className="icon-button" aria-label="适应画布" title="适应画布宽度" onClick={()=>{setAutoFit(true);setZoom(1);}}><Maximize2 size={16}/></button>
      <span className="divider"/><button className="icon-button" title={inspectorOpen?'隐藏属性面板':'显示属性面板'} aria-label={inspectorOpen?'隐藏属性面板':'显示属性面板'} aria-expanded={inspectorOpen} onClick={()=>setInspectorOpen(!inspectorOpen)}>{inspectorOpen?<PanelRightClose size={17}/>:<PanelRightOpen size={17}/>}</button>
    </div></div>
    <input ref={imageInput} hidden type="file" accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml" onChange={e=>void uploadImage(e.target.files?.[0])}/><input ref={input} hidden type="file" multiple accept=".html,.htm,.css,.js,.json,.zip,.mws.json" onChange={e=>void openFiles(e.target.files)}/><input ref={folder} hidden type="file" multiple {...({webkitdirectory:''} as object)} onChange={e=>void openFiles(e.target.files)}/>
    <input ref={moduleInput} hidden type="file" accept=".zip" onChange={async e=>{const f=e.target.files?.[0];if(f)try{const m=moduleFromZip(new Uint8Array(await f.arrayBuffer()));store.replace(installModule(project,m),'安装模块');setNotice(`已安装 ${m.name}`);}catch(err){setNotice((err as Error).message);}e.target.value='';}}/>
    <div className="workspace">
      <aside className="sidebar" aria-label="资源面板" hidden={!libraryOpen}>{!advanced?<CreativeLibrary project={project} tab={creativeTab} selected={selected} locked={busy} onTab={setCreativeTab} onPage={entry=>run(()=>{store.replace({...project,entry},'切换页面');setFile(entry);setSelected('');})} onSelect={id=>{select(id);setFocusToken(n=>n+1);}} onEffectSelect={id=>{select(id);setInspectorSection('effects');setFocusToken(n=>n+1);}} onInsert={id=>addResource(id)} onCover={id=>run(()=>store.replace(replaceCover(project,selected,id),'替换封面'))} onUpload={()=>imageInput.current?.click()} onImportAssets={async files=>{if(files.length>30||files.reduce((sum,f)=>sum+f.size,0)>20*1024*1024||files.some(f=>!f.size||f.size>10*1024*1024))throw new Error('每批最多30张、总计20MB，单张不超过10MB。');const before=store.getSnapshot();const images=await Promise.all(files.map(async file=>({name:file.name,bytes:new Uint8Array(await file.arrayBuffer())})));const latest=store.getSnapshot();if(latest.revision!==before.revision||latest.diagnostics.length)throw new Error('页面已改变，请重新导入。');store.replace(importImages(latest.project,images),'批量导入图片');}} onUseAsset={path=>run(()=>store.replace(replaceCoverSource(project,selected,path,''),'复用图片'))} onDeleteAsset={path=>run(()=>store.replace(deleteImage(project,path),'删除未使用素材'))}/>:<><div className="panel-tabs">{[['layers','图层'],['files','文件'],['modules','模块']].map(([key,label])=><button key={key} className={left===key?'active':''} onClick={()=>setLeft(key)}>{label}</button>)}</div>
        {left==='layers'&&<><div className="panel-heading">DOCUMENT <span>{nodes.length} ELEMENTS</span></div><div className="tree" role="tree">{nodes.map(n=><button role="treeitem" aria-selected={selected===n.id} key={n.id} className={selected===n.id?'selected':''} style={{paddingLeft:12+Math.max(0,n.depth-1)*12}} onClick={()=>select(n.id)}><span className="node-icon">{['h1','h2','p','span'].includes(n.tag)?'T':'◇'}</span>{n.label}{(attr(n.node,'data-aos')||attr(n.node,'data-mws-reveal')||attr(n.node,'data-mws-css-effect')||attr(n.node,'data-mws-xyz'))&&<span className="animation-marker" title="已添加动画或特效"> ✦</span>}</button>)}</div><div className="sidebar-foot">真实 DOM · 源码位置关联<br/>可视化命令与代码共享项目状态</div></>}
        {left==='files'&&<><div className="panel-heading">PROJECT FILES</div><input className="file-search" aria-label="搜索文件与内容" placeholder="搜索文件与内容…" value={query} onChange={e=>setQuery(e.target.value)}/>{Object.entries(draft.files).filter(([name,f])=>!query||name.includes(query)||(f.kind==='text'&&f.content.includes(query))).map(([name,f])=><button className={`file-item ${file===name?'selected':''}`} key={name} onClick={()=>{if(f.kind==='text')setFile(name);else setNotice('二进制资源会随项目保存和导出。');}}><span>{f.kind==='asset'?'▧':'⌘'}</span>{name}</button>)}<div className="sidebar-foot">切换页面<select aria-label="当前页面" value={project.entry} onChange={e=>run(()=>{store.replace({...project,entry:e.target.value},'切换页面');setFile(e.target.value);setSelected('');})}>{Object.keys(project.files).filter(p=>/\.html?$/.test(p)).map(p=><option key={p}>{p}</option>)}</select></div></>}
        {left==='modules'&&<><div className="panel-heading">LOCAL MODULES <span>HTML + CSS</span></div><button className="install" disabled={busy} onClick={()=>moduleInput.current?.click()}>＋ 安装模块 ZIP</button>{[...BUILTINS,...project.modules.filter(m=>!BUILTINS.some(b=>b.id===m.id))].map(m=><div className="module-card" key={m.id}><div className="module-icon">▦</div><strong>{m.name}</strong><p>{m.description}</p><button disabled={busy} onClick={()=>useModule(m)}>＋ 添加到页面</button>{project.modules.some(x=>x.id===m.id)&&<button className="subtle" disabled={busy} onClick={()=>run(()=>{store.replace({...project,modules:project.modules.filter(x=>x.id!==m.id)},'卸载模块');setNotice('模块已从库卸载；已插入的独立 HTML/CSS 保留。');})}>从库卸载</button>}</div>)}<div className="sidebar-foot">脚本、依赖解析与版本升级计划在后续版本提供。</div></>}
      </>} </aside>
      <main className="center">{mode==='design'&&view!=='code'&&view!=='preview'&&<div className="design-toolbar"><span>Shift 点选或框选 · 最多 6 项 · 属性面板编辑主对象</span><select aria-label="变换手柄" value={transformHandle} onChange={e=>setTransformHandle(e.target.value)}><option value="resize">调整尺寸</option><option value="scale">等比缩放</option></select><strong>{multi.length} 项</strong><button disabled={busy||multi.length<2||!multi.every(id=>nodes.find(n=>n.id===id)?.parentId===nodes.find(n=>n.id===multi[0])?.parentId)} onClick={()=>setAlign({axis:'left',token:Date.now()})}>左对齐</button><button disabled={busy||multi.length<2||!multi.every(id=>nodes.find(n=>n.id===id)?.parentId===nodes.find(n=>n.id===multi[0])?.parentId)} onClick={()=>setAlign({axis:'top',token:Date.now()})}>顶对齐</button><button disabled={busy||!multi.length} onClick={()=>dispatch(multi.map(id=>({type:'delete' as const,id})))}>删除所选</button></div>}
        {view!=='code'&&<Canvas transformHandle={transformHandle} onDesignError={setNotice} onMultiSelect={setMulti} align={align} autoFit={autoFit} focusToken={focusToken} replay={replay} jump={jump} onResourceDrop={addResource} project={project} revision={revision} selected={selected} mode={mode} width={width} zoom={zoom} preview={view==='preview'} locked={busy} onSelect={select} onInspect={setInspection} onCommands={dispatch} onHistory={action=>action==='undo'?store.undo():store.redo()} onReady={()=>setReady(true)}/>}
        {(view==='split'||view==='code')&&<section className="code-panel"><div className="code-tabs">{Object.entries(draft.files).filter(([,f])=>f.kind==='text').map(([path])=><button key={path} className={file===path?'active':''} onClick={()=>setFile(path)}>{path}</button>)}<button className="plain-toggle" onClick={()=>setPlain(!plain)}>{plain?'Monaco':'纯文本'}</button></div>
          <div className="editor-body">{plain?<textarea spellCheck={false} aria-label="源代码文本" value={sourceText(draft,file)} onChange={e=>edit(e.target.value)} onSelect={e=>{if(file===project.entry&&!busy){const n=nodeAtOffset(sourceText(project),e.currentTarget.selectionStart);if(n)setSelected(n.id);}}}/>:<Suspense fallback={<div className="empty">加载代码编辑器…</div>}><CodeEditor file={file} content={sourceText(draft,file)} onChange={edit} onCursor={offset=>{if(file===project.entry&&!busy){const n=nodeAtOffset(sourceText(project),offset);if(n)setSelected(n.id);}}} selection={file===project.entry?current:undefined} diagnostics={diagnostics}/></Suspense>}</div>
          {busy&&<div className="diagnostics" role="alert"><strong>保留最后有效画布</strong><span>{diagnostics[0].file}:{diagnostics[0].line}:{diagnostics[0].column} {diagnostics[0].message}</span><button onClick={()=>store.discardDraft()}>放弃错误草稿</button><button onClick={()=>download(saveProject(draft),'website-draft.mws.json','application/json')}>下载草稿</button></div>}
        </section>}
      </main>
      <aside className="inspector" aria-label="属性面板" hidden={!inspectorOpen}>{!advanced?<CreativeInspector section={inspectorSection} onSection={setInspectorSection} project={project} current={current} inspection={inspection} locked={busy} onCommands={dispatch} onTheme={id=>run(()=>store.replace(applyTheme(project,id),'切换主题'))} onCover={id=>run(()=>store.replace(replaceCover(project,selected,id),'替换封面'))} onUpload={()=>imageInput.current?.click()} onLink={id=>run(()=>store.replace(linkToSection(project,selected,id),'设置跳转'))} onProjectChange={(next,label)=>run(()=>store.replace(next,label))} onSolidCover={color=>run(()=>store.replace(replaceSolidCover(project,selected,color),'使用纯色封面'))} onCoverCrop={position=>run(()=>store.replace(setCoverCrop(project,selected,position),'调整裁切位置'))} onCoverFit={fit=>run(()=>store.replace(setCoverFit(project,selected,fit),'调整图片裁剪'))} onReplay={()=>setReplay(n=>n+1)} onJump={()=>setJump(n=>n+1)} onMove={moveSibling} onInteractionDefault={(id,value)=>run(()=>store.replace(setInteractionDefault(project,id,value),'修改交互默认状态'))} onAccordionMultiple={(id,value)=>run(()=>store.replace(setAccordionMultiple(project,id,value),'修改折叠方式'))} onTryInteraction={()=>setView('preview')} onSelectComponent={select} onLocate={()=>setFocusToken(n=>n+1)} onCrop={()=>openVisualTool('crop')} onGradient={()=>openVisualTool('gradient')}/>:<><div className="panel-heading">INSPECTOR <span>源代码写回</span></div>{current?<>
        <div className="selection-label"><span>◇ {current.tag}</span><code>{current.id}</code></div><div className="row-actions"><button disabled={busy} onClick={()=>dispatch([{type:'duplicate',id:selected}])}>复制</button><button disabled={busy} onClick={()=>moveSibling(-1)}>上移</button><button disabled={busy} onClick={()=>moveSibling(1)}>下移</button><button disabled={busy||current.tag==='body'} onClick={()=>dispatch([{type:'delete',id:selected}])}>删除</button></div>
        <fieldset disabled={busy}><legend>元素属性</legend><Field key={selected+'id'} label="id" value={sourceAttribute(project,selected,'id')} onCommit={v=>setAttribute('id',v)}/><Field key={selected+'class'} label="class" value={sourceAttribute(project,selected,'class')} onCommit={v=>setAttribute('class',v)}/>
          {!current.node.childNodes?.some(n=>n.tagName)&&current.loc.endTag&&<Field key={selected+'text'} label="文字" value={current.node.childNodes?.map(n=>n.value||'').join('')||''} onCommit={text=>dispatch([{type:'text',id:selected,text}])}/>}<label className="field"><span>移入容器</span><select aria-label="移入容器" value="" onChange={e=>{if(e.target.value)dispatch([{type:'move',id:selected,parentId:e.target.value}]);}}><option value="">选择目标…</option>{nodes.filter(n=>n.loc.endTag&&['body','div','section','main','article','nav','header','footer','aside'].includes(n.tag)&&n.id!==selected&&!(n.loc.startOffset>current.loc.startOffset&&n.loc.endOffset<=current.loc.endOffset)).map(n=><option key={n.id} value={n.id}>{n.label} · {n.id.slice(-4)}</option>)}</select></label>
        </fieldset>
        <fieldset disabled={busy}><legend>样式覆盖 → studio.css</legend><p className="hint">空值移除覆盖；内联样式和更高优先级规则可能覆盖此值。</p><div className="style-fields">{['display','width','height','color','background-color','font-size','padding','margin','gap','border-radius','translate','rotate','scale'].map(prop=><Field key={selected+prop} label={prop} value={ownStyle(project,selected,prop)} placeholder={inspection?.id===selected?inspection.computed[prop]||'—':'—'} onCommit={v=>style(prop,v)}/>)}</div></fieldset>
        {inspection?.id===selected&&<><div className="panel-heading">BOX MODEL <span>计算值 · 只读</span></div><div className="box-model"><span>margin {inspection.computed.margin}</span><div>padding {inspection.computed.padding}<strong>{Math.round(inspection.rect.width)} × {Math.round(inspection.rect.height)}</strong></div></div><details><summary>浏览器计算样式</summary><div className="computed">{Object.entries(inspection.computed).map(([key,value])=><p key={key}><span>{key}</span><code>{value}</code></p>)}</div></details></>}
      </>:<div className="empty"><div className="empty-icon">⌖</div><strong>选择网页中的元素</strong><p>点击画布或左侧 DOM 图层<br/>开始编辑属性、文字与布局</p></div>}
      </>}<details className="limitations"><summary>当前页面的兼容性提示</summary>{warnings.map(w=><p key={w}>{w}</p>)}<p>首版：静态 HTML/CSS 与普通 JavaScript。React/Vue、JSX、TS 构建、动态 DOM、复杂资源路径需要适配器。</p></details>
      </aside>
    </div>
    {visualTool&&<Suspense fallback={<div role="status">正在打开编辑工具…</div>}>{visualTool.kind==='crop'?<ImageCropDialog src={visualTool.value} onApply={applyVisualTool} onClose={()=>setVisualTool(null)}/>:<GradientDialog value={visualTool.value} onApply={applyVisualTool} onClose={()=>setVisualTool(null)}/>}</Suspense>}
    {delivery&&<ExportPanel entry={project.entry} home={project.files['index.html']?'index.html':project.entry} pages={Object.keys(project.files).filter(path=>/\.html?$/i.test(path)).length} onClose={()=>setDelivery(false)} onZip={exportZip} onHtml={exportHtml}/>}
    {exportIssues.length>0&&<ExportNotice issues={exportIssues} onClose={()=>setExportIssues([])} onZip={exportZip}/>}
    <footer className="statusbar"><span className={busy?'status-error':'status-good'}>● {busy?'源码待修复':ready?'画布已同步':'画布连接中'}</span><span className="status-message" title={notice} role="status">{notice==='准备就绪'?state.label:notice}</span><span className="draft-status" aria-live="polite">{draftStatus}</span><span className="revision">REV {revision.toString().padStart(3,'0')} · {project.files[STYLE_FILE]?'SOURCE + OVERRIDES':'SOURCE FIRST'}</span></footer>
  </div>;
}
function Field({label,value,placeholder,onCommit}:{label:string;value:string;placeholder?:string;onCommit:(value:string)=>void}){
  const [local,setLocal]=useState(value);useEffect(()=>setLocal(value),[value]);
  return <label className="field"><span>{label}</span><input aria-label={label} value={local} placeholder={placeholder} onChange={e=>setLocal(e.target.value)} onBlur={()=>{if(local!==value)onCommit(local);}} onKeyDown={e=>{if(e.nativeEvent.isComposing)return;if(e.key==='Enter')e.currentTarget.blur();if(e.key==='Escape'){setLocal(value);}}}/></label>;
}
