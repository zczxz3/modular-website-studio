/* Controlled fade-up runtime; no project code, eval, network or editor access.
 * Lifecycle/reduced-motion contract adapted from website-assets (MIT).
 * A standalone copy is included in exported sites. */
(() => {
  // Reinitialization must not leave duplicate observers or animations behind.
  window.__studioMotion?.destroy?.();
  const records=new Map(), preference=matchMedia('(prefers-reduced-motion: reduce)');
  const attrs=['data-mws-reveal','data-mws-duration','data-mws-delay','data-mws-distance'];
  const number=(el,key,fallback,min,max)=>{const n=Number(el.getAttribute(key)??fallback);return Number.isFinite(n)?Math.min(max,Math.max(min,n)):fallback;};
  const cancel=record=>{record.animation?.cancel();record.animation=null;};
  function play(el){
    const record=records.get(el);if(!record)return;
    cancel(record);record.done=true;
    if(preference.matches||!el.animate){el.setAttribute('data-mws-motion-state','reduced');return;}
    const base=getComputedStyle(el), transform=base.transform==='none'?'':base.transform;
    const animation=el.animate([{opacity:0,transform:`${transform} translateY(${number(el,attrs[3],24,0,100)}px)`},{opacity:base.opacity,transform:transform||'none'}],{duration:number(el,attrs[1],650,100,3000),delay:number(el,attrs[2],0,0,3000),easing:'cubic-bezier(.16,1,.3,1)',fill:'backwards'});
    record.animation=animation;el.setAttribute('data-mws-motion-state','playing');
    animation.onfinish=()=>{if(record.animation===animation){record.animation=null;el.setAttribute('data-mws-motion-state','played');}};
  }
  const observer=typeof IntersectionObserver==='function'?new IntersectionObserver(entries=>{for(const entry of entries)if(entry.isIntersecting){const record=records.get(entry.target);if(record&&!record.done)play(entry.target);observer.unobserve(entry.target);}},{threshold:.1}):null;
  function sync(){
    const current=new Set(document.querySelectorAll('[data-mws-reveal="enter"],[data-mws-reveal="load"]'));
    for(const [el,record]of records)if(!current.has(el)){cancel(record);observer?.unobserve(el);el.removeAttribute('data-mws-motion-state');records.delete(el);}
    for(const el of current){
      const signature=attrs.map(k=>el.getAttribute(k)).join('|'),old=records.get(el);
      if(old?.signature===signature)continue;
      if(old)cancel(old);observer?.unobserve(el);records.set(el,{signature,done:false,animation:null});
      if(preference.matches||el.getAttribute(attrs[0])==='load'||!observer)play(el);else observer.observe(el);
    }
  }
  const mutations=new MutationObserver(sync);
  const onPreference=()=>{for(const [el,record]of records){cancel(record);record.done=true;el.setAttribute('data-mws-motion-state',preference.matches?'reduced':'played');}};
  function start(){sync();mutations.observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:attrs});}
  const destroy=()=>{mutations.disconnect();observer?.disconnect();for(const record of records.values())cancel(record);records.clear();preference.removeEventListener('change',onPreference);removeEventListener('pagehide',destroy);document.removeEventListener('DOMContentLoaded',start);};
  preference.addEventListener('change',onPreference);addEventListener('pagehide',destroy,{once:true});
  // Only the trusted editing bridge calls play; exported pages work without this API.
  window.__studioMotion={play,sync,destroy};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
