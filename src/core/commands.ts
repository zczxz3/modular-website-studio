import postcss from 'postcss';
import { ID_ATTR, STYLE_FILE, type EditCommand, type Project } from './types';
import { attr, elements, escapeAttr, escapeText, getElement, normalizeProject, parseHtml, patch, sourceText, walk } from './source';
import {randomId} from './id';

const setFile=(p:Project,file:string,content:string):Project=>({...p,files:{...p.files,[file]:{kind:'text',content}}});
export function applyCommand(project:Project,command:EditCommand):Project {
  let html=sourceText(project); let result=project;
  const el='id' in command?getElement(project,command.id):null;
  switch(command.type){
    case 'text': {
      if(el!.node.childNodes?.some(n=>n.tagName)||!el!.loc.endTag)throw new Error('该元素包含子元素；请选择叶子文本节点，或直接编辑 HTML。');
      html=patch(html,el!.loc.startTag!.endOffset,el!.loc.endTag.startOffset,escapeText(command.text));break;
    }
    case 'attribute': case 'remove-attribute': {
      if(!/^[a-zA-Z_:][\w:.-]*$/.test(command.name)||command.name===ID_ATTR||/^on/i.test(command.name)||['srcdoc','sandbox'].includes(command.name))throw new Error('此属性不可在检查器中修改。');
      const loc=el!.loc.attrs?.[command.name];
      if(command.type==='remove-attribute'){if(loc)html=patch(html,loc.startOffset,loc.endOffset,'');break;}
      const text=`${command.name}="${escapeAttr(command.value)}"`;
      html=loc?patch(html,loc.startOffset,loc.endOffset,text):patch(html,el!.loc.startOffset+1+el!.tag.length,el!.loc.startOffset+1+el!.tag.length,' '+text);break;
    }
    case 'style': {
      if(!/^--[\w-]+$|^[a-z][a-z-]*$/.test(command.property))throw new Error('无效的 CSS 属性。');
      // Parse the value in a declaration and reject injection of additional declarations/rules.
      const probe=postcss.parse(`x{${command.property}:${command.value||'initial'}}`);
      const rule=probe.first;if(probe.nodes.length!==1||rule?.type!=='rule'||rule.nodes.length!==1||rule.first?.type!=='decl'||rule.first.prop!==command.property)throw new Error('请输入单个 CSS 属性值。');
      const root=postcss.parse(sourceText(project,STYLE_FILE));const selector=`[${ID_ATTR}="${command.id}"]`;
      let target:postcss.Rule|undefined;root.walkRules(r=>{if(r.selector===selector)target=r;});
      if(!target){target=postcss.rule({selector});root.append(target);}
      target.walkDecls(command.property,d=>{d.remove();});
      if(command.value)target.append(postcss.decl({prop:command.property,value:command.value}));
      if(!target.nodes.length)target.remove();
      result=setFile(result,STYLE_FILE,root.toString());
      // Add a real stylesheet reference to every page so exported edits work without Studio.
      for(const [path,file]of Object.entries(result.files))if(/\.html?$/i.test(path)&&file.kind==='text'){
        const href='../'.repeat(path.split('/').length-1)+STYLE_FILE;
        if(!file.content.includes(`href="${href}"`)&&!file.content.includes(`href='${href}'`))result=setFile(result,path,file.content.replace(/<\/head\s*>/i,`  <link rel="stylesheet" href="${href}">\n</head>`));
      }
      return normalizeProject(result);
    }
    case 'delete': {
      if(el!.tag==='body')throw new Error('不能删除页面 body。');
      const removed=elements(html).filter(n=>n.loc.startOffset>=el!.loc.startOffset&&n.loc.endOffset<=el!.loc.endOffset).map(n=>n.id);
      html=patch(html,el!.loc.startOffset,el!.loc.endOffset,'');
      const root=postcss.parse(sourceText(project,STYLE_FILE));root.walkRules(r=>{if(removed.some(id=>r.selector===`[${ID_ATTR}="${id}"]`))r.remove();});
      if(project.files[STYLE_FILE]) result=setFile(result,STYLE_FILE,root.toString());break;
    }
    case 'duplicate': {
      if(el!.tag==='body')throw new Error('不能复制整个 body。');
      const descendants=elements(html).filter(n=>n.loc.startOffset>=el!.loc.startOffset&&n.loc.endOffset<=el!.loc.endOffset);
      const used=new Set<string>();walk(parseHtml(html),n=>{for(const name of [ID_ATTR,'id']){const value=attr(n,name);if(value)used.add(value);}});
      // Cover relationships are project-wide. A copied group must not keep
      // pointing at its original card or at an existing detail-page cover.
      for(const [path,file]of Object.entries(project.files))if(file.kind==='text'&&/\.html?$/i.test(path))walk(parseHtml(file.content),n=>{const key=attr(n,'data-mws-cover');if(key)used.add(key);});
      const fresh=(prefix:string)=>{let value:string;do{value=prefix+randomId().slice(0,12);}while(used.has(value));used.add(value);return value;};
      const identities=new Map(descendants.map(n=>[n.id,fresh('mws-')]));
      const coverKeys=new Map<string,string>();
      for(const n of descendants){const key=attr(n.node,'data-mws-cover');if(key&&!coverKeys.has(key))coverKeys.set(key,fresh('cover-copy-'));}
      const anchors=new Map<string,string>(),nodeAnchors=new Map<string,string>();
      for(const n of descendants){const id=attr(n.node,'id');if(id){const copyId=fresh('mws-copy-');nodeAnchors.set(n.id,copyId);if(!anchors.has(id))anchors.set(id,copyId);}}
      const changes:{start:number;end:number;text:string}[]=[];
      const references=new Set(['for','aria-controls','aria-labelledby','aria-describedby','aria-owns','aria-activedescendant','headers','list','form']);
      for(const n of descendants)for(const a of n.node.attrs||[]){
        const location=n.loc.attrs?.[a.name];if(!location)continue;
        let value=a.value;
        if(a.name===ID_ATTR)value=identities.get(n.id)!;
        else if(a.name==='id')value=nodeAnchors.get(n.id)||value;
        else if(a.name==='data-mws-cover')value=coverKeys.get(value)||value;
        else if(references.has(a.name))value=value.replace(/[^\t\n\f\r ]+/g,id=>anchors.get(id)||id);
        else if(a.name==='href'&&value.startsWith('#')){
          let target=value.slice(1);try{target=decodeURIComponent(target);}catch{/* Keep malformed external fragments intact. */}
          if(anchors.has(target))value='#'+encodeURIComponent(anchors.get(target)!);
        }
        if(value!==a.value)changes.push({start:location.startOffset-el!.loc.startOffset,end:location.endOffset-el!.loc.startOffset,text:`${a.name}="${escapeAttr(value)}"`});
      }
      // Patch actual attributes only: text, comments and script strings are source.
      let copy=html.slice(el!.loc.startOffset,el!.loc.endOffset);
      for(const change of changes.sort((a,b)=>b.start-a.start))copy=patch(copy,change.start,change.end,change.text);
      // Copy Studio's generated declarations, retaining any media-rule context.
      // Author CSS and arbitrary JS selectors are not rewritten.
      if(project.files[STYLE_FILE]){
        const root=postcss.parse(sourceText(project,STYLE_FILE));const copies:{rule:postcss.Rule;copy:postcss.Rule}[]=[];
        root.walkRules(rule=>{for(const [oldId,newId]of identities)if(rule.selector===`[${ID_ATTR}="${oldId}"]`)copies.push({rule,copy:rule.clone({selector:`[${ID_ATTR}="${newId}"]`})});});
        for(const {rule,copy:copiedRule}of copies)rule.parent!.insertAfter(rule,copiedRule);
        if(copies.length)result=setFile(result,STYLE_FILE,root.toString());
      }
      html=patch(html,el!.loc.endOffset,el!.loc.endOffset,'\n'+copy);break;
    }
    case 'insert': {
      const parent=getElement(project,command.parentId);if(!parent.loc.endTag)throw new Error('这个元素不能包含子节点。');
      const before=command.beforeId?getElement(project,command.beforeId):null;
      if(before&&before.parentId!==parent.id)throw new Error('插入位置不属于目标容器。');
      const at=before?.loc.startOffset??parent.loc.endTag.startOffset;
      html=patch(html,at,at,'\n'+command.html+'\n');break;
    }
    case 'move': {
      const parent=getElement(project,command.parentId);const before=command.beforeId?getElement(project,command.beforeId):null;
      if(el!.tag==='body'||parent.id===el!.id||(parent.loc.startOffset>el!.loc.startOffset&&parent.loc.endOffset<=el!.loc.endOffset))throw new Error('不能将元素移入自身或后代。');
      if(!parent.loc.endTag)throw new Error('目标元素不能包含子节点。');
      if(before&&before.parentId!==parent.id)throw new Error('排序目标不属于目标容器。');
      if(before?.id===el!.id)return project;
      const at=before?.loc.startOffset??parent.loc.endTag.startOffset;
      const text=html.slice(el!.loc.startOffset,el!.loc.endOffset);
      html=patch(html,el!.loc.startOffset,el!.loc.endOffset,'');
      const adjusted=at>el!.loc.startOffset?at-text.length:at;
      html=patch(html,adjusted,adjusted,text);break;
    }
  }
  return normalizeProject(setFile(result,result.entry,html));
}
export function transaction(project:Project,commands:EditCommand[]) {return commands.reduce(applyCommand,project);}
export function ownStyle(project:Project,id:string,property:string):string {
  let value='';try{postcss.parse(sourceText(project,STYLE_FILE)).walkRules(r=>{if(r.selector===`[${ID_ATTR}="${id}"]`)r.walkDecls(property,d=>{value=d.value;});});}catch{/* Diagnostics own invalid CSS. */}return value;
}
export function sourceAttribute(project:Project,id:string,name:string){return attr(getElement(project,id).node,name)||'';}
