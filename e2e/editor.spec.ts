import {test,expect} from '@playwright/test';
import {readFile} from 'node:fs/promises';
import {unzipSync,strFromU8} from 'fflate';
import {addModule,canvas,downloadFile,expectModuleCss,pickFile,serveExport,switchPage,openExample} from './helpers';
import {card,dashCard,slashCard,writeModuleFixtures} from '../tests/module-fixtures';
import type {Project} from '../src/core/types';

test('visual edits, code edits, error recovery, save/reopen and exported site',async({page,browser},testInfo)=>{
  await openExample(page);const frame=page.frameLocator('iframe[title="实时可编辑网页"]');
  const title=frame.locator('h1');await expect(title).toHaveText('山川之上');
  await title.dblclick();await title.fill('Visual edit');await title.press('Enter');
  await page.getByRole('button',{name:'纯文本',exact:true}).click();
  const source=page.getByRole('textbox',{name:'源代码文本'});await expect(source).toHaveValue(/Visual edit/);
  await source.fill((await source.inputValue()).replace('Visual edit','Code edit'));await expect(title).toHaveText('Code edit');
  await page.getByRole('button',{name:'画布',exact:true}).click();await page.getByLabel('布局模式',{exact:true}).selectOption('free');
  const button=frame.locator('#explore');const box=await button.boundingBox();if(!box)throw new Error('Missing button');
  await page.mouse.move(box.x+20,box.y+15);await page.mouse.down();await page.mouse.move(box.x+68,box.y+39,{steps:12});await page.mouse.up();
  await expect(page.getByLabel('translate',{exact:true})).toHaveValue('60px 30px');
  const handle=frame.getByRole('button',{name:'调整选中元素大小'});const hb=await handle.boundingBox();if(!hb)throw new Error('Missing resize handle');
  await page.mouse.move(hb.x+hb.width/2,hb.y+hb.height/2);await page.mouse.down();await page.mouse.move(hb.x+hb.width/2+64,hb.y+hb.height/2+24,{steps:10});await page.mouse.up();
  await expect(page.getByLabel('width',{exact:true})).toHaveValue(/px$/);
  await page.getByRole('button',{name:'分屏',exact:true}).click();await page.getByRole('button',{name:'styles.css',exact:true}).click();
  const validCss=await source.inputValue();await source.fill('body { color: red;');await expect(page.locator('.diagnostics[role="alert"]')).toContainText('保留最后有效画布');await expect(title).toHaveText('Code edit');
  await source.fill(validCss);await expect(page.locator('.diagnostics[role="alert"]')).toHaveCount(0);
  const savedPath=await downloadFile(page,'保存项目',testInfo,'saved');expect(savedPath).toMatch(/website\.mws\.json$/);
  const context=await browser.newContext({baseURL:new URL(page.url()).origin,viewport:{width:1440,height:1000}});
  let site:Awaited<ReturnType<typeof serveExport>>|undefined;
  try{
    const reopened=await context.newPage();await openExample(reopened);
    expect(await reopened.evaluate(()=>localStorage.getItem('mws-project-v1'))).toBeNull();
    await expect(canvas(reopened).locator('h1')).toHaveText('山川之上');
    await pickFile(reopened,'打开项目',savedPath);await expect(canvas(reopened).locator('h1')).toHaveText('Code edit');
    const exportPath=await downloadFile(reopened,'导出网站 ↗',testInfo,'export');
    const files=unzipSync(new Uint8Array(await readFile(exportPath)));expect(strFromU8(files['studio.css'])).toContain('60px 30px');
    site=await serveExport(exportPath,testInfo.outputPath('standalone'));
    await reopened.goto(site.origin+'/');await expect(reopened.locator('h1')).toHaveText('Code edit');await reopened.locator('#explore').click();await expect(reopened.locator('h1')).toHaveText('世界，就在眼前');
  }finally{await context.close();await site?.close();}
});

test('Monaco input and structured drag ordering',async({page})=>{
  await openExample(page);const frame=page.frameLocator('iframe[title="实时可编辑网页"]');await expect(frame.locator('h1')).toBeVisible();
  await page.getByRole('button',{name:'styles.css',exact:true}).click();const monaco=page.getByRole('textbox',{name:'项目源代码'});
  await monaco.press('ControlOrMeta+End');await page.keyboard.insertText('\nh1 { color: rgb(10, 20, 30); }');await expect(frame.locator('h1')).toHaveCSS('color','rgb(10, 20, 30)');
  await page.getByRole('button',{name:'画布',exact:true}).click();await page.getByLabel('画布缩放',{exact:true}).selectOption('0.65');
  const articles=frame.locator('article');const first=await articles.nth(0).boundingBox(),second=await articles.nth(1).boundingBox();if(!first||!second)throw new Error('Missing cards');
  // Grab container padding (not its text) and drop in the preceding card's left half.
  await page.mouse.move(second.x+4,second.y+4);await page.mouse.down();await page.mouse.move(first.x+4,first.y+4,{steps:12});await page.mouse.up();
  await expect(articles.first()).toContainText('数据生长');
});

