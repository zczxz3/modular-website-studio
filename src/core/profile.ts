import type {HtmlNode,Project} from './types';
import {attr,escapeText,normalizeProject,parseHtml,patch,walk} from './source';

const marker='data-mws-profile';
const textOf=(node:HtmlNode)=>node.childNodes?.map(child=>child.value||'').join('')||'';
const pages=(project:Project)=>Object.entries(project.files).filter(([path,file])=>/\.html?$/i.test(path)&&file.kind==='text');
const leaf=(node:HtmlNode)=>!!node.sourceCodeLocation?.startTag&&!!node.sourceCodeLocation.endTag&&!node.childNodes?.some(child=>child.tagName)&&!['script','style'].includes(node.tagName||'');

/** The visible source fields are the profile; there is no separate saved model. */
export function studentProfile(project:Project):{name:string}|null {
  let name:string|undefined,greeting:string|undefined;
  for(const [,file]of pages(project))walk(parseHtml(file.content),node=>{
    if(!leaf(node))return;
    if(attr(node,marker)==='name'&&name===undefined)name=textOf(node).trim();
    if(attr(node,marker)==='greeting'&&greeting===undefined){
      const match=textOf(node).trim().match(/^你好，我是([\s\S]+)。$/);
      if(match)greeting=match[1].trim();
    }
  });
  return greeting!==undefined||name!==undefined?{name:greeting??name!}:null;
}

/** One source-backed project replacement updates only explicit template fields. */
export function applyStudentProfile(project:Project,value:string):Project {
  const name=value.trim();
  if(!name||Array.from(name).length>80||/[\u0000-\u001f\u007f]/.test(name))throw new Error('请输入 1–80 个字符的姓名，不要包含换行或控制字符。');
  const files={...project.files};let fields=0;
  for(const [path,file]of pages(project)){
    const changes:{start:number;end:number;text:string}[]=[];
    walk(parseHtml(file.content),node=>{
      const kind=attr(node,marker);if(!['name','greeting','title'].includes(kind||''))return;
      if(!leaf(node)||(kind==='title'&&node.tagName!=='title'))throw new Error(`${path}：姓名区域包含子元素或标记无效，请在画布中分别修改。`);
      const location=node.sourceCodeLocation!;
      const prefix=attr(node,'data-mws-profile-prefix')?.trim();
      const text=kind==='name'?name:kind==='greeting'?`你好，我是${name}。`:prefix?`${prefix} · ${name}`:`${name}的作品集`;
      if(kind!=='title')fields++;
      changes.push({start:location.startTag!.endOffset,end:location.endTag!.startOffset,text:escapeText(text)});
    });
    if(changes.length){
      let content=file.content;
      for(const change of changes.sort((a,b)=>b.start-a.start))content=patch(content,change.start,change.end,change.text);
      files[path]={kind:'text',content};
    }
  }
  if(!fields)throw new Error('此项目没有模板姓名区域，请在画布中选中文字修改。');
  return normalizeProject({...project,name:`${name}的作品集`,files});
}
