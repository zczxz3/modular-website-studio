import postcss from 'postcss';
import {parse as parseJS} from 'acorn';
import {parseFragment} from 'parse5';
import {escapeAttr,parseHtml,sourceText} from './source';
import type {HtmlNode,Project} from './types';

export class SingleHtmlExportError extends Error {
  readonly issues:string[];
  constructor(issues:Iterable<string>){
    const unique=[...new Set(issues)];
    super('当前页无法完整保存为单个 HTML：\n'+unique.map(s=>'• '+s).join('\n')+'\n请使用“导出网站 ZIP”保留完整项目。');
    this.name='SingleHtmlExportError';this.issues=unique;
  }
}
const ORIGIN='https://mws-export.invalid';
type QualifiedAttribute={name:string;value:string;prefix?:string};
const qualifiedName=(attribute:QualifiedAttribute)=>attribute.prefix?`${attribute.prefix}:${attribute.name}`:attribute.name;
// parse5 stores xlink:href as {name: 'href', prefix: 'xlink'}, while its
// source-location key retains the qualified name. Keep those identities aligned.
const attr=(node:HtmlNode,name:string)=>(node.attrs as QualifiedAttribute[]|undefined)?.find(attribute=>qualifiedName(attribute)===name)?.value;
const SVG_URL_ATTRIBUTES=new Set(['fill','stroke','filter','clip-path','mask','marker','marker-start','marker-mid','marker-end','cursor','color-profile']);
const svgUrlAttributes=(node:HtmlNode)=>(node as HtmlNode&{namespaceURI?:string}).namespaceURI==='http://www.w3.org/2000/svg'?(node.attrs||[]).filter(attribute=>SVG_URL_ATTRIBUTES.has(attribute.name)):[];
const MIME:Record<string,string>={css:'text/css',js:'text/javascript',mjs:'text/javascript',svg:'image/svg+xml',png:'image/png',jpg:'image/jpeg',jpeg:'image/jpeg',webp:'image/webp',avif:'image/avif',gif:'image/gif',ico:'image/x-icon',woff:'font/woff',woff2:'font/woff2',ttf:'font/ttf',otf:'font/otf',mp4:'video/mp4',webm:'video/webm',mp3:'audio/mpeg',wav:'audio/wav',ogg:'audio/ogg',vtt:'text/vtt',pdf:'application/pdf',txt:'text/plain',json:'application/json'};
function dataUrl(text:string,mime:string){
  const bytes=new TextEncoder().encode(text);let binary='';for(let i=0;i<bytes.length;i+=16384)binary+=String.fromCharCode(...bytes.subarray(i,i+16384));
  return `data:${mime};charset=utf-8;base64,${btoa(binary)}`;
}
function dataText(uri:string){
  const comma=uri.indexOf(','),header=uri.slice(5,comma),payload=uri.slice(comma+1).split('#')[0];
  if(comma<0)throw new Error('Invalid data URL');
  const mime=header.split(';')[0].toLowerCase();
  const charset=header.match(/;charset=([^;]+)/i)?.[1]||'utf-8';
  const text=/;base64(?:;|$)/i.test(header)?new TextDecoder(charset,{fatal:true}).decode(Uint8Array.from(atob(payload),c=>c.charCodeAt(0))):decodeURIComponent(payload);
  return {mime,text};
}
const cssUnescape=(value:string)=>value.replace(/\\(?:([0-9a-f]{1,6})\s?|\r?\n|(.))/gi,(_all,hex:string,char:string)=>hex?String.fromCodePoint(parseInt(hex,16)||0xfffd):char||'');
/** CSS token scan: comments and quoted content are not URL functions. */
function rewriteUrls(value:string,rewrite:(ref:string)=>string,fail:(message:string)=>void){
  let out='',i=0;
  while(i<value.length){
    if(value.startsWith('/*',i)){const end=value.indexOf('*/',i+2);if(end<0)return out+value.slice(i);out+=value.slice(i,end+2);i=end+2;continue;}
    if(value[i]==='"'||value[i]==="'"){const start=i,quote=value[i++];while(i<value.length){if(value[i]==='\\'){i+=2;continue;}if(value[i++]===quote)break;}out+=value.slice(start,i);continue;}
    if((i===0||!/[\w-]/.test(value[i-1]))&&/^url\(/i.test(value.slice(i))){
      const start=i;i+=4;while(/\s/.test(value[i]||'')&&i<value.length)i++;
      let raw='',quote='';if(value[i]==='"'||value[i]==="'")quote=value[i++];
      let closed=false;
      while(i<value.length){const c=value[i++];if(c==='\\'){raw+=c+(value[i++]||'');continue;}if(quote?c===quote:c===')'){closed=true;break;}raw+=c;}
      if(quote){while(/\s/.test(value[i]||'')&&i<value.length)i++;if(value[i++]!==')')closed=false;}
      if(!closed||(!quote&&/[()"']/.test(raw))){fail(`无法内嵌 CSS URL：${value.slice(start,i)}`);out+=value.slice(start,i);continue;}
      const ref=cssUnescape(raw.trim()),next=rewrite(ref);out+=`url("${next.replaceAll('\\','\\\\').replaceAll('"','\\"').replaceAll('\n','\\a ')}")`;continue;
    }
    if((i===0||!/[\w-]/.test(value[i-1]))&&/^(?:-webkit-)?image-set\(/i.test(value.slice(i)))fail('CSS image-set() 暂不支持单文件内嵌');
    if(value[i]==='\\')fail('CSS 转义函数或标识符暂不支持单文件内嵌');
    out+=value[i++];
  }
  return out;
}
function visit(node:HtmlNode,fn:(node:HtmlNode)=>void){fn(node);node.childNodes?.forEach(n=>visit(n,fn));const content=(node as HtmlNode&{content?:HtmlNode}).content;if(content)visit(content,fn);}

/** Export only the active page; source project and stable identities stay intact. */
export function exportSingleHtml(project:Project):string {
  const issues=new Set<string>(),embedding=new Set<string>(),cssStack=new Set<string>();
  const fail=(from:string,message:string)=>{issues.add(`${from}：${message}`);};
  const resolve=(from:string,ref:string):{path:string;hash:string;search:string}|null=>{
    try{
      const url=new URL(ref,ORIGIN+'/'+from);if(url.origin!==ORIGIN){fail(from,`外部或临时资源 ${ref}`);return null;}
      let path=decodeURIComponent(url.pathname.slice(1));if(!path||path.endsWith('/'))path+='index.html';
      if(!Object.hasOwn(project.files,path)){fail(from,`缺少资源 ${ref}（${path}）`);return null;}
      return {path,hash:url.hash,search:url.search};
    }catch{fail(from,`无效资源地址 ${ref}`);return null;}
  };
  const scriptCheck=(code:string,path:string)=>{
    try{
      const root=parseJS(code,{ecmaVersion:'latest',sourceType:'script'});
      type JsNode=Record<string,unknown>;
      const globalObject=(node:JsNode|undefined)=>node?.type==='Identifier'&&['window','globalThis','self'].includes(String(node.name));
      const propertyName=(node:JsNode)=>{
        const property=node.property as JsNode|undefined;
        return !node.computed&&property?.type==='Identifier'?String(property.name):node.computed&&property?.type==='Literal'&&typeof property.value==='string'?property.value:undefined;
      };
      const globalName=(node:JsNode|undefined)=>node?.type==='Identifier'?String(node.name):node?.type==='MemberExpression'&&globalObject(node.object as JsNode)?propertyName(node):undefined;
      const scan=(node:unknown)=>{
        if(!node||typeof node!=='object')return;
        const n=node as Record<string,unknown>;
        if(n.type==='ImportExpression')fail(path,'动态 import() 依赖需要网站 ZIP');
        if(n.type==='MemberExpression'){
          if(globalName(n.object as JsNode)==='document'&&propertyName(n)==='currentScript')fail(path,'document.currentScript 依赖原脚本地址');
        }
        if(n.type==='NewExpression'){
          const name=globalName(n.callee as JsNode);
          if(name&&['Worker','SharedWorker','XMLHttpRequest','WebSocket','EventSource'].includes(name))fail(path,`${name} 依赖额外运行资源`);
        }
        if(n.type==='CallExpression'){
          const name=globalName(n.callee as JsNode);
          if(name&&['fetch','importScripts'].includes(name))fail(path,`${name}() 依赖运行时资源`);
        }
        for(const value of Object.values(n))if(Array.isArray(value))value.forEach(scan);else if(value&&typeof value==='object')scan(value);
      };scan(root);
    }catch{fail(path,'不是可内嵌的普通 JavaScript（模块/import/export 请使用 ZIP）');}
  };
  const embed=(from:string,reference:string):string=>{
    const ref=reference.trim();if(!ref||ref.startsWith('#'))return reference;
    if(/^data:/i.test(ref)){if(/^data:image\/svg\+xml[;,]/i.test(ref))checkDataSvg(ref,from);return reference;}
    const target=resolve(from,ref);if(!target)return reference;
    const file=project.files[target.path];
    if(file.kind==='asset'){
      if(/^data:image\/svg\+xml[;,]/i.test(file.content))checkDataSvg(file.content,target.path);
      return file.content+target.hash;
    }
    if(embedding.has(target.path)){fail(from,`资源循环引用 ${target.path}`);return reference;}
    embedding.add(target.path);
    const ext=target.path.split('.').pop()?.toLowerCase()||'';
    let content=file.content;
    if(ext==='svg')content=markup(content,target.path,true);
    const result=dataUrl(content,MIME[ext]||'application/octet-stream')+target.hash;embedding.delete(target.path);return result;
  };
  const css=(input:string,from:string):string=>{
    try{
      const root=postcss.parse(input,{from});
      root.walkAtRules(rule=>{
        if(rule.name.includes('\\')){fail(from,`CSS 转义规则 @${rule.name} 暂不支持内嵌`);return;}
        if(rule.name.toLowerCase()==='charset'){rule.remove();return;}
        if(rule.name.toLowerCase()!=='import')return;
        let reference:string|undefined;
        const params=rule.params.trim(),quoted=params.match(/^(["'])([\s\S]*)\1$/);
        if(quoted&&!new RegExp(`(?<!\\\\)${quoted[1]}`).test(quoted[2]))reference=cssUnescape(quoted[2]);
        else if(/^url\(/i.test(params)){
          let calls=0;const rewritten=rewriteUrls(params,ref=>{calls++;reference=ref;return '__import__';},msg=>fail(from,msg));
          if(calls!==1||rewritten!=='url("__import__")')reference=undefined;
        }
        if(reference===undefined){fail(from,`带条件或无法解析的 @import ${rule.params}`);return;}
        if(/^data:/i.test(reference)){fail(from,`@import 数据 URL 暂不支持：${reference.slice(0,80)}`);return;}
        const target=resolve(from,reference);if(!target)return;
        if(cssStack.has(target.path)){fail(from,`CSS 循环引用 ${target.path}`);return;}
        const file=project.files[target.path];if(file.kind!=='text'){fail(from,`样式文件不是文本：${target.path}`);return;}
        cssStack.add(target.path);const nested=css(file.content,target.path);cssStack.delete(target.path);
        rule.replaceWith(...postcss.parse(nested).nodes);
      });
      root.walkDecls(decl=>{decl.value=rewriteUrls(decl.value,ref=>embed(from,ref),msg=>fail(from,msg));});
      return root.toString();
    }catch{fail(from,'CSS 无法解析');return input;}
  };
  function checkSvgUse(node:HtmlNode,from:string){
    for(const name of ['href','xlink:href']){
      const ref=attr(node,name)?.trim();
      // Modern browsers reject data-URL <use> targets. Packaging an external
      // sprite as data would silently lose the icon, so only local fragments pass.
      if(ref&&!ref.startsWith('#'))fail(from,`SVG <use> 只支持同一文档的 #片段引用：${ref}`);
    }
  }
  function checkDataSvg(uri:string,from:string){
    try{
      const check=(ref:string)=>{
        if(!ref.trim()||ref.trim().startsWith('#'))return ref;
        if(/^data:image\/svg\+xml[;,]/i.test(ref))checkDataSvg(ref,from);
        else if(!/^data:/i.test(ref))fail(from,`内嵌 SVG 仍引用资源 ${ref}`);
        return ref;
      };
      const checkCss=(value:string)=>{
        const root=postcss.parse(value);
        root.walkAtRules(rule=>{if(rule.name.toLowerCase()==='import'||rule.name.includes('\\'))fail(from,`内嵌 SVG 样式依赖 @${rule.name} ${rule.params}`);});
        root.walkDecls(decl=>{rewriteUrls(decl.value,check,msg=>fail(from,msg));});
      };
      visit(parseFragment(dataText(uri).text,{sourceCodeLocationInfo:true}) as unknown as HtmlNode,node=>{
        if(attr(node,'xml:base')!==undefined)fail(from,'内嵌 SVG 使用 xml:base');
        for(const name of ['src','poster','background']){const ref=attr(node,name);if(ref)check(ref);}
        if(node.tagName==='use')checkSvgUse(node,from);
        else if(['image','feImage','script'].includes(node.tagName||''))for(const name of ['href','xlink:href']){const ref=attr(node,name);if(ref)check(ref);}
        if(node.tagName==='style')checkCss(node.childNodes?.map(n=>n.value||'').join('')||'');
        if(attr(node,'style'))checkCss(`x{${attr(node,'style')}}`);
        for(const attribute of svgUrlAttributes(node))rewriteUrls(attribute.value,check,msg=>fail(from,msg));
      });
    }catch{fail(from,'无法验证内嵌 SVG 资源');}
  }
  function markup(source:string,from:string,svg=false):string {
    const root=svg?parseFragment(source,{sourceCodeLocationInfo:true}) as unknown as HtmlNode:parseHtml(source);
    const changes:{start:number;end:number;text:string}[]=[];
    let charset=false,headEnd:number|undefined;
    const attribute=(node:HtmlNode,name:string,value:string)=>{const loc=node.sourceCodeLocation?.attrs?.[name];if(loc)changes.push({start:loc.startOffset,end:loc.endOffset,text:`${name}="${escapeAttr(value)}"`});};
    visit(root,node=>{
      const loc=node.sourceCodeLocation,tag=node.tagName;if(!loc||!tag)return;
      if(!svg&&tag==='head')headEnd=loc.startTag?.endOffset;
      if(!svg&&tag==='meta'){
        if(attr(node,'charset')!==undefined){charset=true;attribute(node,'charset','utf-8');}
        if((attr(node,'http-equiv')||'').toLowerCase()==='content-type'&&attr(node,'content'))attribute(node,'content','text/html; charset=utf-8');
      }
      if(attr(node,'xml:base')!==undefined)fail(from,'xml:base 会改变资源解析路径');
      if(tag==='base'&&attr(node,'href')!==undefined)fail(from,'base href 会改变资源解析路径');
      if(tag==='meta'&&/^(content-security-policy|content-security-policy-report-only|refresh)$/i.test(attr(node,'http-equiv')||''))fail(from,`不支持内嵌页面指令 ${attr(node,'http-equiv')}`);
      if(['iframe','object','embed'].includes(tag))fail(from,`嵌入内容 <${tag}> ${attr(node,'src')||attr(node,'data')||'srcdoc'}`);
      for(const name of ['srcset','imagesrcset'])if(attr(node,name))fail(from,`响应式资源 ${name}="${attr(node,name)}" 暂不支持内嵌`);
      if(tag==='script'){
        if(attr(node,'href')||attr(node,'xlink:href')){fail(from,`SVG 脚本引用 ${attr(node,'href')||attr(node,'xlink:href')} 暂不支持内嵌`);return;}
        const type=(attr(node,'type')||'').trim().toLowerCase();
        if(type==='module'||type==='importmap'){fail(from,`脚本 ${attr(node,'src')||'<inline>'} 使用 ${type}`);return;}
        if(type&&!['text/javascript','application/javascript','application/ecmascript','text/ecmascript'].includes(type))return;
        const src=attr(node,'src');
        if(src){
          if(/^data:/i.test(src)){
            try{
              const decoded=dataText(src);
              if(!['text/javascript','application/javascript','application/ecmascript','text/ecmascript'].includes(decoded.mime))throw new Error('Unsupported data script type');
              scriptCheck(decoded.text,from+' data: script');
            }catch{fail(from,'无法读取已有 data: JavaScript 脚本');}
            return;
          }
          const target=resolve(from,src);if(!target)return;const file=project.files[target.path];
          if(file.kind!=='text'){fail(from,`脚本不是文本：${target.path}`);return;}
          scriptCheck(file.content,target.path);
          // Keeping an external-script element with a data URL preserves defer,
          // async, load/error events and script order, unlike an inline rewrite.
          attribute(node,'src',dataUrl(file.content,'text/javascript'));
        }else scriptCheck(node.childNodes?.map(n=>n.value||'').join('')||'',from+' <script>');
        return;
      }
      if(tag==='style'){
        if(loc.startTag&&loc.endTag){const text=css(source.slice(loc.startTag.endOffset,loc.endTag.startOffset),from).replace(/<\/style/gi,'\\3c /style');changes.push({start:loc.startTag.endOffset,end:loc.endTag.startOffset,text});}return;
      }
      if(tag==='link'){
        const rel=(attr(node,'rel')||'').toLowerCase().split(/\s+/),href=attr(node,'href');
        if(rel.includes('stylesheet')&&href){
          if(rel.includes('alternate')||attr(node,'disabled')!==undefined){fail(from,`备用或禁用样式表 ${href}`);return;}
          const target=resolve(from,href);if(!target)return;const file=project.files[target.path];
          if(file.kind!=='text'){fail(from,`样式文件不是文本：${target.path}`);return;}
          cssStack.add(target.path);const text=css(file.content,target.path).replace(/<\/style/gi,'\\3c /style');cssStack.delete(target.path);
          const attrs=(node.attrs||[]).filter(a=>!['href','rel','type','integrity','crossorigin','referrerpolicy','as'].includes(a.name)).map(a=>` ${a.name}="${escapeAttr(a.value)}"`).join('');
          changes.push({start:loc.startOffset,end:loc.endOffset,text:`<style${attrs}>${text}</style>`});return;
        }
        if(rel.some(r=>['manifest','modulepreload','preconnect','dns-prefetch'].includes(r))){fail(from,`不支持的链接资源 ${rel.join(' ')} ${href||''}`);return;}
        if(href&&rel.some(r=>['icon','apple-touch-icon','preload','prefetch'].includes(r)))attribute(node,'href',embed(from,href));
      }
      const style=attr(node,'style');if(style){const processed=css(`x{${style}}`,from);attribute(node,'style',processed.slice(processed.indexOf('{')+1,processed.lastIndexOf('}')));}
      for(const presentation of svgUrlAttributes(node)){
        const value=rewriteUrls(presentation.value,ref=>embed(from,ref),msg=>fail(from,msg));
        if(value!==presentation.value)attribute(node,presentation.name,value);
      }
      const src=attr(node,'src');if(src&&!['iframe','embed'].includes(tag))attribute(node,'src',embed(from,src));
      for(const name of ['poster','background']){const ref=attr(node,name);if(ref)attribute(node,name,embed(from,ref));}
      if(tag==='use')checkSvgUse(node,from);
      else if(['image','feImage'].includes(tag))for(const name of ['href','xlink:href']){const ref=attr(node,name);if(ref)attribute(node,name,embed(from,ref));}
      if(tag==='a'||tag==='area'){
        const href=attr(node,'href')?.trim();if(!href||href.startsWith('#')||/^(?:[a-z][a-z\d+.-]*:|\/\/)/i.test(href))return;
        const target=resolve(from,href);if(!target)return;
        if(target.path===project.entry)attribute(node,'href',target.search+target.hash);
        else if(/\.html?$/i.test(target.path))fail(from,`链接指向其他页面 ${href}（${target.path}）`);
        else attribute(node,'href',embed(from,href));
      }
    });
    if(!svg&&!charset&&headEnd!==undefined)changes.push({start:headEnd,end:headEnd,text:'<meta charset="utf-8">'});
    changes.sort((a,b)=>b.start-a.start);
    let boundary=source.length;
    for(const change of changes){if(change.end>boundary){fail(from,'资源替换范围重叠');continue;}source=source.slice(0,change.start)+change.text+source.slice(change.end);boundary=change.start;}
    return source;
  }
  const source=sourceText(project);if(!source)throw new SingleHtmlExportError([`入口页面不存在或不是文本：${project.entry}`]);
  const output=markup(source,project.entry);
  if(issues.size)throw new SingleHtmlExportError(issues);
  return output;
}
