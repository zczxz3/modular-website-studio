import {test,expect,type Page} from '@playwright/test';
import {readFile} from 'node:fs/promises';
import {createServer} from 'node:http';
import {canvas,downloadFile,pickFile,inspectorSection} from './helpers';
import type {Project} from '../src/core/types';

async function dragResource(page:Page,id:string){
  await page.getByRole('button',{name:'组件',exact:true}).click();
  const source=page.locator(`[data-resource="${id}"] .resource-preview`);
  await source.scrollIntoViewIfNeeded();
  const start=await source.boundingBox(),target=await canvas(page).locator('main').boundingBox();
  if(!start||!target)throw new Error('Missing native drag target');
  await page.mouse.move(start.x+start.width/2,start.y+30);await page.mouse.down();
  await page.mouse.move(start.x+start.width/2+15,start.y+30,{steps:4});
  await page.mouse.move(target.x+30,Math.min(target.y+target.height-2,650),{steps:16});
  await expect(canvas(page).locator('[data-mws-drop-indicator]')).toBeVisible();
  await page.mouse.up();
}
async function serveHtml(path:string){
  const bytes=await readFile(path);
  const server=createServer((req,res)=>{if(req.url!=='/'){res.writeHead(404);res.end();return;}res.setHeader('Content-Type','text/html; charset=utf-8');res.end(bytes);});
  await new Promise<void>(resolve=>server.listen(0,'127.0.0.1',resolve));
  const address=server.address();if(!address||typeof address==='string')throw new Error('Missing HTTP port');
  return {origin:`http://127.0.0.1:${address.port}`,close:()=>new Promise<void>(resolve=>{server.close(()=>resolve());server.closeAllConnections();})};
}

test('drag CSS and JS widgets, configure without code, save, reopen and operate a single HTML',async({page,browser},info)=>{
  test.setTimeout(90000);await page.goto('/');await page.getByRole('button',{name:'＋ 空白项目',exact:true}).click();
  await dragResource(page,'workbench/tabs');
  const tabs=canvas(page).locator('.ws-tabs');await expect(tabs).toHaveCount(1);
  await expect(page.getByLabel('默认显示',{exact:true})).toBeVisible();
  await tabs.locator('h2').click();await inspectorSection(page,'内容');await page.getByLabel('默认显示',{exact:true}).selectOption('1');
  await expect(tabs).toHaveAttribute('data-mws-default','1');await expect(tabs.locator('[data-mws-panel]:visible')).toHaveCount(3);
  await page.getByRole('button',{name:'选中整个组件',exact:true}).click();
  await inspectorSection(page,'样式');await page.getByLabel('最大宽度',{exact:true}).fill('600');await page.getByLabel('最大宽度',{exact:true}).press('Enter');
  await page.getByLabel('布局模式',{exact:true}).selectOption('free');
  await tabs.scrollIntoViewIfNeeded();const box=await tabs.boundingBox();if(!box)throw new Error('Missing tab widget');
  await page.mouse.move(box.x+6,box.y+6);await page.mouse.down();await page.mouse.move(box.x+38,box.y+22,{steps:10});
  await expect(tabs).not.toHaveCSS('translate','none');await page.mouse.up();
  await expect(tabs).toHaveCSS('translate','40px 20px');
  await page.getByRole('button',{name:'↶ 撤销',exact:true}).click();await expect(tabs).toHaveCSS('translate','none');
  await page.getByRole('button',{name:'↷ 重做',exact:true}).click();await expect(tabs).toHaveCSS('translate','40px 20px');
  await page.getByLabel('布局模式',{exact:true}).selectOption('structure');
  await dragResource(page,'workbench/accordion');
  const accordion=canvas(page).locator('.ws-accordion');await expect(accordion).toHaveCount(1);
  await accordion.locator('h2').click();await inspectorSection(page,'内容');await page.getByLabel('默认显示',{exact:true}).selectOption('-1');
  await page.getByLabel('展开方式',{exact:true}).selectOption('multiple');
  await page.getByRole('button',{name:'试用交互',exact:true}).click();
  const preview=page.frameLocator('iframe[title="隔离运行预览"]');
  await expect(preview.locator('.ws-tabs [data-mws-panel]:visible')).toHaveAttribute('data-mws-panel','process');
  await preview.getByRole('tab',{name:'最终成果',exact:true}).click();await expect(preview.locator('[data-mws-panel="result"]')).toBeVisible();
  await preview.locator('[data-mws-question="first"]').click();await preview.locator('[data-mws-question="second"]').click();
  await expect(preview.locator('.ws-accordion [data-mws-answer]:visible')).toHaveCount(2);
  await page.getByRole('button',{name:'画布',exact:true}).click();
  await expect(page.locator('.code-panel')).toHaveCount(0);
  const projectPath=await downloadFile(page,'保存项目',info,'project');
  const saved=JSON.parse(await readFile(projectPath,'utf8')) as Project;
  expect(saved.files['index.html'].content).toContain('data-mws-default="1"');
  expect(saved.files['studio.css'].content).toContain('40px 20px');
  const htmlPath=await downloadFile(page,'导出 HTML',info,'html');
  const html=await readFile(htmlPath,'utf8');expect(html).toContain('data-mws-component="tabs"');expect(html).not.toContain('src="studio-interactions');
  const context=await browser.newContext({baseURL:new URL(page.url()).origin,viewport:{width:1440,height:1000}});let site:Awaited<ReturnType<typeof serveHtml>>|undefined;
  try{
    const reopened=await context.newPage();await reopened.goto('/');expect(await reopened.evaluate(()=>localStorage.getItem('mws-recent-v1'))).toBeNull();
    await pickFile(reopened,'打开项目文件',projectPath);await expect(canvas(reopened).locator('.ws-tabs')).toHaveCSS('translate','40px 20px');
    await reopened.getByRole('button',{name:'返回开始',exact:true}).click();await pickFile(reopened,'打开项目文件',htmlPath);
    await expect(canvas(reopened).locator('.ws-tabs')).toHaveCSS('translate','40px 20px');
    await reopened.getByRole('button',{name:'预览',exact:true}).click();
    const imported=reopened.frameLocator('iframe[title="隔离运行预览"]');
    await imported.getByRole('tab',{name:'作品概览',exact:true}).click();await expect(imported.locator('[data-mws-panel="overview"]')).toBeVisible();
    site=await serveHtml(htmlPath);await reopened.goto(site.origin+'/');
    await expect(reopened.locator('.ws-tabs')).toHaveCSS('translate','40px 20px');
    await expect(reopened.locator('[data-mws-panel="process"]')).toBeVisible();
    await reopened.getByRole('tab',{name:'创作过程',exact:true}).press('ArrowRight');await expect(reopened.locator('[data-mws-panel="result"]')).toBeVisible();
    await reopened.locator('[data-mws-question="first"]').click();await expect(reopened.locator('[data-mws-answer="first"]')).toBeVisible();
  }finally{await context.close();await site?.close();}
});

test('HTML export names cross-page references and offers the complete ZIP',async({page},info)=>{
  await page.goto('/');await page.getByRole('button',{name:'使用模板 →',exact:true}).click();await page.getByRole('button',{name:'导出网站 ↗',exact:true}).click();await page.getByRole('button',{name:'下载单页 HTML',exact:true}).click();
  const dialog=page.getByRole('dialog');await expect(dialog).toContainText('pages/about.html');
  const zip=await downloadFile(page,'导出完整网站 ZIP',info,'zip');expect(zip).toMatch(/\.zip$/);await expect(dialog).toHaveCount(0);
});
