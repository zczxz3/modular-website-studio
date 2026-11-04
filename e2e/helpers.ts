import {expect,type Page,type TestInfo} from '@playwright/test';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {createServer} from 'node:http';
import {dirname,join,resolve,sep} from 'node:path';
import {unzipSync} from 'fflate';
import {parse,type DefaultTreeAdapterMap} from 'parse5';
import type {Project} from '../src/core/types';

export async function pickFile(page:Page,button:string,path:string){
  const [chooser]=await Promise.all([page.waitForEvent('filechooser'),page.getByRole('button',{name:button,exact:true}).click()]);
  await chooser.setFiles(path);
}
export async function downloadFile(page:Page,button:string,info:TestInfo,folder:string){
  const [download]=await Promise.all([page.waitForEvent('download'),page.getByRole('button',{name:button,exact:true}).click()]);
  // Playwright's internal download.path() is a GUID, so preserve the suggested extension.
  const path=info.outputPath(folder,download.suggestedFilename());
  await mkdir(dirname(path),{recursive:true});await download.saveAs(path);return path;
}
export async function switchPage(page:Page,path:string){
  await page.getByRole('button',{name:'文件',exact:true}).click();
  await page.getByLabel('当前页面',{exact:true}).selectOption(path);
}
export const canvas=(page:Page)=>page.frameLocator('iframe[title="实时可编辑网页"]');
export async function addModule(page:Page,name:string){
  await page.getByRole('button',{name:'模块',exact:true}).click();
  await page.locator('.module-card').filter({has:page.getByText(name,{exact:true})}).getByRole('button',{name:'＋ 添加到页面',exact:true}).click();
}
export function stylesheetRefs(html:string,page:string){
  const refs:string[]=[];
  const visit=(n:DefaultTreeAdapterMap['node'])=>{
    if('tagName' in n&&n.tagName==='link'){
      const attr=(key:string)=>n.attrs.find(a=>a.name===key)?.value||'';
      if(attr('rel').toLowerCase().split(/\s+/).includes('stylesheet'))refs.push(new URL(attr('href'),'https://export.test/'+page).pathname.slice(1));
    }
    if('childNodes' in n)n.childNodes.forEach(visit);
  };visit(parse(html));return refs;
}
export function expectModuleCss(p:Project,css:string,pages:string[]){
  const paths=Object.keys(p.files).filter(path=>path.endsWith('.css')&&p.files[path].content===css);
  expect(paths).toHaveLength(1);
  for(const page of pages)expect(stylesheetRefs(p.files[page].content,page).filter(path=>path===paths[0])).toHaveLength(1);
  return paths[0];
}
export async function serveExport(zipPath:string,dir:string){
  const files=unzipSync(new Uint8Array(await readFile(zipPath)));await mkdir(dir,{recursive:true});
  for(const [name,bytes]of Object.entries(files)){
    const path=resolve(dir,name);if(!path.startsWith(resolve(dir)+sep))throw new Error('Export escaped static root');
    await mkdir(dirname(path),{recursive:true});await writeFile(path,bytes);
  }
  // Serve actual unpacked bytes on a separate origin; no route mocks or Studio runtime.
  const server=createServer((req,res)=>{void(async()=>{
    try{const name=decodeURIComponent(new URL(req.url||'/','http://localhost').pathname).replace(/^\//,'')||'index.html';const path=resolve(dir,name);if(!path.startsWith(resolve(dir)+sep))throw new Error('Path outside root');
      const bytes=await readFile(path);res.setHeader('Content-Type',name.endsWith('.css')?'text/css':name.endsWith('.js')?'text/javascript':'text/html; charset=utf-8');res.end(bytes);
    }catch{res.writeHead(404);res.end('Not found');}
  })();});
  await new Promise<void>(done=>server.listen(0,'127.0.0.1',done));const address=server.address();if(!address||typeof address==='string')throw new Error('Missing static address');
  return {origin:`http://127.0.0.1:${address.port}`,close:()=>new Promise<void>(done=>{server.close(()=>done());server.closeAllConnections();})};
}
