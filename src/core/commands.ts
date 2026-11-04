import postcss from 'postcss';
import { ID_ATTR, STYLE_FILE, type EditCommand, type Project } from './types';
import { addStableIds, attr, elements, escapeAttr, escapeText, getElement, normalizeProject, patch, sourceText } from './source';

const setFile=(p:Project,file:string,content:string):Project=>({...p,files:{...p.files,[file]:{kind:'text',content}}});
export function applyCommand(project:Project,command:EditCommand):Project {
  let html=sourceText(project); let result=project;
  const el='id' in command?getElement(project,command.id):null;
  switch(command.type){
    case 'text': {
      if(el!.node.childNodes?.some(n=>n.tagName)||!el!.loc.endTag)throw new Error('该元素包含子元素；请选择叶子文本节点，或直接编辑 HTML。');
      html=patch(html,el!.loc.startTag!.endOffset,el!.loc.endTag.startOffset,escapeText(command.text));break;
    }
    case 'attribute': {
      if(!/^[a-zA-Z_:][\w:.-]*$/.test(command.name)||command.name===ID_ATTR||/^on/i.test(command.name)||['srcdoc','sandbox'].includes(command.name))throw new Error('此属性不可在检查器中修改。');
      const loc=el!.loc.attrs?.[command.name];const text=`${command.name}="${escapeAttr(command.value)}"`;
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
      // Strip identity and HTML ids to avoid duplicate selectors after duplication.
      const copy=html.slice(el!.loc.startOffset,el!.loc.endOffset).replace(/\s(?:data-mws-id|id)\s*=\s*(?:"[^"]*"|'[^']*')/g,'');
      html=patch(html,el!.loc.endOffset,el!.loc.endOffset,'\n'+copy);break;
    }
    case 'insert': {
      const parent=getElement(project,command.parentId);if(!parent.loc.endTag)throw new Error('这个元素不能包含子节点。');
      html=patch(html,parent.loc.endTag.startOffset,parent.loc.endTag.startOffset,'\n'+command.html+'\n');break;
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
