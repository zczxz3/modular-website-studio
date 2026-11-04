import {test,expect,type Page} from '@playwright/test';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {dirname,join,resolve,sep} from 'node:path';
import {pathToFileURL} from 'node:url';
import {unzipSync} from 'fflate';
import {canvas,downloadFile,pickFile,inspectorSection,revealInspectorField} from './helpers';

async function rasterPhoto(page:Page,path:string,width:number,height:number){
  const data=await page.evaluate(({width,height})=>{
    const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;
    const context=canvas.getContext('2d');if(!context)throw new Error('Canvas unavailable');
    context.fillStyle='#286c70';context.fillRect(0,0,width,height);
    context.fillStyle='#ced8d2';context.fillRect(width*.15,height*.15,width*.7,height*.7);
    context.fillStyle='#233e3d';context.fillRect(width*.25,height*.35,width*.5,height*.3);
    return canvas.toDataURL('image/png').split(',')[1];
  },{width,height});
  await writeFile(path,Buffer.from(data,'base64'));
}
async function commit(page:Page,label:string,value:string){await revealInspectorField(page,label);await page.getByLabel(label,{exact:true}).fill(value);await page.getByLabel(label,{exact:true}).press('Enter');}
async function unpackWebsite(zipPath:string,folder:string){
  const files=unzipSync(new Uint8Array(await readFile(zipPath)));await mkdir(folder,{recursive:true});
  for(const [name,bytes]of Object.entries(files)){
    const path=resolve(folder,name);if(!path.startsWith(resolve(folder)+sep))throw new Error('Export path outside destination');
    await mkdir(dirname(path),{recursive:true});await writeFile(path,bytes);
  }
  return pathToFileURL(join(folder,'index.html')).href;
}

