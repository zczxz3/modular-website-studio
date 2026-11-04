// @vitest-environment jsdom
import {afterEach,describe,expect,it} from 'vitest';
import runtime from '../src/preview/interactions.js?raw';
import {INTERACTIVE_MODULES,ensureInteractionRuntime,interactionFor,setAccordionMultiple,setInteractionDefault} from '../src/core/interactions';
import {createPortfolio} from '../src/core/catalog';
import {insertResource,insertionPoint} from '../src/core/workbench';
import {attr,elements,sourceText,validateProject} from '../src/core/source';
import {ProjectStore} from '../src/core/store';
import {exportWebsite,parseProjectJson,readZip,saveProject} from '../src/core/io';
import {editorDocument,previewTree,standalonePreview} from '../src/preview/document';
import {validateModule} from '../src/core/module-validation';
import {applyCommand} from '../src/core/commands';

const tabs=INTERACTIVE_MODULES[0],accordion=INTERACTIVE_MODULES[1];
const mounted=()=>window as unknown as {__studioInteractions?:{sync:()=>void;destroy:()=>void}};
function boot(html:string){document.body.innerHTML=html;window.eval(runtime);document.dispatchEvent(new Event('DOMContentLoaded'));}
const click=(root:Element,index:number,kind='tab')=>(root.querySelectorAll<HTMLButtonElement>(`button[data-mws-${kind}]`)[index]).click();
const shown=(root:Element,kind='panel')=>Array.from(root.querySelectorAll<HTMLElement>(`[data-mws-${kind}]`)).map(panel=>!panel.hidden);
afterEach(()=>{mounted().__studioInteractions?.destroy();document.body.replaceChildren();});

