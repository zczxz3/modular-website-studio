import {test,expect,type Page} from '@playwright/test';
import {readFile,writeFile} from 'node:fs/promises';
import {canvas,downloadFile,pickFile,serveExport,expectModuleCss,inspectorSection,revealInspectorField} from './helpers';
import type {Project} from '../src/core/types';

const LONG_TITLE='我是林间，把日常的观察变成有温度的设计与故事。';
async function create(page:Page){await page.goto('/');await page.getByRole('button',{name:'使用模板 →',exact:true}).click();await expect(canvas(page).locator('h1')).toHaveText('你好，我是林间。');}
async function noCode(page:Page){await expect(page.getByRole('button',{name:'高级编辑',exact:true})).toHaveAttribute('aria-pressed','false');await expect(page.locator('.code-panel')).toHaveCount(0);await expect(page.locator('.monaco-editor')).toHaveCount(0);}
async function title(page:Page,text:string){const heading=canvas(page).locator('h1');await heading.dblclick();await heading.fill(text);await heading.press('Enter');await expect(heading).toHaveText(text);}
async function changePage(page:Page,path:string){await page.getByRole('button',{name:'页面',exact:true}).click();await page.getByLabel('当前页面',{exact:true}).selectOption(path);}
async function insertBlock(page:Page){await page.getByRole('button',{name:'区块',exact:true}).click();await page.locator('[data-resource="workbench/image-grid"]').getByRole('button',{name:'添加到此处',exact:true}).click();}
async function commit(page:Page,label:string,value:string){await revealInspectorField(page,label);await page.getByLabel(label,{exact:true}).fill(value);await page.getByLabel(label,{exact:true}).press('Enter');}
async function imagesLoaded(page:Page){await expect.poll(()=>page.locator('img').evaluateAll(images=>images.every(n=>n instanceof HTMLImageElement&&n.complete&&n.naturalWidth>0))).toBe(true);}

