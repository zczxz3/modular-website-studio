import {parseFragment} from 'parse5';
import postcss from 'postcss';
import type {HtmlNode,StudioModule} from './types';
import {walk} from './source';

export function validateModuleShape(value:unknown):StudioModule {
  const m=value as StudioModule;
  if(!m||typeof m.id!=='string'||!/^[@a-z0-9][a-z0-9@/_.-]{1,80}$/.test(m.id)||typeof m.version!=='string'||!/^\d+\.\d+\.\d+$/.test(m.version)||typeof m.name!=='string'||typeof m.html!=='string'||typeof m.css!=='string'||!Array.isArray(m.permissions)||!m.dependencies||typeof m.dependencies!=='object'||Array.isArray(m.dependencies))throw new Error('模块 manifest 无效。');
  if(m.permissions.length||Object.keys(m.dependencies).length)throw new Error('首版只支持无运行权限、无外部依赖的 HTML/CSS 模块。');
  return {...m,description:typeof m.description==='string'?m.description:''};
}
// ZIP installation and project reopening must apply the same trust boundary.
export function validateModule(value:unknown):StudioModule {
  const m=validateModuleShape(value);postcss.parse(m.css);
  const inspect=(root:HtmlNode)=>walk(root,n=>{
    if(['script','iframe','object','embed','link','meta','base','style'].includes(n.tagName||''))throw new Error('基础模块不能包含脚本、嵌入页面或外部依赖。');
    if(n.attrs?.some(a=>/^on/i.test(a.name)||['srcdoc','data-mws-id'].includes(a.name)||/^\s*(?:javascript|vbscript):/i.test(a.value)))throw new Error('模块包含不允许的属性。');
    // parse5 keeps template descendants in content, outside childNodes.
    const content=(n as HtmlNode&{content?:HtmlNode}).content;if(content)inspect(content);
  });
  inspect(parseFragment(m.html,{sourceCodeLocationInfo:true}) as unknown as HtmlNode);return m;
}