test('a student creates a Chinese portfolio, resumes its draft and opens the exported website offline',async({page,browser},info)=>{
  test.setTimeout(90000);await page.goto('/');await page.getByRole('button',{name:'使用模板 →',exact:true}).click();
  await expect(page.locator('.selection-label')).toHaveText('主标题');
  await expect(page.locator('.code-panel')).toHaveCount(0);
  await page.getByLabel('你的姓名',{exact:true}).fill('张明');await page.getByRole('button',{name:'应用姓名',exact:true}).click();
  const heading=canvas(page).locator('h1');await expect(heading).toHaveText('你好，我是张明。');
  await expect(canvas(page).locator('html')).toHaveAttribute('lang','zh-CN');
  await expect(canvas(page).locator('.wordmark')).toHaveText('张明');
  await canvas(page).locator('.portfolio-cta').click();await commit(page,'文字内容','看看我的作品');

  const landscape=info.outputPath('student-landscape.png'),portrait=info.outputPath('student-portrait.png');
  await rasterPhoto(page,landscape,640,360);await rasterPhoto(page,portrait,360,640);
  await page.getByRole('button',{name:'换作品封面',exact:true}).click();
  await pickFile(page,'从本机上传',landscape);await commit(page,'图片说明','张明的横幅作品');
  await page.getByLabel('裁切位置',{exact:true}).selectOption('50% 0%');
  const space=canvas(page).locator('.works-grid img[data-mws-cover="work-space"]');
  await expect.poll(()=>space.evaluate((image:HTMLImageElement)=>[image.naturalWidth,image.naturalHeight])).toEqual([640,360]);
  await expect(space).toHaveCSS('object-position','50% 0%');
  const tide=canvas(page).locator('.works-grid img[data-mws-cover="work-tide"]');
  await tide.click();await pickFile(page,'从本机上传',portrait);await commit(page,'图片说明','张明的竖幅作品');
  await page.getByLabel('裁切位置',{exact:true}).selectOption('50% 100%');
  await expect.poll(()=>tide.evaluate((image:HTMLImageElement)=>[image.naturalWidth,image.naturalHeight])).toEqual([360,640]);
  await expect(tide).toHaveCSS('object-position','50% 100%');

  // Sort the whole card through the visible selection action and drag handle.
  // Its image, title and detail-page link must move together.
  await space.click();await page.getByRole('button',{name:'选中作品卡',exact:true}).click();
  const cards=canvas(page).locator('.works-grid > article');
  await cards.first().scrollIntoViewIfNeeded();
  const handle=canvas(page).getByRole('button',{name:'拖动区块排序',exact:true});
  const start=await handle.boundingBox(),target=await cards.nth(1).boundingBox();
  if(!start||!target)throw new Error('Missing complete work-card drag target');
  await page.mouse.move(start.x+start.width/2,start.y+start.height/2);await page.mouse.down();
  await page.mouse.move(target.x+target.width-5,target.y+20,{steps:16});await page.mouse.up();
  await expect(cards.first()).toContainText('沿着潮汐');await expect(cards.first().locator('img')).toHaveAttribute('data-mws-cover','work-tide');
  await expect(cards.first().locator('a').first()).toHaveAttribute('href','pages/work-tide.html');
  await page.getByRole('button',{name:'↶ 撤销',exact:true}).click();await expect(cards.first()).toContainText('空间的回响');
  await page.getByRole('button',{name:'↷ 重做',exact:true}).click();await expect(cards.first()).toContainText('沿着潮汐');

  await page.getByRole('button',{name:'给标题加特效',exact:true}).click();
  await inspectorSection(page,'特效');await page.getByRole('button',{name:'应用淡入并上移',exact:true}).click();
  await page.getByLabel('快慢',{exact:true}).selectOption('350');await page.getByLabel('强弱',{exact:true}).selectOption('24');
  await expect(heading).toHaveAttribute('data-mws-reveal','enter');await expect(heading).toHaveAttribute('data-mws-duration','350');
  await page.getByRole('button',{name:'390px 手机预览',exact:true}).click();
  const preview=page.frameLocator('iframe[title="隔离运行预览"]');
  await expect(page.locator('iframe[title="隔离运行预览"]')).toHaveCSS('width','390px');
  await expect(preview.locator('h1')).toHaveText('你好，我是张明。');
  await expect.poll(()=>preview.locator('html').evaluate(node=>node.scrollWidth<=node.clientWidth)).toBe(true);
  await expect.poll(()=>preview.locator('.works-grid img').evaluateAll(images=>images.map(image=>[(image as HTMLImageElement).naturalWidth,(image as HTMLImageElement).naturalHeight]))).toEqual([[360,640],[640,360]]);

  // No download or return-to-start is needed before the next-day reload path.
  await expect.poll(()=>page.evaluate(()=>{
    const rows=JSON.parse(localStorage.getItem('mws-recent-v1')||'[]');
    return rows[0]?.project.files['index.html'].content||'';
  })).toContain('data-mws-duration="350"');
  expect(await page.evaluate(()=>localStorage.getItem('mws-project-v1'))).toBeNull();
  await page.reload();await page.locator('.recent-project').filter({hasText:'张明的作品集'}).click();
  await expect(canvas(page).locator('h1')).toHaveText('你好，我是张明。');
  await expect(canvas(page).locator('.portfolio-cta')).toHaveText('看看我的作品');
  await expect(canvas(page).locator('.works-grid > article').first()).toContainText('沿着潮汐');
  await expect(canvas(page).locator('h1')).toHaveAttribute('data-mws-duration','350');
  await expect.poll(()=>canvas(page).locator('.works-grid img').evaluateAll(images=>images.every(image=>(image as HTMLImageElement).complete&&(image as HTMLImageElement).naturalWidth>0))).toBe(true);
  const projectPath=await downloadFile(page,'下载可编辑工程',info,'project');
  const zipPath=await downloadFile(page,'导出网站 ↗',info,'website');
  const entryUrl=await unpackWebsite(zipPath,info.outputPath('offline-website'));

  const context=await browser.newContext({baseURL:new URL(page.url()).origin,viewport:{width:1440,height:1000}});
  const offline=await browser.newContext({viewport:{width:390,height:844},offline:true});
  try{
    const reopened=await context.newPage();await reopened.goto('/');expect(await reopened.evaluate(()=>localStorage.getItem('mws-recent-v1'))).toBeNull();
    await pickFile(reopened,'打开项目文件',projectPath);await expect(canvas(reopened).locator('h1')).toHaveText('你好，我是张明。');
    await expect.poll(()=>canvas(reopened).locator('.works-grid img').evaluateAll(images=>images.every(image=>(image as HTMLImageElement).naturalWidth>0))).toBe(true);

    const delivered=await offline.newPage(),remoteRequests:string[]=[];
    delivered.on('request',request=>{if(/^https?:/.test(request.url()))remoteRequests.push(request.url());});
    await delivered.goto(entryUrl);await expect(delivered.locator('h1')).toHaveText('你好，我是张明。');
    await expect(delivered).toHaveTitle('张明的作品集');await expect(delivered.locator('html')).toHaveAttribute('lang','zh-CN');
    await expect(delivered.locator('h1')).toHaveAttribute('data-mws-motion-state','played');
    await expect.poll(()=>delivered.locator('html').evaluate(node=>node.scrollWidth<=node.clientWidth)).toBe(true);
    await expect.poll(()=>delivered.locator('.works-grid img').evaluateAll(images=>images.map(image=>[(image as HTMLImageElement).naturalWidth,(image as HTMLImageElement).naturalHeight]))).toEqual([[360,640],[640,360]]);
    await delivered.locator('.works-grid > article').first().locator('a').first().click();
    await expect(delivered).toHaveURL(/\/pages\/work-tide\.html$/);await expect(delivered).toHaveTitle('沿着潮汐 · 张明');
    const detail=delivered.locator('.work-detail-cover[data-mws-cover="work-tide"]');
    await expect(detail).toHaveAttribute('alt','张明的竖幅作品');await expect(detail).toHaveCSS('object-position','50% 100%');
    await expect.poll(()=>detail.evaluate((image:HTMLImageElement)=>[image.naturalWidth,image.naturalHeight])).toEqual([360,640]);
    await delivered.goto(pathToFileURL(join(info.outputPath('offline-website'),'pages/work-space.html')).href);
    await expect(delivered).toHaveTitle('空间的回响 · 张明');
    const other=delivered.locator('.work-detail-cover[data-mws-cover="work-space"]');
    await expect(other).toHaveAttribute('alt','张明的横幅作品');await expect(other).toHaveCSS('object-position','50% 0%');
    await expect.poll(()=>other.evaluate((image:HTMLImageElement)=>[image.naturalWidth,image.naturalHeight])).toEqual([640,360]);
    expect(remoteRequests).toEqual([]);
  }finally{await context.close();await offline.close();}
});

