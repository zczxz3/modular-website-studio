import { parse } from 'parse5';
import { randomId } from './id';
import postcss from 'postcss';
import { parse as parseJS } from 'acorn';
import { ID_ATTR, type Diagnostic, type ElementInfo, type HtmlNode, type Project } from './types';

export const attr = (node: HtmlNode, name: string) => node.attrs?.find(a=>a.name===name)?.value;
export const escapeText = (s: string) => s.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;');
export const escapeAttr = (s: string) => escapeText(s).replaceAll('"','&quot;');
export function walk(node: HtmlNode, fn:(node:HtmlNode, depth:number)=>void, depth=0) {fn(node,depth); node.childNodes?.forEach(n=>walk(n,fn,depth+1));}
export const parseHtml = (html: string) => parse(html, {sourceCodeLocationInfo:true}) as unknown as HtmlNode;
export const sourceText = (p:Project, file=p.entry) => p.files[file]?.kind==='text' ? p.files[file].content : '';
export function patch(source:string, start:number, end:number, text:string) {return source.slice(0,start)+text+source.slice(end);}
export function elements(html: string):ElementInfo[] {
  const list:ElementInfo[]=[]; let inBody=false;
  const visit=(n:HtmlNode,depth:number,parentId:string|null)=>{
    const was=inBody; if(n.tagName==='body') inBody=true;
    const id=attr(n,ID_ATTR); const loc=n.sourceCodeLocation;
    if(inBody && id && loc && n.tagName) {
      list.push({id,tag:n.tagName,label:attr(n,'id')?`${n.tagName}#${attr(n,'id')}`:n.tagName,depth,parentId,node:n,loc});
      parentId=id;
    }
    n.childNodes?.forEach(child=>visit(child,depth+(id?1:0),parentId)); inBody=was;
  }; visit(parseHtml(html),0,null); return list;
}
export function addStableIds(html:string):string {
  const changes:{at:number;text:string}[]=[]; const seen=new Set<string>();
  walk(parseHtml(html),node=>{
    if(!node.tagName || !node.sourceCodeLocation?.startTag) return;
    const id=attr(node,ID_ATTR);
    if(id){if(!/^[a-zA-Z0-9_-]{1,80}$/.test(id)||seen.has(id)) throw new Error('重复或无效的 data-mws-id；请为节点保留唯一 ID。');seen.add(id);return;}
    let next:string; do {next=`mws-${randomId().slice(0,12)}`;} while(seen.has(next)); seen.add(next);
    // Insert after the tag name; preserve whitespace, attributes, comments and formatting.
    const at=node.sourceCodeLocation.startOffset+1+node.tagName.length;
    changes.push({at,text:` ${ID_ATTR}="${next}"`});
  });
  changes.sort((a,b)=>b.at-a.at).forEach(c=>{html=patch(html,c.at,c.at,c.text);}); return html;
}
const voids=new Set('area base br col embed hr img input link meta param source track wbr'.split(' '));
const optionalEnd=new Set('html head body li dt dd p rt rp optgroup option colgroup thead tbody tfoot tr td th'.split(' '));
export function validateFile(file:string,content:string):Diagnostic[] {
  const errors:Diagnostic[]=[];
  const fail=(message:string,line=1,column=1)=>errors.push({file,message,line,column});
  try {
    if(/\.html?$/i.test(file)) {
      const root=parse(content,{sourceCodeLocationInfo:true,onParseError:e=>{if(e.code!=='missing-doctype') fail(e.code,e.startLine,e.startCol);}}) as unknown as HtmlNode;
      const ids=new Set<string>();
      walk(root,node=>{
        const loc=node.sourceCodeLocation; if(!node.tagName||!loc) return;
        if(!voids.has(node.tagName)&&!optionalEnd.has(node.tagName)&&!loc.endTag) fail(`缺少 </${node.tagName}>`,loc.startLine,loc.startCol);
        const id=attr(node,ID_ATTR); if(id){if(ids.has(id)||!/^[a-zA-Z0-9_-]{1,80}$/.test(id))fail('data-mws-id 必须唯一且仅包含字母、数字、下划线或短横线',loc.startLine,loc.startCol);ids.add(id);}
        const inline=node.childNodes?.map(n=>n.value||'').join('')||'';
        if(node.tagName==='style'||(node.tagName==='script'&&!attr(node,'src')&&(!attr(node,'type')||['module','text/javascript','application/javascript'].includes(attr(node,'type')!)))){
          const ext=node.tagName==='style'?'.css':'.js';
          for(const error of validateFile(file+ext,inline))fail(error.message,(loc.startTag?.endLine||loc.startLine)+error.line-1,error.column);
        }
      });
      if(!/<html[\s>]/i.test(content)||!/<head[\s>]/i.test(content)||!/<body[\s>]/i.test(content)||!/<\/head\s*>/i.test(content)||!/<\/body\s*>/i.test(content))fail('首版需要完整 HTML 文档（含显式 html、head 和 body 标签及闭合标签）。');
    } else if(/\.css$/i.test(file)) postcss.parse(content,{from:file});
    else if(/\.(m?js)$/i.test(file)) parseJS(content,{ecmaVersion:'latest',sourceType:'module',locations:true});
  } catch(e) {const err=e as {message:string;line?:number;column?:number;loc?:{line:number;column:number}};fail(err.message,err.line??err.loc?.line??1,err.column??((err.loc?.column??0)+1));}
  return errors;
}
export function validateProject(project:Project):Diagnostic[] {
  return Object.entries(project.files).flatMap(([file,value])=>value.kind==='text'?validateFile(file,value.content):[]);
}
export function normalizeProject(project:Project):Project {
  const errors=validateProject(project); if(errors.length)throw new Error(`${errors[0].file}:${errors[0].line} ${errors[0].message}`);
  const files={...project.files};
  for(const [name,file] of Object.entries(files)) if(file.kind==='text'&&/\.html?$/i.test(name))files[name]={kind:'text',content:addStableIds(file.content)};
  return {...project,files};
}
export function nodeAtOffset(html:string,offset:number) {
  return elements(html).filter(e=>e.loc.startOffset<=offset && offset<=e.loc.endOffset).sort((a,b)=>(a.loc.endOffset-a.loc.startOffset)-(b.loc.endOffset-b.loc.startOffset))[0];
}
export function getElement(project:Project,id:string) {const found=elements(sourceText(project)).find(n=>n.id===id);if(!found)throw new Error('元素已改变，请重新选择。');return found;}
