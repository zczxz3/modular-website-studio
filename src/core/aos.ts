import {removeXyz} from './xyz';
import type {HtmlNode,Project} from './types';
import {attr,elements,getElement,parseHtml,patch,sourceText,walk} from './source';
import {transaction} from './commands';
import {resolvePath} from './io';
import javascript from '../vendor/aos/aos.js?raw';
import stylesheet from '../vendor/aos/aos.css?raw';
import license from '../vendor/aos/LICENSE.txt?raw';

export const AOS_VERSION='2.3.4';
export const AOS_EFFECTS=[{value:'fade',label:'淡入'},{value:'fade-up',label:'淡入上移'},{value:'fade-down',label:'淡入下移'},{value:'zoom-in',label:'缩放进入'}] as const;
export interface AosConfig {effect:string;duration:number;delay:number;offset:number;once:boolean;}
export const AOS_ATTRIBUTES=['data-aos','data-aos-duration','data-aos-delay','data-aos-offset','data-aos-once'] as const;
// Attribute contract follows VvvebJs plugin-aos and AOS's documented options.
// The existing source-command layer remains responsible for all persistent edits.
export const DEFAULT_AOS:AosConfig={effect:'fade-up',duration:650,delay:0,offset:0,once:true};
const initializer=`/* Modular Website Studio adapter for upstream AOS 2.3.4 (MIT). */
(()=>{if(window.__mwsAosStarted||!window.AOS)return;window.__mwsAosStarted=true;
window.AOS.init({duration:650,offset:0,once:true,disableMutationObserver:true,
disable:()=>typeof matchMedia==='function'&&matchMedia('(prefers-reduced-motion: reduce)').matches});
addEventListener('pageshow',event=>{if(event.persisted)window.AOS.refreshHard();});})();`;

function embedded(node:HtmlNode,html:string,content:string,script:boolean){
  if(node.tagName===(script?'script':'style')){
    const src=script?attr(node,'src'):undefined;
    if(src?.startsWith('data:'))try{
      const comma=src.indexOf(','),header=src.slice(0,comma),payload=src.slice(comma+1);
      const text=/;base64$/i.test(header)?new TextDecoder().decode(Uint8Array.from(atob(payload),c=>c.charCodeAt(0))):decodeURIComponent(payload);
      return text===content;
    }catch{return false;}
    const location=node.sourceCodeLocation;
    if(!src&&location?.startTag&&location.endTag)return html.slice(location.startTag.endOffset,location.endTag.startOffset)===content;
  }
  return false;
}

