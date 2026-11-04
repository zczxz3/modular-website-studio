// @vitest-environment jsdom
import {beforeAll,beforeEach,afterEach,it,expect,vi} from 'vitest';
import bridge from '../src/preview/bridge.js?raw';
import {ProjectStore} from '../src/core/store';
import {normalizeProject,sourceText} from '../src/core/source';
import {previewTree} from '../src/preview/document';
import type {EditCommand} from '../src/core/types';

let hit:Element|null=null,store:ProjectStore;
let messages:{type:string;revision:number;commands:EditCommand[]}[]=[];
const node=(id:string)=>document.getElementById(id)!;
const ids=(parent:Element)=>Array.from(parent.children).map(el=>el.id);
const commands=()=>messages.filter(m=>m.type==='command');
const pointer=(target:EventTarget,type:string,x:number,y:number,shift=false)=>{
  const event=new MouseEvent(type,{bubbles:true,cancelable:true,clientX:x,clientY:y,button:0,shiftKey:shift});
  Object.defineProperty(event,'pointerId',{value:1});target.dispatchEvent(event);return event;
};
function render(mode='structure'){
  window.dispatchEvent(new MessageEvent('message',{source:window,data:{channel:'drag-test',type:'render',...previewTree(store.getSnapshot().project),revision:store.getSnapshot().revision,mode}}));
}
function geometry(){
  for(const el of Array.from(document.querySelectorAll('[data-mws-id]'))){
    Object.defineProperty(el,'getBoundingClientRect',{configurable:true,value:()=>{
      const index=el.parentElement?Array.from(el.parentElement.children).indexOf(el):0;
      const width=parseFloat((el as HTMLElement).style.width)||200,height=parseFloat((el as HTMLElement).style.height)||100;
      const x=50,y=100+index*100;
      return {x,y,left:x,top:y,right:x+width,bottom:y+height,width,height,toJSON(){}};
    }});
  }
}
beforeAll(()=>{
  document.head.innerHTML='<style id="mws-project-style"></style>';
  Object.assign(window,{ResizeObserver:class {observe(){}disconnect(){}},scrollBy:vi.fn()});
  window.eval(bridge.replace('__CHANNEL__','"drag-test"'));
});
beforeEach(()=>{
  messages=[];hit=null;
  vi.spyOn(window,'postMessage').mockImplementation((value)=>{messages.push(value);});
  Object.defineProperty(document,'elementFromPoint',{configurable:true,value:()=>hit});
  const captured=new Set<number>();
  Object.defineProperties(document.documentElement,{
    setPointerCapture:{configurable:true,value:vi.fn((id:number)=>{captured.add(id);})},
    hasPointerCapture:{configurable:true,value:(id:number)=>captured.has(id)},
    releasePointerCapture:{configurable:true,value:vi.fn((id:number)=>{captured.delete(id);})}
  });
  store=new ProjectStore(normalizeProject({format:'mws-project',version:1,name:'Drag',entry:'index.html',modules:[],files:{'index.html':{kind:'text',content:'<!doctype html><html><head></head><body><main id="main"><article id="a"><p id="at">A</p></article><article id="b"><p id="bt">B</p></article><section id="target"><h2 id="target-title">Empty target</h2></section></main></body></html>'}}}));
  render();geometry();
});
afterEach(()=>{window.dispatchEvent(new Event('blur'));vi.restoreAllMocks();});

it('previews real document-flow order while dragging, then writes one undoable source move',()=>{
  const original=sourceText(store.getSnapshot().project);const b=node('b');
  hit=b;pointer(b,'pointerdown',60,220);
  hit=node('at');pointer(document,'pointermove',60,130);
  expect(ids(node('main'))).toEqual(['b','a','target']);
  expect(document.querySelector('[data-mws-drop-indicator]')?.getAttribute('style')).toContain('display: block');
  expect(commands()).toHaveLength(0);expect(sourceText(store.getSnapshot().project)).toBe(original);
  pointer(document,'pointerup',60,130);
  expect(ids(node('main'))).toEqual(['a','b','target']); // restore projection before source authority commits
  expect(commands()).toHaveLength(1);expect(commands()[0].commands).toHaveLength(1);
  store.dispatch(commands()[0].commands,commands()[0].revision);render();
  expect(node('b')).toBe(b);expect(ids(node('main'))).toEqual(['b','a','target']);
  expect(sourceText(store.getSnapshot().project).indexOf('id="b"')).toBeLessThan(sourceText(store.getSnapshot().project).indexOf('id="a"'));
  store.undo();render();expect(sourceText(store.getSnapshot().project)).toBe(original);expect(ids(node('main'))).toEqual(['a','b','target']);
});

