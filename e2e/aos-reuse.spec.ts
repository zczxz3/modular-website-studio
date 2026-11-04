import {test,expect} from '@playwright/test';
import {readFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import {canvas,downloadFile,inspectorSection} from './helpers';

test('drag a heading, configure upstream scroll animation, and open the exported HTML offline',async({page,browser},info)=>{
  await page.goto('/');await page.getByRole('button',{name:'＋ 空白项目',exact:true}).click();
  await page.getByRole('button',{name:'组件',exact:true}).click();
  const card=page.locator('[data-resource="workbench/heading"] .resource-preview');await card.scrollIntoViewIfNeeded();
  const from=await card.boundingBox(),to=await canvas(page).locator('main').boundingBox();if(!from||!to)throw new Error('Missing drag target');
  await page.mouse.move(from.x+30,from.y+30);await page.mouse.down();await page.mouse.move(from.x+45,from.y+30,{steps:4});await page.mouse.move(to.x+30,to.y+to.height-2,{steps:14});await page.mouse.up();
  const heading=canvas(page).getByRole('heading',{name:'写下你的新标题',exact:true});await expect(heading).toBeVisible();await heading.click();
  await inspectorSection(page,'特效');await page.getByLabel('滚动动画',{exact:true}).selectOption('fade-up');
  await page.getByLabel('延迟（毫秒）',{exact:true}).fill('350');await page.getByLabel('延迟（毫秒）',{exact:true}).press('Enter');
  await page.getByLabel('只播放一次',{exact:true}).uncheck();
  await expect(heading).toBeVisible();await expect(heading).not.toHaveAttribute('data-aos');
  await page.getByRole('button',{name:'页面',exact:true}).click();await expect(page.locator('.animated-list')).toContainText('写下你的新标题');
  await inspectorSection(page,'特效');await page.getByRole('button',{name:'预览滚动效果',exact:true}).click();
  const preview=page.frameLocator('iframe[title="隔离运行预览"]').getByRole('heading',{name:'写下你的新标题',exact:true});
  await expect(preview).toHaveClass(/aos-animate/);await expect(preview).toHaveCSS('opacity','1');
  const htmlPath=await downloadFile(page,'导出 HTML',info,'html');
  const html=await readFile(htmlPath,'utf8');expect(html).toContain('data-aos="fade-up"');expect(html).toContain('data-aos-delay="350"');expect(html).toContain('data-aos-once="false"');expect(html).toContain('Copyright (c) 2015 Michał Sajnóg');
  const offline=await browser.newContext({offline:true});
  try{
    const delivered=await offline.newPage();await delivered.goto(pathToFileURL(htmlPath).href);
    const result=delivered.getByRole('heading',{name:'写下你的新标题',exact:true});
    await expect(result).toHaveAttribute('data-aos-delay','350');await expect(result).toHaveClass(/aos-animate/);await expect(result).toHaveCSS('opacity','1');
  }finally{await offline.close();}
});
