/* Trusted built-in interactions. Original Modular Website Studio code, MIT.
 * Declarative HTML is the saved configuration. No network, eval or dependencies. */
(() => {
  window.__studioInteractions?.destroy?.();
  const selector='[data-mws-component="tabs"],[data-mws-component="accordion"]';
  const records=new Map();let nextId=0,started=false;
  const own=(root,query)=>Array.from(root.querySelectorAll(query)).filter(el=>el.closest(selector)===root);
  function recordAttribute(record,el,name,value){
    let attrs=record.attributes.get(el);if(!attrs){attrs=new Map();record.attributes.set(el,attrs);}
    if(!attrs.has(name))attrs.set(name,el.getAttribute(name));
    if(value===null)el.removeAttribute(name);else if(el.getAttribute(name)!==String(value))el.setAttribute(name,String(value));
  }
  function uniqueId(record,el,suffix){
    if(el.id&&document.getElementById(el.id)===el)return el.id;
    let id;do{id=`mws-ui-${++nextId}-${suffix}`;}while(document.getElementById(id));
    recordAttribute(record,el,'id',id);return id;
  }
  function dispose(record){
    record.root.removeEventListener('click',record.click);record.root.removeEventListener('keydown',record.key);
    for(const [el,attrs]of record.attributes)for(const [name,value]of attrs){if(value===null)el.removeAttribute(name);else el.setAttribute(name,value);}
  }
  function activate(record,index,focus=false){
    if(!record.pairs[index])return;
    if(record.kind==='tabs')record.open=new Set([index]);
    else if(record.open.has(index))record.open.delete(index);
    else{if(!record.multiple)record.open.clear();record.open.add(index);}
    render(record);if(focus)record.pairs[index].button.focus();
  }
  function render(record){
    for(const [index,{button,panel}]of record.pairs.entries()){
      const active=record.open.has(index);
      recordAttribute(record,button,record.kind==='tabs'?'aria-selected':'aria-expanded',active?'true':'false');
      if(record.kind==='tabs')recordAttribute(record,button,'tabindex',active?'0':'-1');
      recordAttribute(record,panel,'hidden',active?null:'');
    }
  }
  function prepare(root,kind,pairs,signature){
    const initial=Number(root.getAttribute('data-mws-default')??0);
    const index=Number.isInteger(initial)&&initial>=0&&initial<pairs.length?initial:kind==='accordion'&&initial===-1?-1:0;
    const record={root,kind,pairs,signature,multiple:root.getAttribute('data-mws-multiple')==='true',open:new Set(index<0?[]:[index]),attributes:new Map(),click:null,key:null};
    if(kind==='tabs')for(const list of own(root,'[data-mws-tablist]'))recordAttribute(record,list,'role','tablist');
    for(const {button,panel}of pairs){
      const buttonId=uniqueId(record,button,'control'),panelId=uniqueId(record,panel,'panel');
      recordAttribute(record,button,'aria-controls',panelId);recordAttribute(record,panel,'aria-labelledby',buttonId);
      recordAttribute(record,panel,'role',kind==='tabs'?'tabpanel':'region');
      if(kind==='tabs'){recordAttribute(record,button,'role','tab');recordAttribute(record,panel,'tabindex','0');}
    }
    const buttonFor=event=>event.target instanceof Element?event.target.closest('button'):null;
    record.click=event=>{const button=buttonFor(event),index=pairs.findIndex(pair=>pair.button===button);if(index<0)return;event.preventDefault();activate(record,index);};
    record.key=event=>{
      const button=buttonFor(event),index=pairs.findIndex(pair=>pair.button===button);if(index<0||event.altKey||event.ctrlKey||event.metaKey)return;
      const nextKey=kind==='tabs'?'ArrowRight':'ArrowDown',previousKey=kind==='tabs'?'ArrowLeft':'ArrowUp';
      let next;if(event.key===nextKey)next=(index+1)%pairs.length;else if(event.key===previousKey)next=(index+pairs.length-1)%pairs.length;else if(event.key==='Home')next=0;else if(event.key==='End')next=pairs.length-1;else return;
      event.preventDefault();if(kind==='tabs')activate(record,next,true);else pairs[next].button.focus();
    };
    root.addEventListener('click',record.click);root.addEventListener('keydown',record.key);render(record);return record;
  }
  function sync(){
    const roots=new Set(document.querySelectorAll(selector));
    for(const [root,record]of records)if(!roots.has(root)){dispose(record);records.delete(root);}
    for(const root of roots){
      const kind=root.getAttribute('data-mws-component'),key=kind==='tabs'?'data-mws-tab':'data-mws-question',panelKey=kind==='tabs'?'data-mws-panel':'data-mws-answer';
      const panels=own(root,`[${panelKey}]`),used=new Set(),pairs=own(root,`button[${key}]`).flatMap(button=>{const panel=panels.find(panel=>!used.has(panel)&&panel.getAttribute(panelKey)===button.getAttribute(key));if(panel)used.add(panel);return panel?[{button,panel}]:[];});
      const signature=[kind,root.getAttribute('data-mws-default'),root.getAttribute('data-mws-multiple')].join('|'),old=records.get(root);
      if(old?.signature===signature&&old.pairs.length===pairs.length&&pairs.every((pair,i)=>old.pairs[i].button===pair.button&&old.pairs[i].panel===pair.panel))continue;
      if(old)dispose(old);records.delete(root);if(pairs.length)records.set(root,prepare(root,kind,pairs,signature));
    }
  }
  const mutations=new MutationObserver(sync);
  function start(){if(started||!document.body)return;started=true;sync();mutations.observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['data-mws-component','data-mws-default','data-mws-multiple','data-mws-tab','data-mws-panel','data-mws-question','data-mws-answer']});}
  function stop(){started=false;mutations.disconnect();for(const record of records.values())dispose(record);records.clear();}
  const onShow=()=>start();
  function destroy(){stop();document.removeEventListener('DOMContentLoaded',start);removeEventListener('pagehide',stop);removeEventListener('pageshow',onShow);}
  addEventListener('pagehide',stop);addEventListener('pageshow',onShow);
  window.__studioInteractions={sync,destroy};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