test('first portfolio: content, real image picker, themes, motion, clean reopen and standalone ZIP',async({page,browser},info)=>{
  test.setTimeout(90000);await create(page);await noCode(page);
  await page.getByLabel('项目名称',{exact:true}).fill('林间 · 第一件作品');await title(page,LONG_TITLE);
  const heading=canvas(page).locator('h1'),identity=await heading.getAttribute('data-mws-id');
  await commit(page,'文字颜色','rgb(180, 90, 100)');
  await inspectorSection(page,'样式');await page.getByRole('button',{name:/深海蓝调/}).click();await expect(canvas(page).locator('body')).toHaveCSS('background-color','rgb(16, 28, 48)');await expect(heading).toHaveCSS('color','rgb(180, 90, 100)');
  await page.getByRole('button',{name:'↶ 撤销',exact:true}).click();await expect(canvas(page).locator('body')).toHaveCSS('background-color','rgb(243, 241, 235)');
  await page.getByRole('button',{name:'↷ 重做',exact:true}).click();await page.getByRole('button',{name:'恢复颜色跟随主题',exact:true}).click();await expect(heading).toHaveCSS('color','rgb(236, 242, 251)');
  await inspectorSection(page,'特效');await page.getByRole('button',{name:'应用淡入并上移',exact:true}).click();await expect(heading).toHaveAttribute('data-mws-reveal','enter');
  await page.getByRole('button',{name:'↶ 撤销',exact:true}).click();await expect(heading).not.toHaveAttribute('data-mws-reveal');
  await page.getByRole('button',{name:'↷ 重做',exact:true}).click();await expect(heading).toHaveAttribute('data-mws-reveal','enter');
  await page.getByText('精细设置',{exact:true}).click();await commit(page,'速度（毫秒）','1500');await commit(page,'延迟（毫秒）','80');await commit(page,'上移距离（像素）','32');
  await inspectorSection(page,'特效');await page.getByRole('button',{name:'重播效果',exact:true}).click();await expect(heading).toHaveAttribute('data-mws-motion-state','playing');await expect(heading).toHaveAttribute('data-mws-motion-state','played');
  await title(page,LONG_TITLE+' PORTFOLIO');await expect(heading).toHaveAttribute('data-mws-id',identity!);await expect(heading).toHaveAttribute('data-mws-distance','32');
  await inspectorSection(page,'特效');await page.getByRole('button',{name:'删除效果',exact:true}).click();await expect(heading).not.toHaveAttribute('data-mws-reveal');await expect(heading).toHaveCSS('transform','none');await page.getByRole('button',{name:'↶ 撤销',exact:true}).click();
  const cover=canvas(page).locator('#cover');await cover.click();const coverId=await cover.getAttribute('data-mws-id');
  await page.getByLabel('图片裁剪',{exact:true}).selectOption('contain');await expect(cover).toHaveCSS('object-fit','contain');await page.getByRole('button',{name:'使用回廊 · 竖幅',exact:true}).click();
  await expect(cover).toHaveAttribute('src',/data:image\/svg\+xml/);await expect.poll(()=>cover.evaluate((n:HTMLImageElement)=>n.naturalHeight>n.naturalWidth)).toBe(true);await expect(cover).toHaveCSS('object-fit','contain');
  await page.getByRole('button',{name:'↶ 撤销',exact:true}).click();await expect.poll(()=>cover.evaluate((n:HTMLImageElement)=>n.naturalWidth>n.naturalHeight)).toBe(true);await page.getByRole('button',{name:'↷ 重做',exact:true}).click();
  const upload=info.outputPath('my-portrait.svg');await writeFile(upload,'<svg xmlns="http://www.w3.org/2000/svg" width="300" height="600"><rect width="300" height="600" fill="#f0a575"/><circle cx="150" cy="220" r="80" fill="#233e3d"/><text x="45" y="480" font-size="36">MY COVER</text></svg>');
  await pickFile(page,'从本机上传',upload);await expect(cover).toHaveAttribute('data-mws-id',coverId!);await expect(cover).toHaveCSS('object-fit','contain');await expect.poll(()=>cover.evaluate((n:HTMLImageElement)=>n.naturalWidth)).toBe(300);await commit(page,'图片说明','我的竖幅封面');
  const cta=canvas(page).locator('.portfolio-cta');await cta.click();await page.getByLabel('跳到页面中的位置',{exact:true}).selectOption({label:'作品展示'});await inspectorSection(page,'样式');await page.getByLabel('按钮样式',{exact:true}).selectOption('outline');await expect(cta).toHaveAttribute('href','#works');await expect(cta).toHaveText('查看作品');
  for(const device of ['桌面','手机']){
    await page.getByRole('button',{name:device,exact:true}).click();await page.getByRole('button',{name:'预览',exact:true}).click();const running=page.frameLocator('iframe[title="隔离运行预览"]');
    await expect.poll(()=>running.locator('html').evaluate(n=>n.scrollWidth<=n.clientWidth)).toBe(true);
    await running.locator('.portfolio-cta').click();await expect.poll(()=>running.locator('#works').evaluate(n=>Math.abs(n.getBoundingClientRect().top))).toBeLessThan(80);
    await page.getByRole('button',{name:'画布',exact:true}).click();
  }
  await page.screenshot({path:info.outputPath('portfolio-mobile.png'),fullPage:true});
  await page.getByRole('button',{name:'桌面',exact:true}).click();await changePage(page,'index.html');await page.getByRole('button',{name:'▤ 首屏',exact:true}).click();
  await insertBlock(page);await expect(canvas(page).locator('.ws-image-grid')).toHaveCount(1);await expect(canvas(page).locator('.ws-image-grid')).toHaveCSS('display','grid');
  await page.getByRole('button',{name:'↶ 撤销',exact:true}).click();await expect(canvas(page).locator('.ws-image-grid')).toHaveCount(0);await page.getByRole('button',{name:'↷ 重做',exact:true}).click();await expect(canvas(page).locator('.ws-image-grid')).toHaveCount(1);
  await insertBlock(page);await expect(canvas(page).locator('.ws-image-grid')).toHaveCount(2);await changePage(page,'pages/about.html');await insertBlock(page);await expect(canvas(page).locator('.ws-image-grid')).toHaveCSS('display','grid');await expect.poll(()=>canvas(page).locator('.ws-image-grid img').evaluateAll(images=>images.every(n=>(n as HTMLImageElement).naturalWidth>0))).toBe(true);await changePage(page,'index.html');await noCode(page);
  const savedPath=await downloadFile(page,'保存项目',info,'saved');expect(savedPath).toMatch(/website\.mws\.json$/);const saved=JSON.parse(await readFile(savedPath,'utf8')) as Project;
  expect(saved.modules).toHaveLength(1);expectModuleCss(saved,saved.modules[0].css,['index.html','pages/about.html']);expect(saved.files['index.html'].content).toContain('data-mws-reveal="enter"');
  const context=await browser.newContext({baseURL:new URL(page.url()).origin,viewport:{width:1440,height:1000}});let site:Awaited<ReturnType<typeof serveExport>>|undefined;
  try{
    const reopened=await context.newPage();await reopened.goto('/');expect(await reopened.evaluate(()=>[localStorage.getItem('mws-project-v1'),localStorage.getItem('mws-recent-v1')])).toEqual([null,null]);
    await pickFile(reopened,'打开项目文件',savedPath);await noCode(reopened);await expect(canvas(reopened).locator('h1')).toHaveText(LONG_TITLE+' PORTFOLIO');await expect(canvas(reopened).locator('h1')).toHaveAttribute('data-mws-id',identity!);await expect(canvas(reopened).locator('h1')).toHaveAttribute('data-mws-distance','32');await expect(canvas(reopened).locator('body')).toHaveCSS('background-color','rgb(16, 28, 48)');await expect(canvas(reopened).locator('#cover')).toHaveAttribute('alt','我的竖幅封面');await expect.poll(()=>canvas(reopened).locator('#cover').evaluate((n:HTMLImageElement)=>n.naturalWidth)).toBe(300);await expect(canvas(reopened).locator('.portfolio-cta')).toHaveAttribute('href','#works');await expect(canvas(reopened).locator('.ws-image-grid')).toHaveCount(2);
    await reopened.screenshot({path:info.outputPath('portfolio-reopened.png'),fullPage:true});const zipPath=await downloadFile(reopened,'导出网站 ↗',info,'export');site=await serveExport(zipPath,info.outputPath('standalone'));
    // Record the actual transition before navigation so slow image loading cannot
    // make a successful animation miss a short-lived 'playing' assertion.
    await reopened.addInitScript(()=>{
      const observed:string[]=[];(window as unknown as {observedMotion:string[]}).observedMotion=observed;
      new MutationObserver(changes=>{for(const change of changes){const el=change.target;if(el instanceof Element&&el.matches('h1')){const state=el.getAttribute('data-mws-motion-state');if(state)observed.push(state);}}}).observe(document,{subtree:true,attributes:true,attributeFilter:['data-mws-motion-state']});
    });
    await reopened.goto(site.origin+'/');await imagesLoaded(reopened);
    await expect(reopened.locator('h1')).toHaveText(LONG_TITLE+' PORTFOLIO');await expect(reopened.locator('h1')).toHaveAttribute('data-mws-motion-state','played');expect(await reopened.evaluate(()=>(window as unknown as {observedMotion:string[]}).observedMotion)).toContain('playing');await expect(reopened.locator('body')).toHaveCSS('background-color','rgb(16, 28, 48)');await reopened.locator('.portfolio-cta').click();await expect(reopened).toHaveURL(/#works$/);
    await reopened.getByRole('link',{name:'创作手记 ↗',exact:true}).click();await expect(reopened).toHaveURL(/\/pages\/about.html$/);await expect(reopened.locator('.ws-image-grid')).toHaveCSS('display','grid');await imagesLoaded(reopened);await reopened.getByRole('link',{name:'返回首页',exact:true}).click();await expect(reopened.locator('h1')).toHaveText(LONG_TITLE+' PORTFOLIO');
    await reopened.setViewportSize({width:390,height:844});await reopened.emulateMedia({reducedMotion:'reduce'});await reopened.reload();await expect(reopened.locator('h1')).toHaveAttribute('data-mws-motion-state','reduced');await expect(reopened.locator('h1')).toHaveCSS('transform','none');await expect.poll(()=>reopened.locator('html').evaluate(n=>n.scrollWidth<=n.clientWidth)).toBe(true);await reopened.locator('.portfolio-cta').click();await expect(reopened).toHaveURL(/#works$/);await imagesLoaded(reopened);
  }finally{await context.close();await site?.close();}
});

test('template copies and real recent projects remain independent',async({page},info)=>{
  await page.goto('/');await expect(page.locator('.recent-project')).toHaveCount(0);await page.getByRole('button',{name:'模板手机预览',exact:true}).click();await expect(page.locator('iframe[title="作品集模板预览"]')).toHaveCSS('width','390px');await page.getByRole('button',{name:'使用模板 →',exact:true}).click();
  await page.getByLabel('项目名称',{exact:true}).fill('项目 A');await title(page,'只属于项目 A');await canvas(page).locator('#cover').click();await page.getByRole('button',{name:'使用回廊 · 竖幅',exact:true}).click();await inspectorSection(page,'样式');await page.getByRole('button',{name:/深海蓝调/}).click();
  await page.getByRole('button',{name:'返回开始',exact:true}).click();await expect(page.locator('.recent-project')).toHaveCount(1);await page.getByRole('button',{name:'使用模板 →',exact:true}).click();await page.getByLabel('项目名称',{exact:true}).fill('项目 B');await expect(canvas(page).locator('h1')).toHaveText('你好，我是林间。');await expect(canvas(page).locator('body')).toHaveCSS('background-color','rgb(243, 241, 235)');await expect.poll(()=>canvas(page).locator('#cover').evaluate((n:HTMLImageElement)=>n.naturalWidth>n.naturalHeight)).toBe(true);
  await page.getByRole('button',{name:'返回开始',exact:true}).click();await expect(page.locator('.recent-project')).toHaveCount(2);await page.locator('.recent-project').filter({hasText:'项目 A'}).click();await expect(canvas(page).locator('h1')).toHaveText('只属于项目 A');await expect(canvas(page).locator('body')).toHaveCSS('background-color','rgb(16, 28, 48)');await expect.poll(()=>canvas(page).locator('#cover').evaluate((n:HTMLImageElement)=>n.naturalHeight>n.naturalWidth)).toBe(true);await expect(page.getByRole('button',{name:'↶ 撤销',exact:true})).toBeDisabled();await noCode(page);
  await page.getByRole('button',{name:'返回开始',exact:true}).click();await page.reload();await expect(page.locator('.recent-project')).toHaveCount(2);await expect(page.frameLocator('iframe[title="作品集模板预览"]').locator('h1')).toHaveText('你好，我是林间。');await page.screenshot({path:info.outputPath('start-with-projects.png'),fullPage:true});
});

test('native resource drag shows its insertion point and block sorting stays in document flow',async({page})=>{
  await create(page);await page.getByRole('button',{name:'区块',exact:true}).click();
  const source=page.locator('[data-resource="workbench/image-grid"]').getByRole('button',{name:'拖动插入',exact:true});const start=await source.boundingBox(),hero=await canvas(page).locator('#home').boundingBox();if(!start||!hero)throw new Error('Missing drag targets');
  await page.mouse.move(start.x+start.width/2,start.y+start.height/2);await page.mouse.down();await page.mouse.move(start.x+start.width/2+12,start.y+start.height/2,{steps:4});await page.mouse.move(hero.x+30,hero.y+30,{steps:16});
  await expect(canvas(page).locator('[data-mws-drop-indicator]')).toBeVisible();await page.mouse.up();
  await expect(canvas(page).locator('main > section').first()).toHaveAttribute('data-ws-block','图文作品');await expect(canvas(page).locator('.ws-image-grid')).toHaveCount(1);
  await page.getByRole('button',{name:'手机',exact:true}).click();await expect(canvas(page).locator('.ws-image-grid')).toHaveCSS('grid-template-columns',/^[\d.]+px$/);await page.getByRole('button',{name:'桌面',exact:true}).click();
  await canvas(page).locator('.ws-image-grid').scrollIntoViewIfNeeded();const handle=await canvas(page).getByRole('button',{name:'拖动区块排序',exact:true}).boundingBox();if(!handle)throw new Error('Missing block handle');
  await page.mouse.move(handle.x+20,handle.y+8);await page.mouse.down();await page.mouse.move(handle.x+35,handle.y+14,{steps:4});
  // Scroll the real iframe during the drag, then drop on a descendant near the end of the hero.
  await canvas(page).locator('.hero-note').scrollIntoViewIfNeeded();const target=await canvas(page).locator('.hero-note').boundingBox();if(!target)throw new Error('Missing target');await page.mouse.move(target.x+12,target.y+8,{steps:16});await page.mouse.up();
  await expect(canvas(page).locator('main > section').first()).toHaveAttribute('data-ws-block','首屏');await expect(canvas(page).locator('main > .ws-image-grid')).toHaveCount(1);await expect(canvas(page).locator('#home .ws-image-grid')).toHaveCount(0);
  await page.getByRole('button',{name:'↶ 撤销',exact:true}).click();await expect(canvas(page).locator('main > section').first()).toHaveAttribute('data-ws-block','图文作品');await page.getByRole('button',{name:'↷ 重做',exact:true}).click();await expect(canvas(page).locator('main > section').first()).toHaveAttribute('data-ws-block','首屏');await noCode(page);
});

test('repeated title editing cancels only the current edit and keeps one undo step',async({page})=>{
  await create(page);const heading=canvas(page).locator('h1');
  await heading.dblclick();await heading.fill('第一次完成的标题');
  await page.getByLabel('项目名称',{exact:true}).click();
  await expect(heading).toHaveText('第一次完成的标题');
  await heading.dblclick();await heading.fill('尚未提交的新标题');await heading.press('Escape');
  await expect(heading).toHaveText('第一次完成的标题');
  await heading.dblclick();await heading.press('Enter');
  await page.getByRole('button',{name:'↶ 撤销',exact:true}).click();
  await expect(heading).toHaveText('你好，我是林间。');
  await expect(page.getByRole('button',{name:'↶ 撤销',exact:true})).toBeDisabled();
  await page.getByRole('button',{name:'↷ 重做',exact:true}).click();
  await expect(heading).toHaveText('第一次完成的标题');await noCode(page);
});

test('bundled project cards use the active theme and share one stylesheet',async({page},info)=>{
  await create(page);await inspectorSection(page,'样式');await page.getByRole('button',{name:/深海蓝调/}).click();
  await page.getByRole('button',{name:'组件',exact:true}).click();
  const resource=page.locator('[data-resource="workbench/project-card"]');
  await resource.getByRole('button',{name:'添加到此处',exact:true}).click();
  await resource.getByRole('button',{name:'添加到此处',exact:true}).click();
  const cards=canvas(page).locator('.qr-project');await expect(cards).toHaveCount(2);
  for(const card of await cards.all())await expect(card).toHaveCSS('background-color','rgb(28, 45, 71)');
  const title=cards.first().locator('h2');await title.dblclick();await title.fill('独立修改的项目卡片');await title.press('Enter');
  await expect(cards.last().locator('h2')).toHaveText('我的观察记录');
  await page.getByRole('button',{name:'手机',exact:true}).click();
  await expect.poll(()=>canvas(page).locator('html').evaluate(n=>n.scrollWidth<=n.clientWidth)).toBe(true);
  const saved=JSON.parse(await readFile(await downloadFile(page,'保存项目',info,'cards'),'utf8')) as Project;
  expect(saved.modules).toHaveLength(1);expect(saved.modules[0].id).toBe('workbench/project-card');
  expectModuleCss(saved,saved.modules[0].css,['index.html']);
  expect(saved.files['THIRD_PARTY_NOTICES.md'].content).toContain('queue/project-card@1.0.0');await noCode(page);
});
