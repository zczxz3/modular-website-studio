// @vitest-environment jsdom
import { it,expect,vi } from 'vitest';
import bridge from '../src/preview/bridge.js?raw';
import {createBlank} from '../src/core/catalog';
import {previewTree} from '../src/preview/document';
it('incremental reconciliation preserves real DOM identity and event listeners across updates and moves',()=>{
  document.head.innerHTML='<style id="mws-project-style"></style>';
  document.body.replaceChildren();
  class Observer {observe(){} disconnect(){} unobserve(){}}
  Object.assign(window,{ResizeObserver:Observer});
  window.eval(bridge.replace('__CHANNEL__','"test"'));
  const text=(s:string)=>({kind:'text',text:s});
  const node=(id:string,children:unknown[]=[])=>({kind:'element',id,tag:'div',attrs:{'data-mws-id':id},children});
  const render=(children:unknown[],revision:number,htmlAttrs:Record<string,string>={})=>window.dispatchEvent(new MessageEvent('message',{source:window,data:{channel:'test',type:'render',revision,mode:'structure',css:'',body:node('body',children),htmlAttrs}}));
  render([node('a',[node('child',[text('One')])]),node('b')],1,{lang:'zh-CN',dir:'rtl',onclick:'window.bad=true',class:'source-root'});
  expect(document.documentElement.lang).toBe('zh-CN');expect(document.documentElement.dir).toBe('rtl');
  expect(document.documentElement.hasAttribute('onclick')).toBe(false);expect(document.documentElement.classList.contains('source-root')).toBe(false);
  const original=document.querySelector('[data-mws-id="child"]')!;let calls=0;original.addEventListener('custom-event',()=>calls++);
  render([node('a'),node('b',[node('child',[text('Two')])])],2);
  const updated=document.querySelector('[data-mws-id="child"]')!;expect(updated).toBe(original);expect(updated.textContent).toBe('Two');expect(updated.parentElement?.getAttribute('data-mws-id')).toBe('b');updated.dispatchEvent(new Event('custom-event'));expect(calls).toBe(1);
  expect(document.documentElement.hasAttribute('lang')).toBe(false);expect(document.documentElement.hasAttribute('dir')).toBe(false);
  const scroll=vi.fn();Object.defineProperty(updated,'scrollIntoView',{value:scroll});
  const message=(type:string,id:string)=>window.dispatchEvent(new MessageEvent('message',{source:window,data:{channel:'test',type,id}}));
  message('select','child');expect(scroll).not.toHaveBeenCalled();
  message('focus-selection','child');expect(scroll).toHaveBeenCalledExactlyOnceWith({block:'center',behavior:'auto'});
  message('focus-selection','missing');expect(scroll).toHaveBeenCalledTimes(1);
});

it('projects only source language and direction from the HTML root',()=>{
  const project=createBlank();project.files[project.entry]={kind:'text',content:'<!doctype html><html lang="zh-CN" dir="ltr" onclick="window.bad=true" class="source-root"><head></head><body><h1>中文作品</h1></body></html>'};
  expect(previewTree(project).htmlAttrs).toEqual({lang:'zh-CN',dir:'ltr'});
  project.files[project.entry]={kind:'text',content:'<!doctype html><html><head></head><body>Another page</body></html>'};
  expect(previewTree(project).htmlAttrs).toEqual({});
});
