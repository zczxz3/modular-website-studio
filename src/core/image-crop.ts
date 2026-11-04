import type {Project} from './types';
import {sourceAttribute} from './commands';
import {replaceUploadedImage} from './workbench';
import {setCoverAlt} from './covers';
/** Cropping creates a new local asset; originals, stable IDs and styles remain. */
export function applyCroppedImage(project:Project,id:string,png:Uint8Array){
  const signature=[137,80,78,71,13,10,26,10];
  if(!signature.every((v,i)=>png[i]===v))throw new Error('裁剪结果不是有效的 PNG。');
  const alt=sourceAttribute(project,id,'alt');
  return setCoverAlt(replaceUploadedImage(project,id,png,'cropped.png'),id,alt);
}
