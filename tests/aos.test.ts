import {describe,it,expect} from 'vitest';
import {JSDOM} from 'jsdom';
import {strToU8} from 'fflate';
import {createBlank,createPortfolio} from '../src/core/catalog';
import {applyAos,aosFor,aosDependencies,animatedElements,DEFAULT_AOS} from '../src/core/aos';
import {elements,sourceText,attr,validateProject} from '../src/core/source';
import {transaction,ownStyle} from '../src/core/commands';
import {ProjectStore} from '../src/core/store';
import {insertResource,insertionPoint,applyReveal,DEFAULT_REVEAL} from '../src/core/workbench';
import {exportWebsite,readZip,saveProject,parseProjectJson,projectFromFiles} from '../src/core/io';
import {exportSingleHtml} from '../src/core/export-html';
import {previewTree,standalonePreview} from '../src/preview/document';
import javascript from '../src/vendor/aos/aos.js?raw';
import css from '../src/vendor/aos/aos.css?raw';
import license from '../src/vendor/aos/LICENSE.txt?raw';

describe('reused AOS source-to-export flow',()=>{
  it('inserts a real heading and keeps configuration/layout through atomic undo, project save and HTML export',()=>{
    let p=createBlank();p=insertResource(p,'workbench/heading',insertionPoint(p,''));
    const id=elements(sourceText(p)).find(node=>node.tag==='h2')!.id;
    p=transaction(p,[{type:'style',id,property:'translate',value:'40px 20px'}]);
    const store=new ProjectStore(p),config={...DEFAULT_AOS,delay:350,once:false};store.replace(applyAos(p,id,config));
    const saved=store.getSnapshot().project;expect(aosFor(saved,id)).toEqual(config);expect(animatedElements(saved).map(n=>n.id)).toContain(id);
    expect(sourceText(saved)).toContain('data-aos="fade-up"');expect(sourceText(saved)).toContain('data-aos-delay="350"');
    expect(ownStyle(saved,id,'translate')).toBe('40px 20px');expect(validateProject(saved)).toEqual([]);
    store.undo();expect(store.getSnapshot().project).toEqual(p);store.redo();
    const reopened=parseProjectJson(saveProject(store.getSnapshot().project));expect(aosFor(reopened,id)).toEqual(config);
    const zip=readZip(exportWebsite(reopened));expect(zip['vendor/aos-2.3.4/aos.js']).toEqual(strToU8(javascript));expect(zip['vendor/aos-2.3.4/aos.css']).toEqual(strToU8(css));
    const html=exportSingleHtml(reopened);expect(html).toContain(license);expect(html).toContain('data-aos-delay="350"');
    const imported=projectFromFiles({'index.html':strToU8(html)});expect(aosFor(imported,id)).toEqual(config);expect(exportSingleHtml(imported)).toContain('40px 20px');
    const updated=applyAos(imported,id,{...config,delay:500});expect(aosDependencies(updated)).toHaveLength(3);
    const document=new JSDOM(exportSingleHtml(updated)).window.document;expect(document.querySelectorAll('script')).toHaveLength(2);expect(aosFor(updated,id)?.delay).toBe(500);
  });
  it('shares dependencies across pages without overwriting project files and exports all pages/assets',()=>{
    let p=createPortfolio();p.files['vendor/aos-2.3.4/aos.js']={kind:'text',content:'window.userScript=true;'};
    const id=elements(sourceText(p)).find(node=>node.tag==='h1')!.id;p=applyAos(p,id,DEFAULT_AOS);p=applyAos(p,id,{...DEFAULT_AOS,delay:500});
    expect(p.files['vendor/aos-2.3.4/aos.js'].content).toContain('userScript');expect(aosDependencies(p)).toHaveLength(3);
    p={...p,entry:'pages/about.html'};const other=elements(sourceText(p)).find(n=>n.tag==='h1')!.id;p=applyAos(p,other,DEFAULT_AOS);
    expect(aosDependencies(p)).toHaveLength(3);expect(Object.values(p.files).filter(file=>file.content===javascript)).toHaveLength(1);
    const zip=readZip(exportWebsite(p));for(const path of Object.keys(p.files))expect(zip[path]).toBeDefined();
    expect(sourceText(p)).toContain('src="../vendor/aos-2.3.4/aos-1.js"');expect(sourceText(p)).toContain(license);
    expect(()=>applyAos(p,other,{...DEFAULT_AOS,duration:651})).toThrow();expect(()=>applyAos(p,other,{...DEFAULT_AOS,delay:10000})).toThrow();
  });
  it('keeps source attributes while the editing projection stays visible and excludes project scripts',()=>{
    let p=createBlank();const id=elements(sourceText(p)).find(n=>n.tag==='h1')!.id;p=applyReveal(p,id,DEFAULT_REVEAL);p=applyAos(p,id,DEFAULT_AOS);
    expect(attr(elements(sourceText(p)).find(n=>n.id===id)!.node,'data-mws-reveal')).toBeUndefined();
    const tree=JSON.stringify(previewTree(p).body);expect(tree).not.toContain('"data-aos":');expect(tree).not.toContain('"tag":"script"');expect(sourceText(p)).toContain('data-aos="fade-up"');
    p=applyReveal(p,id,DEFAULT_REVEAL);expect(aosFor(p,id)).toBeNull();p=applyAos(p,id,DEFAULT_AOS);p=applyAos(p,id,null);expect(aosFor(p,id)).toBeNull();
  });
  it('executes the real vendored library in standalone HTML and preview, including reduced motion',async()=>{
    let p=createBlank();const id=elements(sourceText(p)).find(n=>n.tag==='h1')!.id;p=applyAos(p,id,{...DEFAULT_AOS,delay:150});
    for(const reduced of [false,true])for(const html of [exportSingleHtml(p),standalonePreview(p)]){
      const dom=new JSDOM(html,{runScripts:'dangerously',resources:'usable',url:'https://local.test/index.html',beforeParse(window){window.matchMedia=()=>({matches:reduced,media:'',onchange:null,addListener(){},removeListener(){},addEventListener(){},removeEventListener(){},dispatchEvent(){return true;}});}});
      try{
        await new Promise<void>((resolve,reject)=>{const timer=setTimeout(()=>reject(new Error('Exported AOS failed to load')),3000);dom.window.addEventListener('load',()=>{clearTimeout(timer);resolve();},{once:true});});
        const heading=dom.window.document.querySelector('h1')!;
        if(reduced){expect(heading.hasAttribute('data-aos')).toBe(false);expect(heading.classList.contains('aos-init')).toBe(false);}
        else{expect(heading.classList.contains('aos-init')).toBe(true);expect(heading.classList.contains('aos-animate')).toBe(true);expect(heading.getAttribute('data-aos-delay')).toBe('150');}
      }finally{dom.window.close();}
    }
  });
});
