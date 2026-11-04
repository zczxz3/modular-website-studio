// No npm dependencies: this file also ships with the ready-to-run static ZIP.
import {createServer} from 'node:http';
import {readFile,realpath,stat} from 'node:fs/promises';
import {resolve,sep,extname} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
export async function createStaticServer(directory){
  const root=await realpath(resolve(directory));
  const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.woff2':'font/woff2','.woff':'font/woff','.wasm':'application/wasm','.txt':'text/plain; charset=utf-8'};
  return createServer(async(req,res)=>{
    try{
      if(!['GET','HEAD'].includes(req.method)){res.writeHead(405,{Allow:'GET, HEAD'});res.end();return;}
      let name;try{name=decodeURIComponent(new URL(req.url,'http://localhost').pathname);}catch{res.writeHead(400);res.end('Invalid URL');return;}
      if(name.includes('\\')||name.includes('\0')||name.split('/').includes('..')){res.writeHead(403);res.end('Forbidden');return;}
      let path=resolve(root,'.'+name);if((await stat(path)).isDirectory())path=resolve(path,'index.html');path=await realpath(path);
      if(!path.startsWith(root+sep)){res.writeHead(403);res.end('Forbidden');return;}
      const bytes=await readFile(path);res.writeHead(200,{'Content-Type':types[extname(path)]||'application/octet-stream','Content-Length':bytes.length,'X-Content-Type-Options':'nosniff','Cache-Control':'no-cache'});res.end(req.method==='HEAD'?undefined:bytes);
    }catch{res.writeHead(404);res.end('Not found');}
  });
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
  try{
    const root=process.argv[2]||fileURLToPath(new URL('../dist',import.meta.url));const port=Number(process.env.PORT||4173);if(!Number.isInteger(port)||port<1||port>65535)throw new Error('PORT 必须是 1–65535 的整数。');
    const server=await createStaticServer(root);server.on('error',error=>{console.error(error.code==='EADDRINUSE'?`端口 ${port} 已被使用，请关闭旧进程或设置 PORT。`:error.message);process.exitCode=1;});
    server.listen(port,'127.0.0.1',()=>console.log(`Modular Website Studio: http://127.0.0.1:${port}\n在浏览器中打开上述地址；Ctrl+C 停止。`));
  }catch(error){console.error('无法启动：'+error.message+'\n源码版请先运行 npm ci 和 npm run build；下载包请完整解压后启动。');process.exitCode=1;}
}
