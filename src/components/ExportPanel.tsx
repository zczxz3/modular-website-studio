import {useEffect,useRef} from 'react';
interface Props {entry:string;home:string;pages:number;onClose:()=>void;onZip:()=>void;onHtml:()=>void;}
export default function ExportPanel(p:Props){
  const ref=useRef<HTMLDialogElement>(null);
  useEffect(()=>{const dialog=ref.current;dialog?.showModal();return()=>dialog?.close();},[]);
  return <dialog ref={ref} className="export-notice export-panel" aria-labelledby="delivery-title" onCancel={e=>{e.preventDefault();p.onClose();}}>
    <h2 id="delivery-title">把网站带走</h2><p>导出的是可独立打开的作品，图片、样式和已应用的特效一起保留。</p>
    <section className="delivery-choice"><div><strong>完整网站 · 推荐</strong><p>包含全部 {p.pages} 个页面。解压后打开 <code>{p.home}</code>；也可以把整个文件夹交给同学。</p></div><button className="primary" autoFocus onClick={p.onZip}>下载网站 ZIP</button></section>
    <section className="delivery-choice"><div><strong>单个 HTML</strong><p>只保存当前页 <code>{p.entry}</code>。有跨页链接或不支持的依赖时，会提示使用完整网站。</p></div><button onClick={p.onHtml}>下载单页 HTML</button></section>
    <p className="delivery-backup">明天继续修改：在首页打开最近草稿，或使用「下载可编辑工程」保留一份 .mws.json 备份。</p>
    <div className="export-notice-actions"><button onClick={p.onClose}>返回继续编辑</button></div>
  </dialog>;
}
