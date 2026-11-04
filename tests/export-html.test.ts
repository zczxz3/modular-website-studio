import {describe,it,expect} from 'vitest';
import {JSDOM} from 'jsdom';
import {exportSingleHtml,SingleHtmlExportError} from '../src/core/export-html';
import {normalizeProject} from '../src/core/source';
import type {Project,ProjectFile} from '../src/core/types';

const text=(content:string):ProjectFile=>({kind:'text',content});
const fixture=(body:string,head='',extra:Record<string,ProjectFile>={},entry='index.html'):Project=>normalizeProject({format:'mws-project',version:1,name:'Export',entry,modules:[],files:{[entry]:text(`<!doctype html>\n<html><head>${head}</head><body>${body}</body></html>`),...extra}});
const decode=(uri:string)=>Buffer.from(uri.split(',')[1].split('#')[0],'base64').toString('utf8');
function failure(p:Project){try{exportSingleHtml(p);throw new Error('Expected export failure');}catch(error){expect(error).toBeInstanceOf(SingleHtmlExportError);return error as SingleHtmlExportError;}}

describe('single-page HTML export',()=>{
  it('embeds CSS, imports, images, fonts and deferred JS without mutating source or losing stable IDs',async()=>{
    const p=fixture('<!-- retained -->\n<h1 id="heading">可拖动的网页</h1><img src="../assets/my%20cover.png?v=2"><a href="view.html#heading">返回</a>',
      '<link id="theme" rel="stylesheet" href="../styles/base.css" media="screen"><script defer src="../scripts/behavior.js"></script>',{
        'styles/base.css':text('@import "./type.css";\n#heading{color:rgb(12,34,56)}.cover{background:url(../assets/my\\20 cover.png#layer)}'),
        'styles/type.css':text('@font-face{font-family:Example;src:url("../fonts/example.woff2")}'),
        'assets/my cover.png':{kind:'asset',content:'data:image/png;base64,AQID'},
        'fonts/example.woff2':{kind:'asset',content:'data:font/woff2;base64,BAUG'},
        'scripts/behavior.js':text('window.headingFound=!!document.getElementById("heading");window.closingTag="</script>";document.getElementById("heading").dataset.ran="yes";')
      },'pages/view.html');
    const before=JSON.stringify(p),output=exportSingleHtml(p);expect(JSON.stringify(p)).toBe(before);expect(output).toContain('<!-- retained -->');
    const html=new JSDOM(output,{runScripts:'dangerously',resources:'usable',url:'https://standalone.example/page.html'});
    try{
      await new Promise<void>((done,reject)=>{const timeout=setTimeout(()=>reject(new Error('Export script did not load')),3000);html.window.addEventListener('load',()=>{clearTimeout(timeout);done();},{once:true});});
      const doc=html.window.document;expect(doc.querySelector('#heading')?.getAttribute('data-ran')).toBe('yes');expect(html.window.headingFound).toBe(true);expect(html.window.closingTag).toBe('</script>');
      expect(doc.querySelector('meta')?.getAttribute('charset')).toBe('utf-8');expect(doc.querySelector('script')?.hasAttribute('defer')).toBe(true);expect(doc.querySelector('script')?.src).toMatch(/^data:text\/javascript;charset=utf-8;base64,/);
      expect(doc.querySelector('img')?.src).toBe('data:image/png;base64,AQID');expect(doc.querySelector('a')?.getAttribute('href')).toBe('#heading');
      expect(doc.querySelector('style')?.textContent).toContain('data:font/woff2;base64,BAUG');expect(doc.querySelector('style')?.textContent).toContain('data:image/png;base64,AQID#layer');expect(doc.querySelector('style')?.media).toBe('screen');
      expect(html.window.getComputedStyle(doc.querySelector('h1')!).color).toBe('rgb(12, 34, 56)');
      const beforeDoc=new JSDOM(p.files[p.entry].content).window.document;
      expect(doc.querySelector('h1')?.getAttribute('data-mws-id')).toBe(beforeDoc.querySelector('h1')?.getAttribute('data-mws-id'));expect(doc.querySelector('style')?.getAttribute('data-mws-id')).toBe(beforeDoc.querySelector('link')?.getAttribute('data-mws-id'));
    }finally{html.window.close();}
  });

  it('only rewrites CSS URLs, preserving literal content, comments, script text and template resources',()=>{
    const script='window.label="url(missing.png)";';
    const p=fixture(`<div style="background-image:url('assets/a.png')"></div><script>${script}</script><template><img src="assets/a.png"></template>`,
      '<style>/* url(missing.png) */ .x::before{content:"url(missing.png)"}.x{background-image:url("assets/a.png")}</style>',{'assets/a.png':{kind:'asset',content:'data:image/png;base64,AQID'}});
    const output=exportSingleHtml(p),doc=new JSDOM(output).window.document;
    expect(doc.querySelector('script')?.textContent).toBe(script);expect(doc.querySelector('style')?.textContent).toContain('/* url(missing.png) */');expect(doc.querySelector('style')?.textContent).toContain('content:"url(missing.png)"');expect(doc.querySelector('div')?.getAttribute('style')).toContain('data:image/png;base64,AQID');
    expect(doc.querySelector('template')?.content.querySelector('img')?.getAttribute('src')).toBe('data:image/png;base64,AQID');
  });

  it('embeds SVG dependencies while preserving fragment references and CSS closing-tag strings',()=>{
    const p=fixture('<img src="assets/shape.svg#mark">','<link rel="stylesheet" href="style.css">',{
      'assets/shape.svg':text('<svg xmlns="http://www.w3.org/2000/svg"><image href="pixel.png"/><use href="#mark"/></svg>'),
      'assets/pixel.png':{kind:'asset',content:'data:image/png;base64,AQID'},
      'style.css':text('.x::before{content:"</style>"}')
    });
    const output=exportSingleHtml(p),doc=new JSDOM(output).window.document,uri=doc.querySelector('img')!.getAttribute('src')!;
    expect(uri.endsWith('#mark')).toBe(true);expect(decode(uri)).toContain('href="data:image/png;base64,AQID"');expect(decode(uri)).toContain('href="#mark"');expect(doc.querySelectorAll('style')).toHaveLength(1);expect(doc.querySelector('style')!.textContent).toContain('\\3c /style>');
  });

  it('reports all concrete missing/external resources and other-page links instead of returning incomplete HTML',()=>{
    const p=fixture('<img src="missing.png" srcset="small.png 1x, large.png 2x"><a href="pages/about.html">More</a>',
      '<link rel="stylesheet" href="https://cdn.example/theme.css"><script type="module" src="app.js"></script>',{'pages/about.html':text('<!doctype html><html><head></head><body>More</body></html>')});
    const error=failure(p);expect(error.issues.join('\n')).toContain('missing.png');expect(error.message).toContain('https://cdn.example/theme.css');expect(error.message).toContain('pages/about.html');expect(error.message).toContain('srcset');expect(error.message).toContain('module');expect(error.message).toContain('ZIP');
  });

  it('rejects resource-dependent scripts, CSP and qualified imports with precise context',()=>{
    const p=fixture('<h1>Test</h1>','<meta http-equiv="Content-Security-Policy" content="script-src none"><link rel="stylesheet" href="style.css"><script src="app.js"></script>',{
      'style.css':text('@import "mobile.css" screen;'),
      'app.js':text('import("./extra.js");fetch("./data.json");')
    });
    const error=failure(p);expect(error.message.toLowerCase()).toContain('content-security-policy');expect(error.message).toContain('style.css');expect(error.message).toContain('mobile.css');expect(error.message).toContain('动态 import');expect(error.message).toContain('fetch');
  });

  it('leaves external navigation and inline scripts unchanged and ignores unrelated project files',()=>{
    const p=fixture('<a href="https://example.com/about">External</a><a href="#a">Here</a><script>window.example=true;</script>', '',{
      'unused.css':text('@import "https://example.com/unused.css";'),
      'other.html':text('<!doctype html><html><head></head><body>Unused page</body></html>')
    });
    const output=exportSingleHtml(p);expect(output).toContain('href="https://example.com/about"');expect(output).toContain('window.example=true;');expect(output).not.toContain('unused.css');
  });

  it('can reopen and re-export embedded classic scripts without changing timing attributes',()=>{
    const p=fixture('<h1>Local</h1>','<script defer src="local.js"></script>',{'local.js':text('document.querySelector("h1").textContent="中文内容";')});
    const first=exportSingleHtml(p),reopened=fixture('Unused');reopened.files['index.html']=text(first);
    const second=exportSingleHtml(reopened),doc=new JSDOM(second).window.document;
    expect(doc.querySelector('script')?.hasAttribute('defer')).toBe(true);expect(decode(doc.querySelector('script')!.src)).toContain('中文内容');
    expect(doc.querySelectorAll('meta[charset]')).toHaveLength(1);
  });

  it('reports nested dependencies in uploaded or directly embedded data SVG images',()=>{
    const svg='data:image/svg+xml;base64,'+Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><image href="https://cdn.example/remote.png"/></svg>').toString('base64');
    const error=failure(fixture(`<img src="${svg}"><img src="uploaded.svg">`,'',{'uploaded.svg':{kind:'asset',content:svg}}));
    expect(error.message).toContain('https://cdn.example/remote.png');expect(error.message).toContain('uploaded.svg');
  });

  it('rewrites qualified SVG attributes in inline and local SVG without confusing href with xlink:href',()=>{
    const svg='<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"><image href="pixel.png" xlink:href="fallback.png"></image><use xlink:href="#mark"></use></svg>';
    const p=fixture(svg+'<img src="shape.svg">','',{
      'shape.svg':text(svg),
      'pixel.png':{kind:'asset',content:'data:image/png;base64,AQID'},
      'fallback.png':{kind:'asset',content:'data:image/png;base64,BAUG'}
    });
    const doc=new JSDOM(exportSingleHtml(p)).window.document;
    for(const target of [doc,new JSDOM(decode(doc.querySelector('img')!.src)).window.document]){
      expect(target.querySelector('image')?.getAttribute('href')).toBe('data:image/png;base64,AQID');
      expect(target.querySelector('image')?.getAttributeNS('http://www.w3.org/1999/xlink','href')).toBe('data:image/png;base64,BAUG');
      expect(target.querySelector('use')?.getAttribute('xlink:href')).toBe('#mark');
    }
  });

  it('embeds SVG presentation URLs and reports their unresolved counterparts inside data SVGs',()=>{
    const attrs=['fill','stroke','filter','clip-path','mask','marker-start','marker-mid','marker-end','cursor'];
    const body='<svg><rect '+attrs.map(name=>`${name}="url(paint.svg#mark)"`).join(' ')+'></rect><path fill="url(#local)"></path></svg>';
    const p=fixture(body+'<img src="shape.svg">','',{
      'shape.svg':text(body),'paint.svg':text('<svg xmlns="http://www.w3.org/2000/svg"><linearGradient id="mark"/></svg>')
    });
    const doc=new JSDOM(exportSingleHtml(p)).window.document;
    for(const target of [doc,new JSDOM(decode(doc.querySelector('img')!.src)).window.document]){
      for(const name of attrs)expect(target.querySelector('rect')?.getAttribute(name)).toMatch(/^url\("data:image\/svg\+xml;charset=utf-8;base64,.*#mark"\)$/);
      expect(target.querySelector('path')?.getAttribute('fill')).toBe('url("#local")');
    }
    const uri='data:image/svg+xml;base64,'+Buffer.from(body).toString('base64');
    expect(failure(fixture(`<img src="${uri}">`)).message).toContain('内嵌 SVG 仍引用资源 paint.svg#mark');
    expect(failure(fixture('<svg><path fill="url(https://cdn.example/paint.svg#mark)"></path></svg>')).message).toContain('https://cdn.example/paint.svg#mark');
  });

  it('rejects external and data SVG use targets while retaining same-document symbols',()=>{
    const sprite='<svg xmlns="http://www.w3.org/2000/svg"><symbol id="mark"><path d="M0 0h10v10z"/></symbol></svg>';
    const data='data:image/svg+xml;base64,'+Buffer.from(sprite).toString('base64')+'#mark';
    for(const name of ['href','xlink:href'])for(const ref of ['sprite.svg#mark',data]){
      const svg=`<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"><use ${name}="${ref}"></use></svg>`;
      const embedded='data:image/svg+xml;base64,'+Buffer.from(svg).toString('base64');
      for(const p of [
        fixture(svg,'',{'sprite.svg':text(sprite)}),
        fixture('<img src="icon.svg">','',{'icon.svg':text(svg),'sprite.svg':text(sprite)}),
        fixture(`<img src="${embedded}">`)
      ]){
        const error=failure(p);expect(error.message).toContain('SVG <use> 只支持同一文档的 #片段引用');expect(error.message).toContain(ref);
      }
    }
    const local='<svg><symbol id="mark"><path d="M0 0h10v10z"></path></symbol><use href="#mark"></use><use xlink:href="#mark"></use></svg>';
    const output=exportSingleHtml(fixture(local));
    expect(output).toContain('<use');expect(output).toContain('href="#mark"');expect(output).toContain('xlink:href="#mark"');
  });

  it('detects known global and computed resource APIs plus computed currentScript references',()=>{
    const snippets=[
      'window.fetch("data.json")','globalThis["fetch"]("data.json")','self.fetch?.("data.json")',
      'new window.Worker("worker.js")','new globalThis["SharedWorker"]("worker.js")',
      'new self.XMLHttpRequest()','new window["WebSocket"]("wss://example.test")','new globalThis.EventSource("events")',
      'self["importScripts"]("worker.js")','document["currentScript"].src','window.document.currentScript.src','globalThis["document"]["currentScript"].src'
    ];
    for(const code of snippets){
      const error=failure(fixture('<h1>Local</h1>','<script src="app.js"></script>',{'app.js':text(code)}));
      expect(error.message).toContain('app.js');expect(error.message).toContain('依赖');
    }
    // Unrelated object methods are not treated as browser-global loaders.
    expect(exportSingleHtml(fixture('<script>const model={fetch(){return 1}};model.fetch();</script>'))).toContain('model.fetch()');
  });

  it('rejects cyclic CSS resources instead of recursing or silently dropping rules',()=>{
    const error=failure(fixture('<h1>Cycle</h1>','<link rel="stylesheet" href="a.css">',{'a.css':text('@import "b.css";'),'b.css':text('@import "a.css";')}));
    expect(error.message).toContain('CSS 循环引用 a.css');
  });
});
