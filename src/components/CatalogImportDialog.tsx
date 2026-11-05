import type {Project} from '../core/types';
import type {ModuleCatalogSnapshot} from '../core/resource-contract';
import {useEffect,useRef} from 'react';

export default function CatalogImportDialog({snapshot,project,locked,onConfirm,onCancel}:{snapshot:ModuleCatalogSnapshot;project:Project;locked:boolean;onConfirm:()=>void;onCancel:()=>void}){
  const installed=new Set(project.modules.map(module=>module.id));
  const dialog=useRef<HTMLDialogElement>(null);
  useEffect(()=>{const element=dialog.current!;element.showModal();return()=>element.close();},[]);
  const kept=snapshot.resources.filter(resource=>installed.has(resource.module.id)).length;
  return <dialog ref={dialog} aria-labelledby="catalog-import-title" className="catalog-import-dialog" onCancel={e=>{e.preventDefault();onCancel();}}>
    <p className="eyebrow-ui">WEBSITE ASSETS</p><h2 id="catalog-import-title">导入组件集合</h2>
    <p>已校验 {snapshot.resources.length} 个静态组件。确认后加入当前工程的组件列表，再逐个添加到画布。</p>
    <div className="catalog-import-summary"><strong>新增 {snapshot.resources.length-kept} 个</strong><span>保留已有 {kept} 个</span></div>
    <p>相同 ID 使用工程现有版本，已插入的内容和手改样式保留。动态运行包、待实现特效不会安装。</p>
    <details><summary>查看组件与校验版本</summary><code>{snapshot.revision}</code><ul>{snapshot.resources.map(resource=><li key={resource.module.id}>{resource.module.name}<small>{resource.module.id}@{resource.module.version}</small></li>)}</ul></details>
    <p className="hint">可一次撤销。保存工程后可离线继续使用。</p>{locked&&<p role="alert">工程已变化或源码待修复，请取消后重新导入。</p>}
    <div className="catalog-import-actions"><button autoFocus onClick={onCancel}>取消</button><button className="primary" disabled={locked} onClick={onConfirm}>确认导入组件</button></div>
  </dialog>;
}
