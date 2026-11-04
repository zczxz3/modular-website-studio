import {it,expect} from 'vitest';
import {JSDOM} from 'jsdom';
import {strToU8} from 'fflate';
import {createBlank} from '../src/core/catalog';
import {insertResource,insertionPoint} from '../src/core/workbench';
import {setInteractionDefault} from '../src/core/interactions';
import {elements,attr,sourceText} from '../src/core/source';
import {transaction} from '../src/core/commands';
import {projectFromFiles} from '../src/core/io';
import {exportSingleHtml} from '../src/core/export-html';
import {editorDocument,previewTree,standalonePreview} from '../src/preview/document';

it('keeps source navigation links in the editing projection while embedding image resources',()=>{
  const project=projectFromFiles({'index.html':strToU8('<!doctype html><html><head></head><body><a href="pages/work.html">作品</a><img src="cover.png"></body></html>'),'pages/work.html':strToU8('<!doctype html><html><head></head><body>作品详情</body></html>'),'cover.png':new Uint8Array([1,2,3])});
  const tree=JSON.stringify(previewTree(project).body);
  expect(tree).toContain('"href":"pages/work.html"');expect(tree).toContain('data:image/png');
});

it('keeps dragged styles and independent JS widgets through a real single-HTML reimport',async()=>{
  let project=createBlank();
  project=insertResource(project,'workbench/tabs',insertionPoint(project,''));
  project=insertResource(project,'workbench/tabs',insertionPoint(project,''));
  const tabs=elements(sourceText(project)).filter(node=>attr(node.node,'data-mws-component')==='tabs');
  project=setInteractionDefault(project,tabs[0].id,1);
  project=transaction(project,[{type:'style',id:tabs[0].id,property:'translate',value:'40px 20px'},{type:'style',id:tabs[0].id,property:'max-width',value:'600px'}]);
  const output=exportSingleHtml(project),imported=projectFromFiles({'index.html':strToU8(output)});
  expect(sourceText(imported)).toContain(tabs[0].id);expect(Object.keys(imported.files)).toEqual(['index.html']);
  const secondExport=exportSingleHtml(imported);
  expect(secondExport).toContain('40px 20px');expect(secondExport).toContain('data:text/javascript;charset=utf-8;base64,');
  // The editing projection contains only source HTML; embedded JS is reserved for
  // the explicitly requested preview, just like ordinary local script files.
  const tree=JSON.stringify(previewTree(imported).body);
  expect(tree).not.toContain('"tag":"script"');
  expect(editorDocument('test-channel')).toContain("script-src 'nonce-test-channel';");
  expect(standalonePreview(imported)).toContain("script-src 'unsafe-inline' data:;");
  for(const html of [secondExport,standalonePreview(imported)]){
    const dom=new JSDOM(html,{runScripts:'dangerously',resources:'usable',url:'https://local.test/index.html'});
    try{
      await new Promise<void>((done,reject)=>{const timer=setTimeout(()=>reject(new Error('Embedded runtime did not load')),3000);dom.window.addEventListener('load',()=>{clearTimeout(timer);done();},{once:true});});
      const roots=dom.window.document.querySelectorAll('.ws-tabs');
      expect(roots[0].querySelector('[data-mws-panel="process"]')?.hasAttribute('hidden')).toBe(false);
      expect(roots[1].querySelector('[data-mws-panel="overview"]')?.hasAttribute('hidden')).toBe(false);
      (roots[0].querySelector('[data-mws-tab="result"]') as HTMLElement).click();
      expect(roots[0].querySelector('[data-mws-panel="result"]')?.hasAttribute('hidden')).toBe(false);
      expect(roots[1].querySelector('[data-mws-panel="overview"]')?.hasAttribute('hidden')).toBe(false);
      expect(dom.window.getComputedStyle(roots[0]).translate).toBe('40px 20px');
      expect(dom.window.getComputedStyle(roots[0]).maxWidth).toBe('600px');
    }finally{dom.window.close();}
  }
});
