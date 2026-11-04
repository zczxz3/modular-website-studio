import type {Project} from './types';
import {parseProjectJson,saveProject} from './io';
export const RECENT_KEY='mws-recent-v1';
export interface RecentProject {id:string;updated:string;project:Project;}
export function readRecent(storage:Pick<Storage,'getItem'>):RecentProject[]{
  try{const rows=JSON.parse(storage.getItem(RECENT_KEY)||'[]');if(!Array.isArray(rows))return [];return rows.slice(0,6).flatMap(row=>{try{const project=parseProjectJson(JSON.stringify(row.project));if(!project.id||project.id!==row.id)return [];return [{id:row.id,updated:String(row.updated),project}];}catch{return [];}});}catch{return [];}
}
export function rememberProject(storage:Pick<Storage,'getItem'|'setItem'>,project:Project){
  if(!project.id)throw new Error('项目缺少标识。');
  const rows=[{id:project.id,updated:new Date().toISOString(),project:JSON.parse(saveProject(project))},...readRecent(storage).filter(r=>r.id!==project.id)].slice(0,6);
  // A quota error must not delete the previous project list.
  storage.setItem(RECENT_KEY,JSON.stringify(rows));return rows;
}
