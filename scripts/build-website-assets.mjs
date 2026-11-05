// Offline extraction from an explicitly reviewed, pinned upstream distribution.
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {unzipSync,strFromU8} from 'fflate';
const root=new URL('../src/resources/website-assets-library/',import.meta.url);
const pin=JSON.parse(await readFile(new URL('provenance.json',root),'utf8'));
const bytes=await readFile(new URL('upstream/'+pin.archive,root));
const hash=b=>createHash('sha256').update(b).digest('hex');
if(hash(bytes)!==pin.sha256||createHash('sha1').update(`blob ${bytes.length}\0`).update(bytes).digest('hex')!==pin.gitBlob)throw new Error('Website Assets archive differs from the reviewed upstream blob.');
const archive=unzipSync(bytes),catalog=JSON.parse(strFromU8(archive['studio-catalog.json']));
if(catalog.schema_version!==1||catalog.studio_contract!=='static-module-v1'||catalog.modules.length!==pin.moduleCount)throw new Error('Unsupported upstream static catalog.');
const ids=new Set();
const modules=catalog.modules.map(record=>{
  if(record.kind!=='studio-static-module-v1'||record.runtime_required!==false||!/^installable\/[a-z0-9-]+\.zip$/.test(record.path)||ids.has(record.id))throw new Error('Invalid static catalog entry.');
  ids.add(record.id);const zip=archive[record.path];if(!zip||hash(zip)!==record.sha256)throw new Error('Module checksum mismatch: '+record.id);
  const module=JSON.parse(strFromU8(unzipSync(zip)['module.json']));
  if(module.id!==record.id||module.permissions.length||Object.keys(module.dependencies).length)throw new Error('Unsupported module: '+record.id);
  return module;
});
// No runtime files, planned effects, generated source identities or HTML rewrites.
const outputs={'modules.json':JSON.stringify(modules,null,2)+'\n','catalog.json':strFromU8(archive['studio-catalog.json']),'shelf.json':strFromU8(archive['studio-shelf.mws.json']),'LICENSE.txt':strFromU8(archive.LICENSE)};
for(const [name,content]of Object.entries(outputs)){
  if(process.argv.includes('--check')){if(await readFile(new URL(name,root),'utf8')!==content)throw new Error('Rebuild the reviewed static snapshot: '+name);}
  else await writeFile(new URL(name,root),content);
}
console.log(`Verified ${modules.length} pinned Website Assets static modules (${pin.revision.slice(0,7)}); runtime and planned entries excluded.`);
