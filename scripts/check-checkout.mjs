import {access,readFile,stat} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const required=['package.json','package-lock.json','index.html','vite.config.ts','src/main.tsx','src/App.tsx','src/core/modules.ts','src/preview/bridge.js','src/templates/portfolio/index.html','src/resources/website-assets-library/modules.json','src/vendor/aos/aos.js'];
try{
  for(const path of required){const info=await stat(resolve(root,path));if(!info.isFile()||!info.size)throw new Error('源码缺失或为空：'+path);}
  let gitExists=true;try{await access(resolve(root,'.git'));}catch{gitExists=false;}
  if(gitExists){
    const info=await stat(resolve(root,'.git'));
    if(info.isFile()){
      const pointer=(await readFile(resolve(root,'.git'),'utf8')).trim();if(!pointer.startsWith('gitdir: '))throw new Error('.git 指针格式无效。');
      try{await access(resolve(root,pointer.slice(8)));}catch{throw new Error('.git 指向不存在的工作树目录。请在新目录重新克隆，或下载完整源码 ZIP；不要复制旧工作树的 .git 文件。');}
    }
    const entries=execFileSync('git',['ls-files','--stage','-z'],{cwd:root,encoding:'utf8'}).split('\0').filter(Boolean);
    const links=entries.filter(entry=>entry.startsWith('160000 '));if(links.length)throw new Error('源码含有无法独立下载的 Git 子模块指针：'+links.map(e=>e.split('\t')[1]).join(', '));
    const names=new Set(entries.map(entry=>entry.split('\t')[1]));for(const path of required)if(!names.has(path))throw new Error('源码没有被 Git 跟踪：'+path);
  }
  console.log('Source checkout is complete: ordinary source files, no gitlinks, no external worktree dependency.');
}catch(error){console.error('Checkout check failed: '+error.message);process.exitCode=1;}
