import type {Project} from './types';
import {parseProjectJson,saveProject} from './io';
import {RECENT_KEY,rememberProject,type RecentProject} from './recent';

/** Save one validated snapshot in the recent list; never duplicate it in a legacy key. */
export function saveLocalDraft(storage:Pick<Storage,'getItem'|'setItem'>,project:Project):RecentProject[]{
  let snapshot:Project;
  try{
    snapshot=parseProjectJson(saveProject(project));
    if(!snapshot.id)throw new Error('项目缺少标识。');
  }catch(error){
    throw new Error(`草稿未保存：${error instanceof Error?error.message:'项目无效。'} 请修复项目后重试，或下载可编辑工程备份。`);
  }
  try{
    // Read once before writing so a denied read cannot be mistaken for an empty
    // library. Web Storage setItem is atomic: quota errors retain the old value.
    const previous=storage.getItem(RECENT_KEY);
    return rememberProject({getItem:()=>previous,setItem:(key,value)=>storage.setItem(key,value)},snapshot);
  }catch{
    throw new Error('浏览器未能保存草稿，先前保存的版本保持不变。请下载可编辑工程备份。');
  }
}
