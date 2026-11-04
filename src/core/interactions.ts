import type {Project,StudioModule} from './types';
import {attr,elements,getElement,normalizeProject,parseHtml,patch,sourceText,walk} from './source';
import {transaction} from './commands';
import {resolvePath} from './io';
import runtime from '../preview/interactions.js?raw';

const shared=`.ws-interactive{box-sizing:border-box;width:100%;max-width:100%;margin:28px 0;padding:var(--ws-space,28px);border:1px solid var(--ws-line,#cbd5d5);border-radius:var(--ws-radius,16px);background:var(--ws-surface,#fff);color:var(--ws-ink,#233e3d);font:16px/1.65 var(--ws-font,system-ui,sans-serif);overflow-wrap:anywhere}.ws-interactive *{box-sizing:border-box}.ws-interactive h2{font:500 clamp(25px,4vw,36px)/1.2 var(--ws-heading,Georgia,serif);margin:0 0 22px}.ws-interactive button{font:600 14px/1.5 var(--ws-font,system-ui,sans-serif);cursor:pointer;color:inherit}.ws-interactive button:focus-visible{outline:3px solid var(--ws-accent,#286c70);outline-offset:3px}.ws-interactive [data-mws-panel][hidden],.ws-interactive [data-mws-answer][hidden]{display:none!important}.ws-interactive p{margin:10px 0;color:var(--ws-muted,#5f7270)}@media(max-width:600px){.ws-interactive{padding:20px}}`;

export const INTERACTIVE_MODULES:StudioModule[]=[
  {id:'workbench/tabs',version:'1.0.0',name:'标签切换',description:'交互组件 · 拖入后改文字，预览时切换内容',permissions:[],dependencies:{},
    html:'<section class="ws-interactive ws-tabs" data-ws-block="标签切换" data-mws-component="tabs" data-mws-default="0"><h2>让作品有更多层次</h2><div class="ws-tab-list" data-mws-tablist="" aria-label="作品内容"><button type="button" data-mws-tab="overview">作品概览</button><button type="button" data-mws-tab="process">创作过程</button><button type="button" data-mws-tab="result">最终成果</button></div><div class="ws-tab-panel" data-mws-panel="overview"><h3>从一个好奇的问题开始</h3><p>双击这段文字，介绍你的作品想解决什么问题。</p></div><div class="ws-tab-panel" data-mws-panel="process"><h3>记录每一次尝试</h3><p>写下草图、观察和那些改变方向的瞬间。</p></div><div class="ws-tab-panel" data-mws-panel="result"><h3>把想法变成看得见的成果</h3><p>介绍你完成了什么，以及接下来想继续探索的方向。</p></div></section>',
    css:shared+'\n.ws-tab-list{display:flex;gap:8px;flex-wrap:wrap;border-bottom:1px solid var(--ws-line,#cbd5d5);padding-bottom:12px}.ws-tab-list>button{border:1px solid transparent;border-radius:var(--ws-radius,12px);padding:11px 18px;background:transparent}.ws-tab-list>button:hover,.ws-tab-list>button[aria-selected="true"]{border-color:var(--ws-accent,#286c70);background:var(--ws-bg,#f3f1eb)}.ws-tab-panel{padding:22px 0 4px}.ws-tab-panel h3{font-size:21px;margin:0}'},
  {id:'workbench/accordion',version:'1.0.0',name:'折叠问答',description:'交互组件 · 拖入后编辑问答，预览时展开',permissions:[],dependencies:{},
    html:'<section class="ws-interactive ws-accordion" data-ws-block="折叠问答" data-mws-component="accordion" data-mws-default="0" data-mws-multiple="false"><h2>关于我的一些问题</h2><div class="ws-accordion-item"><h3><button type="button" data-mws-question="first">你喜欢创作什么？</button></h3><div data-mws-answer="first"><p>我喜欢观察日常，用图像与文字记录值得停留的瞬间。</p></div></div><div class="ws-accordion-item"><h3><button type="button" data-mws-question="second">这个作品是怎样完成的？</button></h3><div data-mws-answer="second"><p>从一个小问题开始，经过尝试、调整和持续打磨。</p></div></div><div class="ws-accordion-item"><h3><button type="button" data-mws-question="third">接下来想探索什么？</button></h3><div data-mws-answer="third"><p>继续走出去，寻找新的视角，也期待下一次合作。</p></div></div></section>',
    css:shared+'\n.ws-accordion-item{border-top:1px solid var(--ws-line,#cbd5d5)}.ws-accordion-item h3{margin:0}.ws-accordion-item button{display:flex;justify-content:space-between;align-items:center;gap:16px;text-align:left;width:100%;min-height:56px;padding:16px 0;background:transparent;border:0}.ws-accordion-item button::after{content:"+";flex-shrink:0;font-size:22px;color:var(--ws-accent,#286c70)}.ws-accordion-item button[aria-expanded="true"]::after{content:"−"}.ws-accordion-item [data-mws-answer]{padding:0 0 18px}'}
];
export const isInteractiveModule=(id:string)=>INTERACTIVE_MODULES.some(module=>module.id===id);

