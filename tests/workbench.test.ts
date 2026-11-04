import {describe,it,expect,vi} from 'vitest';
import {runInNewContext} from 'node:vm';
import motion from '../src/preview/motion.js?raw';
import {createPortfolio,createBlank,BLOCK,COVERS,RESOURCES,THEME_FILE} from '../src/core/catalog';
import {applyTheme,applyReveal,replaceCover,replaceUploadedImage,linkToSection,insertResource,insertionPoint,currentTheme,revealFor,DEFAULT_REVEAL} from '../src/core/workbench';
import {ProjectStore} from '../src/core/store';
import {attr,elements,sourceText,validateProject} from '../src/core/source';
import {transaction,ownStyle} from '../src/core/commands';
import {parseProjectJson,saveProject,exportWebsite,readZip} from '../src/core/io';
import {validateModule} from '../src/core/modules';
import {previewTree,editorDocument} from '../src/preview/document';
import {readRecent,rememberProject} from '../src/core/recent';
const element=(p:ReturnType<typeof createPortfolio>,tag:string)=>elements(sourceText(p)).find(n=>n.tag===tag)!;

describe('portfolio creation uses the source model',()=>{
  it('creates independent projects with complete local assets and valid vendored modules',()=>{
    const a=createPortfolio(),b=createPortfolio();expect(a.id).not.toBe(b.id);expect(element(a,'h1').id).not.toBe(element(b,'h1').id);
    expect(validateProject(a)).toEqual([]);for(const m of RESOURCES)expect(validateModule(m).id).toBe(m.id);
    const changed=transaction(a,[{type:'text',id:element(a,'h1').id,text:'Only A'}]);expect(sourceText(b)).not.toContain('Only A');expect(sourceText(createPortfolio())).not.toContain('Only A');
    for(const c of COVERS)expect(changed.files[c.path].content).toContain('<svg');expect(changed.files['THIRD_PARTY_NOTICES.md'].content).toContain('MIT License');
  });
  it('switches themes atomically while retaining local overrides and allows returning to theme values',()=>{
    const s=new ProjectStore(createPortfolio()),id=element(s.getSnapshot().project,'h1').id;s.dispatch([{type:'style',id,property:'color',value:'rgb(10, 20, 30)'}]);
    const before=s.getSnapshot().project;s.replace(applyTheme(before,'night'),'切换主题');expect(currentTheme(s.getSnapshot().project)).toBe('night');expect(ownStyle(s.getSnapshot().project,id,'color')).toBe('rgb(10, 20, 30)');
    s.undo();expect(s.getSnapshot().project).toEqual(before);s.redo();expect(currentTheme(s.getSnapshot().project)).toBe('night');s.dispatch([{type:'style',id,property:'color',value:''}]);expect(ownStyle(s.getSnapshot().project,id,'color')).toBe('');
    expect(sourceText(s.getSnapshot().project,'pages/about.html').match(/href="\.\.\/studio-theme.css"/g)).toHaveLength(1);
  });
  it('preserves ordinary page CSS when changing a blank project theme',()=>{
    const p=createBlank(),before=sourceText(p,THEME_FILE).split('\nbody')[1];
    const themed=applyTheme(p,'night');expect(sourceText(themed,THEME_FILE)).toContain('body'+before);expect(currentTheme(themed)).toBe('night');
    expect(sourceText(applyTheme(themed,'paper'),THEME_FILE)).toContain('body'+before);
  });
  it('preserves colliding artwork and reuses one safe bundled copy on all pages',()=>{
    let p=createPortfolio();p.files[COVERS[0].path]={kind:'text',content:'<svg xmlns="http://www.w3.org/2000/svg"><title>User artwork</title></svg>'};
    p=insertResource(p,BLOCK.id,insertionPoint(p,''));
    const copied=Object.keys(p.files).find(path=>p.files[path].content===COVERS[0].source)!;
    expect(copied).not.toBe(COVERS[0].path);expect(sourceText(p)).toContain(`src="${copied}"`);expect(p.files[COVERS[0].path].content).toContain('User artwork');
    p={...p,entry:'pages/about.html'};p=insertResource(p,BLOCK.id,insertionPoint(p,''));expect(sourceText(p)).toContain(`src="../${copied}"`);
    expect(Object.values(p.files).filter(file=>file.content===COVERS[0].source)).toHaveLength(1);
  });
  it('retains installed module definitions when the bundled catalogue changes',()=>{
    let p=createPortfolio();const installed={...BLOCK,version:'0.9.0',html:'<section class="old-grid"><h2>Saved block design</h2></section>',css:'.old-grid{padding:17px}'};
    p={...p,modules:[installed]};p=insertResource(p,BLOCK.id,insertionPoint(p,''));
    expect(p.modules).toEqual([installed]);expect(sourceText(p)).toContain('Saved block design');expect(sourceText(p)).not.toContain('ws-image-grid');
    expect(Object.values(p.files).some(file=>file.content===installed.css)).toBe(true);
  });
  it('replaces images without losing source identity, crop, motion or existing resources',()=>{
    let p=createPortfolio();const id=element(p,'img').id;p=transaction(p,[{type:'style',id,property:'object-fit',value:'contain'}]);p=applyReveal(p,id,DEFAULT_REVEAL);
    p=replaceCover(p,id,'arches');expect(element(p,'img').id).toBe(id);expect(ownStyle(p,id,'object-fit')).toBe('contain');expect(revealFor(p,id)).toEqual(DEFAULT_REVEAL);
    const old=p.files;p=replaceUploadedImage(p,id,new Uint8Array([1,2,3]),'photo.png');expect(attr(element(p,'img').node,'src')).toMatch(/^assets\/image-/);for(const [name,file]of Object.entries(old))if(name!=='index.html')expect(p.files[name]).toEqual(file);
    expect(()=>replaceUploadedImage(p,id,new Uint8Array([1]),'script.js')).toThrow();
  });
  it('inserts repeated blocks at source positions with one CSS file and one link on each page',()=>{
    const s=new ProjectStore(createPortfolio()),before=s.getSnapshot().project,section=elements(sourceText(before)).find(n=>attr(n.node,'data-ws-block')==='首屏')!;
    s.replace(insertResource(before,BLOCK.id,insertionPoint(before,section.id)));const after=s.getSnapshot().project;
    expect(sourceText(after).indexOf('ws-image-grid')).toBeLessThan(sourceText(after).indexOf('id="works"'));s.undo();expect(s.getSnapshot().project).toEqual(before);s.redo();expect(s.getSnapshot().project).toEqual(after);
    let p=insertResource(after,BLOCK.id,insertionPoint(after,''));p={...p,entry:'pages/about.html'};p=insertResource(p,BLOCK.id,insertionPoint(p,''));
    const css=Object.keys(p.files).filter(f=>p.files[f].content===BLOCK.css);expect(css).toHaveLength(1);
    expect(sourceText(p,'index.html').split(`href="${css[0]}"`)).toHaveLength(2);expect(sourceText(p).split(`href="../${css[0]}"`)).toHaveLength(2);expect(sourceText(p)).toContain('src="../assets/tidal.svg"');
    expect(p.modules).toEqual([BLOCK]);
  });
  it('creates section anchors through commands and keeps links after button style changes',()=>{
    let p=createPortfolio();const link=elements(sourceText(p)).find(n=>n.tag==='a'&&n.node.childNodes?.some(c=>c.value==='查看作品'))!,target=elements(sourceText(p)).find(n=>attr(n.node,'data-ws-block')==='作品展示')!;
    p=linkToSection(p,link.id,target.id);p=transaction(p,[{type:'attribute',id:link.id,name:'data-ws-button',value:'outline'}]);expect(sourceText(p)).toContain('href="#works">查看作品</a>');
  });
  it('stores motion on the real element and exports a standalone runtime while editing stays isolated',()=>{
    const s=new ProjectStore(createPortfolio()),id=element(s.getSnapshot().project,'h1').id,before=s.getSnapshot().project;
    s.replace(applyReveal(before,id,DEFAULT_REVEAL));const animated=s.getSnapshot().project;s.undo();expect(s.getSnapshot().project).toEqual(before);s.redo();expect(s.getSnapshot().project).toEqual(animated);
    s.dispatch([{type:'text',id,text:'A longer portfolio heading'}]);expect(revealFor(s.getSnapshot().project,id)).toEqual(DEFAULT_REVEAL);
    const reopened=parseProjectJson(saveProject(s.getSnapshot().project));expect(readZip(exportWebsite(reopened))['studio-motion.js']).toBeDefined();expect(JSON.stringify(previewTree(reopened).body)).not.toContain('MutationObserver');expect(editorDocument('token')).toContain('prefers-reduced-motion');
    s.replace(applyReveal(reopened,id,null));expect(revealFor(s.getSnapshot().project,id)).toBeNull();expect(element(s.getSnapshot().project,'h1').id).toBe(id);
  });
  it('does not overwrite project scripts when adding controlled motion',()=>{
    let p=createPortfolio();p.files['studio-motion.js']={kind:'text',content:'window.original=true;'};const id=element(p,'h1').id;
    p=applyReveal(p,id,DEFAULT_REVEAL);expect(p.files['studio-motion.js'].content).toBe('window.original=true;');expect(sourceText(p)).toContain('src="studio-motion-1.js"');
    const paths=Object.keys(p.files);p=applyReveal(p,id,{...DEFAULT_REVEAL,duration:900});expect(Object.keys(p.files)).toEqual(paths);
  });
  it('stores only real saved projects, isolates histories, and ignores broken recent records',()=>{
    const data=new Map<string,string>(),storage={getItem:(k:string)=>data.get(k)||null,setItem:(k:string,v:string)=>{data.set(k,v);}};
    expect(readRecent(storage)).toEqual([]);const a=createPortfolio('A'),b=createPortfolio('B');rememberProject(storage,a);rememberProject(storage,b);expect(readRecent(storage).map(r=>r.project.name)).toEqual(['B','A']);
    const s=new ProjectStore(a);s.dispatch([{type:'text',id:element(a,'h1').id,text:'change'}]);s.load(b);s.undo();expect(s.getSnapshot().project).toEqual(b);expect(s.getSnapshot().canUndo).toBe(false);
    const reopened=readRecent(storage).find(r=>r.project.name==='A')!.project;expect(sourceText(reopened)).not.toContain('change');
  });
});

