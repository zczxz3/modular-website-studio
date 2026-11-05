import postcss from 'postcss';
import {removeXyz} from './xyz';
import type {EditCommand,Project} from './types';
import {attr,elements,getElement,normalizeProject,parseHtml,patch,sourceText,walk} from './source';
import {transaction} from './commands';
import {insertModule} from './modules';
import {bytesDataUrl,resolvePath} from './io';
import {COVERS,NOTICES,RESOURCES,THEME_FILE,themeCss} from './catalog';
import motion from '../preview/motion.js?raw';
import {randomId} from './id';
import {ensureInteractionRuntime,isInteractiveModule} from './interactions';
import {AOS_ATTRIBUTES} from './aos';
import {replaceCoverSource} from './covers';

const setFile=(p:Project,path:string,content:string):Project=>({...p,files:{...p.files,[path]:{kind:'text',content}}});
export const relativePath=(page:string,path:string)=>'../'.repeat(page.split('/').length-1)+path;
function reference(p:Project,page:string,path:string,type:'style'|'script'):Project {
  const html=sourceText(p,page);let at:number|undefined,found=false;
  walk(parseHtml(html),n=>{
    if(n.tagName===(type==='style'?'head':'body'))at=n.sourceCodeLocation?.endTag?.startOffset;
    if(type==='style'&&n.tagName==='link'&&(attr(n,'rel')||'').split(/\s+/).includes('stylesheet')&&resolvePath(page,attr(n,'href')||'')===path)found=true;
    if(type==='script'&&n.tagName==='script'&&resolvePath(page,attr(n,'src')||'')===path)found=true;
  });
  if(found)return p;if(at===undefined)throw new Error('页面缺少明确的 head 或 body 闭合标签。');
  const ref=relativePath(page,path),text=type==='style'?`<link rel="stylesheet" href="${ref}">\n`:`<script src="${ref}" defer></script>\n`;
  return setFile(p,page,patch(html,at,at,text));
}
export function applyTheme(project:Project,id:string){
  const generated=themeCss(id),existing=project.files[THEME_FILE];
  if(existing?.kind==='asset')throw new Error(`主题样式路径已被非文本资源占用：${THEME_FILE}`);
  let content=generated;
  if(existing?.content){
    // Change theme tokens only; ordinary page rules in this file stay intact.
    const root=postcss.parse(existing.content),next=postcss.parse(generated);
    const tokens=next.nodes.find(n=>n.type==='rule'&&n.selector===':root') as postcss.Rule;
    const names=new Set(tokens.nodes.filter(n=>n.type==='decl').map(n=>n.prop));
    root.walkRules(':root',rule=>{rule.walkDecls(d=>{if(names.has(d.prop))d.remove();});if(!rule.nodes.length)rule.remove();});
    root.walkComments(c=>{if(c.text.startsWith('Studio theme:'))c.remove();});
    root.append(next.first!.clone(),tokens.clone());content=root.toString();
  }
  let p=setFile(project,THEME_FILE,content);
  for(const page of Object.keys(p.files).filter(p=>/\.html?$/i.test(p)))p=reference(p,page,THEME_FILE,'style');
  return normalizeProject(p);
}
export function currentTheme(project:Project){let id='';postcss.parse(sourceText(project,THEME_FILE)).walkDecls('--ws-theme',d=>{id=d.value;});return id;}
export function insertionPoint(project:Project,selected:string){
  const nodes=elements(sourceText(project)),selectedNode=nodes.find(n=>n.id===selected);
  const block=selectedNode&&nodes.filter(n=>attr(n.node,'data-ws-block')&&n.loc.startOffset<=selectedNode.loc.startOffset&&n.loc.endOffset>=selectedNode.loc.endOffset).at(-1);
  if(block?.parentId){const siblings=nodes.filter(n=>n.parentId===block.parentId);return {parentId:block.parentId,beforeId:siblings[siblings.indexOf(block)+1]?.id};}
  const main=nodes.find(n=>n.tag==='main')||nodes.find(n=>n.tag==='body');if(!main)throw new Error('没有可插入的页面容器。');return {parentId:main.id,beforeId:undefined};
}
function coverPath(project:Project,cover:typeof COVERS[number]){
  // Reuse bundled copies without taking over a user's filename.
  const same=Object.keys(project.files).find(path=>path.endsWith('.svg')&&project.files[path].kind==='text'&&project.files[path].content===cover.source);
  if(same)return same;
  let path=cover.path,suffix=1;while(project.files[path])path=`assets/${cover.id}-studio-${suffix++}.svg`;return path;
}
function withResources(project:Project){
  const p={...project,files:{...project.files}},assets:Record<string,string>={};
  for(const cover of COVERS){const path=coverPath(p,cover);p.files[path]={kind:'text',content:cover.source};assets[cover.path]=path;}
  const notice=p.files['THIRD_PARTY_NOTICES.md'];
  if(!notice)p.files['THIRD_PARTY_NOTICES.md']={kind:'text',content:NOTICES};
  else if(notice.kind==='text'&&!notice.content.includes(NOTICES))p.files['THIRD_PARTY_NOTICES.md']={kind:'text',content:notice.content+'\n\n'+NOTICES};
  return {project:p,assets};
}
export function insertResource(project:Project,id:string,point:{parentId:string;beforeId?:string}){
  // Catalogue updates must not silently upgrade an existing project's instances.
  const module=project.modules.find(m=>m.id===id)||RESOURCES.find(m=>m.id===id);if(!module)throw new Error('资源不存在。');
  const resources=withResources(project);let p=resources.project;if(!p.files[THEME_FILE])p=applyTheme(p,'paper');
  // The manifest is canonical; only this insertion's HTML uses page-relative assets.
  p=insertModule(p,{...module,html:module.html.replace(/src="(assets\/[^"]+)"/g,(_all,path:string)=>`src="${relativePath(p.entry,resources.assets[path]||path)}"`)},point.parentId,point.beforeId);
  p={...p,modules:p.modules.map(m=>m.id===module.id?{...module}:m)};
  return isInteractiveModule(id)?ensureInteractionRuntime(p):p;
}
export function replaceCover(project:Project,id:string,coverId:string){
  const cover=COVERS.find(c=>c.id===coverId);if(!cover)throw new Error('素材不存在。');
  if(getElement(project,id).tag!=='img')throw new Error('请先选中图片。');
  // A project can contain modified built-in artwork; do not overwrite it on replacement.
  const path=coverPath(project,cover);let p=project;
  p=setFile(p,path,cover.source);return replaceCoverSource(p,id,path,cover.alt);
}
export function replaceUploadedImage(project:Project,id:string,bytes:Uint8Array,name:string){
  if(getElement(project,id).tag!=='img')throw new Error('请先选中图片。');
  const ext=name.split('.').pop()?.toLowerCase();if(!ext||!['png','jpg','jpeg','webp','gif','svg'].includes(ext))throw new Error('请选择 PNG、JPEG、WebP、GIF 或 SVG 图片。');
  if(!bytes.length||bytes.length>10*1024*1024)throw new Error('图片必须小于 10 MB 且不能为空。');
  const path=`assets/image-${randomId()}.${ext}`,p={...project,files:{...project.files,[path]:{kind:'asset' as const,content:bytesDataUrl(bytes,path)}}};
  // A previous illustration's description cannot describe an unknown upload.
  // Keep it empty until the author supplies the new image's alternative text.
  return replaceCoverSource(p,id,path,'');
}
export function linkToSection(project:Project,id:string,targetId:string){
  if(getElement(project,id).tag!=='a')throw new Error('请选择链接或链接按钮。');
  const target=getElement(project,targetId);let anchor=attr(target.node,'id');const commands:EditCommand[]=[];
  if(!anchor){anchor='section-'+target.id;commands.push({type:'attribute',id:target.id,name:'id',value:anchor});}
  commands.push({type:'attribute',id,name:'href',value:'#'+encodeURIComponent(anchor)});return transaction(project,commands);
}
export interface Reveal {trigger:'enter'|'load';duration:number;delay:number;distance:number;}
export const DEFAULT_REVEAL:Reveal={trigger:'enter',duration:650,delay:0,distance:24};
export function revealFor(project:Project,id:string):Reveal|null{
  const n=getElement(project,id).node,trigger=attr(n,'data-mws-reveal');if(trigger!=='enter'&&trigger!=='load')return null;
  const read=(key:string,fallback:number)=>{const value=Number(attr(n,key)??fallback);return Number.isFinite(value)?value:fallback;};
  return {trigger,duration:read('data-mws-duration',650),delay:read('data-mws-delay',0),distance:read('data-mws-distance',24)};
}
export function applyReveal(project:Project,id:string,config:Reveal|null){
  if(config)project=removeXyz(project,id);
  getElement(project,id);const keys=['data-mws-reveal','data-mws-duration','data-mws-delay','data-mws-distance'];
  if(!config)return transaction(project,keys.map(name=>({type:'remove-attribute' as const,id,name})));
  if(!['enter','load'].includes(config.trigger)||!Number.isFinite(config.duration)||config.duration<100||config.duration>3000||!Number.isFinite(config.delay)||config.delay<0||config.delay>3000||!Number.isFinite(config.distance)||config.distance<0||config.distance>100)throw new Error('动效参数超出范围。');
  // Always generate from trusted bundled code; a saved JS file is never evaluated by the editor.
  let path=Object.keys(project.files).find(path=>/\.js$/.test(path)&&project.files[path].content===motion)||'studio-motion.js';
  if(project.files[path]&&project.files[path].content!==motion){let suffix=1;while(project.files[`studio-motion-${suffix}.js`])suffix++;path=`studio-motion-${suffix}.js`;}
  let p=setFile(project,path,motion);p=reference(p,p.entry,path,'script');
  return transaction(p,[...AOS_ATTRIBUTES.map(name=>({type:'remove-attribute' as const,id,name})),...keys.map((name,index)=>({type:'attribute' as const,id,name,value:String([config.trigger,config.duration,config.delay,config.distance][index])}))]);
}
