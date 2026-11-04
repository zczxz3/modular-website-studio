import {describe,it,expect} from 'vitest';
import {parseProjectJson,saveProject} from '../src/core/io';
import {insertModule,moduleFromZip} from '../src/core/modules';
import {card,dashCard,fixtureProject,legacyProject,moduleZip,slashCard,unsafeCard} from './module-fixtures';
import type {StudioModule} from '../src/core/types';
import {ProjectStore} from '../src/core/store';
import {elements,sourceText} from '../src/core/source';

describe('identical module validation at both import boundaries',()=>{
  for(const [name,module] of [
    ['onclick',unsafeCard],
    ['template event handler',{...card,html:'<template><button onclick="alert(1)">hidden</button></template>'}],
    ['broken CSS',{...card,css:'.card { color: red;'}],
    ['permissions',{...card,permissions:['network']}],
    ['dependencies',{...card,dependencies:{gsap:'3.0.0'}}]
  ] as [string,StudioModule][])it(`rejects ${name} from ZIP and saved project`,()=>{
    expect(()=>moduleFromZip(moduleZip(module))).toThrow();
    expect(()=>parseProjectJson(saveProject({...fixtureProject(),modules:[module]}))).toThrow();
  });
  it('accepts the same static card through either entry and keeps ordinary site scripts',()=>{
    const fromZip=moduleFromZip(moduleZip(card));
    const p=parseProjectJson(saveProject({...fixtureProject(),modules:[card]}));
    expect(p.modules).toEqual([fromZip]);
    expect(p.files['main.js']).toEqual(fixtureProject().files['main.js']);
  });
});

describe('module insertion transactions',()=>{
  const parent=(s:ProjectStore)=>elements(sourceText(s.getSnapshot().project)).find(n=>n.tag==='main')!.id;
  it('undoes registration, source insertion and CSS together and rolls back invalid insertion',()=>{
    const s=new ProjectStore(fixtureProject()),before=s.getSnapshot().project;
    s.replace(insertModule(before,card,parent(s)),'添加模块');const after=s.getSnapshot().project;
    expect(after.modules).toEqual([card]);expect(sourceText(after)).toContain('roundtrip-card');
    s.undo();expect(s.getSnapshot().project).toEqual(before);
    s.redo();expect(s.getSnapshot().project).toEqual(after);
    expect(()=>s.replace(insertModule(after,dashCard,'missing-parent'))).toThrow('元素已改变');
    expect(s.getSnapshot().project).toBe(after);
    s.replace({...after,modules:[]},'卸载模块');expect(s.getSnapshot().project.files).toEqual(after.files);
  });
  it('preserves existing v1 references and styles while a colliding ID gets its own file',()=>{
    const s=new ProjectStore(legacyProject());const old=sourceText(s.getSnapshot().project);
    s.replace(insertModule(s.getSnapshot().project,dashCard,parent(s)));
    const p=s.getSnapshot().project;
    expect(p.files['modules/a-b.css'].content).toBe(slashCard.css);
    expect(sourceText(p)).toContain("href='./modules/a-b.css'");
    expect(Object.values(p.files).filter(f=>f.content===dashCard.css)).toHaveLength(1);
    expect(sourceText(p).match(/slash-card/g)).toHaveLength(old.match(/slash-card/g)!.length);
  });
  it('preserves manual CSS edits and does not repeat a stylesheet reference on reuse',()=>{
    const s=new ProjectStore(fixtureProject());s.replace(insertModule(s.getSnapshot().project,card,parent(s)));
    const path=Object.keys(s.getSnapshot().project.files).find(p=>p.startsWith('modules/'))!;
    s.editFile(path,'.roundtrip-card { color: purple; }');
    s.replace(insertModule(s.getSnapshot().project,card,parent(s)));
    expect(sourceText(s.getSnapshot().project,path)).toBe('.roundtrip-card { color: purple; }');
    expect(sourceText(s.getSnapshot().project).split(`href="${path}"`)).toHaveLength(2);
  });
});
