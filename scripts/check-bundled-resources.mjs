// Verify frozen local examples only. No upstream reads, writes or syncing.
import {readFile} from 'node:fs/promises';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';

if(process.argv.length>2)throw new Error('This command only checks bundled examples; resource synchronization is deferred.');
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const lock=JSON.parse(await readFile(resolve(root,'src/resources/website-assets.lock.json'),'utf8'));
for(const [name,expected]of Object.entries(lock.outputs)){
  const actual=createHash('sha256').update(await readFile(resolve(root,name))).digest('hex');
  if(actual!==expected)throw new Error(`Bundled example changed: ${name}. Review the local change and update its recorded hash; do not synchronize a moving upstream branch.`);
}
console.log(`Verified ${Object.keys(lock.outputs).length} frozen example files; legacy examples retained.`);
const aos=JSON.parse(await readFile(resolve(root,'src/vendor/aos/provenance.json'),'utf8'));
for(const [name,record]of Object.entries(aos.files)){
  const bytes=await readFile(resolve(root,'src/vendor/aos',name));
  const sha256=createHash('sha256').update(bytes).digest('hex');
  const blob=createHash('sha1').update(`blob ${bytes.length}\0`).update(bytes).digest('hex');
  if(sha256!==record.sha256||blob!==record.gitBlob)throw new Error(`Pinned AOS file changed: ${name}. Review provenance before updating.`);
}
console.log(`Verified AOS ${aos.version}: original JS, CSS and MIT license.`);
const curated=JSON.parse(await readFile(resolve(root,'src/resources/curated/upstream/provenance.json'),'utf8'));
for(const item of curated){const bytes=await readFile(resolve(root,'src/resources/curated/upstream',item.file));if(createHash('sha256').update(bytes).digest('hex')!==item.sha256)throw new Error('Curated upstream source changed: '+item.file);}
const xyz=JSON.parse(await readFile(resolve(root,'src/vendor/animxyz/provenance.json'),'utf8'));
for(const [file,hash]of Object.entries(xyz.files))if(createHash('sha256').update(await readFile(resolve(root,'src/vendor/animxyz',file))).digest('hex')!==hash)throw new Error('AnimXYZ dependency changed: '+file);
console.log('Verified pinned Tailblocks, HyperUI and AnimXYZ inputs.');

// Check the newly bundled 31-module distribution without fetching a moving upstream.
const {execFileSync}=await import('node:child_process');
execFileSync(process.execPath,[resolve(root,'scripts/build-website-assets.mjs'),'--check'],{stdio:'inherit'});
