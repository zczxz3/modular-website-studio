import {it,expect} from 'vitest';
import {readFileSync} from 'node:fs';
import {zipSync,unzipSync,strToU8,strFromU8} from 'fflate';
import type {StudioModule} from '../src/core/types';
import {sha256,readWebsiteAssetsCatalog,mergeModuleCatalog} from '../src/core/module-catalog';
import {websiteAssetsZipProvider} from '../src/resources/website-assets-library/provider';
import {WEBSITE_ASSET_PROVIDER,WEBSITE_ASSET_SNAPSHOT,WEBSITE_ASSET_MODULES} from '../src/resources/website-assets-library';
import pin from '../src/resources/website-assets-library/provenance.json';
import {createWebsiteAssetsShelf} from '../src/resources/website-assets-library/shelf';
import {createBlank} from '../src/core/catalog';
import {insertResource,insertionPoint} from '../src/core/workbench';
import {ProjectStore} from '../src/core/store';
import {validateProject,sourceText} from '../src/core/source';
import {parseProjectJson,saveProject,readZip,exportWebsite} from '../src/core/io';
import {exportSingleHtml} from '../src/core/export-html';

const archive=new Uint8Array(readFileSync(new URL('../src/resources/website-assets-library/upstream/studio-components.zip',import.meta.url)));
const module:StudioModule={id:'foundation/new-card',version:'1.0.0',name:'New card',description:'Imported static content',html:'<article class="mf-new-card"><h2>来自组件集合</h2></article>',css:'.mf-new-card{color:navy}',permissions:[],dependencies:{}};
async function collection(modules=[module]){
  const files:Record<string,Uint8Array>={LICENSE:strToU8('MIT License\nfixture authors')};const records=[];
  for(const item of modules){const path='installable/'+item.id.replaceAll('/','--')+'.zip';const inner=zipSync({'module.json':strToU8(JSON.stringify(item)),LICENSE:strToU8('MIT License\nindividual fixture author')});files[path]=inner;records.push({id:item.id,kind:'studio-static-module-v1',runtime_required:false,path,sha256:await sha256(inner)});}
  files['studio-catalog.json']=strToU8(JSON.stringify({schema_version:1,studio_contract:'static-module-v1',modules:records}));return files;
}
function changeCatalog(files:Record<string,Uint8Array>,edit:(catalog:any)=>void){const catalog=JSON.parse(strFromU8(files['studio-catalog.json']));edit(catalog);return {...files,'studio-catalog.json':strToU8(JSON.stringify(catalog))};}