it('cleans up motion observers and animations on reinitialization and effect removal',()=>{
  const attributes=new Map([['data-mws-reveal','load']]);
  const animations:{cancel:ReturnType<typeof vi.fn>;onfinish?:()=>void}[]=[];
  const element={getAttribute:(key:string)=>attributes.get(key)??null,setAttribute:(key:string,value:string)=>attributes.set(key,value),removeAttribute:(key:string)=>attributes.delete(key),animate:vi.fn(()=>{const animation={cancel:vi.fn()};animations.push(animation);return animation;})};
  let nodes:typeof element[]=[element];const mutationObservers:{sync:()=>void;disconnect:ReturnType<typeof vi.fn>}[]=[];
  const preferenceListeners=new Set<()=>void>(),pagehideListeners=new Set<()=>void>();
  const preference={matches:false,addEventListener:(_event:string,fn:()=>void)=>preferenceListeners.add(fn),removeEventListener:(_event:string,fn:()=>void)=>preferenceListeners.delete(fn)};
  const context={window:{},document:{readyState:'complete',body:{},querySelectorAll:()=>nodes,removeEventListener:vi.fn()},matchMedia:()=>preference,getComputedStyle:()=>({opacity:'1',transform:'none'}),
    MutationObserver:class {disconnect=vi.fn();constructor(public sync:()=>void){mutationObservers.push(this);}observe(){}},
    addEventListener:(event:string,fn:()=>void)=>{if(event==='pagehide')pagehideListeners.add(fn);},removeEventListener:(event:string,fn:()=>void)=>{if(event==='pagehide')pagehideListeners.delete(fn);}};
  runInNewContext(motion,context);expect(animations).toHaveLength(1);
  runInNewContext(motion,context);expect(animations[0].cancel).toHaveBeenCalledOnce();expect(mutationObservers[0].disconnect).toHaveBeenCalledOnce();expect(preferenceListeners.size).toBe(1);expect(pagehideListeners.size).toBe(1);
  nodes=[];mutationObservers[1].sync();expect(animations[1].cancel).toHaveBeenCalledOnce();expect(attributes.has('data-mws-motion-state')).toBe(false);
  preference.matches=true;nodes=[element];mutationObservers[1].sync();expect(animations).toHaveLength(2);expect(attributes.get('data-mws-motion-state')).toBe('reduced');
  for(const listener of pagehideListeners)listener();expect(preferenceListeners.size).toBe(0);
});
