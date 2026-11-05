import {strFromU8} from 'fflate';
import type {Project,ProjectFile,StudioModule} from './types';
import type {ModuleCatalogProvider,ModuleCatalogSnapshot} from './resource-contract';
import {MAX_BYTES,readZip,safePath} from './io';
import {validateModule} from './module-validation';

function checkAbort(signal?:AbortSignal){if(signal?.aborted)throw signal.reason||new DOMException('已取消导入。','AbortError');}
export async function sha256(bytes:Uint8Array){
  if(!globalThis.crypto?.subtle)throw new Error('组件包校验需要 HTTPS 或本机 localhost 地址。');
  const hash=await crypto.subtle.digest('SHA-256',new Uint8Array(bytes).buffer);
  return Array.from(new Uint8Array(hash),n=>n.toString(16).padStart(2,'0')).join('');
}

/** Read the upstream distribution index; never evaluate its runtime tarball. */
export async function readWebsiteAssetsCatalog(bytes:Uint8Array,signal?:AbortSignal):Promise<ModuleCatalogSnapshot>{
  checkAbort(signal);const archive=readZip(bytes);
  if(!archive['studio-catalog.json']||!archive.LICENSE)throw new Error('组件集合需要 studio-catalog.json 和 LICENSE；单模块请使用模块 ZIP 入口。');
  const catalog=JSON.parse(strFromU8(archive['studio-catalog.json']));
  if(catalog.schema_version!==1||catalog.studio_contract!=='static-module-v1'||!Array.isArray(catalog.modules)||!catalog.modules.length||catalog.modules.length>200)throw new Error('不是受支持的静态组件集合（static-module-v1）。');
  const ids=new Set<string>(),paths=new Set<string>(),resources:ModuleCatalogSnapshot['resources'][number][]=[];
  const licenses=new Set([strFromU8(archive.LICENSE)]);
  let expanded=Object.values(archive).reduce((sum,file)=>sum+file.length,0);
  let fileCount=Object.keys(archive).length;
  for(const record of catalog.modules){
    checkAbort(signal);
    if(!record||record.kind!=='studio-static-module-v1'||record.runtime_required!==false||typeof record.id!=='string'||typeof record.path!=='string'||!/^installable\/[a-z0-9-]+\.zip$/.test(record.path)||typeof record.sha256!=='string'||!/^[a-f0-9]{64}$/.test(record.sha256)||ids.has(record.id)||paths.has(record.path))throw new Error('组件索引无效或有重复 ID / 路径。');
    ids.add(record.id);paths.add(record.path);
    const packed=archive[record.path];if(!packed||await sha256(packed)!==record.sha256)throw new Error('组件校验失败：'+record.id);
    checkAbort(signal);const files=readZip(packed);expanded+=Object.values(files).reduce((sum,file)=>sum+file.length,0);
    fileCount+=Object.keys(files).length;
    if(expanded>MAX_BYTES||fileCount>500)throw new Error('嵌套组件展开后超过 20 MB 或 500 个文件。');
    // v1 manifests are self-contained HTML/CSS. Unreferenced inner payloads are
    // rejected rather than silently installing executable or missing resources.
    if(!files['module.json']||Object.keys(files).some(path=>path!=='module.json'&&!/^(?:LICENSE(?:\.(?:txt|md))?|README\.md)$/i.test(path)))throw new Error('静态子包只能包含根目录 module.json 和说明/许可证：'+record.id);
    for(const [path,file]of Object.entries(files))if(/^LICENSE/i.test(path))licenses.add(strFromU8(file));
    const module=validateModule(JSON.parse(strFromU8(files['module.json'])));
    if(module.id!==record.id)throw new Error('组件 ID 与索引不一致：'+record.id);
    resources.push({kind:'component',module});
  }
  const digest=await sha256(bytes);checkAbort(signal);
  return {schemaVersion:1,providerId:'website-assets',revision:'sha256:'+digest,resources,files:{},
    notice:`Website Assets static-module-v1 collection\nArchive SHA-256: ${digest}\nOnly validated static modules are installed. Runtime tarballs and planned effects are excluded. Existing project modules and edited styles are retained.\n\n${[...licenses].join('\n\n')}`};
}

/** Immutable local transport for the reserved provider contract. No refresh or
 * network fetch occurs when reopening an existing project. */
export function immutableCatalogProvider(snapshot:ModuleCatalogSnapshot):ModuleCatalogProvider{
  const frozen=structuredClone(snapshot);
  return {id:frozen.providerId,async loadSnapshot(revision,signal){
    checkAbort(signal);if(revision!==frozen.revision)throw new Error('组件快照版本不匹配，请明确选择要导入的发行包。');
    await Promise.resolve();checkAbort(signal);return structuredClone(frozen);
  }};
}

/** Prepare the whole result before a caller commits a single undo transaction. */
export function mergeModuleCatalog(project:Project,snapshot:ModuleCatalogSnapshot):{project:Project;added:number;kept:number}{
  if(snapshot.schemaVersion!==1||!/^[@a-z0-9][a-z0-9@/_.-]{0,79}$/.test(snapshot.providerId)||!/^[a-zA-Z0-9:._-]{1,100}$/.test(snapshot.revision)||!Array.isArray(snapshot.resources)||snapshot.resources.length>200||typeof snapshot.notice!=='string')throw new Error('组件快照无效。');
  const ids=new Set<string>();const incoming:StudioModule[]=snapshot.resources.map(resource=>{
    if(!['component','block'].includes(resource.kind))throw new Error('组件类型不受支持。');
    const module=validateModule(resource.module);if(ids.has(module.id))throw new Error('组件集合含重复 ID：'+module.id);ids.add(module.id);return module;
  });
  const existing=new Set(project.modules.map(module=>module.id)),additions=incoming.filter(module=>!existing.has(module.id));
  const files:Record<string,ProjectFile>={...project.files};let changed=false;
  for(const [path,file]of Object.entries(snapshot.files)){
    safePath(path);if(!file||typeof file.content!=='string'||!['text','asset'].includes(file.kind))throw new Error('组件资源无效：'+path);
    if(files[path]&&(files[path].kind!==file.kind||files[path].content!==file.content))throw new Error('组件资源与工程文件冲突，原文件已保留：'+path);
    if(!files[path]){files[path]={...file};changed=true;}
  }
  // An injective key retains several library revisions without overwriting an
  // author's notices or inventing an automatic module-upgrade operation.
  const key=Array.from(snapshot.providerId+'@'+snapshot.revision,c=>c.charCodeAt(0).toString(16).padStart(2,'0')).join('');
  const noticePath='notices/catalog-'+key+'.txt',old=files[noticePath];
  if(old&&(old.kind!=='text'||old.content!==snapshot.notice))throw new Error('组件来源记录冲突，原文件已保留。');
  if(!old){files[noticePath]={kind:'text',content:snapshot.notice};changed=true;}
  return {project:additions.length||changed?{...project,modules:[...project.modules,...additions],files}:project,added:additions.length,kept:incoming.length-additions.length};
}
