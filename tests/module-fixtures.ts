import {mkdir, writeFile} from 'node:fs/promises';
import {join} from 'node:path';
import {zipSync, strToU8} from 'fflate';
import type {Project, StudioModule} from '../src/core/types.ts';

export const card:StudioModule={id:'test/card',version:'1.0.0',name:'本地验收卡片',description:'本地 ZIP / 跨页面复用',html:'<article class="roundtrip-card"><h2>独有卡片 MODULE-20261104</h2><p>保存后仍然存在</p></article>',css:'.roundtrip-card { color: rgb(11, 45, 87); background-color: rgb(230, 240, 250); padding: 23px; border-radius: 9px; }',permissions:[],dependencies:{}};
export const slashCard:StudioModule={...card,id:'a/b',name:'斜线模块',html:'<article class="slash-card">slash module</article>',css:'.slash-card { color: rgb(12, 34, 56); padding: 17px; }'};
export const dashCard:StudioModule={...card,id:'a-b',name:'短横线模块',html:'<article class="dash-card">dash module</article>',css:'.dash-card { color: rgb(98, 76, 54); padding: 29px; }'};
export const unsafeCard:StudioModule={...card,id:'test/unsafe',name:'不安全卡片',html:'<button onclick="alert(1)">unsafe</button>'};
export function fixtureProject():Project {
  const page=(title:string,prefix:string)=>`<!doctype html><html><head><meta charset="utf-8"><title>${title}</title><link rel="stylesheet" href="${prefix}styles.css"></head><body><nav><a href="${prefix}index.html">首页</a><a href="${prefix}pages/about.html">关于</a></nav><main id="cards"><h1>${title}</h1></main><button id="original-button">原站按钮</button><output id="script-result">未运行</output><script src="${prefix}main.js"></script></body></html>`;
  return {format:'mws-project',version:1,name:'本地模块双页验收',entry:'index.html',modules:[],files:{
    'index.html':{kind:'text',content:page('独有首页 HOME-20261104','')},
    'pages/about.html':{kind:'text',content:page('独有二级页 ABOUT-20261104','../')},
    'styles.css':{kind:'text',content:'body { margin: 20px; font-family: sans-serif; } #cards { display: grid; gap: 16px; }'},
    'main.js':{kind:'text',content:"document.body.dataset.scriptRan = 'yes'; document.querySelector('#original-button').addEventListener('click', () => { document.querySelector('#script-result').textContent = '原站脚本执行成功'; });"}
  }};
}
export function legacyProject():Project {
  const p=fixtureProject();p.modules=[slashCard];
  p.files['modules/a-b.css']={kind:'text',content:slashCard.css};
  p.files['index.html'].content=p.files['index.html'].content.replace('</head>',"<link rel='stylesheet' href='./modules/a-b.css'>\n</head>").replace('</main>',slashCard.html+'</main>');
  return p;
}
export const moduleZip=(module:StudioModule)=>zipSync({'module.json':strToU8(JSON.stringify(module))});
export async function writeModuleFixtures(dir:string){
  await mkdir(dir,{recursive:true});const p=fixtureProject();
  const files={'site.zip':zipSync(Object.fromEntries(Object.entries(p.files).map(([path,file])=>[path,strToU8(file.content)]))), 'card.zip':moduleZip(card), 'a-slash-b.zip':moduleZip(slashCard), 'a-dash-b.zip':moduleZip(dashCard), 'unsafe.zip':moduleZip(unsafeCard), 'legacy.mws.json':strToU8(JSON.stringify(legacyProject())), 'unsafe.mws.json':strToU8(JSON.stringify({...p,modules:[unsafeCard]}))};
  for(const [name,bytes] of Object.entries(files))await writeFile(join(dir,name),bytes);
  return Object.fromEntries(Object.keys(files).map(name=>[name,join(dir,name)]));
}
if(process.argv[1]?.endsWith('/module-fixtures.ts')){
  await writeModuleFixtures('test-results/module-fixtures');
  console.log('Fixtures: test-results/module-fixtures/ (site.zip, card.zip, a-slash-b.zip, a-dash-b.zip, unsafe.zip, legacy.mws.json, unsafe.mws.json)');
}
