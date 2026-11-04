import {useEffect,useRef,useState} from 'react';
import {FileText,Layers3,Blocks,Image as ImageIcon,ArrowUp,ArrowDown,Copy,Trash2,MousePointer2,Sparkles,Palette} from 'lucide-react';
import type {EditCommand,ElementInfo,Project} from '../core/types';
import {attr,elements,sourceText} from '../core/source';
import {ownStyle,sourceAttribute} from '../core/commands';
import {COVERS,svgUrl,THEMES} from '../core/catalog';
import {currentTheme} from '../core/workbench';
import {coverGroupSize,setCoverAlt} from '../core/covers';
import EffectPanel from './EffectPanel';
import AssetLibrary from './AssetLibrary';
import ResourceBrowser from './ResourceBrowser';
import type {Inspection} from './Canvas';
import {animatedElements} from '../core/aos';
import {interactionFor} from '../core/interactions';

export function ValueField({label,value,placeholder,onCommit,multiline=false}:{label:string;value:string;placeholder?:string;onCommit:(value:string)=>void;multiline?:boolean}){
  const [local,setLocal]=useState(value),cancel=useRef(false);useEffect(()=>setLocal(value),[value]);
  const props={ 'aria-label':label,value:local,placeholder,onChange:(e:React.ChangeEvent<HTMLInputElement|HTMLTextAreaElement>)=>setLocal(e.target.value),onBlur:()=>{if(!cancel.current&&local!==value)onCommit(local);cancel.current=false;},onKeyDown:(e:React.KeyboardEvent<HTMLInputElement|HTMLTextAreaElement>)=>{if(e.nativeEvent.isComposing)return;if(e.key==='Enter'&&(!multiline||e.ctrlKey||e.metaKey)){e.preventDefault();e.currentTarget.blur();}if(e.key==='Escape'){e.preventDefault();cancel.current=true;setLocal(value);e.currentTarget.blur();}}};
  return <div className={multiline?'multiline-field':''}><label className="field"><span>{label}</span>{multiline?<textarea rows={4} {...props}/>:<input {...props}/>}</label>{multiline&&<p className="field-shortcuts">Ctrl / ⌘ + Enter 应用 · Esc 取消</p>}</div>;
}
export function CoverChoices({onChoose,disabled=false}:{onChoose:(id:string)=>void;disabled?:boolean}){return <div className="cover-choices">{COVERS.map(c=><button key={c.id} disabled={disabled} onClick={()=>onChoose(c.id)}><img src={svgUrl(c.source)} alt=""/><span>使用{c.name}</span></button>)}</div>;}
interface LibraryProps{project:Project;tab:string;selected:string;locked:boolean;onTab:(tab:string)=>void;onPage:(page:string)=>void;onSelect:(id:string)=>void;onEffectSelect:(id:string)=>void;onInsert:(id:string)=>void;onCover:(id:string)=>void;onUpload:()=>void;onImportAssets:(files:File[])=>Promise<void>;onUseAsset:(path:string)=>void;onDeleteAsset:(path:string)=>void;}
export function CreativeLibrary(p:LibraryProps){
  const animated=animatedElements(p.project);const nodes=elements(sourceText(p.project)),image=nodes.find(n=>n.id===p.selected)?.tag==='img';
  return <><div className="library-heading"><div><span className="eyebrow-ui">WORKSPACE</span><h2>创作资源</h2></div><span className="local-badge">本地资源</span></div><div className="creative-tabs">{[['pages','页面'],['blocks','区块'],['basics','组件'],['assets','素材']].map(([key,label],index)=><button key={key} className={key===p.tab?'active':''} aria-pressed={key===p.tab} onClick={()=>p.onTab(key)}>{[<FileText size={16}/>,<Layers3 size={16}/>,<Blocks size={16}/>,<ImageIcon size={16}/>][index]}<span>{label}</span></button>)}</div>
    {p.tab==='pages'&&<><div className="panel-heading">我的页面</div><label className="page-select">当前页面<select aria-label="当前页面" value={p.project.entry} disabled={p.locked} onChange={e=>p.onPage(e.target.value)}>{Object.keys(p.project.files).filter(f=>/\.html?$/i.test(f)).map(f=><option key={f} value={f}>{f==='index.html'?'首页':f==='pages/about.html'?'创作手记':f==='pages/work-space.html'?'作品 · 空间的回响':f==='pages/work-tide.html'?'作品 · 沿着潮汐':f}</option>)}</select></label><div className="panel-heading">页面内容 <span>点击选中后拖动排序</span></div><div className="section-list">{nodes.filter(n=>attr(n.node,'data-ws-block')).map(n=><button key={n.id} className={n.id===p.selected?'selected':''} onClick={()=>p.onSelect(n.id)}>▤ {attr(n.node,'data-ws-block')}</button>)}</div>{animated.length>0&&<><div className="panel-heading">已添加动画 / 特效 <span>{animated.length}</span></div><div className="section-list animated-list">{animated.map(n=><button key={n.id} onClick={()=>p.onEffectSelect(n.id)} className={n.id===p.selected?'selected':''} title={attr(n.node,'data-aos')||attr(n.node,'data-mws-reveal')||attr(n.node,'data-mws-css-effect')||attr(n.node,'data-mws-xyz')}>✦ {attr(n.node,'data-ws-block')||n.node.childNodes?.filter(child=>child.nodeName==='#text').map(child=>child.value||'').join('').trim().slice(0,32)||n.label}</button>)}</div></>}<p className="panel-tip">双击画布文字即可修改。<br/>选中图片，在右侧更换封面。<br/>拖动选框左上角的手柄可以排序。</p></>}
    {(p.tab==='blocks'||p.tab==='basics')&&<ResourceBrowser key={p.tab} kind={p.tab} locked={p.locked} onInsert={p.onInsert}/>}
    {p.tab==='assets'&&<AssetLibrary project={p.project} canUse={image} locked={p.locked} onImport={p.onImportAssets} onUse={p.onUseAsset} onDelete={p.onDeleteAsset}/>}
  </>;
}
export type InspectorSection='content'|'style'|'effects';
interface InspectorProps{section:InspectorSection;onSection:(section:InspectorSection)=>void;project:Project;current?:ElementInfo;inspection:Inspection|null;locked:boolean;onCommands:(commands:EditCommand[])=>void;onTheme:(id:string)=>void;onCover:(id:string)=>void;onUpload:()=>void;onLink:(id:string)=>void;onProjectChange:(project:Project,label:string)=>void;onSolidCover:(color:string)=>void;onCoverCrop:(position:string)=>void;onCoverFit:(fit:''|'cover'|'contain')=>void;onReplay:()=>void;onJump:()=>void;onMove:(direction:number)=>void;onInteractionDefault:(id:string,value:number)=>void;onAccordionMultiple:(id:string,value:boolean)=>void;onTryInteraction:()=>void;onSelectComponent:(id:string)=>void;onLocate:()=>void;onCrop:()=>void;onGradient:()=>void;}
export function CreativeInspector(p:InspectorProps){
  const {current:n,project}=p,selected=n?.id||'',nodes=elements(sourceText(project));
  const style=(property:string,value:string)=>p.onCommands([{type:'style',id:selected,property,value}]);
  const attribute=(name:string,value:string)=>p.onCommands([{type:'attribute',id:selected,name,value}]);
  const [coverColor,setCoverColor]=useState('#286c70');
  useEffect(()=>setCoverColor(n?sourceAttribute(project,n.id,'data-mws-cover-color')||'#286c70':'#286c70'),[selected]);
  const workCard=n&&nodes.filter(x=>x.tag==='article'&&attr(x.node,'data-ws-block')?.startsWith('作品 ·')&&x.loc.startOffset<=n.loc.startOffset&&x.loc.endOffset>=n.loc.endOffset).at(-1);
  const interaction=n?interactionFor(project,n.id):null,computed=p.inspection?.id===selected?p.inspection.computed:{};
  const styleOrigin=(label:string,property:string)=><div className="value-origin"><span>{ownStyle(project,selected,property)?'局部修改':'跟随主题或页面'}</span>{ownStyle(project,selected,property)&&<button title="移除局部修改" onClick={()=>style(property,'')}>{property==='color'?'恢复颜色跟随主题':`恢复${label}默认值`}</button>}</div>;
  const styleField=(label:string,property:string)=><div key={selected+property}><ValueField label={label} value={ownStyle(project,selected,property)} placeholder={computed[property]||'跟随页面'} onCommit={v=>style(property,['font-size','border-radius','gap','padding','max-width'].includes(property)&&/^\d+(?:\.\d+)?$/.test(v.trim())?v.trim()+'px':v)}/>{styleOrigin(label,property)}</div>;
  const fonts=[['system-ui, sans-serif','简洁无衬线'],['Georgia, "Songti SC", SimSun, serif','经典衬线'],['Consolas, "Courier New", monospace','整齐等宽']],font=ownStyle(project,selected,'font-family');
  const layoutProperties=['display','flex-direction','flex-wrap','grid-template-columns'],customLayout=layoutProperties.some(property=>ownStyle(project,selected,property));
  const isText=n&&!n.node.childNodes?.some(c=>c.tagName)&&!!n.loc.endTag;
  return <>
    <div className="inspector-title"><div><span className="eyebrow-ui">PROPERTIES</span><h2>元素设置</h2></div><MousePointer2 size={18}/></div>
    <nav className="inspector-tabs" aria-label="属性分类">{(['content','style','effects'] as const).map((section,index)=><button key={section} aria-pressed={p.section===section} onClick={()=>p.onSection(section)}>{[<FileText size={15}/>,<Palette size={15}/>,<Sparkles size={15}/>][index]}{['内容','样式','特效'][index]}</button>)}</nav>
    {n?<>
      <div className="selection-label"><span>{attr(n.node,'data-ws-block')||({img:'图片',h1:'主标题',h2:'标题',p:'文字',a:'链接按钮'}[n.tag]||'页面元素')}</span></div>
      <div className="row-actions"><button disabled={p.locked} onClick={()=>p.onMove(-1)}><ArrowUp size={14}/>上移</button><button disabled={p.locked} onClick={()=>p.onMove(1)}><ArrowDown size={14}/>下移</button><button disabled={p.locked} onClick={()=>p.onCommands([{type:'duplicate',id:selected}])}><Copy size={14}/>复制</button><button className="danger-subtle" disabled={p.locked||n.tag==='body'} onClick={()=>p.onCommands([{type:'delete',id:selected}])}><Trash2 size={14}/>删除</button></div>
      <div className="selection-navigation"><button onClick={p.onLocate}><MousePointer2 size={13}/>在画布定位</button><button disabled={!n.parentId} onClick={()=>n.parentId&&p.onSelectComponent(n.parentId)}>选中父级</button></div>
      {workCard&&workCard.id!==selected&&<button className="select-work" disabled={p.locked} onClick={()=>p.onSelectComponent(workCard.id)}>选中作品卡</button>}
      {p.section==='effects'&&<EffectPanel project={project} id={selected} locked={p.locked} onChange={p.onProjectChange} onReplay={p.onReplay} onPreview={p.onTryInteraction}/>}
      {p.section==='content'&&<>
        <fieldset disabled={p.locked}><legend>{n.tag==='img'?'图片与封面':'内容与链接'}</legend>
          {isText&&<ValueField key={selected+'text'} multiline={n.tag==='p'||n.tag==='figcaption'||n.tag==='blockquote'} label="文字内容" value={n.node.childNodes?.map(c=>c.value||'').join('')||''} onCommit={text=>p.onCommands([{type:'text',id:selected,text}])}/>}
          {n.tag==='img'&&<>
            <button className="wide-button upload-button" onClick={p.onUpload}><ImageIcon size={16}/>从本机上传</button><button className="wide-button" onClick={p.onCrop}>裁剪当前图片</button><p className="hint">也可以使用下面的内置封面。</p><CoverChoices onChoose={p.onCover}/>
            <div className="solid-cover"><label>封面颜色<input type="color" aria-label="封面颜色" value={coverColor} onChange={e=>setCoverColor(e.target.value)}/></label><button onClick={()=>p.onSolidCover(coverColor)}>使用纯色封面</button></div>
            <ValueField label="图片说明" value={sourceAttribute(project,selected,'alt')} placeholder="描述图片，便于他人理解" onCommit={value=>p.onProjectChange(setCoverAlt(project,selected,value),'修改图片说明')}/>
            <label className="field"><span>图片裁剪</span><select aria-label="图片裁剪" value={ownStyle(project,selected,'object-fit')} onChange={e=>p.onCoverFit(e.target.value as ''|'cover'|'contain')}><option value="">跟随页面</option><option value="cover">填满区域</option><option value="contain">完整显示</option></select></label>
            <label className="field"><span>裁切位置</span><select aria-label="裁切位置" value={ownStyle(project,selected,'object-position')||'50% 50%'} onChange={e=>p.onCoverCrop(e.target.value)}><option value="50% 50%">居中</option><option value="50% 0%">靠上</option><option value="50% 100%">靠下</option><option value="0% 50%">靠左</option><option value="100% 50%">靠右</option></select></label>
            {coverGroupSize(project,selected)>1&&<p className="hint linked-hint">首页和详情页的封面、裁切与说明会一起更新。</p>}
          </>}
          {n.tag==='a'&&<><label className="field"><span>跳转区块</span><select aria-label="跳到页面中的位置" value={nodes.find(x=>sourceAttribute(project,selected,'href')==='#'+encodeURIComponent(attr(x.node,'id')||''))?.id||''} onChange={e=>{if(e.target.value)p.onLink(e.target.value);}}><option value="">选择区块…</option>{nodes.filter(x=>attr(x.node,'data-ws-block')).map(x=><option key={x.id} value={x.id}>{attr(x.node,'data-ws-block')}</option>)}</select></label><ValueField label="链接地址" value={sourceAttribute(project,selected,'href')} onCommit={v=>attribute('href',v)}/><button className="wide-button" onClick={p.onJump}>在画布检查跳转</button></>}
          {!isText&&n.tag!=='img'&&n.tag!=='a'&&<p className="hint">在画布中双击文字，或选中其中的图片进行替换。</p>}
        </fieldset>
        {interaction&&<fieldset disabled={p.locked}><legend>{interaction.kind==='tabs'?'选项卡交互':'折叠面板交互'}</legend><label className="field"><span>默认显示</span><select aria-label="默认显示" value={interaction.initial} onChange={e=>p.onInteractionDefault(interaction.id,Number(e.target.value))}>{interaction.kind==='accordion'&&<option value={-1}>全部收起</option>}{interaction.options.map(option=><option key={option.value} value={option.value}>{option.label}</option>)}</select></label>{interaction.kind==='accordion'&&<label className="field"><span>展开方式</span><select aria-label="展开方式" value={interaction.multiple?'multiple':'single'} onChange={e=>p.onAccordionMultiple(interaction.id,e.target.value==='multiple')}><option value="single">一次展开一项</option><option value="multiple">可同时展开多项</option></select></label>}<div className="row-actions"><button onClick={()=>p.onSelectComponent(interaction.id)}>选中整个组件</button><button onClick={p.onTryInteraction}>试用交互</button></div><p className="hint">画布展开全部内容，预览按默认状态运行。</p></fieldset>}
      </>}
      {p.section==='style'&&<>
        {n.tag!=='img'&&<fieldset disabled={p.locked}><legend>背景</legend><button className="wide-button" onClick={p.onGradient}>编辑渐变背景</button>{ownStyle(project,selected,'background-image')&&<button onClick={()=>style('background-image','')}>恢复背景默认值</button>}</fieldset>}
        <fieldset disabled={p.locked}><legend>外观</legend>
          {n.tag==='img'?styleField('图片圆角','border-radius'):<>
            <label className="field"><span>字体</span><select aria-label="字体" value={font} onChange={e=>style('font-family',e.target.value)}><option value="">跟随主题</option>{fonts.map(([value,label])=><option key={value} value={value}>{label}</option>)}{font&&!fonts.some(([value])=>value===font)&&<option value={font}>自定义字体</option>}</select></label>{styleOrigin('字体','font-family')}{styleField('字号','font-size')}{styleField('文字颜色','color')}
            <label className="field"><span>文字对齐</span><select aria-label="文字对齐" value={ownStyle(project,selected,'text-align')} onChange={e=>style('text-align',e.target.value)}><option value="">跟随页面</option><option value="left">靠左</option><option value="center">居中</option><option value="right">靠右</option></select></label>{styleOrigin('文字对齐','text-align')}
          </>}
          {styleField('最大宽度','max-width')}
          {['a','button'].includes(n.tag)&&<label className="field"><span>按钮样式</span><select aria-label="按钮样式" value={sourceAttribute(project,selected,'data-ws-button')||''} onChange={e=>attribute('data-ws-button',e.target.value)}><option value="">保持原样</option><option value="solid">实心按钮</option><option value="outline">描边按钮</option></select></label>}
        </fieldset>
        {n.loc.endTag&&!isText&&<fieldset disabled={p.locked}><legend>排列与留白</legend><label className="field"><span>内容排列</span><select aria-label="内容排列" value="" onChange={e=>p.onCommands(e.target.value==='grid'?[{type:'style',id:selected,property:'display',value:'grid'},{type:'style',id:selected,property:'grid-template-columns',value:'repeat(auto-fit,minmax(min(240px,100%),1fr))'}]:[{type:'style',id:selected,property:'display',value:'flex'},{type:'style',id:selected,property:'flex-direction',value:e.target.value},{type:'style',id:selected,property:'flex-wrap',value:'wrap'}])}><option value="">保持当前排列</option><option value="row">左右排列 · 自动换行</option><option value="column">上下排列</option><option value="grid">自动网格</option></select></label>{customLayout&&<button onClick={()=>p.onCommands(layoutProperties.map(property=>({type:'style',id:selected,property,value:''})))}>恢复排列默认值</button>}{styleField('元素间距','gap')}{styleField('内容留白','padding')}{styleField('背景颜色','background-color')}</fieldset>}
      </>}
    </>:<div className="empty"><div className="empty-icon"><MousePointer2 size={32}/></div><strong>选中你想修改的地方</strong><p>点选画布中的文字、图片或区块，<br/>这里会显示对应的编辑选项。</p></div>}
    {p.section==='style'&&<fieldset className="theme-panel" disabled={p.locked}><legend>整站主题</legend><div className="theme-options">{THEMES.map(t=><button key={t.id} aria-pressed={currentTheme(project)===t.id} onClick={()=>p.onTheme(t.id)}><span className="theme-swatch" style={{background:t.bg,borderColor:t.accent}}><i style={{background:t.accent}}/></span><strong>{t.name}</strong><small>{t.description}</small></button>)}</div><p className="hint">局部修改保留，主题可一次撤销。</p></fieldset>}
  </>;
}
