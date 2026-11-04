import {useEffect,useRef,useState} from 'react';
import Grapick from 'grapick';
import 'grapick/dist/grapick.min.css';
import './visual-tools.css';
import {DEFAULT_GRADIENT,isEditableGradient,normalizePickedGradient} from '../core/gradient';
interface Props {value:string;onApply:(value:string)=>void;onClose:()=>void;}
export default function GradientDialog(p:Props){
 const dialog=useRef<HTMLDialogElement>(null),host=useRef<HTMLDivElement>(null),picker=useRef<ReturnType<typeof Grapick>|null>(null);
 const [value,setValue]=useState(isEditableGradient(p.value)?p.value:DEFAULT_GRADIENT);
 const [error,setError]=useState('');
 useEffect(()=>{let active=true;dialog.current?.showModal();const gp=Grapick({el:host.current!,height:'46px',emptyColor:'#000000'});picker.current=gp;gp.setValue(value);gp.on('change',()=>{if(active)setValue(normalizePickedGradient(gp.getValue()));});return()=>{active=false;gp.destroy();picker.current=null;dialog.current?.close();};},[]);
 return <dialog ref={dialog} className="visual-tool-dialog gradient-dialog" aria-labelledby="gradient-title" onCancel={e=>{e.preventDefault();p.onClose();}}>
  <h2 id="gradient-title">编辑渐变背景</h2><p>点击色条添加色标，拖动调整位置，点击色标选颜色。修改先在这里预览，应用后写入作品。</p>
  {p.value&&!isEditableGradient(p.value)&&<p>当前背景包含未适配的配置；这里从新渐变开始，取消会保留原背景。</p>}<div className="gradient-preview" style={{backgroundImage:value}} aria-label="渐变预览"/><div className="gradient-host" ref={host}/>
  <label className="tool-control">方向<select aria-label="渐变方向" defaultValue="" onChange={e=>{if(e.target.value)picker.current?.setDirection(e.target.value);}}><option value="">保持当前方向</option><option value="0deg">从下到上</option><option value="90deg">从左到右</option><option value="135deg">斜向</option><option value="180deg">从上到下</option></select></label>
  <code className="gradient-value">{value}</code>{error&&<p role="alert">{error}</p>}
  <div className="tool-actions"><button onClick={p.onClose}>取消渐变</button><button className="primary" onClick={()=>{try{if(!CSS.supports('background-image',value)||!isEditableGradient(value))throw new Error('请保留 2–16 个有效色标，位置在 0% 到 100% 之间。');p.onApply(value);}catch(e){setError((e as Error).message);}}}>应用渐变</button></div>
 </dialog>;
}
