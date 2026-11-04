// @vitest-environment jsdom
import { it,expect } from 'vitest';
import bridge from '../src/preview/bridge.js?raw';
it('incremental reconciliation preserves real DOM identity and event listeners across updates and moves',()=>{
  document.head.innerHTML='<style id="mws-project-style"></style>';
  document.body.replaceChildren();
  class Observer {observe(){} disconnect(){} unobserve(){}}
  Object.assign(window,{ResizeObserver:Observer});
  window.eval(bridge.replace('__CHANNEL__','"test"'));
  const text=(s:string)=>({kind:'text',text:s});
  const node=(id:string,children:unknown[]=[])=>({kind:'element',id,tag:'div',attrs:{'data-mws-id':id},children});
  const render=(children:unknown[],revision:number)=>window.dispatchEvent(new MessageEvent('message',{source:window,data:{channel:'test',type:'render',revision,mode:'structure',css:'',body:node('body',children)}}));
  render([node('a',[node('child',[text('One')])]),node('b')],1);
  const original=document.querySelector('[data-mws-id="child"]')!;let calls=0;original.addEventListener('custom-event',()=>calls++);
  render([node('a'),node('b',[node('child',[text('Two')])])],2);
  const updated=document.querySelector('[data-mws-id="child"]')!;expect(updated).toBe(original);expect(updated.textContent).toBe('Two');expect(updated.parentElement?.getAttribute('data-mws-id')).toBe('b');updated.dispatchEvent(new Event('custom-event'));expect(calls).toBe(1);
});
