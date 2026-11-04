import {describe,it,expect} from 'vitest';
import {strToU8} from 'fflate';
import {createPortfolio,COVERS} from '../src/core/catalog';
import {replaceCover,replaceUploadedImage,applyReveal,DEFAULT_REVEAL,revealFor} from '../src/core/workbench';
import {coverGroupSize,replaceSolidCover,setCoverCrop,setCoverFit,setCoverAlt} from '../src/core/covers';
import {attr,elements,sourceText,validateProject} from '../src/core/source';
import {transaction,ownStyle} from '../src/core/commands';
import {ProjectStore} from '../src/core/store';
import {parseProjectJson,saveProject,exportWebsite,readZip,projectFromFiles,resolvePath} from '../src/core/io';
import type {Project} from '../src/core/types';

const cover=(project:Project,key:string,page=project.entry)=>elements(sourceText(project,page)).find(node=>node.tag==='img'&&attr(node.node,'data-mws-cover')===key)!;
const photo='<svg xmlns="http://www.w3.org/2000/svg" width="300" height="600"><rect width="300" height="600" fill="#286c70"></rect></svg>';

describe('linked portfolio covers remain source-backed',()=>{
  it('ships real detail pages with matching cover keys and local navigation',()=>{
    const p=createPortfolio();
    expect(validateProject(p)).toEqual([]);
    for(const key of ['work-space','work-tide']){
      const home=cover(p,key),page=`pages/${key}.html`,detail=cover(p,key,page);
      expect(home).toBeDefined();expect(detail).toBeDefined();expect(home.id).not.toBe(detail.id);
      expect(coverGroupSize(p,home.id)).toBe(2);
      expect(sourceText(p,page)).toContain('lang="zh-CN"');
      expect(sourceText(p)).toContain(`href="${page}"`);
      expect(resolvePath(page,attr(detail.node,'src')!)).toBe(attr(home.node,'src'));
    }
    expect(coverGroupSize(p,cover(p,'hero').id)).toBe(1);
  });

  it('replaces matching covers from a detail page as one undoable edit without changing shared-artwork neighbours',()=>{
    let p=createPortfolio();const home=cover(p,'work-tide'),detail=cover(p,'work-tide','pages/work-tide.html');
    p=transaction(p,[{type:'style',id:home.id,property:'translate',value:'30px 12px'},{type:'style',id:home.id,property:'border-radius',value:'19px'}]);
    p=applyReveal(p,home.id,DEFAULT_REVEAL);
    p={...p,entry:'pages/work-tide.html'};
    p=transaction(p,[{type:'attribute',id:detail.id,name:'srcset',value:'old-small.png 1x, old-large.png 2x'},{type:'attribute',id:detail.id,name:'sizes',value:'100vw'},{type:'style',id:detail.id,property:'width',value:'400px'}]);
    const original=p,store=new ProjectStore(p),heroBefore=cover(p,'hero','index.html'),otherBefore=cover(p,'work-space','index.html');
    store.replace(replaceUploadedImage(p,detail.id,strToU8(photo),'my-portrait.svg'),'替换作品封面');
    const next=store.getSnapshot().project,newHome=cover(next,'work-tide','index.html'),newDetail=cover(next,'work-tide');
    const path=attr(newHome.node,'src')!;
    expect(next.entry).toBe('pages/work-tide.html');expect(path).toMatch(/^assets\/image-.*\.svg$/);
    expect(attr(newDetail.node,'src')).toBe('../'+path);expect(next.files[path].kind).toBe('asset');
    expect(attr(newDetail.node,'srcset')).toBeUndefined();expect(attr(newDetail.node,'sizes')).toBeUndefined();
    expect(attr(newHome.node,'alt')).toBe('');expect(attr(newDetail.node,'alt')).toBe('');
    expect(newHome.id).toBe(home.id);expect(newDetail.id).toBe(detail.id);
    expect(ownStyle(next,home.id,'translate')).toBe('30px 12px');expect(ownStyle(next,home.id,'border-radius')).toBe('19px');expect(ownStyle(next,detail.id,'width')).toBe('400px');
    expect(revealFor({...next,entry:'index.html'},home.id)).toEqual(DEFAULT_REVEAL);
    expect(cover(next,'hero','index.html').node.attrs).toEqual(heroBefore.node.attrs);
    expect(cover(next,'work-space','index.html').node.attrs).toEqual(otherBefore.node.attrs);
    expect(sourceText(next,'pages/about.html')).toBe(sourceText(original,'pages/about.html'));
    store.undo();expect(store.getSnapshot().project).toEqual(original);store.redo();expect(store.getSnapshot().project).toEqual(next);
  });

  it('keeps independent local artwork when choosing the library or a reusable solid cover',()=>{
    let p=createPortfolio();const id=cover(p,'work-space').id;
    p.files[COVERS[0].path]={kind:'text',content:'<svg xmlns="http://www.w3.org/2000/svg"><title>My original artwork</title></svg>'};
    p=replaceCover(p,id,'tidal');const selectedPath=attr(cover(p,'work-space').node,'src')!;
    expect(selectedPath).not.toBe(COVERS[0].path);expect(p.files[COVERS[0].path].content).toContain('My original artwork');
    expect(attr(cover(p,'work-space','pages/work-space.html').node,'src')).toBe('../'+selectedPath);
    expect(attr(cover(p,'hero').node,'src')).toBe(COVERS[0].path);
    p.files['assets/cover-123abc.svg']={kind:'text',content:'<svg xmlns="http://www.w3.org/2000/svg"><title>Keep this file</title></svg>'};
    p=replaceSolidCover(p,id,'#123ABC');const solidPath=attr(cover(p,'work-space').node,'src')!;
    expect(solidPath).toBe('assets/cover-123abc-1.svg');expect(p.files['assets/cover-123abc.svg'].content).toContain('Keep this file');
    expect(p.files[solidPath].content).toContain('fill="#123abc"');
    expect(attr(cover(p,'work-space').node,'data-mws-cover-color')).toBe('#123abc');
    expect(attr(cover(p,'work-space','pages/work-space.html').node,'alt')).toBe('纯色作品封面');
    const files=Object.keys(p.files);p=replaceSolidCover(p,id,'#123abc');expect(Object.keys(p.files)).toEqual(files);
    expect(()=>replaceSolidCover(p,id,'red')).toThrow('六位');expect(()=>replaceSolidCover(p,id,'#123abc" onload="x')).toThrow();
    p=replaceUploadedImage(p,id,strToU8(photo),'cover.svg');
    expect(attr(cover(p,'work-space').node,'data-mws-cover-color')).toBeUndefined();
    expect(attr(cover(p,'work-space','pages/work-space.html').node,'data-mws-cover-color')).toBeUndefined();
  });

  it('shares crop, fit and alternative text without changing dimensions, then survives project and ZIP reopen',()=>{
    let p=createPortfolio();const home=cover(p,'work-space'),detail=cover(p,'work-space','pages/work-space.html'),hero=cover(p,'hero');
    p=transaction(p,[{type:'style',id:home.id,property:'height',value:'230px'}]);
    p=replaceUploadedImage(p,home.id,strToU8(photo),'portrait.svg');
    p=setCoverCrop(p,home.id,'50% 25%');p=setCoverFit(p,home.id,'cover');p=setCoverAlt(p,home.id,'林间的第一件作品，竖幅构图');
    expect(()=>setCoverCrop(p,home.id,'101% 25%')).toThrow();expect(()=>setCoverCrop(p,home.id,'50% 25%;color:red')).toThrow();
    expect(ownStyle(p,hero.id,'object-position')).toBe('');expect(ownStyle(p,home.id,'height')).toBe('230px');
    const saved=parseProjectJson(saveProject(p)),zip=readZip(exportWebsite(saved)),reopened=projectFromFiles(zip);
    for(const target of [saved,reopened]){
      expect(ownStyle(target,home.id,'object-position')).toBe('50% 25%');expect(ownStyle(target,detail.id,'object-position')).toBe('50% 25%');
      expect(ownStyle(target,home.id,'object-fit')).toBe('cover');expect(ownStyle(target,detail.id,'object-fit')).toBe('cover');
      for(const page of ['index.html','pages/work-space.html']){
        const node=cover(target,'work-space',page),path=resolvePath(page,attr(node.node,'src')!)!;
        expect(attr(node.node,'alt')).toBe('林间的第一件作品，竖幅构图');expect(zip[path]).toEqual(strToU8(photo));
      }
      expect(sourceText(target,'index.html')).toContain('href="pages/work-space.html"');
    }
    p=setCoverCrop(p,home.id,'');p=setCoverFit(p,home.id,'');
    expect(ownStyle(p,home.id,'object-position')).toBe('');expect(ownStyle(p,detail.id,'object-fit')).toBe('');expect(ownStyle(p,home.id,'height')).toBe('230px');
  });

  it('makes a copied work cover independent while the original and its detail page stay linked',()=>{
    let p=createPortfolio();const original=cover(p,'work-space'),detail=cover(p,'work-space','pages/work-space.html');
    p=replaceSolidCover(p,original.id,'#286c70');p=setCoverCrop(p,original.id,'50% 25%');
    const article=elements(sourceText(p)).find(node=>node.tag==='article'&&node.loc.startOffset<original.loc.startOffset&&node.loc.endOffset>original.loc.endOffset)!;
    const store=new ProjectStore(p);store.dispatch([{type:'duplicate',id:article.id}]);
    const duplicated=store.getSnapshot().project;
    const clone=elements(sourceText(duplicated)).find(node=>node.tag==='img'&&attr(node.node,'data-mws-cover')?.startsWith('cover-copy-'))!;
    const cloneKey=attr(clone.node,'data-mws-cover')!,originalPath=attr(cover(duplicated,'work-space').node,'src');
    expect(coverGroupSize(duplicated,clone.id)).toBe(1);expect(coverGroupSize(duplicated,original.id)).toBe(2);
    expect(ownStyle(duplicated,clone.id,'object-position')).toBe('50% 25%');
    expect(sourceText(duplicated).match(/href="pages\/work-space.html"/g)).toHaveLength(2);
    store.undo();expect(store.getSnapshot().project).toEqual(p);store.redo();expect(store.getSnapshot().project).toEqual(duplicated);
    store.replace(replaceUploadedImage(duplicated,clone.id,strToU8(photo),'copy.svg'),'替换副本图片');
    const uploaded=store.getSnapshot().project;
    expect(attr(cover(uploaded,cloneKey).node,'src')).not.toBe(originalPath);
    expect(attr(cover(uploaded,'work-space').node,'src')).toBe(originalPath);
    expect(attr(cover(uploaded,'work-space','pages/work-space.html').node,'src')).toBe('../'+originalPath);
    store.undo();expect(store.getSnapshot().project).toEqual(duplicated);store.redo();expect(store.getSnapshot().project).toEqual(uploaded);
    const solid=setCoverCrop(replaceSolidCover(uploaded,clone.id,'#abcdef'),clone.id,'100% 50%');
    expect(attr(cover(solid,cloneKey).node,'data-mws-cover-color')).toBe('#abcdef');
    expect(attr(cover(solid,'work-space').node,'data-mws-cover-color')).toBe('#286c70');
    expect(ownStyle(solid,original.id,'object-position')).toBe('50% 25%');expect(ownStyle(solid,detail.id,'object-position')).toBe('50% 25%');
    const reopened=parseProjectJson(saveProject(solid)),changed=replaceCover(reopened,original.id,'arches');
    expect(attr(cover(changed,'work-space','pages/work-space.html').node,'src')).toBe('../'+attr(cover(changed,'work-space').node,'src'));
    expect(attr(cover(changed,cloneKey).node,'data-mws-cover-color')).toBe('#abcdef');expect(ownStyle(changed,clone.id,'object-position')).toBe('100% 50%');
  });

  it('preserves cover relationships inside a copied subtree using distinct new keys per source group',()=>{
    let p=createPortfolio();const article=elements(sourceText(p)).find(node=>node.tag==='article')!;
    p=transaction(p,[{type:'insert',parentId:article.id,html:'<img data-mws-cover="work-space" src="assets/arches.svg" alt="同组细节"><img data-mws-cover="work-tide" src="assets/tidal.svg" alt="另一组封面">'}]);
    p=transaction(p,[{type:'duplicate',id:article.id}]);
    const copies=elements(sourceText(p)).filter(node=>node.tag==='img'&&attr(node.node,'data-mws-cover')?.startsWith('cover-copy-'));
    expect(copies).toHaveLength(3);
    const keys=copies.map(node=>attr(node.node,'data-mws-cover')!);
    expect(keys[0]).toBe(keys[1]);expect(keys[2]).not.toBe(keys[0]);
    p=replaceSolidCover(p,copies[0].id,'#334455');
    expect(coverGroupSize(p,copies[0].id)).toBe(2);expect(coverGroupSize(p,copies[2].id)).toBe(1);
    const updated=elements(sourceText(p)).filter(node=>copies.some(copy=>copy.id===node.id));
    expect(attr(updated[0].node,'src')).toBe(attr(updated[1].node,'src'));
    expect(attr(updated[2].node,'src')).toBe('assets/tidal.svg');
    expect(attr(cover(p,'work-space').node,'src')).toBe('assets/arches.svg');
    expect(attr(cover(p,'work-space','pages/work-space.html').node,'src')).toBe('../assets/arches.svg');
  });
});