test('hover styling preserves a freely dragged button position in canvas and preview',async({page})=>{
  await page.goto('/');await page.getByRole('button',{name:'使用模板 →',exact:true}).click();
  const button=canvas(page).locator('.portfolio-cta');await button.scrollIntoViewIfNeeded();await button.click();
  await page.getByLabel('布局模式',{exact:true}).selectOption('free');
  const box=await button.boundingBox();if(!box)throw new Error('Missing CTA drag target');
  await page.mouse.move(box.x+10,box.y+10);await page.mouse.down();await page.mouse.move(box.x+42,box.y+26,{steps:12});await page.mouse.up();
  await expect(button).toHaveCSS('translate','40px 20px');
  await inspectorSection(page,'特效');await page.getByLabel('外观效果',{exact:true}).selectOption('outline-hover');
  await button.hover();await expect(button).toHaveCSS('translate','40px 20px');
  await page.getByRole('button',{name:'桌面',exact:true}).hover();await expect(button).toHaveCSS('translate','40px 20px');
  await page.getByRole('button',{name:'预览',exact:true}).click();
  const preview=page.frameLocator('iframe[title="隔离运行预览"]').locator('.portfolio-cta');
  await preview.hover();await expect(preview).toHaveCSS('translate','40px 20px');
  await page.getByRole('button',{name:'桌面',exact:true}).hover();await expect(preview).toHaveCSS('translate','40px 20px');
});
