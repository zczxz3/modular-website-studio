import type {Project} from './types';
import {bytesDataUrl,resolvePath} from './io';
import {randomId} from './id';
import {attr,elements} from './source';
export interface ImageImport {name:string;bytes:Uint8Array;}
export function importImages(project:Project,images:ImageImport[]):Project{
 if(!images.length||images.length>30||images.reduce((n,i)=>n+i.bytes.length,0)>20*1024*1024)throw new Error('每次导入 1–30 张图片，总计不超过 20 MB。');
 const files={...project.files};
 for(const image of images){const ext=image.name.split('.').pop()?.toLowerCase();if(!ext||!['png','jpg','jpeg','webp','gif','svg'].includes(ext)||!image.bytes.length||image.bytes.length>10*1024*1024)throw new Error('请选择非空且小于 10 MB 的 PNG/JPG/WebP/GIF/SVG 图片。');
 const stem=image.name.replace(/\.[^.]+$/,'').normalize('NFKC').replace(/[^\p{L}\p{N}_-]/gu,'-').slice(0,50)||'image';
 const path='assets/image-'+stem+'-'+randomId()+'.'+ext,content=bytesDataUrl(image.bytes,path);if(!Object.values(files).some(f=>f.content===content))files[path]={kind:'asset',content};}
 return {...project,files};
}
export function imageAssets(project:Project){return Object.keys(project.files).filter(p=>/\.(png|jpe?g|webp|gif|svg)$/i.test(p));}
export function assetUsage(project:Project,path:string){
 const refs=new Set<string>();for(const [page,file] of Object.entries(project.files)){
 if(file.kind!=='text'||page===path)continue;
 if(/\.html?$/i.test(page))for(const node of elements(file.content))for(const key of ['src','poster','href','xlink:href'])if(resolvePath(page,attr(node.node,key)||'')===path)refs.add(page);
 // Conservative for CSS/JS, srcset and hand-authored strings: a possible reference blocks deletion.
 for(const match of file.content.matchAll(/url\(\s*['\"]?([^)'\"]+)['\"]?\s*\)/g))if(resolvePath(page,match[1].trim())===path)refs.add(page);
 if(file.content.includes(path)||file.content.includes(path.split('/').pop()!))refs.add(page);
 }for(const module of project.modules)if((module.html+module.css).includes(path)||(module.html+module.css).includes(path.split('/').pop()!))refs.add('模块：'+module.id);return [...refs];
}
export function deleteImage(project:Project,path:string){if(!imageAssets(project).includes(path))throw new Error('图片不存在。');if(assetUsage(project,path).length)throw new Error('图片仍被页面或样式引用，请先替换这些引用。');const files={...project.files};delete files[path];return {...project,files};}
