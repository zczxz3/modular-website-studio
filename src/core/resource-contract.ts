import type {ProjectFile,StudioModule} from './types';

/** Transport-neutral contract for bundled and explicitly imported catalogs.
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

/** Bundled and explicitly imported offline sources; automatic updates are deferred. */
export const BUNDLED_RESOURCE_SOURCES=[{
  id:'website-assets',
  repository:'https://github.com/zczxz3/website-assets',
  status:'bundled',
  catalogPath:'studio/studio-catalog.json',
  archivePath:'studio/studio-components.zip',
  kinds:['component']
}] as const;

/** Runtime lifecycle providers and network synchronization are not registered. */
export const DEFERRED_RESOURCE_SOURCES=[] as const;