test('local module ZIP survives two pages, one-step history, clean reopen, uninstall and static export',async({page,browser},testInfo)=>{
  const fixtures=await writeModuleFixtures(testInfo.outputPath('fixtures'));
  await openExample(page);await page.getByRole('button',{name:'画布',exact:true}).click();
  await pickFile(page,'打开项目',fixtures['site.zip']);
  await expect(canvas(page).locator('h1')).toHaveText('独有首页 HOME-20261104');
  // A normal local JS file is retained, but never runs in the editing iframe.
  await expect(canvas(page).locator('body')).not.toHaveAttribute('data-script-ran','yes');
  await canvas(page).locator('#original-button').click();await expect(canvas(page).locator('#script-result')).toHaveText('未运行');
  await page.getByRole('button',{name:'模块',exact:true}).click();
  await pickFile(page,'＋ 安装模块 ZIP',fixtures['card.zip']);
  await expect(page.getByRole('status')).toHaveText('已安装 '+card.name);
  await addModule(page,card.name);await expect(canvas(page).locator('.roundtrip-card')).toHaveCount(1);
  await expect(canvas(page).locator('.roundtrip-card')).toHaveCSS('padding','23px');
  await page.getByRole('button',{name:'↶ 撤销',exact:true}).click();await expect(canvas(page).locator('.roundtrip-card')).toHaveCount(0);
  const undone=JSON.parse(await readFile(await downloadFile(page,'保存项目',testInfo,'undone'),'utf8')) as Project;
  expect(Object.values(undone.files).filter(f=>f.content===card.css)).toHaveLength(0);
  expect(undone.files['index.html'].content).not.toContain('modules/');
  expect(undone.modules.map(m=>m.id)).toEqual([card.id]);
  await page.getByRole('button',{name:'↷ 重做',exact:true}).click();await expect(canvas(page).locator('.roundtrip-card')).toHaveCount(1);
  await expect(canvas(page).locator('.roundtrip-card')).toHaveCSS('color','rgb(11, 45, 87)');
  await addModule(page,card.name);await expect(canvas(page).locator('.roundtrip-card')).toHaveCount(2);
  await switchPage(page,'pages/about.html');await addModule(page,card.name);
  await expect(canvas(page).locator('.roundtrip-card')).toHaveCount(1);
  await expect(canvas(page).locator('.roundtrip-card')).toHaveCSS('padding','23px');
  await switchPage(page,'index.html');
  for(const instance of await canvas(page).locator('.roundtrip-card').all())await expect(instance).toHaveCSS('color','rgb(11, 45, 87)');
  const savedPath=await downloadFile(page,'保存项目',testInfo,'saved');expect(savedPath).toMatch(/website\.mws\.json$/);
  const saved=JSON.parse(await readFile(savedPath,'utf8')) as Project;
  const cssPath=expectModuleCss(saved,card.css,['index.html','pages/about.html']);
  expect(Object.keys(saved.files).filter(path=>path.startsWith('modules/')&&path.endsWith('.css'))).toEqual([cssPath]);
  expect(saved.modules).toEqual([card]);
  const context=await browser.newContext({baseURL:new URL(page.url()).origin,viewport:{width:1440,height:1000}});
  let site:Awaited<ReturnType<typeof serveExport>>|undefined;
  try{
    const reopened=await context.newPage();await openExample(reopened);
    expect(await reopened.evaluate(()=>localStorage.getItem('mws-project-v1'))).toBeNull();
    await expect(canvas(reopened).locator('h1')).toHaveText('山川之上');
    await pickFile(reopened,'打开项目',savedPath);
    await expect(canvas(reopened).locator('h1')).toHaveText('独有首页 HOME-20261104');
    await expect(canvas(reopened).locator('.roundtrip-card')).toHaveCount(2);
    for(const instance of await canvas(reopened).locator('.roundtrip-card').all())await expect(instance).toHaveCSS('padding','23px');
    await reopened.getByRole('button',{name:'模块',exact:true}).click();
    const moduleCard=reopened.locator('.module-card').filter({has:reopened.getByText(card.name,{exact:true})});
    await expect(moduleCard.getByRole('button',{name:'从库卸载',exact:true})).toBeVisible();
    await switchPage(reopened,'pages/about.html');await expect(canvas(reopened).locator('h1')).toHaveText('独有二级页 ABOUT-20261104');
    await expect(canvas(reopened).locator('.roundtrip-card')).toHaveText(/独有卡片 MODULE-20261104/);
    await expect(canvas(reopened).locator('.roundtrip-card')).toHaveCSS('color','rgb(11, 45, 87)');
    await reopened.getByRole('button',{name:'模块',exact:true}).click();await moduleCard.getByRole('button',{name:'从库卸载',exact:true}).click();
    await expect(moduleCard).toHaveCount(0);await expect(canvas(reopened).locator('.roundtrip-card')).toHaveCSS('padding','23px');
    const uninstalled=JSON.parse(await readFile(await downloadFile(reopened,'保存项目',testInfo,'uninstalled'),'utf8')) as Project;
    expect(uninstalled.modules).toEqual([]);expect(uninstalled.files).toEqual(saved.files);
    const exportPath=await downloadFile(reopened,'导出网站 ↗',testInfo,'export');
    const exported=unzipSync(new Uint8Array(await readFile(exportPath)));
    expect(Object.keys(exported).sort()).toEqual(Object.keys(saved.files).sort());
    for(const [path,file]of Object.entries(saved.files))expect(strFromU8(exported[path])).toBe(file.content);
    site=await serveExport(exportPath,testInfo.outputPath('standalone'));
    for(const [path,count,title]of [['index.html',2,'独有首页 HOME-20261104'],['pages/about.html',1,'独有二级页 ABOUT-20261104']] as const){
      await reopened.goto(site.origin+'/'+path);await expect(reopened.locator('h1')).toHaveText(title);
      await expect(reopened.locator('.roundtrip-card')).toHaveCount(count);
      for(const instance of await reopened.locator('.roundtrip-card').all()){await expect(instance).toHaveCSS('padding','23px');await expect(instance).toHaveCSS('color','rgb(11, 45, 87)');}
      await expect(reopened.locator('body')).toHaveAttribute('data-script-ran','yes');
      await reopened.locator('#original-button').click();await expect(reopened.locator('#script-result')).toHaveText('原站脚本执行成功');
    }
  }finally{await context.close();await site?.close();}
});

