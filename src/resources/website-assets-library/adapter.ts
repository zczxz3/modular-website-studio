import type {StudioModule} from '../../core/types';

/** Preserve stable IDs and the reviewed @1.0.1 compatibility adaptation. */
export function adaptWebsiteAssetModule(module:StudioModule):StudioModule{
  return {...module,version:module.version==='1.0.0'?'1.0.1':module.version,
    html:adaptWebsiteAssetsHtml(module.html),css:adaptWebsiteAssetsCss(module.css)};
}
export function adaptWebsiteAssetsHtml(html:string){return html.replace(/(<[a-z][^>]*\bclass="[^\"]*\bmf-price\b[^\"]*"[^>]*>)mf-pricing0 /g,'$1¥0 ').replace(/class="([^"]*)"/g,(_all,classes:string)=>`class="${classes.split(/\s+/).map(name=>/^(mf-|qr-)/.test(name)?'wa-'+name:name).join(' ')}"`);}
export function adaptWebsiteAssetsCss(css:string){return css.replace(/\.(mf-|qr-)/g,'.wa-$1').replace(/\bmf-(spin|shimmer|orbit)\b/g,'wa-mf-$1');}