it('Escape, pointer cancellation, blur and a stale render discard live previews',()=>{
  const original=sourceText(store.getSnapshot().project);
  for(const cancel of ['escape','pointercancel','blur','render','outside','message']){
    render();geometry();messages=[];hit=node('b');pointer(node('b'),'pointerdown',60,220);
    hit=node('a');pointer(document,'pointermove',60,120);expect(ids(node('main'))[0]).toBe('b');
    if(cancel==='escape')document.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true,cancelable:true}));
    else if(cancel==='render')render();
    else if(cancel==='outside')pointer(document,'pointermove',-10,120);
    else if(cancel==='message')window.dispatchEvent(new MessageEvent('message',{source:window,data:{channel:'drag-test',type:'cancel-drag'}}));
    else window.dispatchEvent(new Event(cancel));
    pointer(document,'pointerup',60,120);
    expect(ids(node('main'))).toEqual(['a','b','target']);expect(commands()).toHaveLength(0);expect(sourceText(store.getSnapshot().project)).toBe(original);
  }
});

it('Shift-drag previews nesting and avoids dropping a container into its descendants',()=>{
  const b=node('b');hit=b;pointer(b,'pointerdown',60,220);
  hit=node('target-title');pointer(document,'pointermove',60,330,true);
  expect(b.parentElement).toBe(node('target'));expect(commands()).toHaveLength(0);
  pointer(document,'pointerup',60,330,true);
  expect(commands()).toHaveLength(1);
  store.dispatch(commands()[0].commands,commands()[0].revision);render();
  expect(node('b').parentElement).toBe(node('target'));
  // A hit on the dragged element's own descendant is not a legal nesting target.
  messages=[];geometry();hit=node('target');pointer(node('target'),'pointerdown',60,320);
  hit=node('bt');pointer(document,'pointermove',70,340,true);pointer(document,'pointerup',70,340,true);
  expect(commands()).toHaveLength(0);expect(node('target').parentElement).toBe(node('main'));
});

it('keeps whole-card sorting in its original grid while the handle crosses ancestor padding',()=>{
  const a=node('a');a.setAttribute('data-ws-block','Work A');node('b').setAttribute('data-ws-block','Work B');
  hit=a;pointer(a,'pointerdown',60,95);
  hit=document.body;pointer(document,'pointermove',75,105);
  expect(a.parentElement).toBe(node('main'));expect(ids(node('main'))).toEqual(['a','b','target']);
  hit=node('bt');pointer(document,'pointermove',60,275);
  expect(ids(node('main'))).toEqual(['b','a','target']);
  hit=document.body;pointer(document,'pointermove',60,278);
  expect(a.parentElement).toBe(node('main'));expect(ids(node('main'))).toEqual(['b','a','target']);
  pointer(document,'pointerup',60,278);
  expect(commands()).toHaveLength(1);
  expect(commands()[0].commands).toEqual([{type:'move',id:a.getAttribute('data-mws-id'),parentId:node('main').getAttribute('data-mws-id'),beforeId:node('target').getAttribute('data-mws-id')}]);
  store.dispatch(commands()[0].commands,commands()[0].revision);render();expect(ids(node('main'))).toEqual(['b','a','target']);
});

