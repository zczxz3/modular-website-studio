import {test,expect} from '@playwright/test';
import {readFile} from 'node:fs/promises';
import {canvas,downloadFile,pickFile,expectModuleCss,serveExport,inspectorSection} from './helpers';
import type {Project} from '../src/core/types';
const catalog=JSON.parse(await readFile(new URL('../src/resources/website-assets-library/catalog.json',import.meta.url),'utf8')) as {modules:{id:string}[]};

test('all 31 repository components are discoverable, insertable and exported offline',async({page},info)=>{
  test.setTimeout(60000);
  await page.goto('/');await page.getByRole('button',{name:'＋ 空白项目',exact:true}).click();await page.getByRole('button',{name:'组件',exact:true}).click();
  await page.getByLabel('组件来源',{exact:true}).selectOption('website-assets');await expect(page.locator('.resource-card')).toHaveCount(12);
  await page.getByLabel('组件类别',{exact:true}).selectOption('Buttons');await expect(page.locator('.resource-card')).toHaveCount(10);await page.getByLabel('搜索组件',{exact:true}).fill('扫光');await expect(page.locator('.resource-card')).toHaveCount(1);
  await page.getByLabel('搜索组件',{exact:true}).fill('不存在的组件');await expect(page.getByText('没有匹配的组件',{exact:true})).toBeVisible();await page.getByRole('button',{name:'清除筛选',exact:true}).click();
  await page.getByLabel('组件来源',{exact:true}).selectOption('website-assets');await expect(page.getByRole('button',{name:'↶ 撤销',exact:true})).toBeDisabled();
  await page.getByRole('button',{name:/显示更多组件/}).click();await page.getByRole('button',{name:/显示更多组件/}).click();await expect(page.locator('.resource-card')).toHaveCount(31);
  for(const record of catalog.modules)await page.locator(`[data-resource="${record.id}"]`).getByRole('button',{name:'添加到此处',exact:true}).click();
  await expect(canvas(page).locator('.wa-mf-field')).toHaveCount(1);await expect(canvas(page).locator('.wa-mf-button-shine')).toHaveCount(1);await expect(canvas(page).locator('.wa-qr-project')).toHaveCount(1);await expect(canvas(page).locator('.wa-mf-price')).toContainText('¥0');
  const savedPath=await downloadFile(page,'下载可编辑工程',info,'all-components');const saved=JSON.parse(await readFile(savedPath,'utf8')) as Project;expect(saved.modules).toHaveLength(31);
  const htmlPath=await downloadFile(page,'导出 HTML',info,'offline');await page.context().setOffline(true);await page.goto('file://'+htmlPath);await expect(page.locator('.wa-mf-field')).toHaveCSS('display','block');await expect(page.locator('.wa-mf-button-shine button')).toHaveCSS('cursor','pointer');
  await page.locator('.wa-mf-field input').fill('我的作品');await expect(page.locator('.wa-mf-field input')).toHaveValue('我的作品');const disclosure=page.locator('.wa-mf-accordion details').first();await disclosure.locator('summary').click();await expect(disclosure).toHaveAttribute('open','');
  await page.setViewportSize({width:390,height:844});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});

test('repository components reuse source CSS across pages and survive undo, reopen and ZIP export',async({page},info)=>{
  await page.goto('/');await page.getByRole('button',{name:'使用模板 →',exact:true}).click();await page.getByRole('button',{name:'组件',exact:true}).click();await page.getByLabel('组件来源',{exact:true}).selectOption('website-assets');await page.getByLabel('搜索组件',{exact:true}).fill('foundation/button-shine');
  const add=page.locator('[data-resource="foundation/button-shine"]').getByRole('button',{name:'添加到此处',exact:true});await add.click();await expect(canvas(page).locator('.wa-mf-button-shine')).toHaveCount(1);await page.getByRole('button',{name:'↶ 撤销',exact:true}).click();await expect(canvas(page).locator('.wa-mf-button-shine')).toHaveCount(0);await page.getByRole('button',{name:'↷ 重做',exact:true}).click();await add.click();await expect(canvas(page).locator('.wa-mf-button-shine')).toHaveCount(2);
  const label=canvas(page).locator('.wa-mf-button-shine .wa-mf-label').first();await label.dblclick();await label.fill('查看我的作品');await label.press('Enter');await expect(label).toHaveText('查看我的作品');
  await page.getByRole('button',{name:'页面',exact:true}).click();await page.getByLabel('当前页面',{exact:true}).selectOption('pages/about.html');await page.getByRole('button',{name:'组件',exact:true}).click();await page.getByLabel('组件来源',{exact:true}).selectOption('website-assets');await page.getByLabel('搜索组件',{exact:true}).fill('foundation/button-shine');await add.click();await expect(canvas(page).locator('.wa-mf-button-shine')).toHaveCount(1);
  const path=await downloadFile(page,'下载可编辑工程',info,'reopen');const saved=JSON.parse(await readFile(path,'utf8')) as Project;expect(saved.modules).toHaveLength(1);expectModuleCss(saved,saved.modules[0].css,['index.html','pages/about.html']);
  await page.getByRole('button',{name:'返回开始',exact:true}).click();await pickFile(page,'打开项目文件',path);await expect(canvas(page).locator('.wa-mf-button-shine')).toHaveCount(1);
  const zip=await downloadFile(page,'导出网站 ↗',info,'website');const root=info.outputPath('unpacked'),site=await serveExport(zip,root);
  try{await page.context().setOffline(true);await page.goto('file://'+root+'/pages/about.html');await expect(page.locator('.wa-mf-button-shine button')).toHaveCSS('cursor','pointer');await page.goto('file://'+root+'/index.html');await expect(page.locator('.wa-mf-button-shine')).toHaveCount(2);await expect(page.locator('.wa-mf-button-shine .wa-mf-label').first()).toHaveText('查看我的作品');}finally{await site.close();}
});

test('original library cards coexist with existing themed examples without changing their appearance',async({page})=>{
  await page.goto('/');await page.getByRole('button',{name:'使用模板 →',exact:true}).click();await inspectorSection(page,'样式');await page.getByRole('button',{name:/深海蓝调/}).click();
  await page.getByRole('button',{name:'组件',exact:true}).click();await page.getByLabel('组件来源',{exact:true}).selectOption('studio');
  for(const id of ['workbench/card','workbench/project-card'])await page.locator(`[data-resource="${id}"]`).getByRole('button',{name:'添加到此处',exact:true}).click();
  const old=canvas(page).locator('.mf-card'),project=canvas(page).locator('.qr-project');await expect(old).toHaveCSS('background-color','rgb(28, 45, 71)');await expect(project).toHaveCSS('background-color','rgb(28, 45, 71)');
  await page.getByLabel('组件来源',{exact:true}).selectOption('website-assets');
  for(const id of ['foundation/card','queue/project-card']){await page.getByLabel('搜索组件',{exact:true}).fill(id);await page.locator(`[data-resource="${id}"]`).getByRole('button',{name:'添加到此处',exact:true}).click();}
  await expect(old).toHaveCSS('background-color','rgb(28, 45, 71)');await expect(project).toHaveCSS('background-color','rgb(28, 45, 71)');await expect(canvas(page).locator('.wa-mf-card')).toHaveCSS('background-color','rgb(255, 255, 255)');await expect(canvas(page).locator('.wa-qr-project')).toHaveCSS('background-color','rgb(255, 255, 255)');
});
