import {test,expect} from '@playwright/test';
import {readFile} from 'node:fs/promises';
import {canvas,downloadFile,inspectorSection,pickFile} from './helpers';

test('Cropper creates a local cropped image, cancels safely and survives project reopen',async({page,browser},info)=>{
 await page.goto('/');await page.getByRole('button',{name:'使用模板 →',exact:true}).click();await page.getByRole('button',{name:'换作品封面',exact:true}).click();
 const image=canvas(page).locator('[data-mws-cover="work-space"]');const before=await image.getAttribute('src'),id=await image.getAttribute('data-mws-id');
 await page.getByRole('button',{name:'裁剪当前图片',exact:true}).click();await expect(page.getByRole('button',{name:'应用裁剪',exact:true})).toBeEnabled();await page.getByRole('button',{name:'取消裁剪',exact:true}).click();await expect(image).toHaveAttribute('src',before!);
 await page.getByRole('button',{name:'裁剪当前图片',exact:true}).click();await expect(page.getByRole('button',{name:'应用裁剪',exact:true})).toBeEnabled();
 await page.getByLabel('裁剪比例',{exact:true}).selectOption('1');
 const handle=page.locator('cropper-handle[action="move"]').last();const box=await handle.boundingBox();if(!box)throw new Error('Missing crop handle');await page.mouse.move(box.x+box.width/2,box.y+box.height/2);await page.mouse.down();await page.mouse.move(box.x+box.width/2+12,box.y+box.height/2+8,{steps:5});await page.mouse.up();
 await page.getByRole('button',{name:'应用裁剪',exact:true}).click();await expect(page.getByRole('dialog')).toHaveCount(0);await expect(image).toHaveAttribute('src',/^data:image\/png/);await expect(image).toHaveAttribute('data-mws-id',id!);
 await expect.poll(()=>image.evaluate((n:HTMLImageElement)=>n.naturalWidth===n.naturalHeight&&n.naturalWidth>0)).toBe(true);
 await page.getByRole('button',{name:'↶ 撤销',exact:true}).click();await expect(image).toHaveAttribute('src',before!);await page.getByRole('button',{name:'↷ 重做',exact:true}).click();await expect(image).toHaveAttribute('src',/^data:image\/png/);
 const projectPath=await downloadFile(page,'下载可编辑工程',info,'crop-project');const saved=JSON.parse(await readFile(projectPath,'utf8'));expect(saved.files['pages/work-space.html'].content).toContain('.png');
 const context=await browser.newContext();try{const fresh=await context.newPage();await fresh.goto(new URL(page.url()).origin);await pickFile(fresh,'打开项目文件',projectPath);await expect(canvas(fresh).locator('[data-mws-cover="work-space"]')).toHaveAttribute('src',/^data:image\/png/);}finally{await context.close();}
});

test('Grapick applies CSS once, cancels without edits and exports without editor dependencies',async({page},info)=>{
 await page.goto('/');await page.getByRole('button',{name:'＋ 空白项目',exact:true}).click();
 await canvas(page).locator('h1').click();await inspectorSection(page,'样式');await page.getByRole('button',{name:'编辑渐变背景',exact:true}).click();
 await expect(page.locator('.gradient-value')).toContainText('linear-gradient');await page.getByLabel('渐变方向',{exact:true}).selectOption('135deg');await expect(page.locator('.gradient-value')).toContainText('135deg');await page.getByRole('button',{name:'取消渐变',exact:true}).click();await expect(page.getByRole('button',{name:'↶ 撤销',exact:true})).toBeDisabled();
 await page.getByRole('button',{name:'编辑渐变背景',exact:true}).click();await page.getByLabel('渐变方向',{exact:true}).selectOption('135deg');await page.locator('.grp-preview').click({position:{x:150,y:20}});await expect(page.locator('.grp-handler')).toHaveCount(3);await expect(page.locator('.gradient-value')).not.toContainText('rgba(');await page.getByRole('button',{name:'应用渐变',exact:true}).click();
 const heading=canvas(page).locator('h1');await expect(heading).toHaveCSS('background-image',/linear-gradient\(135deg/);
 await page.getByRole('button',{name:'↶ 撤销',exact:true}).click();await expect(heading).toHaveCSS('background-image','none');await page.getByRole('button',{name:'↷ 重做',exact:true}).click();await expect(heading).toHaveCSS('background-image',/135deg/);
 const path=await downloadFile(page,'导出 HTML',info,'gradient-html');const html=await readFile(path,'utf8');expect(html).toContain('linear-gradient(135deg');expect(html).not.toMatch(/cropperjs|grapick/);
 await page.context().setOffline(true);await page.goto('file://'+path);await expect(page.locator('h1')).toHaveCSS('background-image',/135deg/);
});
