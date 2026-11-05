import raw from './shelf.json?raw';
import {parseProjectJson} from '../../core/io';
import {randomId} from '../../core/id';
import {adaptWebsiteAssetModule,adaptWebsiteAssetsHtml,adaptWebsiteAssetsCss} from './adapter';
import {WEBSITE_ASSET_NOTICE} from './index';

/** Reuse the upstream native v1 project, with the same compatibility adaptation
 * as the catalog. Each opening creates an independent editable project. */
export function createWebsiteAssetsShelf(){
  const project=parseProjectJson(raw);
  project.id=randomId();project.name='我的组件库 · 组件展架';
  project.modules=project.modules.map(adaptWebsiteAssetModule);
  for(const [path,file]of Object.entries(project.files))if(file.kind==='text'){
    if(/\.html?$/i.test(path))project.files[path]={kind:'text',content:adaptWebsiteAssetsHtml(file.content)};
    if(/\.css$/i.test(path))project.files[path]={kind:'text',content:adaptWebsiteAssetsCss(file.content)};
  }
  project.files['WEBSITE_ASSETS_SOURCE.txt']={kind:'text',content:WEBSITE_ASSET_NOTICE};
  return parseProjectJson(JSON.stringify(project));
}
