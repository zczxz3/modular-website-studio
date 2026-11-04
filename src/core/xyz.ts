import type {Project} from './types';
import {attr,getElement,sourceText,parseHtml,walk,patch} from './source';
import {transaction} from './commands';
import originalCss from '../vendor/animxyz/animxyz.css?raw';
const css=originalCss+'\n@media(prefers-reduced-motion:reduce){[data-mws-xyz]{animation:none!important;opacity:1!important;transform:none!important}}';
import license from '../vendor/animxyz/LICENSE.txt?raw';
export const XYZ_PRESETS=[{id:'fade up small',name:'淡入＋上移＋缩放'},{id:'fade down',name:'淡入＋下移'},{id:'fade rotate-left small',name:'淡入＋旋转＋缩放'}];
export function removeXyz(p:Project,id:string){const n=getElement(p,id);if(!attr(n.node,'data-mws-xyz'))return p;return transaction(p,[...['xyz','data-mws-xyz'].map(name=>({type:'remove-attribute' as const,id,name})),{type:'attribute',id,name:'class',value:(attr(n.node,'class')||'').split(/\s+/).filter(c=>!['xyz-in','xyz-out'].includes(c)).join(' ')},...['--xyz-duration','--xyz-delay'].map(property=>({type:'style' as const,id,property,value:''}))]);}
export function applyXyz(p:Project,id:string,preset:string,duration=650,delay=0){
 if(!preset)return removeXyz(p,id);if(!XYZ_PRESETS.some(x=>x.id===preset)||!Number.isInteger(duration)||duration<100||duration>3000||!Number.isInteger(delay)||delay<0||delay>3000)throw new Error('组合动效参数无效。');
 const node=getElement(p,id);if(['html','head','body','script','style','link'].includes(node.tag))throw new Error('请选择内容元素。');
 const files={...p.files};let path=Object.keys(files).find(path=>files[path].content===css)||'vendor/animxyz-0.6.7.css';let i=1;while(files[path]&&files[path].content!==css)path=`vendor/animxyz-0.6.7-${i++}.css`;files[path]={kind:'text',content:css};
 const html=sourceText(p);let at:number|undefined;walk(parseHtml(html),n=>{if(n.tagName==='head')at=n.sourceCodeLocation?.endTag?.startOffset;});if(at===undefined)throw new Error('页面缺少head闭合标签。');
 const href='../'.repeat(p.entry.split('/').length-1)+path;const extra=(html.includes('href="'+href+'"')?'':`<link rel="stylesheet" href="${href}">\n`)+(html.includes(license)?'':`<!-- AnimXYZ 0.6.7 MIT\n${license} -->\n`);
 files[p.entry]={kind:'text',content:patch(html,at,at,extra)};let noticePath=Object.keys(files).find(path=>files[path].content===license)||'vendor/animxyz-LICENSE.txt',suffix=1;while(files[noticePath]&&files[noticePath].content!==license)noticePath=`vendor/animxyz-LICENSE-${suffix++}.txt`;files[noticePath]={kind:'text',content:license};
 const cls=(attr(node.node,'class')||'').split(/\s+/).filter(c=>c&&!['xyz-in','xyz-out'].includes(c)).concat('xyz-in').join(' ');
 return transaction({...p,files},[...['data-aos','data-aos-duration','data-aos-delay','data-aos-offset','data-aos-once','data-mws-reveal','data-mws-duration','data-mws-delay','data-mws-distance'].map(name=>({type:'remove-attribute' as const,id,name})),{type:'attribute',id,name:'xyz',value:preset},{type:'attribute',id,name:'data-mws-xyz',value:preset},{type:'attribute',id,name:'class',value:cls},{type:'style',id,property:'--xyz-duration',value:duration+'ms'},{type:'style',id,property:'--xyz-delay',value:delay+'ms'}]);
}
