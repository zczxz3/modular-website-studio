import { useEffect, useMemo, useRef, useState, type DragEvent } from 'react';
import { randomId } from '../core/id';
import { editorDocument, previewTree, standalonePreview } from '../preview/document';
import type { EditCommand, Project } from '../core/types';
export interface Inspection {id:string;rect:{width:number;height:number;x:number;y:number};computed:Record<string,string>;text:string;}
interface Props {project:Project;revision:number;selected:string;mode:string;width:number;zoom:number;preview:boolean;locked:boolean;onSelect:(id:string)=>void;onInspect:(i:Inspection)=>void;onCommands:(c:EditCommand[],r:number)=>void;onHistory:(s:string)=>void;onReady:()=>void;onMultiSelect?:(ids:string[])=>void;onDesignError?:(message:string)=>void;align?:{axis:string;token:number};transformHandle?:string;replay?:number;jump?:number;focusToken?:number;autoFit?:boolean;onResourceDrop?:(id:string,parentId:string,beforeId:string|undefined,revision:number)=>void;}
export default function Canvas(props:Props){
  const activeDesign=useRef(''),cancelledDesign=useRef(new Set<string>());
  const scrollRef=useRef<HTMLDivElement>(null),[fitZoom,setFitZoom]=useState(1),[resourceDrag,setResourceDrag]=useState(false);
  const ref=useRef<HTMLIFrameElement>(null);const channel=useMemo(()=>randomId(),[]);const src=useMemo(()=>editorDocument(channel),[channel]);const [ready,setReady]=useState(false);const current=useRef(props);current.current=props;
  const tree=useMemo(()=>previewTree(props.project),[props.project]);
  const post=(data:Record<string,unknown>)=>ref.current?.contentWindow?.postMessage({channel,...data},'*');
  useEffect(()=>{const listener=(e:MessageEvent)=>{if(e.source!==ref.current?.contentWindow||!e.data||e.data.channel!==channel)return;const d=e.data;
    if(d.type==='ready'){setReady(true);const p=current.current;post({type:'render',...previewTree(p.project),revision:p.revision,mode:p.mode,locked:p.locked,pageKey:p.project.id+':'+p.project.entry});}
    if(d.type==='resource-drop'&&typeof d.id==='string'&&typeof d.parentId==='string'&&(d.beforeId===undefined||typeof d.beforeId==='string')&&Number.isInteger(d.revision))current.current.onResourceDrop?.(d.id,d.parentId,d.beforeId,d.revision);
    if(d.type==='design-start'&&typeof d.gesture==='string')activeDesign.current=d.gesture;
    if(d.type==='design-error'&&typeof d.message==='string')current.current.onDesignError?.(d.message);
    if(d.type==='multi-select'&&Array.isArray(d.ids)&&d.ids.length<=6&&d.ids.every((id:unknown)=>typeof id==='string'))current.current.onMultiSelect?.(d.ids);
    if(d.type==='rendered')current.current.onReady();
    if(d.type==='select'&&typeof d.id==='string')current.current.onSelect(d.id);
    if(d.type==='inspect'&&typeof d.id==='string')current.current.onInspect(d);
    if(d.type==='command'&&(!d.designGesture||!cancelledDesign.current.has(d.designGesture))&&Array.isArray(d.commands)&&d.commands.length<=64&&Number.isInteger(d.revision))current.current.onCommands(d.commands,d.revision);
    if(d.type==='undo'||d.type==='redo')current.current.onHistory(d.type);
  };window.addEventListener('message',listener);return()=>window.removeEventListener('message',listener);},[channel]);
  useEffect(()=>{if(ready)post({type:'render',...tree,revision:props.revision,mode:props.mode,locked:props.locked,pageKey:props.project.id+':'+props.project.entry});},[ready,tree,props.revision,props.locked]);
  // Native drag events cannot enter an opaque sandbox in Chromium. Only a
  // library-resource drag activates this parent surface; hit testing and the
  // insertion decision stay in the trusted iframe runtime.
  useEffect(()=>{
    const start=(e:globalThis.DragEvent)=>{if(!current.current.preview&&!current.current.locked&&Array.from(e.dataTransfer?.types||[]).includes('application/x-mws-resource'))setResourceDrag(true);};
    const end=()=>{setResourceDrag(false);post({type:'cancel-drag'});};
    const cancel=(e:KeyboardEvent)=>{if(e.key==='Escape'){cancelledDesign.current.add(activeDesign.current);if(cancelledDesign.current.size>32)cancelledDesign.current.delete(cancelledDesign.current.values().next().value!);post({type:'cancel-design'});}};window.addEventListener('keydown',cancel);
    window.addEventListener('dragstart',start);window.addEventListener('dragend',end);
    return()=>{window.removeEventListener('dragstart',start);window.removeEventListener('dragend',end);window.removeEventListener('keydown',cancel);};
  },[channel]);
  useEffect(()=>{if(ready)post({type:'select',id:props.selected});},[ready,props.selected]);
  // Explicit guide navigation may scroll. Ordinary selection and dragging do not.
  useEffect(()=>{if(ready&&props.focusToken)post({type:'focus-selection',id:props.selected});},[ready,props.focusToken]);
  useEffect(()=>{if(ready)post({type:'mode',mode:props.mode});},[ready,props.mode]);
  useEffect(()=>{if(ready&&props.replay)post({type:'replay',id:props.selected});},[props.replay]);
  useEffect(()=>{if(ready&&props.jump)post({type:'follow',id:props.selected});},[props.jump]);
  useEffect(()=>{const el=scrollRef.current;if(!el)return;const measure=()=>setFitZoom(Math.max(.1,Math.min(1,(el.clientWidth-56)/props.width)));measure();const observer=new ResizeObserver(measure);observer.observe(el);return()=>observer.disconnect();},[props.width]);
  useEffect(()=>{if(ready&&props.align)post({type:'design-align',axis:props.align.axis});},[props.align]);
  useEffect(()=>{if(ready)post({type:'design-handle',value:props.transformHandle||'resize'});},[ready,props.transformHandle]);
  const externalPoint=(e:DragEvent<HTMLDivElement>)=>{
    const frame=ref.current,rect=frame?.getBoundingClientRect();if(!frame||!rect||!rect.width||!rect.height)return null;
    return {clientX:(e.clientX-rect.left)*frame.clientWidth/rect.width,clientY:(e.clientY-rect.top)*frame.clientHeight/rect.height,shiftKey:e.shiftKey};
  };
  const scale=props.autoFit?Math.min(props.zoom,fitZoom):props.zoom;
  return <div className="canvas-area"><div className="canvas-caption"><span>{props.project.entry}</span><span>{props.width}px <i/> {Math.round(scale*100)}% <i/> {props.preview?'运行预览':'实时编辑'}</span></div>
    <div className="canvas-scroll" ref={scrollRef}><div className="canvas-sizer" style={{width:props.width*scale,height:780*scale}}><div className="canvas-scale" style={{position:'absolute',width:props.width,transform:`scale(${scale})`,transformOrigin:'top left'}}>
      <iframe ref={ref} title="实时可编辑网页" sandbox="allow-scripts" srcDoc={src} style={{display:props.preview?'none':'block',width:props.width,height:780}}/>
      {props.preview&&<iframe title="隔离运行预览" sandbox="allow-scripts" srcDoc={standalonePreview(props.project)} style={{width:props.width,height:780}}/>}
      {resourceDrag&&!props.preview&&!props.locked&&<div data-mws-resource-drop-surface="" aria-hidden="true" style={{position:'absolute',inset:0,width:props.width,height:780,zIndex:1}} onDragOver={e=>{if(!Array.from(e.dataTransfer.types).includes('application/x-mws-resource'))return;e.preventDefault();e.dataTransfer.dropEffect='copy';const point=externalPoint(e);if(point)post({type:'external-drag-over',...point});}} onDragLeave={()=>post({type:'external-drag-cancel'})} onDrop={e=>{e.preventDefault();const point=externalPoint(e),id=e.dataTransfer.getData('application/x-mws-resource');if(point&&id)post({type:'external-resource-drop',id,...point});else post({type:'external-drag-cancel'});setResourceDrag(false);}}/>}
    </div></div></div>
    <div className="canvas-help">{props.preview?'脚本可运行 · 禁止网络请求、表单提交、弹窗和父页面访问':props.mode==='design'?'Shift 点选或框选 · 拖动边框移动、缩放、旋转 · Esc 取消':props.mode==='free'?'拖动改变位置，右下角改变尺寸 · 松手写回样式 · Esc 取消':'拖动组件实时调整排列 · Shift 拖入容器 · 松手写回 HTML · Esc 取消'}</div>
  </div>;
}
