import { parseHtml, attr, walk, sourceText } from '../core/source';
import { assetUrl, resolvePath, rewriteCssUrls } from '../core/io';
import type { HtmlNode, Project, WireNode } from '../core/types';
import bridge from './bridge.js?raw';
import design from './design.js?raw';
import moveable from 'moveable/dist/moveable.min.js?raw';
import selecto from 'selecto/dist/selecto.min.js?raw';
import motion from './motion.js?raw';

const blocked=new Set(['script','iframe','object','embed','base','meta','link','style','noscript','template']);
export function previewTree(project:Project):{body:WireNode;htmlAttrs:{lang?:string;dir?:string};css:string;warnings:string[]} {
  const root=parseHtml(sourceText(project));let body:HtmlNode|undefined;let css='';const warnings=new Set<string>();
  const htmlAttrs:{lang?:string;dir?:string}={};
  const seenCss=new Set<string>();
  const stylesheet=(path:string):string=>{
    if(seenCss.has(path))return '';seenCss.add(path);
    return rewriteCssUrls(project,path,sourceText(project,path).replace(/@import\s+(?:url\(\s*)?['"]([^'"]+)['"]\s*\)?\s*;/g,(_all,ref:string)=>{const target=resolvePath(path,ref);if(target&&project.files[target])return stylesheet(target);warnings.add('部分外部 CSS 或带条件的 @import 需要手动适配。');return ''; }));
  };
  walk(root,n=>{
    if(n.tagName==='html')for(const name of ['lang','dir'] as const){const value=attr(n,name);if(value!==undefined)htmlAttrs[name]=value;}
    if(n.tagName==='body')body=n;
    if(n.tagName==='style')css+='\n'+rewriteCssUrls(project,project.entry,n.childNodes?.map(c=>c.value||'').join('')||'');
    if(n.tagName==='link'&&attr(n,'rel')==='stylesheet'){
      const path=resolvePath(project.entry,attr(n,'href')||'');if(path&&project.files[path])css+='\n'+stylesheet(path);else warnings.add('外部样式表在编辑模式中禁用，请导入本地副本。');
    }
    if(n.tagName==='script')warnings.add('脚本在编辑模式停用；点击「预览」运行。动态 DOM 不支持可视化回写。');
    if(['iframe','object','embed','template'].includes(n.tagName||''))warnings.add('嵌入内容、模板和框架运行时仅支持源代码编辑。');
  });
  function convert(n:HtmlNode):WireNode|null {
    if(n.nodeName==='#text')return {kind:'text',text:n.value||''};
    if(n.nodeName==='#comment')return {kind:'comment',text:n.data||''};
    if(!n.tagName||blocked.has(n.tagName))return null;
    const attrs:Record<string,string>={};
    for(const a of n.attrs||[]){
      if(a.name==='data-aos'||/^on/i.test(a.name)||['srcdoc','sandbox','nonce','integrity','is','autofocus','contenteditable','srcset','action','formaction'].includes(a.name))continue;
      if(/^\s*(?:javascript|vbscript):/i.test(a.value))continue;
      const resource=['src','poster'].includes(a.name)||(['href','xlink:href'].includes(a.name)&&!['a','area'].includes(n.tagName));
      if(a.name==='class'&&attr(n,'data-mws-xyz')){attrs[a.name]=a.value.split(/\s+/).filter(c=>!['xyz-in','xyz-out'].includes(c)).join(' ');continue;}
      attrs[a.name]=resource?assetUrl(project,project.entry,a.value):a.value;
    }
    return {kind:'element',id:attr(n,'data-mws-id')||'',tag:n.tagName,attrs,children:(n.childNodes||[]).map(convert).filter((x):x is WireNode=>!!x)};
  }
  if(!body)throw new Error('页面没有 body。');return {body:convert(body)!,htmlAttrs,css,warnings:[...warnings]};
}
export function editorDocument(channel:string){
  const runtime=(moveable+';\n'+selecto+';\n'+motion+'\n'+bridge.replace('__CHANNEL__',JSON.stringify(channel))+'\n'+design.replace('__CHANNEL__',JSON.stringify(channel))).replace(/<\/script/gi,'<\\/script');
  return `<!doctype html><html><head><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'nonce-${channel}'; style-src 'unsafe-inline'; img-src data: blob: https:; font-src data:; media-src data:; connect-src 'none'; form-action 'none'; base-uri 'none'"><style id="mws-project-style"></style></head><body></body><script nonce="${channel}">${runtime}</script></html>`;
}
export function standalonePreview(project:Project){
  let html=sourceText(project);const root=parseHtml(html);const patches:{start:number;end:number;text:string}[]=[];
  walk(root,n=>{
    const loc=n.sourceCodeLocation;if(!loc)return;
    if(n.tagName==='link'&&attr(n,'rel')==='stylesheet'){
      const path=resolvePath(project.entry,attr(n,'href')||'');if(path&&project.files[path])patches.push({start:loc.startOffset,end:loc.endOffset,text:`<style>${rewriteCssUrls(project,path,sourceText(project,path)).replace(/<\/style/gi,'<\\/style')}</style>`});
    }else if(n.tagName==='script'&&attr(n,'src')){
      const path=resolvePath(project.entry,attr(n,'src')!);if(path&&project.files[path])patches.push({start:loc.startOffset,end:loc.endOffset,text:`<script${attr(n,'type')==='module'?' type="module"':''}>${sourceText(project,path).replace(/<\/script/gi,'<\\/script')}</script>`});
    }else for(const a of n.attrs||[]){if(['src','poster'].includes(a.name)&&loc.attrs?.[a.name]){const l=loc.attrs[a.name];patches.push({start:l.startOffset,end:l.endOffset,text:`${a.name}="${assetUrl(project,project.entry,a.value).replaceAll('"','&quot;')}"`});}}
  });
  patches.sort((a,b)=>b.start-a.start).forEach(p=>{html=html.slice(0,p.start)+p.text+html.slice(p.end);});
  // Opaque origin: no parent access, network, popups, forms, top navigation or storage.
  const navigation=`<script>document.addEventListener('click',function(e){var a=e.target.closest('a[href^="#"]');if(!a)return;var target;try{target=document.getElementById(decodeURIComponent(a.getAttribute('href').slice(1)));}catch{}if(target){e.preventDefault();target.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});}});</script>`;
  return html.replace(/<head([^>]*)>/i,`<head$1><meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline' data:; style-src 'unsafe-inline'; img-src data: blob: https:; font-src data:; media-src data:; connect-src 'none'; form-action 'none'; base-uri 'none'">`).replace(/<\/body\s*>/i,navigation+'</body>');
}
