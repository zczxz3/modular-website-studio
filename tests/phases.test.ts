import {it,expect} from 'vitest';
import {strToU8} from 'fflate';
import {createBlank,createPortfolio,BLOCKS} from '../src/core/catalog';
import {insertResource,insertionPoint} from '../src/core/workbench';
import {attr,elements,sourceText,validateProject} from '../src/core/source';
import {ProjectStore} from '../src/core/store';
import {applyXyz,removeXyz} from '../src/core/xyz';
import {applyAos,DEFAULT_AOS} from '../src/core/aos';
import {previewTree} from '../src/preview/document';
import {parseProjectJson,saveProject} from '../src/core/io';
import {exportSingleHtml} from '../src/core/export-html';
import {importImages,deleteImage,assetUsage,imageAssets} from '../src/core/assets';
import {replaceCoverSource} from '../src/core/covers';
it('installs scoped precompiled curated blocks with no external scripts or utilities at runtime',()=>{
 let p=createBlank();for(const block of BLOCKS.slice(1)){p=insertResource(p,block.id,insertionPoint(p,''));expect(validateProject(p)).toEqual([]);expect(block.css).not.toContain('@import');expect(block.css).toContain('.mws-curated');}
 const html=exportSingleHtml(p);expect(html).toContain('mws-curated');expect(html).not.toContain('cdn.tailwindcss');expect(html).toContain('Copyright');
});
it('exports AnimXYZ and disables conflicting entry effects, keeping undo atomic',()=>{
 const p=createBlank();p.files['vendor/animxyz-LICENSE.txt']={kind:'text',content:'KEEP USER NOTICE'};const id=elements(sourceText(p)).find(n=>n.tag==='h1')!.id,store=new ProjectStore(p);
 store.replace(applyXyz(p,id,'fade up small',800,200));const next=store.getSnapshot().project;expect(next.files['vendor/animxyz-LICENSE.txt'].content).toBe('KEEP USER NOTICE');
 expect(sourceText(parseProjectJson(saveProject(next)))).toContain('fade up small');
 expect(sourceText(next)).toContain('xyz="fade up small"');expect(exportSingleHtml(next)).toContain('--xyz-duration: 800ms');expect(previewTree(next).body).not.toBeNull();
 store.undo();expect(store.getSnapshot().project).toEqual(p);store.redo();expect(store.getSnapshot().project).toEqual(next);
 const aos=applyAos(next,id,DEFAULT_AOS);expect(attr(elements(sourceText(aos)).find(n=>n.id===id)!.node,'data-mws-xyz')).toBeUndefined();expect(sourceText(removeXyz(next,id))).not.toContain('xyz-in');
 expect(()=>applyXyz(p,id,'<script>')).toThrow();
});
it('imports batches atomically, deduplicates and blocks deleting referenced images',()=>{
 const p=createPortfolio(),bytes=strToU8('<svg xmlns="http://www.w3.org/2000/svg"></svg>');const next=importImages(p,[{name:'我的封面.svg',bytes},{name:'same.svg',bytes}]);expect(imageAssets(next).length).toBe(imageAssets(p).length+1);
 const path=Object.keys(next.files).find(p=>p.includes('image-我的封面'))!,id=elements(sourceText(next)).find(n=>n.tag==='img')!.id;
 const linked=replaceCoverSource(next,id,path,'');expect(assetUsage(linked,path)).toContain('index.html');expect(()=>deleteImage(linked,path)).toThrow('引用');expect(deleteImage(next,path)).toEqual(p);
 expect(()=>importImages(p,[{name:'okay.svg',bytes},{name:'bad.exe',bytes}])).toThrow();expect(imageAssets(p)).toHaveLength(2);
});
