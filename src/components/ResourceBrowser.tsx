import {useState,type DragEvent} from 'react';
import {Search,GripVertical,Plus,Check,FolderInput} from 'lucide-react';
import type {StudioModule} from '../core/types';
import {BASIC,BLOCKS,COVERS,svgUrl,themeCss} from '../core/catalog';
import {WEBSITE_ASSET_META,WEBSITE_ASSET_CATEGORIES,WEBSITE_ASSET_ORIGIN} from '../resources/website-assets-library';

function ResourceCard({module,onInsert,disabled}:{module:StudioModule;onInsert:()=>void;disabled:boolean}){
  const meta=WEBSITE_ASSET_META[module.id],name=meta?.name||module.name,description=meta?.description||module.description,compact=meta?.category==='Buttons';
  let html=module.html;for(const cover of COVERS)html=html.replaceAll(cover.path,svgUrl(cover.source));
  const drag=(e:DragEvent)=>{if(disabled){e.preventDefault();return;}e.dataTransfer.setData('application/x-mws-resource',module.id);e.dataTransfer.setData('text/plain',module.id);e.dataTransfer.effectAllowed='copy';};
  return <article className="resource-card" data-resource={module.id} draggable={!disabled} onDragStart={drag}>
    <div className="resource-preview"><iframe style={compact?{width:'100%',height:137,transform:'none'}:undefined} title={name+'预览'} sandbox="" loading="lazy" srcDoc={`<!doctype html><html><head><meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; img-src data:; font-src data:; form-action 'none'; base-uri 'none'"><style>${themeCss('paper')} body{font:14px system-ui;${compact?'margin:0;min-height:137px;display:grid;place-items:center':'margin:12px'}}${module.css}</style></head><body>${html}</body></html>`}/></div>
    <strong>{name}</strong><span className="resource-kind"><Check size={11} aria-hidden="true"/>{module.html.includes('data-mws-component=')?'可添加 · 点击交互':'可添加 · HTML / CSS'}</span>
    {meta&&<span className="resource-source">website-assets · {WEBSITE_ASSET_CATEGORIES[meta.category]}</span>}<p>{description}</p>
    {meta&&<details className="resource-details"><summary>使用说明</summary><p>{description}</p><code>{module.id}@{module.version}</code></details>}
    <div className="resource-actions"><button disabled={disabled} onClick={onInsert}><Plus size={14} aria-hidden="true"/>添加到此处</button><button disabled={disabled} draggable={!disabled} title="拖动插入组件" aria-label="拖动插入"><GripVertical size={15} aria-hidden="true"/></button></div>
  </article>;
}

export default function ResourceBrowser({kind,locked,onInsert,installed=[],onImport,importing=false}:{kind:'blocks'|'basics';locked:boolean;onInsert:(id:string)=>void;installed?:StudioModule[];onImport?:()=>void;importing?:boolean}){
  const [search,setSearch]=useState(''),[filter,setFilter]=useState('all'),[source,setSource]=useState('all'),[category,setCategory]=useState('all'),[limit,setLimit]=useState(12);
  const reset=()=>{setSearch('');setFilter('all');setSource('all');setCategory('all');setLimit(12);};
  const installedIds=new Set(installed.map(module=>module.id));
  const base=kind==='blocks'?BLOCKS:BASIC;
  const available=[...base.map(module=>installed.find(saved=>saved.id===module.id)||module),...(kind==='basics'?installed.filter(module=>![...BASIC,...BLOCKS].some(bundled=>bundled.id===module.id)):[])];
  const resources=available.filter(module=>{
    const meta=WEBSITE_ASSET_META[module.id];
    const matchesSource=source==='all'||(source==='project'?installedIds.has(module.id):source==='website-assets'?!!meta:!meta&&BASIC.some(bundled=>bundled.id===module.id));
    return matchesSource&&(category==='all'||meta?.category===category)&&(filter==='all'||(filter==='interactive')===module.html.includes('data-mws-component='))&&[module.id,module.name,module.description,meta?.name,meta?.description,meta&&WEBSITE_ASSET_CATEGORIES[meta.category]].join(' ').toLowerCase().includes(search.trim().toLowerCase());
  });
  return <>
    {kind==='basics'&&<><div className="resource-selects"><label>组件来源<select aria-label="组件来源" value={source} onChange={e=>{setSource(e.target.value);setFilter('all');setCategory('all');setLimit(12);}}><option value="all">全部来源</option><option value="studio">工作台精选 · {BASIC.length-WEBSITE_ASSET_ORIGIN.count}</option><option value="website-assets">我的组件库 · {WEBSITE_ASSET_ORIGIN.count}</option><option value="project">工程组件 · {installed.filter(module=>!BLOCKS.some(block=>block.id===module.id)).length}</option></select></label><label>组件类别<select aria-label="组件类别" value={category} disabled={source==='studio'} onChange={e=>{setCategory(e.target.value);setFilter('all');setLimit(12);}}><option value="all">全部类别</option>{Object.entries(WEBSITE_ASSET_CATEGORIES).map(([id,name])=><option key={id} value={id}>{name}</option>)}</select></label></div>
    <div className="catalog-source-note"><span>已内置 {WEBSITE_ASSET_ORIGIN.count} 个 · 快照 {WEBSITE_ASSET_ORIGIN.revision.slice(0,7)}</span>{onImport&&<button disabled={locked||importing} onClick={()=>{setSource('project');setCategory('all');setFilter('all');setLimit(12);onImport();}}><FolderInput size={14}/>{importing?'正在校验…':'导入组件集合 ZIP'}</button>}</div></>}
    <div className="library-search"><Search size={15}/><input aria-label="搜索组件" placeholder="搜索名称、用途或 ID…" value={search} onChange={e=>{setSearch(e.target.value);setLimit(12);}}/>{search&&<button aria-label="清除搜索" onClick={()=>{setSearch('');setLimit(12);}}>×</button>}</div>
    {kind==='basics'&&<nav className="resource-filters" aria-label="组件分类">{[['all','全部'],['static','基础'],['interactive','交互']].map(([id,label])=><button key={id} aria-pressed={filter===id} onClick={()=>{setFilter(id);setLimit(12);}}>{label}</button>)}</nav>}
    <div className="panel-heading">{kind==='blocks'?'完整页面区块':'可添加的组件'}<span>{resources.length} 项</span></div>
    {resources.slice(0,limit).map(module=><ResourceCard key={module.id} module={module} disabled={locked} onInsert={()=>onInsert(module.id)}/>)}
    {resources.length>limit&&<button className="resource-more" onClick={()=>setLimit(n=>n+12)}>显示更多组件（还有 {resources.length-limit} 项）</button>}
    {!resources.length&&<div className="empty resource-empty"><Search size={25}/><strong>没有匹配的组件</strong><p>试试“按钮”“表单”，或清除当前筛选。</p><button onClick={reset}>清除筛选</button></div>}
    <p className="panel-tip">拖入画布，或点击添加。组件随工程保存，可离线导出。{kind==='basics'&&<>我的组件库已收录 {WEBSITE_ASSET_ORIGIN.count} 个静态模块；可直接导入 studio-components.zip，已有组件保留。JS 动效包与待实现方案保留接口。</>}</p>
  </>;
}
