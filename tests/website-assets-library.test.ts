import {it,expect} from 'vitest';
import {readFileSync} from 'node:fs';
import {unzipSync,strFromU8} from 'fflate';
import {WEBSITE_ASSET_MODULES,WEBSITE_ASSET_META,WEBSITE_ASSET_SNAPSHOT} from '../src/resources/website-assets-library';
import rawModules from '../src/resources/website-assets-library/modules.json';
import catalog from '../src/resources/website-assets-library/catalog.json';
import {createBlank,RESOURCES} from '../src/core/catalog';
import {insertResource,insertionPoint} from '../src/core/workbench';
import {moduleFromZip,validateModule} from '../src/core/modules';
import {sourceText,validateProject,attr,walk,parseHtml} from '../src/core/source';
import {parseProjectJson,saveProject,exportWebsite,readZip,resolvePath} from '../src/core/io';
import {exportSingleHtml} from '../src/core/export-html';
import {ProjectStore} from '../src/core/store';

it('registers the 31 static modules with provenance and excludes runtime/planned distributions',()=>{
  expect(WEBSITE_ASSET_SNAPSHOT.resources).toHaveLength(31);expect(new Set(RESOURCES.map(m=>m.id)).size).toBe(RESOURCES.length);
  const archive=unzipSync(readFileSync(new URL('../src/resources/website-assets-library/upstream/studio-components.zip',import.meta.url)));
  for(const record of catalog.modules){
    expect(record.runtime_required).toBe(false);const raw=moduleFromZip(archive[record.path]);expect(rawModules.find(m=>m.id===record.id)).toEqual(raw);
    const adapted=WEBSITE_ASSET_MODULES.find(m=>m.id===record.id)!;expect(WEBSITE_ASSET_META[adapted.id]).toBeDefined();expect(adapted.css).toContain('.wa-');expect(adapted.css).not.toMatch(/\.(?:mf-|qr-)/);expect(adapted.version).toBe('1.0.1');
    if(adapted.id==='foundation/pricing'){expect(adapted.version).toBe('1.0.1');expect(adapted.html).toContain('¥0');}else expect(adapted.html.replaceAll('wa-mf-','mf-').replaceAll('wa-qr-','qr-')).toBe(raw.html);
  }
  for(const planned of catalog.planned_effects)expect(RESOURCES.some(m=>m.id===planned.id)).toBe(false);
});

for(const module of WEBSITE_ASSET_MODULES)it(`${module.id}: duplicate, nested page, undo, reopen and standalone export`,()=>{
  expect(validateModule(module)).toEqual(module);
  const initial=createBlank(),store=new ProjectStore(initial);
  store.replace(insertResource(initial,module.id,insertionPoint(initial,'')),'添加组件');const first=store.getSnapshot().project;
  expect(validateProject(first)).toEqual([]);store.undo();expect(store.getSnapshot().project).toEqual(initial);store.redo();expect(store.getSnapshot().project).toEqual(first);
  let p=insertResource(first,module.id,insertionPoint(first,''));p={...p,entry:'pages/nested.html',files:{...p.files,'pages/nested.html':{kind:'text',content:sourceText(initial).replace('href="studio-theme.css"','href="../studio-theme.css"')}}};
  p=insertResource(p,module.id,insertionPoint(p,''));expect(validateProject(p)).toEqual([]);expect(p.modules).toEqual([module]);
  const css=Object.keys(p.files).filter(path=>p.files[path].content===module.css);expect(css).toHaveLength(1);
  for(const page of ['index.html','pages/nested.html']){
    const refs:(string|null)[]=[];walk(parseHtml(sourceText(p,page)),n=>{if(n.tagName==='link'&&attr(n,'rel')==='stylesheet')refs.push(resolvePath(page,attr(n,'href')!));});expect(refs.filter(path=>path===css[0])).toHaveLength(1);
  }
  const reopened=parseProjectJson(saveProject(p));expect(reopened).toEqual(p);const zip=readZip(exportWebsite(reopened));expect(strFromU8(zip[css[0]])).toBe(module.css);
  const html=exportSingleHtml(reopened);expect(html).toContain('MIT License');expect(html).not.toContain('Moveable');
});

it('retains installed manifests and user-edited CSS when the bundled library is reused',()=>{
  const module=WEBSITE_ASSET_MODULES.find(m=>m.id==='foundation/button-shine')!;let p=createBlank();const saved={...module,version:'0.9.0',html:'<div class="saved-button"><button>我的旧版本</button></div>',css:'.saved-button{color:purple}'};
  p={...p,modules:[saved]};p=insertResource(p,module.id,insertionPoint(p,''));const path=Object.keys(p.files).find(path=>p.files[path].content===saved.css)!;
  p={...p,files:{...p.files,[path]:{kind:'text',content:'.saved-button{color:blue}'}}};p=insertResource(p,module.id,insertionPoint(p,''));
  expect(p.modules).toEqual([saved]);expect(p.files[path].content).toContain('blue');expect(sourceText(p).match(/我的旧版本/g)).toHaveLength(2);
});
