import {immutableCatalogProvider,readWebsiteAssetsCatalog} from '../../core/module-catalog';
import type {ModuleCatalogSnapshot} from '../../core/resource-contract';
import {adaptWebsiteAssetModule} from './adapter';

/** Explicitly imported offline ZIP -> the existing versioned provider API. */
export async function websiteAssetsZipProvider(bytes:Uint8Array,signal?:AbortSignal){
  const raw=await readWebsiteAssetsCatalog(bytes,signal);
  const snapshot:ModuleCatalogSnapshot={...raw,resources:raw.resources.map(resource=>({...resource,module:adaptWebsiteAssetModule(resource.module)})),
    notice:raw.notice+'\nStudio compatibility adaptation: mf-/qr- classes and three named keyframes use wa- prefixes; the legacy pricing sample is corrected. Original module IDs are retained.\n'};
  return {provider:immutableCatalogProvider(snapshot),revision:snapshot.revision};
}