/** Bundled code only. Saved project scripts are never evaluated by this helper. */
export function ensureInteractionRuntime(project:Project):Project {
  let path=Object.keys(project.files).find(path=>path.endsWith('.js')&&project.files[path].kind==='text'&&project.files[path].content===runtime);
  if(!path){path='studio-interactions.js';let suffix=1;while(project.files[path])path=`studio-interactions-${suffix++}.js`;}
  let p={...project,files:{...project.files,[path]:{kind:'text' as const,content:runtime}}};
  const html=sourceText(p);let linked=false,at:number|undefined;
  walk(parseHtml(html),node=>{
    if(node.tagName==='body')at=node.sourceCodeLocation?.endTag?.startOffset;
    if(node.tagName==='script'&&resolvePath(p.entry,attr(node,'src')||'')===path)linked=true;
  });
  if(!linked){
    if(at===undefined)throw new Error('页面缺少明确的 body 闭合标签。');
    const href='../'.repeat(p.entry.split('/').length-1)+path;
    p={...p,files:{...p.files,[p.entry]:{kind:'text',content:patch(html,at,at,`<script src="${href}" defer></script>\n`)}}};
  }
  return normalizeProject(p);
}

export interface InteractionInfo {id:string;kind:'tabs'|'accordion';initial:number;multiple:boolean;options:{value:number;label:string}[];}
/** Select any descendant to configure its containing interactive component. */
export function interactionFor(project:Project,id:string):InteractionInfo|null {
  if(!id)return null;const nodes=elements(sourceText(project)),selected=nodes.find(node=>node.id===id);if(!selected)return null;
  const root=nodes.filter(node=>['tabs','accordion'].includes(attr(node.node,'data-mws-component')||'')&&node.loc.startOffset<=selected.loc.startOffset&&node.loc.endOffset>=selected.loc.endOffset).at(-1);
  if(!root)return null;
  const kind=attr(root.node,'data-mws-component') as InteractionInfo['kind'];
  const descendants=nodes.filter(node=>node.loc.startOffset>root.loc.startOffset&&node.loc.endOffset<root.loc.endOffset);
  // Match the runtime's ownership and one-to-one control/panel pairing. A panel
  // may have been deleted or moved in the editor; unmatched controls have no
  // runtime state and must not shift the saved default index.
  const nested=descendants.filter(node=>['tabs','accordion'].includes(attr(node.node,'data-mws-component')||''));
  const owned=descendants.filter(node=>!nested.some(parent=>node.loc.startOffset>=parent.loc.startOffset&&node.loc.endOffset<=parent.loc.endOffset));
  const key=kind==='tabs'?'data-mws-tab':'data-mws-question',panelKey=kind==='tabs'?'data-mws-panel':'data-mws-answer';
  const panels=owned.filter(node=>attr(node.node,panelKey)!==undefined),used=new Set<string>();
  const buttons=owned.filter(node=>node.tag==='button'&&attr(node.node,key)!==undefined).filter(button=>{
    const panel=panels.find(panel=>!used.has(panel.id)&&attr(panel.node,panelKey)===attr(button.node,key));
    if(!panel)return false;used.add(panel.id);return true;
  });
  const options=buttons.map((button,index)=>({value:index,label:button.node.childNodes?.map(n=>n.value||'').join('').trim()||`第 ${index+1} 项`}));
  const value=Number(attr(root.node,'data-mws-default')??0),initial=Number.isInteger(value)&&value>=(kind==='accordion'?-1:0)&&value<options.length?value:0;
  return {id:root.id,kind,initial,multiple:attr(root.node,'data-mws-multiple')==='true',options};
}
export function setInteractionDefault(project:Project,id:string,initial:number):Project {
  const info=interactionFor(project,id);if(!info||!Number.isInteger(initial)||initial<(info.kind==='accordion'?-1:0)||initial>=info.options.length)throw new Error('请选择组件内有效的默认内容。');
  return transaction(project,[{type:'attribute',id:info.id,name:'data-mws-default',value:String(initial)}]);
}
export function setAccordionMultiple(project:Project,id:string,multiple:boolean):Project {
  const info=interactionFor(project,id);if(info?.kind!=='accordion')throw new Error('请先选择折叠问答组件。');
  getElement(project,info.id);
  return transaction(project,[{type:'attribute',id:info.id,name:'data-mws-multiple',value:String(multiple)}]);
}