describe('interactive components remain source-backed static module packages',()=>{
  it('uses one local runtime and one stylesheet per module across repeated instances and pages',()=>{
    for(const module of INTERACTIVE_MODULES)expect(validateModule(module)).toEqual(module);
    const store=new ProjectStore(createPortfolio()),before=store.getSnapshot().project;
    store.replace(insertResource(before,tabs.id,insertionPoint(before,'')));
    const inserted=store.getSnapshot().project;
    expect(Object.values(inserted.files).filter(file=>file.content===runtime)).toHaveLength(1);
    store.undo();expect(store.getSnapshot().project).toEqual(before);store.redo();expect(store.getSnapshot().project).toEqual(inserted);
    let project=insertResource(inserted,tabs.id,insertionPoint(inserted,''));
    project={...project,entry:'pages/about.html'};project=insertResource(project,tabs.id,insertionPoint(project,''));project=insertResource(project,accordion.id,insertionPoint(project,''));
    expect(Object.values(project.files).filter(file=>file.content===runtime)).toHaveLength(1);
    for(const module of INTERACTIVE_MODULES)expect(Object.values(project.files).filter(file=>file.content===module.css)).toHaveLength(1);
    for(const page of ['index.html','pages/about.html']){
      const html=sourceText(project,page),prefix=page.includes('/')?'../':'';
      expect(html.match(new RegExp(`src="${prefix}studio-interactions.js"`,'g'))).toHaveLength(1);
      const stylesheet=Object.keys(project.files).find(path=>project.files[path].content===tabs.css)!;
      expect(html.split(`href="${prefix}${stylesheet}"`)).toHaveLength(2);
    }
    const saved=parseProjectJson(saveProject(project));expect(saved.files).toEqual(project.files);expect(validateProject(saved)).toEqual([]);
    const zip=readZip(exportWebsite(saved));expect(new TextDecoder().decode(zip['studio-interactions.js'])).toBe(runtime);
  });
  it('stores default state on its owning HTML element and isolates project scripts from edit mode',()=>{
    let project=createPortfolio();project.files['studio-interactions.js']={kind:'text',content:'window.untrustedProjectScript = true;'};
    project.files['index.html']={kind:'text',content:sourceText(project).replace('</body>','<script src="studio-interactions.js"></script></body>')};
    project=insertResource(project,tabs.id,insertionPoint(project,''));
    expect(project.files['studio-interactions.js'].content).toContain('untrustedProjectScript');
    expect(project.files['studio-interactions-1.js'].content).toBe(runtime);
    const nodes=elements(sourceText(project)),root=nodes.find(node=>attr(node.node,'data-mws-component')==='tabs')!,button=nodes.find(node=>attr(node.node,'data-mws-tab')==='process')!;
    const info=interactionFor(project,button.id);expect(info?.id).toBe(root.id);expect(info?.options.map(option=>option.label)).toEqual(['作品概览','创作过程','最终成果']);
    project=setInteractionDefault(project,button.id,2);expect(interactionFor(project,root.id)?.initial).toBe(2);expect(sourceText(project)).toContain('data-mws-default="2"');
    expect(()=>setInteractionDefault(project,root.id,4)).toThrow();expect(()=>setInteractionDefault(project,root.id,-1)).toThrow();
    const reopened=parseProjectJson(saveProject(project));expect(interactionFor(reopened,root.id)?.initial).toBe(2);
    expect(JSON.stringify(previewTree(reopened).body)).not.toContain('untrustedProjectScript');expect(editorDocument('test')).not.toContain('__studioInteractions');
    expect(standalonePreview(reopened)).toContain(runtime);expect(Object.keys(ensureInteractionRuntime(reopened).files)).toEqual(Object.keys(reopened.files));
  });
  it('persists accordion configuration and excludes nested controls from its choices',()=>{
    let project=createPortfolio();project=insertResource(project,accordion.id,insertionPoint(project,''));
    const root=elements(sourceText(project)).find(node=>attr(node.node,'data-mws-component')==='accordion')!;
    project=setAccordionMultiple(setInteractionDefault(project,root.id,-1),root.id,true);
    expect(interactionFor(parseProjectJson(saveProject(project)),root.id)).toMatchObject({kind:'accordion',initial:-1,multiple:true});
    project=insertResource(project,tabs.id,{parentId:root.id});
    expect(interactionFor(project,root.id)?.options).toHaveLength(3);
    const nested=elements(sourceText(project)).find(node=>attr(node.node,'data-mws-tab')==='process')!;
    expect(interactionFor(project,nested.id)?.kind).toBe('tabs');
    expect(()=>setAccordionMultiple(createPortfolio(),root.id,true)).toThrow();
  });
  it('keeps the saved default aligned with runtime pairs after deleting or reordering component content',()=>{
    let project=createPortfolio();project=insertResource(project,tabs.id,insertionPoint(project,''));
    const nodes=elements(sourceText(project)),root=nodes.find(node=>attr(node.node,'data-mws-component')==='tabs')!;
    const overview=nodes.find(node=>attr(node.node,'data-mws-panel')==='overview')!;
    const list=nodes.find(node=>attr(node.node,'data-mws-tablist')!==undefined)!;
    const process=nodes.find(node=>attr(node.node,'data-mws-tab')==='process')!;
    const result=nodes.find(node=>attr(node.node,'data-mws-tab')==='result')!;
    project=applyCommand(project,{type:'delete',id:overview.id});
    // Unknown component attributes do not create a new runtime ownership scope.
    project=applyCommand(project,{type:'attribute',id:list.id,name:'data-mws-component',value:'future-widget'});
    expect(interactionFor(project,root.id)?.options.map(option=>option.label)).toEqual(['创作过程','最终成果']);
    project=setInteractionDefault(project,root.id,0);
    boot(sourceText(parseProjectJson(saveProject(project))));
    expect(Array.from(document.querySelectorAll<HTMLElement>('[data-mws-panel]')).filter(panel=>!panel.hidden).map(panel=>panel.getAttribute('data-mws-panel'))).toEqual(['process']);
    project=applyCommand(project,{type:'move',id:result.id,parentId:list.id,beforeId:process.id});
    expect(interactionFor(project,root.id)?.options.map(option=>option.label)).toEqual(['最终成果','创作过程']);
    project=setInteractionDefault(project,root.id,1);
    boot(sourceText(parseProjectJson(saveProject(project))));
    expect(Array.from(document.querySelectorAll<HTMLElement>('[data-mws-panel]')).filter(panel=>!panel.hidden).map(panel=>panel.getAttribute('data-mws-panel'))).toEqual(['process']);
  });
});

