import {describe,it,expect} from 'vitest';
import postcss from 'postcss';
import {JSDOM} from 'jsdom';
import {strToU8} from 'fflate';
import {createBlank,createPortfolio} from '../src/core/catalog';
import {applyCssEffect,applicableEffects,cssEffectFor,EFFECT_CSS} from '../src/core/effects';
import {applyReveal,DEFAULT_REVEAL,revealFor} from '../src/core/workbench';
import {attr,elements,sourceText,validateProject} from '../src/core/source';
import {ownStyle,transaction} from '../src/core/commands';
import {ProjectStore} from '../src/core/store';
import {exportWebsite,parseProjectJson,projectFromFiles,readZip,saveProject} from '../src/core/io';
import {exportSingleHtml} from '../src/core/export-html';
import {previewTree} from '../src/preview/document';

const node=(project:ReturnType<typeof createBlank>,tag:string)=>elements(sourceText(project)).find(item=>item.tag===tag)!;
describe('source-backed beginner effects',()=>{
  it('offers only effects appropriate to the selected element',()=>{
    const p=createPortfolio();
    expect(applicableEffects(p,node(p,'h1').id).map(effect=>effect.id)).toEqual(['text-outline']);
    expect(applicableEffects(p,node(p,'img').id).map(effect=>effect.id)).toEqual(['hover-zoom']);
    expect(applicableEffects(p,node(p,'a').id).map(effect=>effect.id)).toEqual(['outline-hover']);
    expect(applicableEffects(p,node(p,'section').id).map(effect=>effect.id)).toEqual(['hover-zoom','frosted']);
    expect(()=>applyCssEffect(p,node(p,'img').id,'text-outline')).toThrow('不适用');
    expect(applicableEffects(p,node(p,'body').id)).toEqual([]);
  });

  it('preserves dragged styles, identity and fade through applying, removing, undo and saved-project reopening',()=>{
    let p=createPortfolio();const id=node(p,'img').id;
    p=transaction(p,[{type:'style',id,property:'translate',value:'60px 30px'},{type:'style',id,property:'transform',value:'rotate(4deg)'},{type:'style',id,property:'max-width',value:'420px'}]);
    p=applyReveal(p,id,DEFAULT_REVEAL);const store=new ProjectStore(p),before=store.getSnapshot().project;
    store.replace(applyCssEffect(before,id,'hover-zoom'),'悬停缩放');const after=store.getSnapshot().project;
    expect(cssEffectFor(after,id)).toBe('hover-zoom');expect(ownStyle(after,id,'translate')).toBe('60px 30px');expect(ownStyle(after,id,'transform')).toBe('rotate(4deg)');expect(revealFor(after,id)).toEqual(DEFAULT_REVEAL);
    store.undo();expect(store.getSnapshot().project).toEqual(before);store.redo();expect(store.getSnapshot().project).toEqual(after);
    const saved=parseProjectJson(saveProject(after)),removed=applyCssEffect(saved,id,null);
    expect(cssEffectFor(removed,id)).toBeNull();expect(ownStyle(removed,id,'translate')).toBe('60px 30px');expect(ownStyle(removed,id,'max-width')).toBe('420px');expect(revealFor(removed,id)).toEqual(DEFAULT_REVEAL);
    expect(node(removed,'img').id).toBe(id);expect(validateProject(removed)).toEqual([]);
    const properties:string[]=[];postcss.parse(EFFECT_CSS).walkDecls(decl=>{properties.push(decl.prop);});
    expect(properties).not.toContain('translate');expect(properties).not.toContain('transform');expect(EFFECT_CSS).toContain('prefers-reduced-motion:no-preference');
  });

  it('uses one collision-safe stylesheet across multiple pages without changing author files',()=>{
    let p=createPortfolio();p.files['studio-effects.css']={kind:'text',content:'.original{color:purple}'};
    p=applyCssEffect(p,node(p,'h1').id,'text-outline');p=applyCssEffect(p,node(p,'img').id,'hover-zoom');
    p={...p,entry:'pages/about.html'};p=applyCssEffect(p,node(p,'h1').id,'text-outline');
    expect(p.files['studio-effects.css'].content).toBe('.original{color:purple}');
    const files=Object.keys(p.files).filter(path=>p.files[path].content===EFFECT_CSS);expect(files).toEqual(['studio-effects-1.css']);
    expect(sourceText(p,'index.html').match(/href="studio-effects-1.css"/g)).toHaveLength(1);
    expect(sourceText(p).match(/href="\.\.\/studio-effects-1.css"/g)).toHaveLength(1);
    expect(readZip(exportWebsite(p))['studio-effects-1.css']).toEqual(strToU8(EFFECT_CSS));
    expect(previewTree(p).css).toContain(EFFECT_CSS.trim());
    expect(JSON.stringify(previewTree(p).body)).not.toContain('"tag":"script"');
  });

  it('keeps both independent copied effects and movement through single HTML export and reimport',()=>{
    let p=createBlank();const id=node(p,'h1').id;
    p=transaction(p,[{type:'style',id,property:'translate',value:'40px 20px'}]);p=applyCssEffect(p,id,'text-outline');
    p=transaction(p,[{type:'duplicate',id}]);const second=elements(sourceText(p)).filter(item=>item.tag==='h1')[1].id;
    p=applyCssEffect(p,second,null);
    const html=exportSingleHtml(p),reopened=projectFromFiles({'index.html':strToU8(html)}),dom=new JSDOM(exportSingleHtml(reopened));
    try{
      const headings=dom.window.document.querySelectorAll('h1');
      expect(headings[0].getAttribute('data-mws-css-effect')).toBe('text-outline');expect(headings[1].hasAttribute('data-mws-css-effect')).toBe(false);
      expect(dom.window.getComputedStyle(headings[0]).translate).toBe('40px 20px');expect(dom.window.getComputedStyle(headings[1]).translate).toBe('40px 20px');
      expect(dom.window.document.querySelector('link[href="studio-effects.css"]')).toBeNull();
      expect(cssEffectFor(reopened,id)).toBe('text-outline');expect(attr(node(reopened,'h1').node,'data-mws-id')).toBe(id);
    }finally{dom.window.close();}
  });
});
