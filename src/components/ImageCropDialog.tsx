import {useEffect,useRef,useState} from 'react';
import Cropper from 'cropperjs';
import './visual-tools.css';
interface Props {src:string;onApply:(png:Uint8Array)=>void;onClose:()=>void;}
export default function ImageCropDialog(p:Props){
 const dialog=useRef<HTMLDialogElement>(null),host=useRef<HTMLDivElement>(null),cropper=useRef<Cropper|null>(null),live=useRef(false);
 const [ready,setReady]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState('');
 useEffect(()=>{let cancelled=false;live.current=true;dialog.current?.showModal();const image=new Image();image.src=p.src;image.alt='待裁剪图片';
   const instance=new Cropper(image,{container:host.current!});cropper.current=instance;
   void instance.getCropperImage()?.$ready().then(img=>{if(cancelled)return;if(img.naturalWidth*img.naturalHeight>40_000_000)throw new Error('图片像素过大，请使用不超过四千万像素的图片。');setReady(true);}).catch(e=>{if(!cancelled)setError(e.message||'图片无法解码。');});
   return()=>{cancelled=true;live.current=false;instance.destroy();cropper.current=null;dialog.current?.close();};
 },[p.src]);
 async function apply(){setBusy(true);setError('');try{const selection=cropper.current?.getCropperSelection();if(!selection||selection.width<1||selection.height<1)throw new Error('请先拖出裁剪区域。');
   const width=Math.max(1,Math.round(Math.min(1600,1600*selection.width/selection.height)));
   const canvas=await selection.$toCanvas({width});const blob=await new Promise<Blob>((ok,fail)=>canvas.toBlob(b=>b?ok(b):fail(new Error('无法生成裁剪图片。')),'image/png'));
   const bytes=new Uint8Array(await blob.arrayBuffer());if(live.current)p.onApply(bytes);
 }catch(e){if(live.current)setError((e as Error).message);}finally{if(live.current)setBusy(false);}}
 return <dialog ref={dialog} className="visual-tool-dialog" aria-labelledby="crop-title" onCancel={e=>{e.preventDefault();if(!busy)p.onClose();}}>
  <h2 id="crop-title">裁剪图片</h2><p>拖动选框与边缘调整构图。应用后生成新图片，原图保留在工程中；可一次撤销。</p>
  <div ref={host} className="crop-host"/>
  <label className="tool-control">裁剪比例<select aria-label="裁剪比例" disabled={!ready||busy} onChange={e=>{const s=cropper.current?.getCropperSelection();if(s){s.aspectRatio=Number(e.target.value);s.$change(s.x,s.y,s.width,s.height,s.aspectRatio);}}}><option value="NaN">自由</option><option value="1">正方形</option><option value={4/3}>4:3 横幅</option><option value={3/4}>3:4 竖幅</option><option value={16/9}>16:9 宽幅</option></select></label>
  {error&&<p role="alert">{error}</p>}<div className="tool-actions"><button disabled={busy} onClick={p.onClose}>取消裁剪</button><button className="primary" disabled={!ready||busy||!!error} onClick={()=>void apply()}>{busy?'正在生成…':'应用裁剪'}</button></div>
 </dialog>;
}
