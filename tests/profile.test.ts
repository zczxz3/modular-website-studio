import {describe,it,expect} from 'vitest';
import {strToU8} from 'fflate';
import type {Project} from '../src/core/types';
import {attr,elements,normalizeProject,parseHtml,sourceText,walk} from '../src/core/source';
import {applyStudentProfile,studentProfile} from '../src/core/profile';
import {ProjectStore} from '../src/core/store';
import {transaction,ownStyle} from '../src/core/commands';
import {applyReveal,DEFAULT_REVEAL,revealFor} from '../src/core/workbench';
import {exportWebsite,parseProjectJson,projectFromFiles,readZip,saveProject} from '../src/core/io';
import {exportSingleHtml} from '../src/core/export-html';
import {createPortfolio} from '../src/core/catalog';

const text=(content:string)=>({kind:'text' as const,content});
const fixture=():Project=>normalizeProject({format:'mws-project',version:1,id:'profile-test',name:'我的作品集',entry:'index.html',modules:[],files:{
  'index.html':text('<!doctype html>\n<html lang="zh-CN"><head><meta charset="utf-8"><title data-mws-profile="title">留白 · 个人作品集</title></head><body><header><a href="#home" data-mws-profile="name">LIN / 林间</a></header><main id="home"><h1 data-mws-profile="greeting">你好，我是林间。</h1><!-- 林间 must remain in this comment. --><p data-note="林间">林间是我访问过的地方。</p><img src="cover.png" alt="作品封面"></main><footer><span data-mws-profile="name">LIN / 林间</span></footer><script>window.originalName="林间";</script></body></html>'),
  'pages/about.html':text('<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><title data-mws-profile="title" data-mws-profile-prefix="创作手记">创作手记</title></head><body><a href="../index.html" data-mws-profile="name">LIN / 林间</a><p>独立的手记文字。</p></body></html>'),
  'cover.png':{kind:'asset',content:'data:image/png;base64,AQID'}
}});
function markedText(project:Project,kind:string){
  const values:string[]=[];
  for(const [path,file]of Object.entries(project.files))if(/\.html?$/i.test(path)&&file.kind==='text')walk(parseHtml(file.content),node=>{if(attr(node,'data-mws-profile')===kind)values.push(node.childNodes?.map(child=>child.value||'').join('')||'');});
  return values;
}

describe('student template personalization',()=>{
  it('personalizes the bundled template while leaving another freshly created portfolio independent',()=>{
    const original=createPortfolio(),other=createPortfolio(),changed=applyStudentProfile(original,'张明');
    expect(studentProfile(original)).toEqual({name:'林间'});expect(studentProfile(other)).toEqual({name:'林间'});
    expect(studentProfile(changed)).toEqual({name:'张明'});expect(markedText(changed,'greeting')).toEqual(['你好，我是张明。']);
    expect(markedText(changed,'name').every(value=>value==='张明')).toBe(true);
    expect(markedText(changed,'title')).toContain('张明的作品集');expect(markedText(changed,'title')).toContain('创作手记 · 张明');
    expect(changed.entry).toBe(original.entry);expect(changed.id).toBe(original.id);expect(changed.id).not.toBe(other.id);
  });

  it('updates marked Chinese fields atomically while keeping unrelated source, assets, layout and motion',()=>{
    let project=fixture();const id=elements(sourceText(project)).find(node=>node.tag==='h1')!.id;
    project=transaction(project,[{type:'style',id,property:'translate',value:'40px 20px'}]);project=applyReveal(project,id,DEFAULT_REVEAL);
    const before=JSON.stringify(project),ids=elements(sourceText(project)).map(node=>node.id),store=new ProjectStore(project);
    expect(studentProfile(project)).toEqual({name:'林间'});
    store.replace(applyStudentProfile(project,'  张明 & <星光>  '),'修改姓名');
    const next=store.getSnapshot().project;
    expect(studentProfile(next)).toEqual({name:'张明 & <星光>'});expect(next.name).toBe('张明 & <星光>的作品集');
    expect(markedText(next,'name')).toEqual(['张明 & <星光>','张明 & <星光>','张明 & <星光>']);
    expect(markedText(next,'greeting')).toEqual(['你好，我是张明 & <星光>。']);
    expect(markedText(next,'title')).toEqual(['张明 & <星光>的作品集','创作手记 · 张明 & <星光>']);
    expect(sourceText(next)).toContain('张明 &amp; &lt;星光&gt;');
    expect(sourceText(next)).toContain('<!-- 林间 must remain in this comment. -->');
    expect(sourceText(next)).toContain('<p data-mws-id=');expect(sourceText(next)).toContain('data-note="林间">林间是我访问过的地方。</p>');
    expect(sourceText(next)).toContain('window.originalName="林间";');
    expect(elements(sourceText(next)).map(node=>node.id)).toEqual(ids);expect(next.files['cover.png']).toEqual(project.files['cover.png']);
    expect(ownStyle(next,id,'translate')).toBe('40px 20px');expect(revealFor(next,id)).toEqual(DEFAULT_REVEAL);expect(JSON.stringify(project)).toBe(before);
    store.undo();expect(store.getSnapshot().project).toEqual(project);expect(store.getSnapshot().canUndo).toBe(false);store.redo();expect(store.getSnapshot().project).toEqual(next);
  });

  it('survives project download, ZIP reimport and standalone HTML reimport with page language and title intact',()=>{
    const changed=applyStudentProfile(fixture(),'王小雨'),saved=parseProjectJson(saveProject(changed));
    const zipped=projectFromFiles(readZip(exportWebsite(saved))),single=exportSingleHtml(saved),reopened=projectFromFiles({'index.html':strToU8(single)});
    for(const project of [saved,zipped,reopened]){
      expect(studentProfile(project)).toEqual({name:'王小雨'});expect(sourceText(project)).toContain('lang="zh-CN"');
      expect(markedText(project,'title')[0]).toBe('王小雨的作品集');
    }
    const renamed=applyStudentProfile(saved,'李晨');expect(markedText(renamed,'title')).toEqual(['李晨的作品集','创作手记 · 李晨']);
    expect(markedText(saved,'title')).toEqual(['王小雨的作品集','创作手记 · 王小雨']);
  });

  it('counts Unicode code points and rejects invalid names or unsafe source markers without altering the project',()=>{
    const project=fixture(),before=JSON.stringify(project),long='🌱'.repeat(80);
    expect(studentProfile(applyStudentProfile(project,long))).toEqual({name:long});
    for(const name of ['', '   ', '🌱'.repeat(81),'王\n明','张\u0000明'])expect(()=>applyStudentProfile(project,name)).toThrow('1–80');
    const nested={...project,files:{...project.files,'index.html':text(sourceText(project).replace('你好，我是林间。','你好，我是<strong>林间</strong>。'))}};
    expect(()=>applyStudentProfile(nested,'张明')).toThrow('姓名区域包含子元素');
    const unmarked={...project,files:{'index.html':text('<!doctype html><html><head><title>Independent</title></head><body><p>林间</p></body></html>')}};
    expect(studentProfile(unmarked)).toBeNull();expect(()=>applyStudentProfile(unmarked,'张明')).toThrow('没有模板姓名区域');
    expect(JSON.stringify(project)).toBe(before);
  });
});
