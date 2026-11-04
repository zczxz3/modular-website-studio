import {it,expect} from 'vitest';
import {createPortfolio} from '../src/core/catalog';
import {applyCroppedImage} from '../src/core/image-crop';
import {attr,elements,sourceText} from '../src/core/source';
import {ownStyle,transaction} from '../src/core/commands';
import {ProjectStore} from '../src/core/store';
import {parseProjectJson,saveProject,readZip,exportWebsite} from '../src/core/io';
it('keeps crop asset, alt, linked covers, styles and one-step undo through export/reopen',()=>{
 let p=createPortfolio();const image=elements(sourceText(p)).find(n=>attr(n.node,'data-mws-cover')==='work-space')!;
 p=transaction(p,[{type:'style',id:image.id,property:'translate',value:'12px 8px'}]);const store=new ProjectStore(p);
 const bytes=Uint8Array.from(Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=','base64'));
 store.replace(applyCroppedImage(p,image.id,bytes),'裁剪');const result=store.getSnapshot().project;
 const target=elements(sourceText(result)).find(n=>n.id===image.id)!;const path=attr(target.node,'src')!;
 expect(attr(target.node,'alt')).toBe(attr(image.node,'alt'));expect(ownStyle(result,image.id,'translate')).toBe('12px 8px');expect(result.files['assets/arches.svg']).toEqual(p.files['assets/arches.svg']);
 expect(sourceText(result,'pages/work-space.html')).toContain('../'+path);expect(readZip(exportWebsite(result))[path]).toEqual(bytes);
 expect(sourceText(parseProjectJson(saveProject(result)))).toContain(path);
 store.undo();expect(store.getSnapshot().project).toEqual(p);store.redo();expect(store.getSnapshot().project).toEqual(result);
 expect(()=>applyCroppedImage(p,image.id,new Uint8Array([1,2,3]))).toThrow('PNG');
});