it('sorts a two-card grid horizontally even when the moving card is its only row neighbour',()=>{
  const main=node('main'),a=node('a');main.style.display='grid';
  for(const el of Array.from(main.children))Object.defineProperty(el,'getBoundingClientRect',{configurable:true,value:()=>{
    const index=Array.from(main.children).indexOf(el),x=50+index%2*220,y=100+Math.floor(index/2)*120;
    return {x,y,left:x,top:y,right:x+200,bottom:y+100,width:200,height:100,toJSON(){}};
  }});
  hit=a;pointer(a,'pointerdown',60,110);
  hit=node('bt');pointer(document,'pointermove',460,120);
  expect(ids(main)).toEqual(['b','a','target']);expect(commands()).toHaveLength(0);
  hit=main;pointer(document,'pointermove',465,125);pointer(document,'pointerup',465,125);
  expect(commands()).toHaveLength(1);
  expect(commands()[0].commands).toEqual([{type:'move',id:a.getAttribute('data-mws-id'),parentId:main.getAttribute('data-mws-id'),beforeId:node('target').getAttribute('data-mws-id')}]);
});

it('free motion and resizing are live CSS previews with one commit, while cancellation restores inline CSS',()=>{
  render('free');geometry();const b=node('b') as HTMLElement;b.style.color='red';hit=b;
  pointer(b,'pointerdown',60,220);pointer(document,'pointermove',92,246);
  expect(b.style.translate).toBe('32px 26px');expect(commands()).toHaveLength(0);
  document.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true}));
  expect(b.style.translate).toBe('');expect(b.style.color).toBe('red');expect(commands()).toHaveLength(0);
  pointer(b,'pointerdown',60,220);pointer(document,'pointermove',92,246);pointer(document,'pointerup',92,246);
  expect(commands()).toHaveLength(1);expect(commands()[0].commands).toEqual([{type:'style',id:b.getAttribute('data-mws-id'),property:'translate',value:'32px 26px'}]);
  expect(b.style.translate).toBe('');expect(b.style.color).toBe('red');
  messages=[];const handle=document.querySelector('[aria-label="调整选中元素大小"]')!;
  pointer(handle,'pointerdown',250,300);pointer(document,'pointermove',280,320);
  expect(b.style.width).toBe('230px');expect(b.style.height).toBe('120px');
  pointer(document,'pointerup',280,320);
  expect(commands()).toHaveLength(1);expect(commands()[0].commands).toHaveLength(3);expect(b.style.width).toBe('');expect(b.style.color).toBe('red');
});

it('native resource drops honor explicit nesting and show the same target they commit',()=>{
  hit=node('target-title');
  const transfer={types:['application/x-mws-resource'],getData:()=> 'workbench/tabs',dropEffect:''};
  function native(type:string){const e=new MouseEvent(type,{bubbles:true,cancelable:true,clientX:60,clientY:330,shiftKey:true});Object.defineProperty(e,'dataTransfer',{value:transfer});document.dispatchEvent(e);return e;}
  expect(native('dragover').defaultPrevented).toBe(true);
  expect(document.querySelector('[data-mws-drop-indicator]')?.getAttribute('data-mws-drop-placement')).toBe('inside');
  native('drop');const drop=messages.find(m=>m.type==='resource-drop') as unknown as {id:string;parentId:string;beforeId?:string};
  expect(drop).toMatchObject({id:'workbench/tabs',parentId:node('target').getAttribute('data-mws-id')});expect(drop.beforeId).toBeUndefined();
  expect(document.querySelector('[data-mws-drop-indicator]')?.getAttribute('style')).toContain('display: none');
});

it('parent-forwarded resource drags preview nesting, cancel, and commit the same target and revision',()=>{
  hit=node('target-title');
  const point={clientX:60,clientY:330,shiftKey:true};
  const forward=(type:string)=>window.dispatchEvent(new MessageEvent('message',{source:window,data:{channel:'drag-test',type,...point,id:'workbench/tabs'}}));
  forward('external-drag-over');
  const indicator=document.querySelector('[data-mws-drop-indicator]')!;
  expect(indicator.getAttribute('data-mws-drop-placement')).toBe('inside');expect(indicator.getAttribute('style')).toContain('display: block');
  expect(messages.filter(m=>m.type==='resource-drop')).toHaveLength(0);
  forward('external-drag-cancel');expect(indicator.getAttribute('style')).toContain('display: none');
  forward('external-drag-over');forward('external-resource-drop');
  expect(messages.filter(m=>m.type==='resource-drop')).toEqual([{channel:'drag-test',type:'resource-drop',id:'workbench/tabs',parentId:node('target').getAttribute('data-mws-id'),beforeId:undefined,revision:store.getSnapshot().revision}]);
  expect(indicator.getAttribute('style')).toContain('display: none');expect(commands()).toHaveLength(0);
});

