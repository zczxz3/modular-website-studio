import type {ProjectFile,StudioModule} from './types';

/** Transport-neutral contract for a future component repository adapter.
 * It returns source files, never a second editable canvas model or executable
 * plugin hooks. Receiving code must validate modules and file paths before use.
 */
export type ModuleResourceKind='block'|'component';
export interface ModuleResource {
  kind:ModuleResourceKind;
  module:StudioModule;
}
export interface ModuleCatalogSnapshot {
  schemaVersion:1;
  providerId:string;
  /** An explicit immutable version; do not resolve a moving branch on reopen. */
  revision:string;
  resources:readonly ModuleResource[];
  files:Readonly<Record<string,ProjectFile>>;
  notice:string;
}
export interface ModuleCatalogProvider {
  readonly id:string;
  loadSnapshot(revision:string,signal?:AbortSignal):Promise<ModuleCatalogSnapshot>;
}

/** Bundled static source. Network refresh and automatic upgrades remain deferred. */
export const BUNDLED_RESOURCE_SOURCES=[{
  id:'website-assets',
  repository:'https://github.com/zczxz3/website-assets',
  status:'bundled',
  kinds:['component']
}] as const;

/** Runtime lifecycle providers and network synchronization are not registered. */
export const DEFERRED_RESOURCE_SOURCES=[] as const;
