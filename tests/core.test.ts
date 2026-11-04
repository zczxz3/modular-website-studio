import { describe,it,expect } from 'vitest';
import { ProjectStore } from '../src/core/store';
import { sampleProject } from '../src/core/sample';
import { attr, elements, sourceText, normalizeProject, validateFile } from '../src/core/source';
import { applyCommand, ownStyle } from '../src/core/commands';
import { saveProject, parseProjectJson, exportWebsite, projectFromFiles, readZip, safePath } from '../src/core/io';
import { BUILTINS, installModule, validateModule } from '../src/core/modules';
import { previewTree, standalonePreview, editorDocument } from '../src/preview/document';
import { strFromU8, zipSync, strToU8 } from 'fflate';
const fresh=()=>new ProjectStore(structuredClone(sampleProject));
const find=(store:ProjectStore,tag:string)=>elements(sourceText(store.getSnapshot().project)).find(n=>n.tag===tag)!;

describe('Source → canvas → source → save → reopen → export',()=>{
  it('preserves comments and untouched source bytes when assigning stable identity',()=>{
    const raw=sourceText(sampleProject).replace('<main>','<!-- preserve  me -->\n<main>');
    const p=normalizeProject({...sampleProject,files:{...sampleProject.files,'index.html':{kind:'text',content:raw}}});
    expect(sourceText(p).replace(/ data-mws-id="[^"]+"/g,'')).toBe(raw);
    expect(normalizeProject(p)).toEqual(p);
  });
  it('round-trips real text, CSS, DOM hierarchy, code editing and export',()=>{
    const s=fresh(),h1=find(s,'h1'),button=find(s,'button');
    s.dispatch([{type:'text',id:h1.id,text:'新的山川 & 世界'},{type:'style',id:button.id,property:'translate',value:'40px 20px'},{type:'style',id:button.id,property:'width',value:'240px'}]);
    const p=s.getSnapshot().project;expect(sourceText(p)).toContain('新的山川 &amp; 世界');expect(sourceText(p)).toContain('href="studio.css"');expect(ownStyle(p,button.id,'width')).toBe('240px');
    s.editFile('index.html',sourceText(p).replace('新的山川 &amp; 世界','Code to canvas'));
    expect(JSON.stringify(previewTree(s.getSnapshot().project))).toContain('Code to canvas');
    const reopened=parseProjectJson(saveProject(s.getSnapshot().project));expect(reopened).toEqual(s.getSnapshot().project);
    const zip=readZip(exportWebsite(reopened));expect(strFromU8(zip['index.html'])).toContain('Code to canvas');expect(strFromU8(zip['studio.css'])).toContain('40px 20px');expect(strFromU8(zip['main.js'])).toContain('addEventListener');
    expect(projectFromFiles(zip).files).toEqual(reopened.files);
  });
  it('keeps stable element ids through manual edits and undo/redo',()=>{
    const s=fresh(),id=find(s,'h1').id;s.dispatch([{type:'text',id,text:'Changed'}]);s.undo();expect(sourceText(s.getSnapshot().project)).toContain('山川之上');s.redo();expect(find(s,'h1').id).toBe(id);expect(sourceText(s.getSnapshot().project)).toContain('Changed');
  });
  it('retains last valid preview on invalid HTML/CSS/JS and rejects conflicting visual edits',()=>{
    const s=fresh(),p=s.getSnapshot().project,id=find(s,'h1').id;
    s.editFile('styles.css','body { color: red;');expect(s.getSnapshot().project).toBe(p);expect(s.getSnapshot().diagnostics.length).toBeGreaterThan(0);expect(()=>s.dispatch([{type:'text',id,text:'lost'}])).toThrow();
    s.discardDraft();s.editFile('main.js','const = ;');expect(s.getSnapshot().project).toBe(p);s.discardDraft();
    s.editFile('index.html',sourceText(p).replace('</h1>',''));expect(s.getSnapshot().project).toBe(p);s.discardDraft();
    s.dispatch([{type:'text',id,text:'Fresh'}]);expect(()=>s.dispatch([{type:'text',id,text:'Stale'}],0)).toThrow('版本');
  });
  it('moves actual source slices without converting Flexbox to absolute positioning',()=>{
    const s=fresh(),list=elements(sourceText(s.getSnapshot().project)),cards=list.filter(n=>n.tag==='article');
    s.dispatch([{type:'move',id:cards[1].id,parentId:cards[0].parentId!,beforeId:cards[0].id}]);
    const html=sourceText(s.getSnapshot().project);expect(html.indexOf(cards[1].id)).toBeLessThan(html.indexOf(cards[0].id));expect(html).not.toContain('position: absolute');
    expect(()=>s.dispatch([{type:'move',id:cards[0].parentId!,parentId:cards[0].id}])).toThrow('后代');
  });
  it('makes transactions atomic if a later command fails',()=>{
    const s=fresh(),p=s.getSnapshot().project,id=find(s,'h1').id;
    expect(()=>s.dispatch([{type:'text',id,text:'Should roll back'},{type:'move',id,parentId:id}])).toThrow();expect(s.getSnapshot().project).toBe(p);
  });
  it('removes deleted descendant override rules while preserving unrelated CSS',()=>{
    const s=fresh(),article=find(s,'article'),h1=find(s,'h1');
    s.dispatch([{type:'style',id:article.id,property:'color',value:'red'},{type:'style',id:h1.id,property:'color',value:'blue'}]);s.dispatch([{type:'delete',id:article.id}]);
    expect(sourceText(s.getSnapshot().project,'studio.css')).not.toContain(article.id);expect(ownStyle(s.getSnapshot().project,h1.id,'color')).toBe('blue');
  });
  it('rejects duplicate identity, CSS injection, non-leaf text replacement and void insertion',()=>{
    const s=fresh(),p=s.getSnapshot().project,id=find(s,'h1').id;
    expect(()=>s.dispatch([{type:'style',id,property:'color',value:'red; display:none'}])).toThrow();
    expect(()=>s.dispatch([{type:'text',id:find(s,'section').id,text:'Erase'}])).toThrow('子元素');
    expect(validateFile('index.html',sourceText(p).replace(/data-mws-id="[^"]+"/g,'data-mws-id="same"')).length).toBeGreaterThan(0);
    expect(validateFile('index.html',sourceText(p).replace('</head>','<style>body { color: red;</style></head>')).length).toBeGreaterThan(0);
    expect(validateFile('index.html',sourceText(p).replace('</body>','<script>const = ;</script></body>')).length).toBeGreaterThan(0);
  });
  it('duplicates with fresh identities and preserves source attributes',()=>{
    const s=fresh(),id=find(s,'button').id;s.dispatch([{type:'duplicate',id}]);const buttons=elements(sourceText(s.getSnapshot().project)).filter(n=>n.tag==='button');expect(buttons.length).toBe(2);expect(buttons[0].id).not.toBe(buttons[1].id);
  });
  it('duplicates nested generated styles and internal references without rewriting source literals',()=>{
    const raw=`<!doctype html><html><head><link rel="stylesheet" href="module.css"></head><body>
<!-- untouched outside -->
<p id="outside">External description</p><main>
<article class="example-card" id='card' data-mws-reveal="enter">
  <h2 id="heading">A title with id="panel" in its text</h2>
  <label for="email">Email</label><input id="email" aria-describedby="hint outside">
  <p id="hint">Help</p><button aria-controls="panel" aria-labelledby="heading outside">Open</button>
  <div id="panel"><a href="#panel">Inside</a><a href="#outside">Outside</a><a href="other.html#panel">Other page</a></div>
  <!-- id="panel" and data-mws-id="literal" stay literal -->
  <script>window.marker=' id="panel" data-mws-id="literal"';</script>
</article>
<!-- untouched after -->
</main></body></html>`;
    const s=new ProjectStore({...sampleProject,files:{'index.html':{kind:'text',content:raw},'module.css':{kind:'text',content:'.example-card { background: white; }'}}});
    const article=find(s,'article'),heading=find(s,'h2'),input=find(s,'input');
    s.dispatch([{type:'style',id:article.id,property:'padding',value:'31px'},{type:'style',id:heading.id,property:'color',value:'rgb(12, 34, 56)'},{type:'style',id:input.id,property:'width',value:'220px'}]);
    s.editFile('studio.css',sourceText(s.getSnapshot().project,'studio.css')+`\n/* keep responsive context */\n@media (max-width: 600px) { [data-mws-id="${input.id}"] { width: 160px; } }`);
    const before=s.getSnapshot().project,original=elements(sourceText(before)).find(n=>n.id===article.id)!;
    s.dispatch([{type:'duplicate',id:article.id}]);const after=s.getSnapshot().project;
    const nodes=elements(sourceText(after)),articles=nodes.filter(n=>n.tag==='article'),copied=articles[1];
    const descendants=nodes.filter(n=>n.loc.startOffset>=copied.loc.startOffset&&n.loc.endOffset<=copied.loc.endOffset);
    const copiedHeading=descendants.find(n=>n.tag==='h2')!,copiedInput=descendants.find(n=>n.tag==='input')!,copiedHint=descendants.find(n=>n.tag==='p')!,copiedPanel=descendants.find(n=>n.tag==='div')!;
    expect(ownStyle(after,copied.id,'padding')).toBe('31px');expect(ownStyle(after,copiedHeading.id,'color')).toBe('rgb(12, 34, 56)');expect(ownStyle(after,copiedInput.id,'width')).toBe('160px');
    expect(sourceText(after,'studio.css')).toContain(`@media (max-width: 600px) { [data-mws-id="${input.id}"] { width: 160px; } [data-mws-id="${copiedInput.id}"] { width: 160px; } }`);
    expect(attr(descendants.find(n=>n.tag==='label')!.node,'for')).toBe(attr(copiedInput.node,'id'));
    expect(attr(copiedInput.node,'aria-describedby')).toBe(attr(copiedHint.node,'id')+' outside');
    const copiedButton=descendants.find(n=>n.tag==='button')!;
    expect(attr(copiedButton.node,'aria-controls')).toBe(attr(copiedPanel.node,'id'));
    expect(attr(copiedButton.node,'aria-labelledby')).toBe(attr(copiedHeading.node,'id')+' outside');
    expect(descendants.filter(n=>n.tag==='a').map(n=>attr(n.node,'href'))).toEqual(['#'+attr(copiedPanel.node,'id'),'#outside','other.html#panel']);
    expect(attr(copied.node,'data-mws-reveal')).toBe('enter');
    const ids=nodes.map(n=>attr(n.node,'id')).filter(Boolean);expect(new Set(ids).size).toBe(ids.length);
    const html=sourceText(after),copy=html.slice(copied.loc.startOffset,copied.loc.endOffset);
    expect(copy).toContain('<!-- id="panel" and data-mws-id="literal" stay literal -->');expect(copy).toContain("window.marker=' id=\"panel\" data-mws-id=\"literal\"';");expect(copy).toContain('A title with id="panel" in its text');
    expect(html).toBe(sourceText(before).slice(0,original.loc.endOffset)+'\n'+copy+sourceText(before).slice(original.loc.endOffset));
    expect(after.files['module.css']).toEqual(before.files['module.css']);
    s.undo();expect(s.getSnapshot().project).toEqual(before);s.redo();expect(s.getSnapshot().project).toEqual(after);
    s.dispatch([{type:'style',id:copiedHeading.id,property:'color',value:'blue'}]);expect(ownStyle(s.getSnapshot().project,heading.id,'color')).toBe('rgb(12, 34, 56)');expect(ownStyle(s.getSnapshot().project,copiedHeading.id,'color')).toBe('blue');
    expect(parseProjectJson(saveProject(s.getSnapshot().project))).toEqual(s.getSnapshot().project);
  });
});
describe('Imports and trust boundaries',()=>{
  it('rejects traversal and hostile project schemas',()=>{
    for(const path of ['../x','/etc/x','a/../../x','a\\b','__proto__/x'])expect(()=>safePath(path)).toThrow();
    expect(()=>parseProjectJson('{"format":"mws-project","version":1}')).toThrow();
    expect(()=>readZip(zipSync({'../escape.html':strToU8('bad')}))).toThrow();
  });
  it('round-trips binary resources',()=>{
    const input={'index.html':strToU8(sourceText(sampleProject)),'styles.css':strToU8('body{}'),'pixel.png':new Uint8Array([137,80,78,71,0,255])};
    const p=projectFromFiles(input);expect(readZip(exportWebsite(p))['pixel.png']).toEqual(input['pixel.png']);
  });
  it('blocks executable modules, permissions and implicit updates',()=>{
    expect(validateModule(BUILTINS[0]).id).toBe('studio/card');
    expect(()=>validateModule({...BUILTINS[0],html:'<img onerror="alert(1)" src="x">'})).toThrow();
    expect(()=>validateModule({...BUILTINS[0],html:'<script>alert(1)</script>'})).toThrow();
    expect(()=>validateModule({...BUILTINS[0],permissions:['network']})).toThrow();
    const p=installModule(sampleProject,BUILTINS[0]);expect(()=>installModule(p,BUILTINS[0])).toThrow('已安装');
  });
  it('strips active content from editing DOM while preserving executable export',()=>{
    const p=normalizeProject({...sampleProject,files:{...sampleProject.files,'index.html':{kind:'text',content:sourceText(sampleProject).replace('<h1 class="title">','<h1 onclick="alert(1)" class="title">')}}});
    const tree=JSON.stringify(previewTree(p).body);expect(tree).not.toContain('onclick');expect(tree).not.toContain('addEventListener');expect(sourceText(p)).toContain('onclick');
    expect(editorDocument('token')).toContain("connect-src 'none'");expect(standalonePreview(p)).toContain('addEventListener');expect(standalonePreview(p)).toContain("form-action 'none'");
  });
});
