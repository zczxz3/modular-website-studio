import { parseFragment } from 'parse5';
import postcss from 'postcss';
import type { Project, StudioModule, HtmlNode } from './types';
import { strFromU8 } from 'fflate';
import { readZip, validateModuleShape } from './io';
import { walk } from './source';

export const BUILTINS:StudioModule[]=[
  {id:'studio/card',version:'1.0.0',name:'内容卡片',description:'语义化 article · 响应式',html:'<article class="mws-card"><p class="mws-eyebrow">FIELD NOTES</p><h2>新的视角</h2><p>双击文字开始编辑，拖动卡片改变布局。</p><button type="button">探索更多 ↗</button></article>',css:'.mws-card { padding: 28px; border: 1px solid #bfcac9; border-radius: 16px; background: #fff; color: #143b3b; }\n.mws-card h2 { font-size: 28px; }\n.mws-card button { background: #235d59; color: white; border: 0; border-radius: 30px; padding: 12px 20px; }\n.mws-eyebrow { letter-spacing: .2em; font-size: 11px; }',permissions:[],dependencies:{}},
  {id:'studio/section',version:'1.0.0',name:'弹性容器',description:'Flexbox · 接收拖入元素',html:'<section class="mws-section"><h2>新章节</h2><p>将其他元素拖入这个容器。</p></section>',css:'.mws-section { display: flex; flex-direction: column; gap: 16px; padding: 40px; min-height: 180px; border: 1px dashed #9aa; border-radius: 16px; }',permissions:[],dependencies:{}},
  {id:'studio/button',version:'1.0.0',name:'行动按钮',description:'原生 button · 可编辑文字',html:'<button type="button" class="mws-action">开始探索 ↗</button>',css:'.mws-action { padding: 14px 26px; color: white; background: #235d59; border: 0; border-radius: 28px; cursor: pointer; }',permissions:[],dependencies:{}}
];
export function validateModule(value:unknown):StudioModule {
  const m=validateModuleShape(value);postcss.parse(m.css);
  walk(parseFragment(m.html,{sourceCodeLocationInfo:true}) as unknown as HtmlNode,n=>{
    if(['script','iframe','object','embed','link','meta','base','style'].includes(n.tagName||''))throw new Error('基础模块不能包含脚本、嵌入页面或外部依赖。');
    if(n.attrs?.some(a=>/^on/i.test(a.name)||['srcdoc','data-mws-id'].includes(a.name)||/^\s*(?:javascript|vbscript):/i.test(a.value)))throw new Error('模块包含不允许的属性。');
  });return m;
}
export function installModule(project:Project,module:StudioModule):Project {
  const m=validateModule(module);const existing=project.modules.find(x=>x.id===m.id);
  if(existing)throw new Error(`模块 ${m.id} 已安装；首版不自动升级。`);
  return {...project,modules:[...project.modules,m]};
}
export function moduleFromZip(bytes:Uint8Array):StudioModule {
  const files=readZip(bytes);if(!files['module.json'])throw new Error('ZIP 根目录缺少 module.json。');
  const manifest=JSON.parse(strFromU8(files['module.json']));return validateModule(manifest);
}