it('loads the reorganized pinned distribution through the versioned provider contract',async()=>{
  expect(await sha256(archive)).toBe(pin.sha256);expect(pin.sourcePath).toBe('studio/studio-components.zip');
  const {provider,revision}=await websiteAssetsZipProvider(archive);const snapshot=await provider.loadSnapshot(revision);
  expect(provider.id).toBe('website-assets');expect(revision).toBe('sha256:'+pin.sha256);expect(snapshot.resources.map(r=>r.module)).toEqual(WEBSITE_ASSET_MODULES);expect(snapshot.resources).toHaveLength(31);
  expect(snapshot.resources.every(r=>r.module.permissions.length===0&&Object.keys(r.module.dependencies).length===0)).toBe(true);
  expect(snapshot.resources.some(r=>/^E\d+/.test(r.module.id))).toBe(false);expect(snapshot.notice).toContain('MIT License');expect(snapshot.notice).toContain(pin.sha256);
  await expect(provider.loadSnapshot('main')).rejects.toThrow('版本不匹配');snapshot.resources[0].module.name='mutated consumer';expect((await provider.loadSnapshot(revision)).resources[0].module.name).not.toBe('mutated consumer');
});
it('keeps the bundled immutable provider abortable and revision-specific',async()=>{
  expect(await WEBSITE_ASSET_PROVIDER.loadSnapshot(pin.revision)).toEqual(WEBSITE_ASSET_SNAPSHOT);
  const abort=new AbortController();abort.abort();await expect(WEBSITE_ASSET_PROVIDER.loadSnapshot(pin.revision,abort.signal)).rejects.toThrow();await expect(readWebsiteAssetsCatalog(archive,abort.signal)).rejects.toThrow();
});
it('rejects corrupt checksums, missing files, duplicate IDs and runtime entries',async()=>{
  const files=await collection();
  for(const broken of [changeCatalog(files,c=>{c.modules[0].sha256='0'.repeat(64);}),changeCatalog(files,c=>{c.modules[0].path='installable/missing.zip';}),changeCatalog(files,c=>{c.modules.push(c.modules[0]);}),changeCatalog(files,c=>{c.modules[0].runtime_required=true;})])await expect(readWebsiteAssetsCatalog(zipSync(broken))).rejects.toThrow();
});
it('applies the same script/template/permission validation to hash-valid collection modules',async()=>{
  for(const bad of [{...module,html:'<template><img src="x" onerror="alert(1)"></template>'},{...module,permissions:['network']},{...module,html:'<script>alert(1)</script>'}])await expect(readWebsiteAssetsCatalog(zipSync(await collection([bad])))).rejects.toThrow();
  const files=await collection();await expect(readWebsiteAssetsCatalog(zipSync({...files,'../escape.js':strToU8('unsafe')}))).rejects.toThrow('路径');
});
it('preserves module-level licenses and rejects extra executable payloads',async()=>{
  const files=await collection();const snapshot=await readWebsiteAssetsCatalog(zipSync(files));expect(snapshot.notice).toContain('individual fixture author');
  const path='installable/foundation--new-card.zip';const inner=unzipSync(files[path]);inner['runtime.js']=strToU8('alert(1)');files[path]=zipSync(inner);const digest=await sha256(files[path]);
  await expect(readWebsiteAssetsCatalog(zipSync(changeCatalog(files,c=>{c.modules[0].sha256=digest;})))).rejects.toThrow('说明/许可证');
});
it('imports once, inserts a previously unknown ID, undoes, reopens and exports without upgrading saved modules',async()=>{
  const {provider,revision}=await websiteAssetsZipProvider(zipSync(await collection()));const snapshot=await provider.loadSnapshot(revision);
  const initial=createBlank(),store=new ProjectStore(initial);const merged=mergeModuleCatalog(initial,snapshot);expect(merged.added).toBe(1);expect(merged.kept).toBe(0);expect(sourceText(merged.project)).toBe(sourceText(initial));
  store.replace(merged.project,'导入组件集合');store.undo();expect(store.getSnapshot().project).toEqual(initial);store.redo();expect(store.getSnapshot().project).toEqual(merged.project);
  let p=insertResource(merged.project,module.id,insertionPoint(merged.project,''));const css=Object.keys(p.files).find(path=>p.files[path].content==='.wa-mf-new-card{color:navy}')!;
  p={...p,files:{...p.files,[css]:{kind:'text',content:'.wa-mf-new-card{color:purple}'}}};
  const updated={...snapshot,resources:[{kind:'component' as const,module:{...snapshot.resources[0].module,version:'9.0.0',html:'<p>do not replace</p>'}}]};
  const again=mergeModuleCatalog(p,updated);expect(again.added).toBe(0);expect(again.kept).toBe(1);expect(again.project).toBe(p);expect(p.modules[0].version).toBe('1.0.1');
  const reopened=parseProjectJson(saveProject(p));expect(reopened.files[css].content).toContain('purple');expect(validateProject(reopened)).toEqual([]);
  const zip=readZip(exportWebsite(reopened));expect(strFromU8(zip[css])).toContain('purple');expect(strFromU8(zip['index.html'])).toContain('来自组件集合');expect(Object.keys(zip).some(path=>path.startsWith('notices/'))).toBe(true);
  expect(exportSingleHtml(reopened)).toContain('individual fixture author');
});
it('does not partially register a collection when resource files collide',async()=>{
  const snapshot=await readWebsiteAssetsCatalog(zipSync(await collection()));const p=createBlank();const before=saveProject(p);
  const bad={...snapshot,files:{'index.html':{kind:'text' as const,content:'replace user page'}}};expect(()=>mergeModuleCatalog(p,bad)).toThrow('冲突');expect(saveProject(p)).toBe(before);expect(p.modules).toEqual([]);
  expect(()=>mergeModuleCatalog(p,{...snapshot,resources:[...snapshot.resources,...snapshot.resources]})).toThrow('重复');
});
it('embeds collection notices as inert comments without duplicating them on re-export',()=>{
  const initial=createBlank(),notice='Unique license --> <script>untrusted()</script>';
  const p={...initial,files:{...initial.files,'notices/catalog-abcd.txt':{kind:'text' as const,content:notice}}};
  const html=exportSingleHtml(p);expect(html).toContain('Unique license - -> &lt;script>');expect(html).not.toContain('<script>untrusted()');
  const again=exportSingleHtml({...p,files:{...p.files,[p.entry]:{kind:'text',content:html}}});expect(again.match(/Unique license/g)).toHaveLength(1);
});
it('opens the native upstream two-page shelf as independent editable projects',()=>{
  const a=createWebsiteAssetsShelf(),b=createWebsiteAssetsShelf();expect(a.id).not.toBe(b.id);expect(a.modules).toEqual(WEBSITE_ASSET_MODULES);expect(Object.keys(a.files).filter(path=>/\.html$/.test(path))).toHaveLength(2);expect(validateProject(a)).toEqual([]);
  for(const [path,file]of Object.entries(a.files))if(file.kind==='text'&&/\.(?:html|css)$/.test(path)){expect(file.content).not.toMatch(/class="mf-|class="qr-|\.(?:mf-|qr-)/);}
  expect(Object.entries(a.files).filter(([path])=>/\.html?$/.test(path)).some(([,file])=>file.content.includes('mf-pricing0'))).toBe(false);
  expect(readZip(exportWebsite(a))['WEBSITE_ASSETS_SOURCE.txt']).toBeDefined();expect(parseProjectJson(saveProject(a))).toEqual(a);
});
