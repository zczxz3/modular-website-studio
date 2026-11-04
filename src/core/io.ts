import { unzipSync, zipSync, strFromU8, strToU8 } from 'fflate';
import type { Project, ProjectFile } from './types';
import { normalizeProject, sourceText } from './source';

export const MAX_BYTES=20*1024*1024;
const textExtension=/\.(html?|css|m?js|ts|json|txt|md|svg)$/i;
export function safePath(path:string){
  if(!path||path.startsWith('/')||path.includes('\\')||path.includes('\0')||path.split('/').some(s=>s==='..'||s==='.'||s==='__proto__'||s==='constructor'||s==='prototype')||/^[a-z]+:/i.test(path))throw new Error(`不安全的文件路径：${path}`);
  return path;
}
export function resolvePath(from:string,ref:string){
  if(/^(?:[a-z]+:|\/\/|#)/i.test(ref))return null;
  const parts=ref.startsWith('/')?[]:from.split('/').slice(0,-1);
  for(const part of ref.split(/[?#]/)[0].split('/')){if(part==='..')parts.pop();else if(part&&part!=='.')parts.push(part);}
  return parts.join('/');
}
const mime=(path:string)=>({png:'image/png',jpg:'image/jpeg',jpeg:'image/jpeg',gif:'image/gif',webp:'image/webp',svg:'image/svg+xml',woff:'font/woff',woff2:'font/woff2',ico:'image/x-icon',mp4:'video/mp4'}[path.split('.').pop()!.toLowerCase()]||'application/octet-stream');
export function bytesDataUrl(bytes:Uint8Array,path:string){let binary='';for(let i=0;i<bytes.length;i+=16384)binary+=String.fromCharCode(...bytes.subarray(i,i+16384));return `data:${mime(path)};base64,${btoa(binary)}`;}
export function assetUrl(project:Project,from:string,ref:string){const path=resolvePath(from,ref);const file=path?project.files[path]:null;if(!file)return ref;return file.kind==='asset'?file.content:`data:${mime(path!)};base64,${btoa(unescape(encodeURIComponent(file.content)))}`;}
export function readZip(bytes:Uint8Array){
  if(bytes.length>MAX_BYTES)throw new Error('ZIP 超过 20 MB。');let size=0,count=0;
  return unzipSync(bytes,{filter:file=>{safePath(file.name);size+=file.originalSize;count++;if(size>MAX_BYTES||count>500)throw new Error('展开后的项目超过 20 MB 或 500 个文件。');return !file.name.endsWith('/');}});
}
export function parseProjectJson(raw:string):Project {
  if(raw.length>MAX_BYTES*1.5)throw new Error('项目文件过大。');const p=JSON.parse(raw) as Project;
  if(p.format!=='mws-project'||p.version!==1||typeof p.name!=='string'||typeof p.entry!=='string'||!p.files||typeof p.files!=='object'||Array.isArray(p.files)||!Array.isArray(p.modules))throw new Error('不是受支持的 MWS 项目（version 1）。');
  if(Object.keys(p.files).length>500)throw new Error('项目文件过多。');
  for(const [path,file]of Object.entries(p.files)){safePath(path);if(!file||!['text','asset'].includes(file.kind)||typeof file.content!=='string'||(file.kind==='asset'&&!/^data:[\w/+.-]+;base64,[A-Za-z0-9+/=]*$/.test(file.content)))throw new Error(`文件无效：${path}`);}
  if(!p.files[p.entry]||! /\.html?$/i.test(p.entry))throw new Error('HTML 入口不存在。');
  // Installed modules are inert data, but validate their shape before rendering their UI.
  p.modules=p.modules.map(validateModuleShape);
  return normalizeProject(p);
}
export function validateModuleShape(value:unknown){
  const m=value as import('./types').StudioModule;
  if(!m||!/^[@a-z0-9][a-z0-9@/_.-]{1,80}$/.test(m.id)||!/^\d+\.\d+\.\d+$/.test(m.version)||typeof m.name!=='string'||typeof m.html!=='string'||typeof m.css!=='string'||!Array.isArray(m.permissions)||!m.dependencies||typeof m.dependencies!=='object'||Array.isArray(m.dependencies))throw new Error('模块 manifest 无效。');
  if(m.permissions.length||Object.keys(m.dependencies).length)throw new Error('首版只支持无运行权限、无外部依赖的 HTML/CSS 模块。');
  return {...m,description:typeof m.description==='string'?m.description:''};
}
export function projectFromFiles(input:Record<string,Uint8Array>,name='Imported website'):Project {
  let paths=Object.keys(input);if(!paths.length)throw new Error('项目为空。');
  const prefix=paths[0].includes('/')?paths[0].split('/')[0]+'/':'';
  if(prefix&&paths.every(p=>p.startsWith(prefix))){input=Object.fromEntries(paths.map(path=>[path.slice(prefix.length),input[path]]));paths=Object.keys(input);}
  const entry=paths.includes('index.html')?'index.html':paths.find(p=>/\.html?$/i.test(p));if(!entry)throw new Error('没有找到 HTML 页面。');
  const files:Record<string,ProjectFile>={};let total=0;
  for(const [path,bytes]of Object.entries(input)){safePath(path);total+=bytes.length;if(total>MAX_BYTES||paths.length>500)throw new Error('项目超过导入限制。');files[path]=textExtension.test(path)?{kind:'text',content:strFromU8(bytes)}:{kind:'asset',content:bytesDataUrl(bytes,path)};}
  return normalizeProject({format:'mws-project',version:1,name,entry,files,modules:[]});
}
export function exportWebsite(project:Project):Uint8Array {
  const output:Record<string,Uint8Array>={};
  for(const [path,file] of Object.entries(project.files)){safePath(path);output[path]=file.kind==='text'?strToU8(file.content):Uint8Array.from(atob(file.content.split(',')[1]),c=>c.charCodeAt(0));}
  return zipSync(output,{level:6});
}
export function saveProject(project:Project){return JSON.stringify(project,null,2);}
export function download(data:string|Uint8Array,name:string,type:string){const blob=new Blob([typeof data==='string'?data:new Uint8Array(data)],{type});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
export function rewriteCssUrls(project:Project,file:string,css:string){return css.replace(/url\(\s*(['"]?)(.*?)\1\s*\)/g,(_all,_q,ref:string)=>`url("${assetUrl(project,file,ref).replaceAll('"','%22')}")`);}
export {sourceText};
