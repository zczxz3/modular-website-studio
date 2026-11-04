import {useEffect,useRef} from 'react';

export default function ExportNotice({issues,onClose,onZip}:{issues:string[];onClose:()=>void;onZip:()=>void}){
  const ref=useRef<HTMLDialogElement>(null);
  useEffect(()=>{ref.current?.showModal();return()=>ref.current?.close();},[]);
  return <dialog ref={ref} className="export-notice" aria-labelledby="export-title" onCancel={e=>{e.preventDefault();onClose();}}>
    <h2 id="export-title">这个页面需要完整网站导出</h2>
    <p>以下内容无法完整放进一个 HTML 文件。网站 ZIP 可以保留项目里的页面、样式、脚本和素材。</p>
    <ul>{issues.map((issue,index)=><li key={index}>{issue}</li>)}</ul>
    <div className="export-notice-actions"><button autoFocus onClick={onClose}>返回继续编辑</button><button className="primary" onClick={onZip}>导出完整网站 ZIP</button></div>
  </dialog>;
}