export function aosFor(project:Project,id:string):AosConfig|null {
  const node=getElement(project,id).node,effect=attr(node,'data-aos');if(!effect)return null;
  const number=(name:string,fallback:number)=>{const value=Number(attr(node,name)??fallback);return Number.isFinite(value)?value:fallback;};
  return {effect,duration:number('data-aos-duration',400),delay:number('data-aos-delay',0),offset:number('data-aos-offset',120),once:attr(node,'data-aos-once')==='true'};
}
function asset(p:Project,suggested:string,content:string):{project:Project;path:string}{
  const extension=suggested.split('.').pop()!;
  let path=Object.keys(p.files).find(path=>path.endsWith('.'+extension)&&p.files[path].kind==='text'&&p.files[path].content===content);
  if(!path){path=suggested;let suffix=1;while(p.files[path])path=suggested.replace(/\.[^.]+$/,`-${suffix++}.${extension}`);}
  return {project:{...p,files:{...p.files,[path]:{kind:'text',content}}},path};
}
function reference(project:Project,path:string,script:boolean,content:string):Project {
  const html=sourceText(project);let found=false,end:number|undefined;
  walk(parseHtml(html),node=>{
    if(node.tagName===(script?'body':'head'))end=node.sourceCodeLocation?.endTag?.startOffset;
    if(embedded(node,html,content,script))found=true;
    if(node.tagName===(script?'script':'link')&&(script||(attr(node,'rel')||'').toLowerCase().split(/\s+/).includes('stylesheet'))&&resolvePath(project.entry,attr(node,script?'src':'href')||'')===path)found=true;
  });
  if(found)return project;if(end===undefined)throw new Error('页面缺少明确的 head 或 body 闭合标签。');
  const url='../'.repeat(project.entry.split('/').length-1)+path;
  const text=script?`<script src="${url}" defer></script>\n`:`<link rel="stylesheet" href="${url}">\n`;
  return {...project,files:{...project.files,[project.entry]:{kind:'text',content:patch(html,end,end,text)}}};
}
export function applyAos(project:Project,id:string,config:AosConfig|null):Project {
  const node=getElement(project,id);if(['html','head','body','script','style','link'].includes(node.tag))throw new Error('请选择标题、封面或内容区块。');
  if(!config)return transaction(project,AOS_ATTRIBUTES.map(name=>({type:'remove-attribute',id,name})));
  if(!AOS_EFFECTS.some(effect=>effect.value===config.effect)||typeof config.once!=='boolean'||
    !Number.isInteger(config.duration)||config.duration<50||config.duration>3000||config.duration%50!==0||
    !Number.isInteger(config.delay)||config.delay<0||config.delay>3000||config.delay%50!==0||
    !Number.isInteger(config.offset)||config.offset<0||config.offset>1000)throw new Error('AOS 时长/延迟须为 50ms 的倍数，范围 0–3000ms（时长至少 50ms）；触发距离须为 0–1000px。');
  let p=removeXyz(project,id);
  for(const [name,content,script] of [['aos.css',stylesheet,false],['aos.js',javascript,true],['studio-init.js',initializer,true]] as const){
    const saved=asset(p,'vendor/aos-2.3.4/'+name,content);p=reference(saved.project,saved.path,script,content);
  }
  p=asset(p,'vendor/aos-2.3.4/LICENSE.txt',license).project;
  // Keep the MIT notice inside the HTML too: single-file export has no license file.
  const html=sourceText(p);
  if(!html.includes(license)){
    let at:number|undefined;walk(parseHtml(html),node=>{if(node.tagName==='head')at=node.sourceCodeLocation?.endTag?.startOffset;});
    if(at===undefined)throw new Error('页面缺少 head 闭合标签。');
    p={...p,files:{...p.files,[p.entry]:{kind:'text',content:patch(html,at,at,`<!-- AOS 2.3.4 license\n${license} -->\n`)}}};
  }
  const notices=p.files['THIRD_PARTY_NOTICES.md'],notice=`AOS 2.3.4 by Michał Sajnóg (MIT), https://github.com/michalsnik/aos/tree/1c7043c10a777d0ddcd2abfd08187619ac555353\n\n${license}`;
  if(!notices||notices.kind==='text'&&!notices.content.includes(notice))p={...p,files:{...p.files,'THIRD_PARTY_NOTICES.md':{kind:'text',content:(notices?.content||'')+'\n\n'+notice}}};
  const values=[config.effect,config.duration,config.delay,config.offset,config.once];
  return transaction(p,[...['data-mws-reveal','data-mws-duration','data-mws-delay','data-mws-distance'].map(name=>({type:'remove-attribute' as const,id,name})),...AOS_ATTRIBUTES.map((name,i)=>({type:'attribute' as const,id,name,value:String(values[i])}))]);
}
export function animatedElements(project:Project){
  return elements(sourceText(project)).filter(node=>attr(node.node,'data-aos')||attr(node.node,'data-mws-reveal')||attr(node.node,'data-mws-css-effect')||attr(node.node,'data-mws-xyz'));
}
/** Human-readable source/dependency evidence, also useful when exporting/reopening. */
export function aosDependencies(project:Project){
  const html=sourceText(project),files=new Set<string>();walk(parseHtml(html),node=>{
    for(const [content,label,script] of [[stylesheet,'内嵌 AOS CSS',false],[javascript,'内嵌 AOS JavaScript',true],[initializer,'内嵌初始化脚本',true]] as const)if(embedded(node,html,content,script))files.add(label);
    const reference=attr(node,node.tagName==='script'?'src':'href');if(!reference)return;
    const path=resolvePath(project.entry,reference);if(path&&project.files[path]?.kind==='text'&&[javascript,stylesheet,initializer].includes(project.files[path].content))files.add(path);
  });return [...files];
}
