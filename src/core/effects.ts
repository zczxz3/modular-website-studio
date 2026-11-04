import type {Project} from './types';
import {attr,getElement,parseHtml,patch,sourceText,walk} from './source';
import {transaction} from './commands';
import {resolvePath} from './io';

export type CssEffectId='hover-zoom'|'text-outline'|'outline-hover'|'frosted';
export interface CssEffect {id:CssEffectId;name:string;description:string;}
const blocks=new Set(['article','section','div','figure','aside','header','footer','main','nav','blockquote']);
const titles=new Set(['h1','h2','h3','h4','h5','h6']);
const EFFECTS:CssEffect[]=[
  {id:'hover-zoom',name:'悬停缩放',description:'鼠标经过时轻轻放大，保留你拖动的位置。'},
  {id:'text-outline',name:'标题描边',description:'用主题强调色勾出文字轮廓。'},
  {id:'outline-hover',name:'悬停描边',description:'鼠标经过或键盘聚焦时显示强调边框。'},
  {id:'frosted',name:'磨砂表面',description:'让区块呈现半透明的柔和背景。'}
];
export const EFFECT_ATTRIBUTE='data-mws-css-effect';
// These effects deliberately leave translate and transform to layout and motion.
// The individual scale property composes with the editor's saved CSS translation.
export const EFFECT_CSS=`/* Studio CSS effects v1 — standalone, no script or network dependency. */
[data-mws-css-effect="hover-zoom"] { transition:scale 220ms ease; }
@media (prefers-reduced-motion:no-preference) {
  [data-mws-css-effect="hover-zoom"]:is(:hover,:focus-visible,:focus-within) { scale:1.035; }
}
[data-mws-css-effect="text-outline"] { -webkit-text-stroke:1px var(--ws-accent,currentColor); }
[data-mws-css-effect="outline-hover"] { transition:box-shadow 180ms ease; }
[data-mws-css-effect="outline-hover"]:is(:hover,:focus-visible) { box-shadow:0 0 0 3px var(--ws-accent,#286c70); }
[data-mws-css-effect="frosted"] { background-color:color-mix(in srgb,var(--ws-surface,#fff) 78%,transparent); -webkit-backdrop-filter:blur(12px); backdrop-filter:blur(12px); box-shadow:inset 0 0 0 1px color-mix(in srgb,var(--ws-ink,#233e3d) 14%,transparent); }
@media (prefers-reduced-motion:reduce) {
  [data-mws-css-effect="hover-zoom"], [data-mws-css-effect="outline-hover"] { transition:none; }
}
`;

export function applicableEffects(project:Project,id:string):CssEffect[]{
  const {tag}=getElement(project,id);
  return EFFECTS.filter(effect=>effect.id==='hover-zoom'?tag==='img'||blocks.has(tag):effect.id==='text-outline'?titles.has(tag):effect.id==='outline-hover'?tag==='a'||tag==='button':blocks.has(tag));
}
export function cssEffectFor(project:Project,id:string):CssEffectId|null {
  const value=attr(getElement(project,id).node,EFFECT_ATTRIBUTE);
  return EFFECTS.some(effect=>effect.id===value)?value as CssEffectId:null;
}
function withEffectStyles(project:Project):Project {
  let path=Object.keys(project.files).find(path=>path.endsWith('.css')&&project.files[path].kind==='text'&&project.files[path].content===EFFECT_CSS);
  if(!path){path='studio-effects.css';let suffix=1;while(project.files[path])path=`studio-effects-${suffix++}.css`;}
  const p={...project,files:{...project.files,[path]:{kind:'text' as const,content:EFFECT_CSS}}};
  const html=sourceText(p);let end:number|undefined,linked=false;
  walk(parseHtml(html),node=>{
    if(node.tagName==='head')end=node.sourceCodeLocation?.endTag?.startOffset;
    if(node.tagName==='link'&&(attr(node,'rel')||'').toLowerCase().split(/\s+/).includes('stylesheet')&&resolvePath(p.entry,attr(node,'href')||'')===path)linked=true;
  });
  if(linked)return p;
  if(end===undefined)throw new Error('页面缺少明确的 head 闭合标签。');
  const href='../'.repeat(p.entry.split('/').length-1)+path;
  return {...p,files:{...p.files,[p.entry]:{kind:'text',content:patch(html,end,end,`<link rel="stylesheet" href="${href}">\n`)}}};
}
/** Only the built-in effect catalogue is accepted; no project JS is evaluated. */
export function applyCssEffect(project:Project,id:string,effect:CssEffectId|null):Project {
  getElement(project,id);
  if(effect===null)return transaction(project,[{type:'remove-attribute',id,name:EFFECT_ATTRIBUTE}]);
  if(!applicableEffects(project,id).some(option=>option.id===effect))throw new Error('这个效果不适用于当前元素。');
  return transaction(withEffectStyles(project),[{type:'attribute',id,name:EFFECT_ATTRIBUTE,value:effect}]);
}
