import {CURATED_BLOCKS,CURATED_NOTICE} from '../resources/curated';
import {WEBSITE_ASSET_MODULES,WEBSITE_ASSET_NOTICE} from '../resources/website-assets-library';
import type {Project,StudioModule} from './types';
import type {ModuleCatalogSnapshot} from './resource-contract';
import {INTERACTIVE_MODULES} from './interactions';
import {normalizeProject} from './source';
import {randomId} from './id';
import {foundation} from '../resources/foundation';
import {queueCard} from '../resources/queue-card';
import {WEBSITE_ASSETS_NOTICE} from '../resources/website-assets';
import license from '../resources/website-assets-LICENSE.txt?raw';
import manifest from '../templates/portfolio/manifest';
import html from '../templates/portfolio/index.html?raw';
import about from '../templates/portfolio/about.html?raw';
import workSpace from '../templates/portfolio/work-space.html?raw';
import workTide from '../templates/portfolio/work-tide.html?raw';
import css from '../templates/portfolio/portfolio.css?raw';
import tidal from '../templates/portfolio/tidal.svg?raw';
import arches from '../templates/portfolio/arches.svg?raw';

export const THEMES=[
  {id:'paper',name:'纸感留白',description:'暖白 · 墨绿 · 舒展衬线',bg:'#f3f1eb',surface:'#ffffff',ink:'#233e3d',muted:'#5f7270',accent:'#286c70',line:'#ced8d2',radius:'12px',space:'28px',heading:'Georgia, "Songti SC", serif'},
  {id:'night',name:'深海蓝调',description:'深蓝 · 冰蓝 · 几何无衬线',bg:'#101c30',surface:'#1c2d47',ink:'#ecf2fb',muted:'#a8bdd5',accent:'#83c9eb',line:'#354863',radius:'26px',space:'36px',heading:'system-ui, sans-serif'}
];
export const THEME_FILE='studio-theme.css';
export const COVERS=[{id:'tidal',name:'潮汐 · 横幅',path:'assets/tidal.svg',alt:'青蓝色潮汐与山形的抽象构图',source:tidal},{id:'arches',name:'回廊 · 竖幅',path:'assets/arches.svg',alt:'层叠拱门组成的空间研究',source:arches}];
export const svgUrl=(source:string)=>'data:image/svg+xml;charset=utf-8,'+encodeURIComponent(source);
export function themeCss(id:string){
  const t=THEMES.find(t=>t.id===id);if(!t)throw new Error('主题不存在。');
  return `/* Studio theme: ${t.id} — source is authoritative. */\n:root { --ws-theme: ${t.id}; --ws-bg:${t.bg}; --ws-surface:${t.surface}; --ws-ink:${t.ink}; --ws-muted:${t.muted}; --ws-accent:${t.accent}; --ws-line:${t.line}; --ws-radius:${t.radius}; --ws-space:${t.space}; --ws-heading:${t.heading}; --ws-font:system-ui,sans-serif; }\n[data-ws-button] { display:inline-flex; align-items:center; justify-content:center; min-height:46px; max-width:100%; padding:12px 24px; border:1px solid var(--ws-accent); border-radius:var(--ws-radius); font:600 14px/1.5 var(--ws-font); text-decoration:none; cursor:pointer; transition:box-shadow .2s; }\n[data-ws-button="solid"] { background:var(--ws-accent); color:var(--ws-bg); }\n[data-ws-button="outline"] { background:transparent; color:var(--ws-accent); }\n[data-ws-button]:hover { box-shadow:0 5px 0 color-mix(in srgb,var(--ws-accent) 25%,transparent); }\n@media(prefers-reduced-motion:reduce){[data-ws-button]{transition:none}}`;
}
const tokens:Record<string,string>={accent:'accent',ink:'ink',surface:'surface',radius:'radius',space:'space'};
function themed(source:string){return source.replace(/--mf-(accent|ink|surface|radius|space):([^;]+);/g,(_all,key:string,value:string)=>`--mf-${key}:var(--ws-${tokens[key]},${value});`).replace('500 28px/1.15 Georgia,serif','500 28px/1.15 var(--ws-heading,Georgia,serif)');}
const original=(id:string)=>foundation.find(m=>m.id==='foundation/'+id)!;
const adapt=(id:string,name:string,description:string,html?:string):StudioModule=>{
  const m=original(id);return {id:'workbench/'+id,version:'1.0.0',name,description,html:html??m.html,css:themed(m.css),permissions:[],dependencies:{}};
};
export const BLOCK:StudioModule={...adapt('grid','双图文作品区块','两张图片与说明，手机上自动上下排列'),id:'workbench/image-grid',html:'<section data-ws-block="图文作品" class="mf-grid ws-image-grid"><article><img src="assets/tidal.svg" alt="潮汐与山形"><small>01 / 日常观察</small><h3>从一束光开始</h3><p>点击这里，写下作品的故事。</p></article><article><img src="assets/arches.svg" alt="层叠的拱门"><small>02 / 设计练习</small><h3>另一种可能</h3><p>替换图片，让这个区块成为你的作品。</p></article></section>',css:themed(original('grid').css)+'\n.ws-image-grid{margin:40px 6%;font-family:var(--ws-font,system-ui)} .ws-image-grid img{width:100%;max-width:100%;aspect-ratio:4/3;object-fit:cover;border-radius:var(--mf-radius);margin-bottom:20px}.ws-image-grid small{color:var(--ws-muted,#456569)}@media(max-width:600px){.ws-image-grid{grid-template-columns:1fr}}'};
const queueColors:Record<string,string>={'#182434':'--ws-ink','#d7e1e9':'--ws-line','#fff':'--ws-surface','#526173':'--ws-muted','#2463eb':'--ws-accent','#176f68':'--ws-accent'};
const projectCard:StudioModule={...queueCard,id:'workbench/project-card',name:'项目展示卡片',description:'内置作品示例 · 可修改内容与链接',
  html:queueCard.html.replace('Field notes','我的观察记录').replace('A quiet place for ideas and observations.','把值得记录的观察与想法，变成你的下一个作品。').replace('#projects','#works').replace('Explore this project →','查看这个作品 →'),
  css:queueCard.css.replace(/#(?:182434|d7e1e9|fff|526173|2463eb|176f68)\b/g,color=>`var(${queueColors[color]},${color})`).replace('16px/1.6 system-ui,sans-serif','16px/1.6 var(--ws-font,system-ui,sans-serif)').replaceAll('border-radius:16px','border-radius:var(--ws-radius,16px)').replaceAll('border-radius:12px','border-radius:var(--ws-radius,12px)')+'\n.qr-project{box-sizing:border-box;width:100%;overflow-wrap:anywhere;padding:var(--ws-space,18px)}.qr-project h2{font-family:var(--ws-heading,system-ui)}'};
export const BASIC=[
  {id:'workbench/heading',version:'1.0.0',name:'基础标题',description:'拖入标题，改字后可添加滚动动画',html:'<h2 class="ws-heading">写下你的新标题</h2>',css:'.ws-heading{font:500 clamp(28px,4vw,52px)/1.25 var(--ws-heading,Georgia,serif);color:var(--ws-ink,#233e3d);margin:28px 0;overflow-wrap:anywhere}',permissions:[],dependencies:{}},
  adapt('card','留白卡片','来自 website-assets · 可直接改文字',original('card').html.replace('FIELD NOTES · 01','创作笔记 · 01').replace('Room for a new idea','为想法留一点空间').replace('A quiet starting point for stories, projects and useful details.','在这里介绍你的作品、过程与想法。').replace('https://example.com/','#').replace('Read the story ↗','继续阅读 ↗')),
  adapt('navigation','折叠导航','原生折叠菜单 · 手机可用',original('navigation').html.replace('FIELD STUDIO','我的作品集').replace('Explore','浏览').replace('https://example.com/work','#works').replace('https://example.com/about','#about').replace('https://example.com/','#home').replace('Overview','首页').replace('Work','作品').replace('About','关于')),
  adapt('button-fill','填充按钮','来自 Button Atlas · 原生悬停反馈',original('button-fill').html.replace('Continue','继续探索')),
  projectCard,
  ...INTERACTIVE_MODULES,
  ...WEBSITE_ASSET_MODULES
];
export const NOTICES=`# Bundled resources\n\n${WEBSITE_ASSETS_NOTICE}\n\n${CURATED_NOTICE}\n\n${WEBSITE_ASSET_NOTICE}\n\nPortfolio layout, built-in tabs/accordion components and runtime, and tidal/arches SVG illustrations: original Modular Website Studio contributors, 2026, MIT. No third-party photography or fonts redistributed.\n\n${license}`;
// All registered resources are local immutable snapshots; moving upstreams never modify projects.
export const RESOURCE_CATALOG:ModuleCatalogSnapshot={
  schemaVersion:1,providerId:'studio/bundled-examples',revision:'1.2.0',
  resources:[{kind:'block',module:BLOCK},...CURATED_BLOCKS.map(module=>({kind:'block' as const,module})),...BASIC.map(module=>({kind:'component' as const,module}))],
  files:Object.fromEntries(COVERS.map(c=>[c.path,{kind:'text' as const,content:c.source}])),
  notice:NOTICES
};
export const BLOCKS=[BLOCK,...CURATED_BLOCKS];
export const RESOURCES=RESOURCE_CATALOG.resources.map(resource=>resource.module);
export const TEMPLATE=manifest;
export function createPortfolio(name='我的作品集'):Project {
  return normalizeProject({id:randomId(),format:'mws-project',version:1,name,entry:manifest.entry,modules:[],files:{
    'index.html':{kind:'text',content:html},'pages/about.html':{kind:'text',content:about},'pages/work-space.html':{kind:'text',content:workSpace},'pages/work-tide.html':{kind:'text',content:workTide},'portfolio.css':{kind:'text',content:css},
    [THEME_FILE]:{kind:'text',content:themeCss('paper')},'template.json':{kind:'text',content:JSON.stringify(manifest,null,2)},
    'THIRD_PARTY_NOTICES.md':{kind:'text',content:NOTICES},...Object.fromEntries(COVERS.map(c=>[c.path,{kind:'text' as const,content:c.source}]))
  }});
}
export function createBlank():Project {return normalizeProject({id:randomId(),format:'mws-project',version:1,name:'空白作品',entry:'index.html',modules:[],files:{'index.html':{kind:'text',content:'<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>新作品</title><link rel="stylesheet" href="studio-theme.css"></head><body><main><h1>从一个想法开始</h1><p>从左侧添加区块，开始创作。</p></main></body></html>'},[THEME_FILE]:{kind:'text',content:themeCss('paper')+'\nbody{margin:32px;font-family:var(--ws-font);background:var(--ws-bg);color:var(--ws-ink)}'}}});}
