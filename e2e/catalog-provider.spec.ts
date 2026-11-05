import {test,expect} from '@playwright/test';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {zipSync,strToU8} from 'fflate';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {canvas,pickFile,downloadFile,serveExport} from './helpers';
import type {Project} from '../src/core/types';

const pack=fileURLToPath(new URL('../src/resources/website-assets-library/upstream/studio-components.zip',import.meta.url));
test('the collection imports through its provider, cancels without edits and saves as one undoable change',async({page},info)=>{
  await page.goto('/');await page.getByRole('button',{name:'＋ 空白项目',exact:true}).click();await page.getByRole('button',{name:'组件',exact:true}).click();
  await expect(page.locator('.catalog-source-note')).toContainText('28dcb4e');
  await pickFile(page,'导入组件集合 ZIP',pack);const dialog=page.getByRole('dialog',{name:'导入组件集合',exact:true});await expect(dialog).toContainText('已校验 31 个静态组件');await expect(dialog).toContainText('新增 31 个');
  await page.screenshot({path:info.outputPath('catalog-import.png')});
  await page.getByRole('button',{name:'取消',exact:true}).click();await expect(page.getByRole('button',{name:'↶ 撤销',exact:true})).toBeDisabled();await expect(canvas(page).locator('.wa-mf-field')).toHaveCount(0);
  await pickFile(page,'导入组件集合 ZIP',pack);await page.getByRole('button',{name:'确认导入组件',exact:true}).click();await expect(page.getByRole('status')).toContainText('新增 31 个，保留已有 0 个');await expect(page.getByLabel('组件来源',{exact:true})).toHaveValue('project');
  await page.getByRole('button',{name:'↶ 撤销',exact:true}).click();await expect(page.getByText('没有匹配的组件',{exact:true})).toBeVisible();await page.getByRole('button',{name:'↷ 重做',exact:true}).click();
  await page.getByLabel('搜索组件',{exact:true}).fill('扫光');await page.locator('[data-resource="foundation/button-shine"]').getByRole('button',{name:'添加到此处',exact:true}).click();await expect(canvas(page).locator('.wa-mf-button-shine')).toHaveCount(1);
  await pickFile(page,'导入组件集合 ZIP',pack);await expect(dialog).toContainText('新增 0 个');await expect(dialog).toContainText('保留已有 31 个');await page.getByRole('button',{name:'确认导入组件',exact:true}).click();
  const path=await downloadFile(page,'下载可编辑工程',info,'collection');const saved=JSON.parse(await readFile(path,'utf8')) as Project;expect(saved.modules).toHaveLength(31);expect(saved.modules.some(m=>/^E\d+/.test(m.id))).toBe(false);
  await page.getByRole('button',{name:'返回开始',exact:true}).click();await pickFile(page,'打开项目文件',path);await expect(canvas(page).locator('.wa-mf-button-shine')).toHaveCount(1);
});

test('new IDs from an explicit pack appear in the normal library and export without Studio',async({page},info)=>{
  const module={id:'foundation/new-card',version:'1.0.0',name:'New card',description:'Imported component',html:'<article class="mf-new-card"><h2>新接入的组件</h2></article>',css:'.mf-new-card{padding:24px;color:rgb(12,34,56)}',permissions:[],dependencies:{}};
  const inner=zipSync({'module.json':strToU8(JSON.stringify(module))});const collection=zipSync({'studio-catalog.json':strToU8(JSON.stringify({schema_version:1,studio_contract:'static-module-v1',modules:[{id:module.id,kind:'studio-static-module-v1',runtime_required:false,path:'installable/new-card.zip',sha256:createHash('sha256').update(inner).digest('hex')}]})),LICENSE:strToU8('MIT License\nNew static fixture'), 'installable/new-card.zip':inner});
  const path=info.outputPath('new-collection.zip');await mkdir(info.outputPath(),{recursive:true});await writeFile(path,collection);
  await page.goto('/');await page.getByRole('button',{name:'＋ 空白项目',exact:true}).click();await page.getByRole('button',{name:'组件',exact:true}).click();await pickFile(page,'导入组件集合 ZIP',path);await page.getByRole('button',{name:'确认导入组件',exact:true}).click();
  const card=page.locator('[data-resource="foundation/new-card"]');await expect(card).toBeVisible();await card.getByRole('button',{name:'添加到此处',exact:true}).click();await expect(canvas(page).locator('.wa-mf-new-card')).toHaveCount(1);
  await page.getByLabel('组件来源',{exact:true}).selectOption('studio');await expect(card).toHaveCount(0);await page.getByLabel('组件来源',{exact:true}).selectOption('project');await expect(card).toBeVisible();
  const html=await downloadFile(page,'导出 HTML',info,'new-component');await page.context().setOffline(true);await page.goto('file://'+html);await expect(page.locator('.wa-mf-new-card')).toHaveCSS('color','rgb(12, 34, 56)');await expect(page.locator('h2')).toHaveText('新接入的组件');
});

test('the upstream shelf is a real editable two-page project with independent export',async({page},info)=>{
  await page.goto('/');await page.getByRole('button',{name:/打开组件展架/}).click();await expect(page.getByLabel('项目名称',{exact:true})).toHaveValue('我的组件库 · 组件展架');
  await expect(canvas(page).locator('.wa-mf-field')).toHaveCount(1);await page.getByRole('button',{name:'页面',exact:true}).click();const pages=await page.getByLabel('当前页面',{exact:true}).locator('option').allTextContents();expect(pages).toHaveLength(2);
  await page.screenshot({path:info.outputPath('component-shelf.png')});
  const path=await downloadFile(page,'下载可编辑工程',info,'shelf');const saved=JSON.parse(await readFile(path,'utf8')) as Project;expect(saved.modules).toHaveLength(31);const nested=Object.keys(saved.files).find(path=>path.endsWith('.html')&&path.includes('/'))!;
  await page.getByLabel('当前页面',{exact:true}).selectOption(nested);await expect(canvas(page).locator('.wa-mf-button-shine')).toHaveCount(1);
  const zip=await downloadFile(page,'导出网站 ↗',info,'shelf-website'),root=info.outputPath('unpacked'),site=await serveExport(zip,root);
  try{await page.context().setOffline(true);await page.goto('file://'+root+'/'+nested);await expect(page.locator('.wa-mf-button-shine button')).toHaveCSS('cursor','pointer');}finally{await site.close();}
});
