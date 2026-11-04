import {test,expect} from '@playwright/test';
import {readFile} from 'node:fs/promises';
import {unzipSync,strFromU8} from 'fflate';

test('visual edits, code edits, error recovery, save/reopen and exported site',async({page})=>{
  await page.goto('/');const frame=page.frameLocator('iframe[title="实时可编辑网页"]');
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
  const validCss=await source.inputValue();await source.fill('body { color: red;');await expect(page.getByRole('alert')).toContainText('保留最后有效画布');await expect(title).toHaveText('Code edit');
  await source.fill(validCss);await expect(page.getByRole('alert')).toHaveCount(0);
  const save=page.waitForEvent('download');await page.getByRole('button',{name:'保存项目',exact:true}).click();const saved=await save;const savedPath=await saved.path();if(!savedPath)throw new Error('Missing saved project');
  await page.reload();await page.getByRole('button',{name:'重新打开已保存',exact:true}).click();await expect(title).toHaveText('Code edit');
  const open=page.waitForEvent('filechooser');await page.getByRole('button',{name:'打开项目',exact:true}).click();await(await open).setFiles(savedPath);await expect(title).toHaveText('Code edit');
  const exporting=page.waitForEvent('download');await page.getByRole('button',{name:'导出网站 ↗',exact:true}).click();const exported=await exporting;const exportPath=await exported.path();if(!exportPath)throw new Error('Missing export');
  const files=unzipSync(new Uint8Array(await readFile(exportPath)));expect(strFromU8(files['studio.css'])).toContain('60px 30px');
  // Serve the actual exported bytes, with no Studio runtime, and click its original script.
  await page.route('https://export.test/**',route=>{const path=new URL(route.request().url()).pathname.slice(1)||'index.html';const body=files[path];return route.fulfill({status:body?200:404,body:body?Buffer.from(body):'Not found',contentType:path.endsWith('.css')?'text/css':path.endsWith('.js')?'text/javascript':'text/html'});});
  await page.goto('https://export.test/');await expect(page.locator('h1')).toHaveText('Code edit');await page.locator('#explore').click();await expect(page.locator('h1')).toHaveText('世界，就在眼前');
});

test('Monaco input and structured drag ordering',async({page})=>{
  await page.goto('/');const frame=page.frameLocator('iframe[title="实时可编辑网页"]');await expect(frame.locator('h1')).toBeVisible();
  await page.getByRole('button',{name:'styles.css',exact:true}).click();const monaco=page.getByRole('textbox',{name:'项目源代码'});
  await monaco.click();await monaco.press('ControlOrMeta+End');await page.keyboard.insertText('\nh1 { color: rgb(10, 20, 30); }');await expect(frame.locator('h1')).toHaveCSS('color','rgb(10, 20, 30)');
  await page.getByRole('button',{name:'画布',exact:true}).click();await page.getByLabel('画布缩放',{exact:true}).selectOption('0.65');
  const articles=frame.locator('article');const first=await articles.nth(0).boundingBox(),second=await articles.nth(1).boundingBox();if(!first||!second)throw new Error('Missing cards');
  // Grab container padding (not its text) and drop in the preceding card's left half.
  await page.mouse.move(second.x+4,second.y+4);await page.mouse.down();await page.mouse.move(first.x+4,first.y+4,{steps:12});await page.mouse.up();
  await expect(articles.first()).toContainText('数据生长');
});
