import { useEffect, useMemo, useRef, useState } from 'react';
import { randomId } from '../core/id';
import { editorDocument, previewTree, standalonePreview } from '../preview/document';
import type { EditCommand, Project } from '../core/types';
export interface Inspection {id:string;rect:{width:number;height:number;x:number;y:number};computed:Record<string,string>;text:string;}
interface Props {project:Project;revision:number;selected:string;mode:string;width:number;zoom:number;preview:boolean;locked:boolean;onSelect:(id:string)=>void;onInspect:(i:Inspection)=>void;onCommands:(c:EditCommand[],r:number)=>void;onHistory:(s:string)=>void;onReady:()=>void;}
export default function Canvas(props:Props){
  const ref=useRef<HTMLIFrameElement>(null);const channel=useMemo(()=>randomId(),[]);const src=useMemo(()=>editorDocument(channel),[channel]);const [ready,setReady]=useState(false);const current=useRef(props);current.current=props;
  const tree=useMemo(()=>previewTree(props.project),[props.project]);
  const post=(data:Record<string,unknown>)=>ref.current?.contentWindow?.postMessage({channel,...data},'*');
  useEffect(()=>{const listener=(e:MessageEvent)=>{if(e.source!==ref.current?.contentWindow||!e.data||e.data.channel!==channel)return;const d=e.data;
    if(d.type==='ready'){setReady(true);const p=current.current;post({type:'render',...previewTree(p.project),revision:p.revision,mode:p.mode,locked:p.locked});}
    if(d.type==='rendered')current.current.onReady();
    if(d.type==='select'&&typeof d.id==='string')current.current.onSelect(d.id);
    if(d.type==='inspect'&&typeof d.id==='string')current.current.onInspect(d);
    if(d.type==='command'&&Array.isArray(d.commands)&&d.commands.length<=20&&Number.isInteger(d.revision))current.current.onCommands(d.commands,d.revision);
    if(d.type==='undo'||d.type==='redo')current.current.onHistory(d.type);
  };window.addEventListener('message',listener);return()=>window.removeEventListener('message',listener);},[channel]);
  useEffect(()=>{if(ready)post({type:'render',...tree,revision:props.revision,mode:props.mode,locked:props.locked});},[ready,tree,props.revision,props.locked]);
  useEffect(()=>{if(ready)post({type:'select',id:props.selected});},[ready,props.selected]);
  useEffect(()=>{if(ready)post({type:'mode',mode:props.mode});},[ready,props.mode]);
  return <div className="canvas-area"><div className="canvas-caption"><span>{props.project.entry}</span><span>{props.width} PX · {props.preview?'脚本隔离预览':'LIVE DOM'}</span></div>
    <div className="canvas-scroll"><div className="canvas-sizer" style={{width:props.width*props.zoom,minHeight:780*props.zoom}}><div className="canvas-scale" style={{width:props.width,transform:`scale(${props.zoom})`,transformOrigin:'top left'}}>
      <iframe ref={ref} title="实时可编辑网页" sandbox="allow-scripts" srcDoc={src} style={{display:props.preview?'none':'block',width:props.width,height:780}}/>
      {props.preview&&<iframe title="隔离运行预览" sandbox="allow-scripts" srcDoc={standalonePreview(props.project)} style={{width:props.width,height:780}}/>}
    </div></div></div>
    <div className="canvas-help">{props.preview?'脚本可运行 · 禁止网络请求、表单提交、弹窗和父页面访问':props.mode==='free'?'自由模式：拖动写入 CSS translate，保留原有 transform · 右下角调整尺寸':'结构模式：拖放排序 · Shift + 拖入容器 · 双击叶子元素修改文字'}</div>
  </div>;
}
