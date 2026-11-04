import type { Diagnostic, EditCommand, Project } from './types';
import { normalizeProject, validateProject } from './source';
import { transaction } from './commands';

export interface StudioState { project:Project; draft:Project; diagnostics:Diagnostic[]; revision:number; canUndo:boolean; canRedo:boolean; label:string; }
export class ProjectStore {
  private past:Project[]=[];private future:Project[]=[];private listeners=new Set<()=>void>();
  private state:StudioState;
  constructor(project:Project){const p=normalizeProject(project);this.state={project:p,draft:p,diagnostics:[],revision:0,canUndo:false,canRedo:false,label:'项目已打开'};}
  getSnapshot=()=>this.state;
  subscribe=(listener:()=>void)=>{this.listeners.add(listener);return()=>{this.listeners.delete(listener);};};
  private notify(){this.listeners.forEach(fn=>fn());}
  private commit(project:Project,label:string){
    if(JSON.stringify(project)===JSON.stringify(this.state.project)){this.state={...this.state,draft:project,diagnostics:[]};this.notify();return;}
    this.past.push(this.state.project);if(this.past.length>100)this.past.shift();this.future=[];
    this.state={project,draft:project,diagnostics:[],revision:this.state.revision+1,canUndo:true,canRedo:false,label};this.notify();
  }
  editFile(file:string,content:string){
    const draft={...this.state.draft,files:{...this.state.draft.files,[file]:{kind:'text' as const,content}}};
    const diagnostics=validateProject(draft);
    if(diagnostics.length){this.state={...this.state,draft,diagnostics,label:'代码有错误，保留最后有效画布'};this.notify();return;}
    this.commit(normalizeProject(draft),`修改 ${file}`);
  }
  dispatch(commands:EditCommand[],expectedRevision=this.state.revision){
    if(this.state.diagnostics.length)throw new Error('请先修复代码错误或放弃草稿，再进行可视化操作。');
    if(expectedRevision!==this.state.revision)throw new Error('画布版本已改变，本次操作已取消；请重新操作。');
    this.commit(transaction(this.state.project,commands),'可视化编辑');
  }
  replace(project:Project,label='打开项目'){this.commit(normalizeProject(project),label);}
  discardDraft(){this.state={...this.state,draft:this.state.project,diagnostics:[],label:'已恢复有效代码'};this.notify();}
  undo(){if(this.state.diagnostics.length){this.discardDraft();return;}const p=this.past.pop();if(!p)return;this.future.push(this.state.project);this.restore(p,'撤销');}
  redo(){const p=this.future.pop();if(!p)return;this.past.push(this.state.project);this.restore(p,'重做');}
  private restore(project:Project,label:string){this.state={project,draft:project,diagnostics:[],revision:this.state.revision+1,canUndo:!!this.past.length,canRedo:!!this.future.length,label};this.notify();}
}
