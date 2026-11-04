import type {EditCommand,Project} from './types';
import {attr,elements,getElement} from './source';
import {transaction} from './commands';

interface CoverTarget {page:string;id:string;}
function coverTargets(project:Project,id:string):CoverTarget[]{
  const selected=getElement(project,id);
  if(selected.tag!=='img')throw new Error('请先选中图片。');
  const key=attr(selected.node,'data-mws-cover');
  if(!key)return [{page:project.entry,id}];
  return Object.entries(project.files).flatMap(([page,file])=>file.kind==='text'&&/\.html?$/i.test(page)
    ?elements(file.content).filter(node=>node.tag==='img'&&attr(node.node,'data-mws-cover')===key).map(node=>({page,id:node.id}))
    :[]);
}

/** Only explicit cover keys link instances; sharing the same image URL does not. */
export function coverGroupSize(project:Project,id:string){return coverTargets(project,id).length;}
function editCovers(project:Project,id:string,commands:(target:CoverTarget)=>EditCommand[]):Project{
  const targets=coverTargets(project,id),entry=project.entry;
  let next=project;
  for(const target of targets)next=transaction({...next,entry:target.page},commands(target));
  return {...next,entry};
}

/** The caller adds the asset first; this helper patches only linked image attrs. */
export function replaceCoverSource(project:Project,id:string,path:string,alt?:string,color?:string):Project{
  if(!project.files[path])throw new Error('封面素材不存在。');
  return editCovers(project,id,target=>[
    {type:'attribute',id:target.id,name:'src',value:'../'.repeat(target.page.split('/').length-1)+path},
    {type:'remove-attribute',id:target.id,name:'srcset'},
    {type:'remove-attribute',id:target.id,name:'sizes'},
    ...(alt===undefined?[]:[{type:'attribute' as const,id:target.id,name:'alt',value:alt}]),
    ...(color===undefined?[{type:'remove-attribute' as const,id:target.id,name:'data-mws-cover-color'}]:[{type:'attribute' as const,id:target.id,name:'data-mws-cover-color',value:color}])
  ]);
}

export function replaceSolidCover(project:Project,id:string,input:string):Project{
  coverTargets(project,id);
  const color=input.trim().toLowerCase();
  if(!/^#[0-9a-f]{6}$/.test(color))throw new Error('纯色封面请输入六位十六进制颜色，例如 #286c70。');
  const content=`<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="1000" viewBox="0 0 1600 1000" role="img"><title>纯色作品封面</title><rect width="1600" height="1000" fill="${color}"></rect></svg>`;
  let path=Object.keys(project.files).find(path=>path.endsWith('.svg')&&project.files[path].kind==='text'&&project.files[path].content===content);
  if(!path){path=`assets/cover-${color.slice(1)}.svg`;let suffix=1;while(project.files[path])path=`assets/cover-${color.slice(1)}-${suffix++}.svg`;}
  const next={...project,files:{...project.files,[path]:{kind:'text' as const,content}}};
  return replaceCoverSource(next,id,path,'纯色作品封面',color);
}

export function setCoverCrop(project:Project,id:string,position:string):Project{
  const value=position.trim();
  const coordinates=value.match(/^(\d+(?:\.\d+)?)%\s+(\d+(?:\.\d+)?)%$/);
  if(value&&(!coordinates||Number(coordinates[1])>100||Number(coordinates[2])>100))throw new Error('请选择 0% 到 100% 之间的裁切位置。');
  return editCovers(project,id,target=>[{type:'style',id:target.id,property:'object-position',value}]);
}
export function setCoverFit(project:Project,id:string,value:''|'cover'|'contain'):Project{
  if(!['','cover','contain'].includes(value))throw new Error('请选择填满区域或完整显示。');
  return editCovers(project,id,target=>[{type:'style',id:target.id,property:'object-fit',value}]);
}
export function setCoverAlt(project:Project,id:string,value:string):Project{
  return editCovers(project,id,target=>[{type:'attribute',id:target.id,name:'alt',value}]);
}