for(const legacy of [false,true])test(`module IDs do not collide${legacy?' with v1 stylesheet references':''}`,async({page},testInfo)=>{
  const fixtures=await writeModuleFixtures(testInfo.outputPath('fixtures'));await openExample(page);
  await page.getByRole('button',{name:'画布',exact:true}).click();await pickFile(page,'打开项目',fixtures[legacy?'legacy.mws.json':'site.zip']);
  await expect(canvas(page).locator('h1')).toHaveText('独有首页 HOME-20261104');
  await page.getByRole('button',{name:'模块',exact:true}).click();
  if(!legacy){await pickFile(page,'＋ 安装模块 ZIP',fixtures['a-slash-b.zip']);await expect(page.getByRole('status')).toHaveText('已安装 '+slashCard.name);await addModule(page,slashCard.name);}
  await pickFile(page,'＋ 安装模块 ZIP',fixtures['a-dash-b.zip']);await expect(page.getByRole('status')).toHaveText('已安装 '+dashCard.name);await addModule(page,dashCard.name);
  await expect(canvas(page).locator('.slash-card')).toHaveCSS('padding','17px');await expect(canvas(page).locator('.dash-card')).toHaveCSS('padding','29px');
  await switchPage(page,'pages/about.html');await addModule(page,slashCard.name);await addModule(page,dashCard.name);
  await expect(canvas(page).locator('.slash-card')).toHaveCSS('color','rgb(12, 34, 56)');await expect(canvas(page).locator('.dash-card')).toHaveCSS('color','rgb(98, 76, 54)');
  const saved=JSON.parse(await readFile(await downloadFile(page,'保存项目',testInfo,'saved'),'utf8')) as Project;
  const a=expectModuleCss(saved,slashCard.css,['index.html','pages/about.html']),b=expectModuleCss(saved,dashCard.css,['index.html','pages/about.html']);expect(a).not.toBe(b);
  if(legacy){expect(a).toBe('modules/a-b.css');expect(saved.files['index.html'].content).toContain("href='./modules/a-b.css'");}
});

test('file pickers reject the same onclick module in ZIP and saved project',async({page},testInfo)=>{
  const fixtures=await writeModuleFixtures(testInfo.outputPath('fixtures'));await openExample(page);
  await expect(canvas(page).locator('h1')).toHaveText('山川之上');await page.getByRole('button',{name:'模块',exact:true}).click();
  await pickFile(page,'＋ 安装模块 ZIP',fixtures['unsafe.zip']);await expect(page.getByRole('status')).toContainText('不允许的属性');
  await pickFile(page,'打开项目',fixtures['unsafe.mws.json']);await expect(canvas(page).locator('h1')).toHaveText('山川之上');
  await expect(page.getByRole('status')).toContainText('不允许的属性');await expect(page.getByText('不安全卡片',{exact:true})).toHaveCount(0);
});
