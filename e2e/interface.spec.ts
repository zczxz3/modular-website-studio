import {test,expect} from '@playwright/test';
import {canvas} from './helpers';

test('appearance, inspector groups and resource search leave project content unchanged',async({page})=>{
  await page.goto('/');await page.getByRole('button',{name:'使用模板 →',exact:true}).click();
  const heading=canvas(page).locator('h1');await expect(heading).toHaveText('你好，我是林间。');const id=await heading.getAttribute('data-mws-id');
  await page.getByRole('button',{name:'切换到深色界面',exact:true}).click();
  await expect(page.locator('.studio')).toHaveAttribute('data-ui-theme','dark');
  await expect(canvas(page).locator('body')).toHaveCSS('background-color','rgb(243, 241, 235)');
  await page.locator('.inspector-tabs').getByRole('button',{name:'样式',exact:true}).click();await expect(page.getByLabel('字号',{exact:true})).toBeVisible();
  await page.locator('.inspector-tabs').getByRole('button',{name:'特效',exact:true}).click();await expect(page.getByLabel('滚动动画',{exact:true})).toBeVisible();
  await page.locator('.inspector-tabs').getByRole('button',{name:'内容',exact:true}).click();await expect(page.getByLabel('文字内容',{exact:true})).toBeVisible();
  await page.getByRole('button',{name:'组件',exact:true}).click();await page.getByLabel('搜索组件',{exact:true}).fill('标题');
  await expect(page.locator('.resource-card')).toHaveCount(2);await expect(page.locator('[data-resource="workbench/heading"]')).toBeVisible();
  await page.getByRole('button',{name:'清除搜索',exact:true}).click();await page.getByRole('button',{name:'交互',exact:true}).click();await expect(page.locator('.resource-card')).toHaveCount(2);
  await page.getByRole('button',{name:'区块',exact:true}).click();await expect(page.locator('[data-resource="workbench/image-grid"]')).toBeVisible();
  await expect(heading).toHaveAttribute('data-mws-id',id!);await expect(heading).toHaveText('你好，我是林间。');await expect(page.getByRole('button',{name:'↶ 撤销',exact:true})).toBeDisabled();
  await page.reload();await expect(page.locator('.start-screen')).toHaveAttribute('data-ui-theme','dark');
});

test('laptop workspace can hide panels and restore fit without oversized scroll space',async({page})=>{
  await page.setViewportSize({width:1024,height:768});await page.goto('/');await page.getByRole('button',{name:'使用模板 →',exact:true}).click();
  await expect.poll(()=>page.evaluate(()=>document.documentElement.scrollWidth<=document.documentElement.clientWidth)).toBe(true);
  await page.getByRole('button',{name:'隐藏资源面板',exact:true}).click();await page.getByRole('button',{name:'隐藏属性面板',exact:true}).click();
  await expect(page.getByLabel('资源面板',{exact:true})).toBeHidden();await expect(page.getByLabel('属性面板',{exact:true})).toBeHidden();
  await page.getByLabel('画布缩放',{exact:true}).selectOption('0.5');
  await expect.poll(async()=>Math.round((await page.locator('.canvas-sizer').boundingBox())!.height)).toBe(390);
  await page.getByLabel('画布缩放',{exact:true}).selectOption('fit');
  await expect(page.locator('.canvas-caption')).toContainText('100%');
  const frame=await page.locator('iframe[title="实时可编辑网页"]').boundingBox();expect(frame!.x).toBeGreaterThanOrEqual(0);expect(frame!.x+frame!.width).toBeLessThanOrEqual(1024);
  await page.getByRole('button',{name:'显示资源面板',exact:true}).click();await page.getByRole('button',{name:'显示属性面板',exact:true}).click();
  await expect(page.getByLabel('资源面板',{exact:true})).toBeVisible();await expect(page.getByLabel('属性面板',{exact:true})).toBeVisible();
  await page.getByRole('button',{name:'创作指引',exact:true}).click();await expect(page.getByLabel('你的姓名',{exact:true})).toBeHidden();
  await page.getByRole('button',{name:'创作指引',exact:true}).click();await expect(page.getByLabel('你的姓名',{exact:true})).toBeVisible();
});

test('the home effect shortcut opens the matching inspector section',async({page})=>{
  await page.goto('/');await page.getByRole('button',{name:'试用标题特效',exact:true}).click();
  await expect(page.locator('.inspector-tabs').getByRole('button',{name:'特效',exact:true})).toHaveAttribute('aria-pressed','true');
  await expect(page.getByLabel('滚动动画',{exact:true})).toBeVisible();
});

test('long paragraph editing supports cancel, apply, one-step history and project download',async({page},info)=>{
  await page.goto('/');await page.getByRole('button',{name:'使用模板 →',exact:true}).click();
  const paragraph=canvas(page).locator('.hero-intro');const original=await paragraph.textContent();await paragraph.click();
  const field=page.getByRole('textbox',{name:'文字内容',exact:true});await expect(field).toHaveJSProperty('tagName','TEXTAREA');
  await field.fill('这段修改应该取消');await field.press('Escape');await expect(field).toHaveValue(original!);await expect(paragraph).toHaveText(original!);
  const text='这是我的第一件设计作品。我把观察、草图和完成的过程放在这里，让每一件作品都能讲清楚自己的故事。';
  await field.fill(text);await field.press('ControlOrMeta+Enter');await expect(paragraph).toHaveText(text);
  await page.getByRole('button',{name:'↶ 撤销',exact:true}).click();await expect(paragraph).toHaveText(original!);
  await page.getByRole('button',{name:'↷ 重做',exact:true}).click();await expect(paragraph).toHaveText(text);
  const {downloadFile}=await import('./helpers');const {readFile}=await import('node:fs/promises');
  const path=await downloadFile(page,'下载可编辑工程',info,'paragraph');const saved=JSON.parse(await readFile(path,'utf8'));expect(saved.files['index.html'].content).toContain(text);
});

test('explicit selection navigation locates offscreen content without project history',async({page})=>{
  await page.goto('/');await page.getByRole('button',{name:'使用模板 →',exact:true}).click();
  const heading=canvas(page).locator('h1');await expect(heading).toBeVisible();
  await canvas(page).locator('body').evaluate(()=>window.scrollTo(0,document.body.scrollHeight));
  await expect.poll(()=>heading.evaluate(e=>e.getBoundingClientRect().bottom<0)).toBe(true);
  await page.getByRole('button',{name:'在画布定位',exact:true}).click();
  await expect.poll(()=>heading.evaluate(e=>{const r=e.getBoundingClientRect();return r.top>=0&&r.bottom<=innerHeight;})).toBe(true);
  await page.getByRole('button',{name:'选中父级',exact:true}).click();await expect(page.locator('.selection-label')).not.toContainText('主标题');
  await page.getByLabel('当前页面',{exact:true}).focus();await page.getByLabel('当前页面',{exact:true}).press('Delete');
  await expect(heading).toHaveCount(1);await expect(page.getByRole('button',{name:'↶ 撤销',exact:true})).toBeDisabled();
});