it('rejects forwarded resource drags with untrusted senders, malformed coordinates or IDs, or a locked canvas',()=>{
  hit=node('target-title');
  const payload={channel:'drag-test',type:'external-resource-drop',clientX:60,clientY:330,shiftKey:true,id:'workbench/tabs'};
  const forward=(patch:Record<string,unknown>,source:MessageEventSource|null=window)=>window.dispatchEvent(new MessageEvent('message',{source,data:{...payload,...patch}}));
  forward({},null);forward({channel:'untrusted'});
  for(const clientX of [NaN,Infinity,-Infinity,'60',null,-1])forward({clientX});
  for(const clientY of [NaN,Infinity,'330',-1])forward({clientY});
  for(const id of ['',null,'<script>','workbench/'.padEnd(83,'a')])forward({id});
  forward({shiftKey:'true'});
  forward({type:'external-drag-over',clientX:NaN});expect(document.querySelector('[data-mws-drop-indicator]')?.getAttribute('style')).toContain('display: none');
  window.dispatchEvent(new MessageEvent('message',{source:window,data:{channel:'drag-test',type:'render',...previewTree(store.getSnapshot().project),revision:store.getSnapshot().revision,mode:'structure',locked:true}}));
  forward({});forward({type:'external-drag-over'});
  expect(messages.filter(m=>m.type==='resource-drop')).toHaveLength(0);expect(commands()).toHaveLength(0);
  expect(document.querySelector('[data-mws-drop-indicator]')?.getAttribute('style')).toContain('display: none');
});

it('dropping back at the same source position creates no history command',()=>{
  hit=node('b');pointer(node('b'),'pointerdown',60,220);
  hit=node('target');pointer(document,'pointermove',60,320);
  expect(ids(node('main'))).toEqual(['a','b','target']);
  pointer(document,'pointerup',60,320);expect(commands()).toHaveLength(0);
});

it('captures only real drags so ordinary clicks and double-clicks keep their original targets',()=>{
  const capture=document.documentElement.setPointerCapture;
  const release=document.documentElement.releasePointerCapture;
  const insert=vi.spyOn(node('b'),'insertBefore');
  hit=node('bt');
  for(let click=0;click<2;click++){
    expect(pointer(node('bt'),'pointerdown',60,220).defaultPrevented).toBe(false);pointer(node('bt'),'pointermove',61,220);pointer(node('bt'),'pointerup',61,220);
  }
  expect(insert).not.toHaveBeenCalled();
  expect(capture).not.toHaveBeenCalled();expect(release).not.toHaveBeenCalled();expect(commands()).toHaveLength(0);
  expect(pointer(node('b'),'pointerdown',60,220).defaultPrevented).toBe(true);expect(capture).not.toHaveBeenCalled();
  hit=node('a');pointer(document,'pointermove',60,120);
  expect(capture).toHaveBeenCalledExactlyOnceWith(1);
  pointer(document,'pointermove',61,121);expect(capture).toHaveBeenCalledOnce();
  pointer(document,'pointerup',61,121);expect(release).toHaveBeenCalledExactlyOnceWith(1);
});

it('leaving the document before capture abandons the pending drag',()=>{
  hit=node('b');pointer(node('b'),'pointerdown',60,220);
  document.dispatchEvent(new Event('pointerleave'));
  hit=node('a');pointer(document,'pointermove',60,120);pointer(document,'pointerup',60,120);
  expect(document.documentElement.setPointerCapture).not.toHaveBeenCalled();expect(commands()).toHaveLength(0);
  expect(ids(node('main'))).toEqual(['a','b','target']);
});
