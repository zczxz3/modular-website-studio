export const DEFAULT_GRADIENT='linear-gradient(90deg, #d7e9e3 0%, #286c70 100%)';
/** Grapick renders stop colors as HTML. Only our numeric/hex subset may enter it. */
export function isEditableGradient(value:string){
 if(value.length>1500)return false;
 const match=value.match(/^linear-gradient\((\d+(?:\.\d+)?)deg, (.+)\)$/i);
 if(!match||Number(match[1])>360)return false;
 const stops=match[2].split(', ');
 return stops.length>=2&&stops.length<=16&&stops.every(stop=>{const m=stop.match(/^#[0-9a-f]{6} (\d+(?:\.\d+)?)%$/i);return !!m&&Number(m[1])<=100;});
}
/** Normalize colors sampled by the trusted picker canvas, never arbitrary HTML. */
export function normalizePickedGradient(value:string){
 return value.replace(/rgba\((\d+), (\d+), (\d+), (?:255|1)\)/g,(all,r,g,b)=>{
  const rgb=[r,g,b].map(Number);return rgb.every(v=>v<=255)?'#'+rgb.map(v=>v.toString(16).padStart(2,'0')).join(''):all;
 }).replace(/#([a-f0-9])([a-f0-9])([a-f0-9])(?= )/gi,(_all,r,g,b)=>'#'+r+r+g+g+b+b);
}
