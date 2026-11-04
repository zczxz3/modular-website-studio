import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,writeFile,mkdir,copyFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import {createStaticServer} from './serve.mjs';
const source=fileURLToPath(new URL('..',import.meta.url));

test('the dependency-free server serves a normal static website and rejects invalid paths',async()=>{
  const root=await mkdtemp(join(tmpdir(),'mws-web-'));let server;
  try{
    await writeFile(join(root,'index.html'),'<!doctype html><title>可运行的网站</title>');await writeFile(join(root,'app.js'),'window.ready=true;');
    server=await createStaticServer(root);await new Promise(done=>server.listen(0,'127.0.0.1',done));const base='http://127.0.0.1:'+server.address().port;
    assert.match(await (await fetch(base)).text(),/可运行的网站/);assert.equal((await fetch(base+'/app.js')).headers.get('content-type'),'text/javascript; charset=utf-8');assert.equal((await fetch(base,{method:'HEAD'})).status,200);
    assert.equal((await fetch(base+'/%2e%2e%2fprivate.txt')).status,403);assert.equal((await fetch(base+'/missing.js')).status,404);assert.equal((await fetch(base,{method:'POST'})).status,405);
  }finally{if(server)await new Promise(done=>server.close(done));await rm(root,{recursive:true,force:true});}
});

async function fixture(){
  const root=await mkdtemp(join(tmpdir(),'mws-checkout-'));const files=['scripts/check-checkout.mjs','package.json','package-lock.json','index.html','vite.config.ts','src/main.tsx','src/App.tsx','src/core/modules.ts','src/preview/bridge.js','src/templates/portfolio/index.html','src/resources/website-assets-library/modules.json','src/vendor/aos/aos.js'];
  for(const path of files){await mkdir(dirname(join(root,path)),{recursive:true});await copyFile(join(source,path),join(root,path));}return root;
}
test('a source ZIP works without .git while a copied broken worktree pointer is diagnosed',async()=>{
  const root=await fixture();try{
    let result=spawnSync(process.execPath,['scripts/check-checkout.mjs'],{cwd:root,encoding:'utf8'});assert.equal(result.status,0);
    await writeFile(join(root,'.git'),'gitdir: /missing/studio/worktree\n');result=spawnSync(process.execPath,['scripts/check-checkout.mjs'],{cwd:root,encoding:'utf8'});assert.equal(result.status,1);assert.match(result.stderr,/不存在的工作树目录/);
  }finally{await rm(root,{recursive:true,force:true});}
});
test('an empty submodule-style gitlink cannot be shipped as source',async t=>{
  if(spawnSync('git',['--version']).status!==0){t.skip('Git is not installed');return;}
  const root=await fixture();try{
    for(const args of [['init','-q'],['add','.'],['update-index','--add','--cacheinfo','160000,1234567890123456789012345678901234567890,empty-components']])assert.equal(spawnSync('git',args,{cwd:root}).status,0);
    const result=spawnSync(process.execPath,['scripts/check-checkout.mjs'],{cwd:root,encoding:'utf8'});assert.equal(result.status,1);assert.match(result.stderr,/Git 子模块指针：empty-components/);
  }finally{await rm(root,{recursive:true,force:true});}
});
