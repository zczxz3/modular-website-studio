import type { Project, StudioModule, HtmlNode } from './types';
import { strFromU8 } from 'fflate';
import { readZip, resolvePath } from './io';
import { attr, parseHtml, patch, sourceText, walk } from './source';
import { transaction } from './commands';
import { validateModule } from './module-validation';
export { validateModule } from './module-validation';

export const BUILTINS:StudioModule[]=[
  {id:'studio/card',version:'1.0.0',name:'内容卡片',description:'语义化 article · 响应式',html:'<article class="mws-card"><p class="mws-eyebrow">FIELD NOTES</p><h2>新的视角</h2><p>双击文字开始编辑，拖动卡片改变布局。</p><button type="button">探索更多 ↗</button></article>',css:'.mws-card { padding: 28px; border: 1px solid #bfcac9; border-radius: 16px; background: #fff; color: #143b3b; }\n.mws-card h2 { font-size: 28px; }\n.mws-card button { background: #235d59; color: white; border: 0; border-radius: 30px; padding: 12px 20px; }\n.mws-eyebrow { letter-spacing: .2em; font-size: 11px; }',permissions:[],dependencies:{}},
  {id:'studio/section',version:'1.0.0',name:'弹性容器',description:'Flexbox · 接收拖入元素',html:'<section class="mws-section"><h2>新章节</h2><p>将其他元素拖入这个容器。</p></section>',css:'.mws-section { display: flex; flex-direction: column; gap: 16px; padding: 40px; min-height: 180px; border: 1px dashed #9aa; border-radius: 16px; }',permissions:[],dependencies:{}},
  {id:'studio/button',version:'1.0.0',name:'行动按钮',description:'原生 button · 可编辑文字',html:'<button type="button" class="mws-action">开始探索 ↗</button>',css:'.mws-action { padding: 14px 26px; color: white; background: #235d59; border: 0; border-radius: 28px; cursor: pointer; }',permissions:[],dependencies:{}}
];
export function installModule(project:Project,module:StudioModule):Project {
  const m=validateModule(module);const existing=project.modules.find(x=>x.id===m.id);
  if(existing)throw new Error(`模块 ${m.id} 已安装；首版不自动升级。`);
  return {...project,modules:[...project.modules,m]};
}
export function moduleFromZip(bytes:Uint8Array):StudioModule {
  const files=readZip(bytes);if(!files['module.json'])throw new Error('ZIP 根目录缺少 module.json。');
  const manifest=JSON.parse(strFromU8(files['module.json']));return validateModule(manifest);
}

function stylesheetPath(project:Project,module:StudioModule){
  // IDs contain ASCII only. Hex is injective and safe in both filenames and URLs.
  const path=`modules/mws-${Array.from(module.id,c=>c.charCodeAt(0).toString(16).padStart(2,'0')).join('')}.css`;
  if(project.files[path]){
    if(project.files[path].kind!=='text')throw new Error(`模块样式路径已被非文本资源占用：${path}`);
    return path; // Keep hand-edited source CSS.
  }
  const legacy=`modules/${module.id.replaceAll('/','-')}.css`;
  // Reuse known v1 CSS without renaming its files or rewriting existing references.
  // A colliding or modified legacy file must never be overwritten.
  if(project.files[legacy]?.kind==='text'&&project.files[legacy].content===module.css)return legacy;
  return path;
}

export function insertModule(project:Project,module:StudioModule,parentId:string,beforeId?:string):Project {
  const m=validateModule(module);
  let p=project.modules.some(installed=>installed.id===m.id)?project:installModule(project,m);
  const path=stylesheetPath(p,m);
  if(!p.files[path])p={...p,files:{...p.files,[path]:{kind:'text',content:m.css}}};
  let head:HtmlNode|undefined,linked=false;const html=sourceText(p);
  walk(parseHtml(html),n=>{
    if(n.tagName==='head')head=n;
    if(n.tagName==='link'&&(attr(n,'rel')||'').toLowerCase().split(/\s+/).includes('stylesheet')&&resolvePath(p.entry,attr(n,'href')||'')===path)linked=true;
  });
  // File creation is project-wide; a stylesheet reference belongs to each using page.
  if(!linked){
    const at=head?.sourceCodeLocation?.endTag?.startOffset;if(at===undefined)throw new Error('页面缺少可插入样式引用的 head 闭合标签。');
    const href='../'.repeat(p.entry.split('/').length-1)+path;
    p={...p,files:{...p.files,[p.entry]:{kind:'text',content:patch(html,at,at,`<link rel="stylesheet" href="${href}">\n`)}}};
  }
  // Pure preparation + existing source commands; the caller commits one snapshot.
  return transaction(p,[{type:'insert',parentId,beforeId,html:m.html}]);
}