describe('standalone trusted interaction runtime',()=>{
  it('keeps tab instances independent with unique accessibility links and keyboard control',()=>{
    boot(tabs.html+tabs.html.replace('data-mws-default="0"','data-mws-default="1"'));
    const [first,second]=document.querySelectorAll('[data-mws-component="tabs"]');
    expect(shown(first)).toEqual([true,false,false]);expect(shown(second)).toEqual([false,true,false]);
    click(first,2);expect(shown(first)).toEqual([false,false,true]);expect(shown(second)).toEqual([false,true,false]);
    const last=first.querySelectorAll<HTMLButtonElement>('button')[2];last.focus();last.dispatchEvent(new KeyboardEvent('keydown',{key:'ArrowLeft',bubbles:true}));
    expect(shown(first)).toEqual([false,true,false]);expect(document.activeElement).toBe(first.querySelectorAll('button')[1]);
    const ids=Array.from(document.querySelectorAll('[id]')).map(el=>el.id);expect(new Set(ids).size).toBe(ids.length);
    for(const button of document.querySelectorAll('[role="tab"]')){
      expect(document.getElementById(button.getAttribute('aria-controls')!)?.getAttribute('aria-labelledby')).toBe(button.id);
    }
  });
  it('supports one-open and multiple-open accordion modes without duplicate listeners',()=>{
    boot(accordion.html);const root=document.querySelector('[data-mws-component="accordion"]')!;
    expect(shown(root,'answer')).toEqual([true,false,false]);click(root,1,'question');expect(shown(root,'answer')).toEqual([false,true,false]);
    root.setAttribute('data-mws-multiple','true');root.setAttribute('data-mws-default','-1');mounted().__studioInteractions!.sync();
    expect(shown(root,'answer')).toEqual([false,false,false]);click(root,0,'question');click(root,2,'question');expect(shown(root,'answer')).toEqual([true,false,true]);
    // Reinitialization must remove prior click listeners, so one click toggles once.
    window.eval(runtime);document.dispatchEvent(new Event('DOMContentLoaded'));click(root,1,'question');expect(shown(root,'answer')).toEqual([false,true,false]);
    const button=root.querySelectorAll<HTMLButtonElement>('button')[1];button.focus();button.dispatchEvent(new KeyboardEvent('keydown',{key:'Home',bubbles:true}));expect(document.activeElement).toBe(root.querySelector('button'));
  });
  it('cleans up removed components and restores behavior after a page-cache lifecycle',()=>{
    boot(tabs.html+accordion.html);const tabsRoot=document.querySelector('[data-mws-component="tabs"]')!;
    tabsRoot.remove();mounted().__studioInteractions!.sync();expect(tabsRoot.querySelector('[role="tab"]')).toBeNull();expect(shown(tabsRoot)).toEqual([true,true,true]);
    window.dispatchEvent(new Event('pagehide'));const root=document.querySelector('[data-mws-component="accordion"]')!;expect(root.querySelector('[aria-expanded]')).toBeNull();
    window.dispatchEvent(new Event('pageshow'));expect(shown(root,'answer')).toEqual([true,false,false]);click(root,1,'question');expect(shown(root,'answer')).toEqual([false,true,false]);
    mounted().__studioInteractions!.destroy();expect(root.querySelector('[aria-expanded]')).toBeNull();
  });
  it('does not let nested interaction controls change their containing instance',()=>{
    boot(accordion.html.replace('<p>我喜欢观察日常，用图像与文字记录值得停留的瞬间。</p>',tabs.html));
    const root=document.querySelector('[data-mws-component="accordion"]')!,nested=root.querySelector('[data-mws-component="tabs"]')!;
    click(nested,1);expect(shown(nested)).toEqual([false,true,false]);expect(shown(root,'answer')).toEqual([true,false,false]);
  });
});
