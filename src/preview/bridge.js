/* Trusted editing runtime. Project JavaScript NEVER executes in this document. */
(() => {
  const channel = __CHANNEL__;
  const send = (type, payload = {}) => parent.postMessage({ channel, type, ...payload }, '*');
  let selected = '', mode = 'structure', revision = 0, drag = null, activeEdit = null, cancelEdit = null, locked = false, suppressClickUntil = 0;
  const styles = document.getElementById('mws-project-style');
  const uiStyle = document.createElement('style');
  uiStyle.textContent = '[data-mws-id]:hover{cursor:default} [data-mws-editing]{outline:2px solid #328fcb!important;cursor:text!important}';
  document.head.append(uiStyle);
  const overlay = document.createElement('div');
  overlay.id='mws-selection';
  overlay.style.cssText = 'position:fixed;pointer-events:none;z-index:2147483647;border:2px solid #358ddb;box-sizing:border-box;display:none;';
  const handle=document.createElement('button');handle.setAttribute('aria-label','调整选中元素大小');
  handle.style.cssText='position:absolute;right:-5px;bottom:-5px;width:10px;height:10px;margin:0;padding:0;border:2px solid white;background:#358ddb;pointer-events:auto;cursor:nwse-resize;';overlay.append(handle);
  document.documentElement.append(overlay);
  const moveHandle=document.createElement('button');moveHandle.textContent='↕ 拖动排序';moveHandle.setAttribute('aria-label','拖动区块排序');moveHandle.style.cssText='position:absolute;left:-2px;top:-27px;pointer-events:auto;background:#286c70;color:white;border:0;border-radius:4px;padding:4px 8px;font:11px system-ui;cursor:grab;white-space:nowrap;';overlay.append(moveHandle);
  const dropLine=document.createElement('div');dropLine.setAttribute('data-mws-drop-indicator','');dropLine.style.cssText='position:fixed;z-index:2147483647;height:3px;background:#35a9d7;pointer-events:none;display:none;';document.documentElement.append(dropLine);
  let pageKey='';
  const find=id=>Array.from(document.querySelectorAll('[data-mws-id]')).find(el=>el.getAttribute('data-mws-id')===id);
  const editable=target=>target instanceof Element?target.closest('[data-mws-id]'):null;
  const textEditable=el=>!!el&&!el.children.length&&!['input','textarea','select','img','body'].includes(el.localName);
  function show(){
    if(mode==='design'){overlay.style.display='none';return;}
    const el=find(selected);if(!el){overlay.style.display='none';return;}
    const r=el.getBoundingClientRect();Object.assign(overlay.style,{display:'block',left:r.left+'px',top:r.top+'px',width:r.width+'px',height:r.height+'px'});
    moveHandle.style.display=el.localName==='body'||locked?'none':'block';
  }
  function inspect(){
    show();const el=find(selected);if(!el)return;
    const r=el.getBoundingClientRect(), c=getComputedStyle(el);
    const keys=['display','position','width','height','color','background-color','font-size','font-family','max-width','padding','margin','gap','border-radius','transform','translate','flex-direction','grid-template-columns','object-fit','text-align'];
    send('inspect',{id:selected,rect:{width:r.width,height:r.height,x:r.x,y:r.y},computed:Object.fromEntries(keys.map(k=>[k,c.getPropertyValue(k)])),text:el.children.length?'':el.textContent});
  }
  function select(el){if(!el)return;selected=el.getAttribute('data-mws-id');send('select',{id:selected});inspect();}
  // Keyed reconciliation: reuse existing elements and text nodes, including cross-parent moves.
  function reconcile(parentNode, wanted, pool, live){
    const desired=[];
    wanted.forEach((v,index)=>{
      let node;
      if(v.kind==='element'){
        node=pool.get(v.id);
        if(!node||node.localName!==v.tag){node=(v.tag==='svg'||parentNode.namespaceURI==='http://www.w3.org/2000/svg')?document.createElementNS('http://www.w3.org/2000/svg',v.tag):document.createElement(v.tag);}
        for(const a of Array.from(node.attributes))if(!(a.name in v.attrs)&&!['data-mws-editing','data-mws-motion-state'].includes(a.name))node.removeAttribute(a.name);
        for(const [key,value]of Object.entries(v.attrs))if(node.getAttribute(key)!==value)node.setAttribute(key,value);
        live.add(node);reconcile(node,v.children,pool,live);
      }else{
        const type=v.kind==='text'?3:8;const old=parentNode.childNodes[index];node=old?.nodeType===type?old:(type===3?document.createTextNode(v.text):document.createComment(v.text));if(node.nodeValue!==v.text)node.nodeValue=v.text;
      }
      desired.push(node);
    });
    desired.forEach((node,index)=>{if(parentNode.childNodes[index]!==node)parentNode.insertBefore(node,parentNode.childNodes[index]||null);});
    for(const node of Array.from(parentNode.childNodes))if(!desired.includes(node))node.remove();
  }
  function update(data){
    cancelDrag();cancelEdit?.();
    revision=data.revision;mode=data.mode;locked=!!data.locked;handle.style.pointerEvents=locked?'none':'auto';
    // Preserve source language/direction without copying active HTML-root attrs.
    for(const name of ['lang','dir']){const value=data.htmlAttrs?.[name];if(typeof value==='string')document.documentElement.setAttribute(name,value);else document.documentElement.removeAttribute(name);}
    const pool=new Map(Array.from(document.querySelectorAll('[data-mws-id]')).map(n=>[n.getAttribute('data-mws-id'),n]));
    const body=data.body;for(const a of Array.from(document.body.attributes))if(!(a.name in body.attrs))document.body.removeAttribute(a.name);
    for(const [k,v]of Object.entries(body.attrs))if(document.body.getAttribute(k)!==v)document.body.setAttribute(k,v);
    reconcile(document.body,body.children,pool,new Set());if(styles.textContent!==data.css)styles.textContent=data.css;
    if(data.pageKey&&data.pageKey!==pageKey){pageKey=data.pageKey;scrollTo({top:0,left:0,behavior:'instant'});}
    requestAnimationFrame(inspect);send('rendered',{revision});
  }
  addEventListener('message',e=>{
    if(e.source!==parent||!e.data||e.data.channel!==channel)return;
    const d=e.data;if(d.type==='render')update(d);
    if(d.type==='select'){selected=d.id;inspect();}
    if(d.type==='focus-selection'&&typeof d.id==='string'){const el=find(d.id);if(el){el.scrollIntoView({block:'center',behavior:'auto'});show();}}
    if(d.type==='mode'){cancelDrag();mode=d.mode;show();}
    if(d.type==='cancel-drag')cancelDrag();
    if(d.type==='external-drag-cancel')clearDrop();
    if(d.type==='external-drag-over'){
      if(locked||!validExternalPoint(d)){clearDrop();return;}
      resourceHover(d);
    }
    if(d.type==='external-resource-drop'){
      clearDrop();
      if(locked||!validExternalPoint(d)||typeof d.id!=='string'||!/^[@a-z0-9][a-z0-9@/_.-]{1,80}$/.test(d.id))return;
      resourceDrop(d.id,d);
    }
    if(d.type==='replay')window.__studioMotion?.play(find(d.id));
    if(d.type==='follow'){const el=find(d.id),href=el?.getAttribute('href');if(href?.startsWith('#')){try{document.getElementById(decodeURIComponent(href.slice(1)))?.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});}catch{}}}
  });
  document.addEventListener('click',e=>{if(mode==='design'){e.preventDefault();return;}if(activeEdit)return;e.preventDefault();e.stopPropagation();if(performance.now()<suppressClickUntil)return;select(editable(e.target));},true);
  document.addEventListener('submit',e=>e.preventDefault(),true);
  document.addEventListener('dblclick',e=>{
    if(locked||mode==='design')return;
    const el=editable(e.target);if(!textEditable(el))return;
    if(activeEdit===el)return;
    cancelEdit?.();e.preventDefault();activeEdit=el;const base=revision;const original=el.textContent;el.contentEditable='plaintext-only';el.setAttribute('data-mws-editing','');el.focus();
    const range=document.createRange();range.selectNodeContents(el);const s=getSelection();s.removeAllRanges();s.addRange(range);
    const finish=(commit=true)=>{
      if(activeEdit!==el)return;
      activeEdit=null;cancelEdit=null;el.removeEventListener('blur',blur);el.removeEventListener('keydown',key);el.removeAttribute('contenteditable');el.removeAttribute('data-mws-editing');
      if(!commit)el.textContent=original;
      else if(el.textContent!==original)send('command',{revision:base,commands:[{type:'text',id:el.getAttribute('data-mws-id'),text:el.textContent}]});
    };
    const blur=()=>finish();
    const key=e=>{
      if(e.isComposing)return;
      if(e.key==='Escape'){e.preventDefault();e.stopPropagation();finish(false);el.blur();}
      if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();finish();el.blur();}
    };
    cancelEdit=()=>finish(false);el.addEventListener('blur',blur);el.addEventListener('keydown',key);
  });
  const containerTags=new Set(['div','section','main','article','aside','header','footer','nav','body','ul','ol','li','figure','figcaption','blockquote','form','fieldset','details']);
  const isContainer=el=>!!el&&containerTags.has(el.localName)&&el.hasAttribute('data-mws-id');
  const inViewport=e=>e.clientX>=0&&e.clientY>=0&&e.clientX<innerWidth&&e.clientY<innerHeight;
  function hitAt(e,skip){
    if(!inViewport(e))return null;
    // Pointer capture keeps release reliable outside the grabbed element. Hit-test
    // the actual pointer position rather than the capture event's retargeted node.
    const previous=skip?.style.pointerEvents,priority=skip?.style.getPropertyPriority('pointer-events');
    if(skip)skip.style.setProperty('pointer-events','none','important');
    let hit;try{hit=document.elementFromPoint?.(e.clientX,e.clientY);}finally{if(skip){if(previous)skip.style.setProperty('pointer-events',previous,priority);else skip.style.removeProperty('pointer-events');}}
    const target=editable(hit||e.target);return target&&target!==skip&&!skip?.contains(target)?target:null;
  }
  function clearDrop(){dropLine.style.display='none';overlay.style.borderColor='#358ddb';}
  function paintPoint(point,preview){
    if(!point){clearDrop();return;}
    const rect=(preview||point.target).getBoundingClientRect();
    const inside=point.inside&&!preview,horizontal=point.horizontal,edgeAfter=point.visualAfter??point.after;
    Object.assign(dropLine.style,{display:'block',background:inside?'#35a9d714':'#35a9d7',border:inside?'2px dashed #35a9d7':'0',boxSizing:'border-box',
      left:(inside||!horizontal||preview?rect.left:edgeAfter?rect.right:rect.left)+'px',
      top:(inside||horizontal||preview?rect.top:edgeAfter?rect.bottom:rect.top)+'px',
      width:(inside||!horizontal?rect.width:3)+'px',height:(inside||horizontal?rect.height:3)+'px'});
    dropLine.setAttribute('data-mws-drop-placement',inside?'inside':point.after?'after':'before');
  }
  function nearestContainer(hit){let target=hit;while(target&&!isContainer(target))target=target.parentElement;return target;}
  function besidePoint(target,e,moving){
    // Keep plain pointer sorting in a legal layout container rather than nesting
    // whole cards inside a button, heading or paragraph under the pointer.
    while(target?.parentElement&&!isContainer(target.parentElement))target=target.parentElement;
    const parentEl=target?.parentElement?.closest('[data-mws-id]');if(!parentEl||moving===parentEl||moving?.contains(parentEl))return null;
    const rect=target.getBoundingClientRect(),css=getComputedStyle(parentEl);
    // The moving node stays in flow and is the other column of a two-card grid.
    const gridRow=css.display==='grid'&&Array.from(parentEl.children).some(el=>el!==target&&Math.abs(el.getBoundingClientRect().top-rect.top)<1&&Math.abs(el.getBoundingClientRect().left-rect.left)>1);
    const horizontal=(css.display==='flex'&&css.flexDirection.startsWith('row'))||gridRow;
    const reverse=horizontal?((css.flexDirection==='row-reverse')!==(css.direction==='rtl')):css.flexDirection==='column-reverse';
    const beyond=horizontal?e.clientX>=rect.left+rect.width/2:e.clientY>=rect.top+rect.height/2,after=reverse?!beyond:beyond;
    let before=after?target.nextElementSibling:target;if(before===moving)before=before.nextElementSibling;
    return {parentEl,before,target,after,visualAfter:beyond,horizontal,inside:false};
  }
  function dragPoint(e,d){
    let target=hitAt(e,d.el);if(!target)return null;
    if(e.shiftKey){const parentEl=nearestContainer(target);if(!parentEl||parentEl===d.el||d.el.contains(parentEl))return null;return {parentEl,before:null,target:parentEl,inside:true,after:true,horizontal:false};}
    if(isContainer(d.el)){
      // A handle begins just outside its card. Crossing that padding or a grid
      // gap must not pull the card into an ancestor; Shift changes containers.
      let sibling=target;while(sibling&&sibling.parentElement!==d.originalParent)sibling=sibling.parentElement;
      if(!sibling||sibling===d.el)return d.point;
      target=sibling;
    }else if(d.block)target=target.closest('[data-ws-block]')||target;
    if(target===d.el||d.el.contains(target))return null;
    // Do not accidentally pull a component out when hovering its current parent
    // after live reflow. Shift is the explicit operation for changing nesting.
    if(target===d.el.parentElement)return d.point;
    return besidePoint(target,e,d.el);
  }
  function restoreDrag(d,release=true){
    const before=d.originalNext?.parentNode===d.originalParent?d.originalNext:null;
    if(d.originalParent?.isConnected&&d.el.isConnected&&(d.el.parentNode!==d.originalParent||d.el.nextSibling!==before))d.originalParent.insertBefore(d.el,before);
    if(d.el.getAttribute('style')!==d.oldStyle){if(d.oldStyle===null)d.el.removeAttribute('style');else d.el.setAttribute('style',d.oldStyle);}
    if(release&&Number.isInteger(d.pointerId)&&document.documentElement.hasPointerCapture?.(d.pointerId))document.documentElement.releasePointerCapture(d.pointerId);
  }
  function cancelDrag(){const d=drag;drag=null;if(d){restoreDrag(d);suppressClickUntil=performance.now()+250;}clearDrop();show();}
  function updateDrag(e){
    if(!drag)return;const d=drag;d.dx=e.clientX-d.startX;d.dy=e.clientY-d.startY;
    if(Math.abs(d.dx)+Math.abs(d.dy)<5&&!d.moved)return;
    if(!inViewport(e)){cancelDrag();return;}
    if(!d.moved){
      d.moved=true;
      e.preventDefault();getSelection()?.removeAllRanges();
      // Capture only after a real drag begins. Capturing on pointerdown would
      // retarget ordinary click/dblclick events away from editable text.
      if(Number.isInteger(d.pointerId))try{document.documentElement.setPointerCapture?.(d.pointerId);}catch{/* Synthetic events have no active pointer. */}
    }
    if(d.resize){d.el.style.width=Math.max(24,d.width+d.dx)+'px';d.el.style.height=Math.max(24,d.height+d.dy)+'px';d.el.style.boxSizing='border-box';}
    else if(d.mode==='free')d.el.style.translate=`${(d.translate[0]||0)+d.dx}px ${(d.translate[1]||0)+d.dy}px`;
    else{
      const point=dragPoint(e,d);d.point=point;
      if(point){point.parentEl.insertBefore(d.el,point.before);paintPoint(point,d.el);}
      else{restoreDrag(d,false);clearDrop();}
    }
    // The iframe owns its scroll position and pointer coordinates, including at
    // outer canvas zoom. No parent zoom conversion is needed here.
    if(e.clientY<28)scrollBy({top:-14,behavior:'instant'});else if(e.clientY>innerHeight-28)scrollBy({top:14,behavior:'instant'});
    show();
  }
  document.addEventListener('pointerdown',e=>{
    if(mode==='design'||locked||activeEdit||e.button!==0)return;cancelDrag();
    const resize=e.target===handle,el=resize||e.target===moveHandle?find(selected):editable(e.target);if(!el||el.localName==='body')return;
    select(el);const r=el.getBoundingClientRect(),c=getComputedStyle(el),translate=c.translate==='none'?[0,0]:c.translate.split(' ').map(parseFloat);
    drag={id:selected,el,startX:e.clientX,startY:e.clientY,width:r.width,height:r.height,resize,block:el.hasAttribute('data-ws-block'),base:revision,dx:0,dy:0,translate,oldStyle:el.getAttribute('style'),moved:false,mode,pointerId:e.pointerId,originalParent:el.parentNode,originalNext:el.nextSibling,point:null};
    // Cancelling a text pointerdown suppresses Chromium's compatibility mouse
    // events, including dblclick. Keep ordinary text clicks native until a real
    // drag starts; handles and non-text elements can suppress their defaults.
    if(resize||e.target===moveHandle||!textEditable(el))e.preventDefault();
  });
  document.addEventListener('dragstart',e=>{if(drag)e.preventDefault();});
  document.addEventListener('pointermove',updateDrag);
  document.addEventListener('pointerup',e=>{
    if(!drag)return;
    if(!inViewport(e)){cancelDrag();return;}
    const d=drag;drag=null;const point=d.point;restoreDrag(d);clearDrop();show();if(!d.moved)return;
    suppressClickUntil=performance.now()+250;let commands=[];
    if(d.resize)commands=[{type:'style',id:d.id,property:'width',value:Math.max(24,Math.round(d.width+d.dx))+'px'},{type:'style',id:d.id,property:'height',value:Math.max(24,Math.round(d.height+d.dy))+'px'},{type:'style',id:d.id,property:'box-sizing',value:'border-box'}];
    else if(d.mode==='free')commands=[{type:'style',id:d.id,property:'translate',value:`${Math.round((d.translate[0]||0)+d.dx)}px ${Math.round((d.translate[1]||0)+d.dy)}px`}];
    else if(point){
      const beforeId=point.before?.getAttribute('data-mws-id')||undefined;
      const currentNext=d.el.nextElementSibling?.getAttribute('data-mws-id')||undefined;
      if(point.parentEl!==d.originalParent||beforeId!==currentNext)commands=[{type:'move',id:d.id,parentId:point.parentEl.getAttribute('data-mws-id'),beforeId}];
    }
    if(commands.length)send('command',{revision:d.base,commands});
  });
  addEventListener('pointercancel',cancelDrag);addEventListener('blur',cancelDrag);
  document.addEventListener('pointerleave',()=>{if(drag&&!document.documentElement.hasPointerCapture?.(drag.pointerId))cancelDrag();});
  document.addEventListener('keydown',e=>{if(drag&&e.key==='Escape'){e.preventDefault();e.stopImmediatePropagation();cancelDrag();}},true);
  function dropPoint(event){
    const hit=hitAt(event),main=document.querySelector('main')||document.body;
    if(!hit)return null;
    if(event.shiftKey){const parentEl=nearestContainer(hit);return parentEl?{parentEl,before:null,target:parentEl,inside:true,after:true,horizontal:false}:null;}
    let target=hit.closest('[data-ws-block]');
    if(!target){let el=hit;while(el&&el.parentElement!==main)el=el.parentElement;target=el;}
    if(!target||target===main)return {parentEl:main,before:null,target:main,inside:true,after:true,horizontal:false};
    return besidePoint(target,event);
  }
  function validExternalPoint(e){return Number.isFinite(e.clientX)&&Number.isFinite(e.clientY)&&typeof e.shiftKey==='boolean';}
  function resourceHover(e){const point=dropPoint(e);paintPoint(point);if(point){if(e.clientY<28)scrollBy({top:-14,behavior:'instant'});else if(e.clientY>innerHeight-28)scrollBy({top:14,behavior:'instant'});}return point;}
  function resourceDrop(id,e){const point=dropPoint(e);if(point)send('resource-drop',{id,parentId:point.parentEl.getAttribute('data-mws-id'),beforeId:point.before?.getAttribute('data-mws-id')||undefined,revision});}
  document.addEventListener('dragover',e=>{if(locked||!Array.from(e.dataTransfer?.types||[]).includes('application/x-mws-resource'))return;if(!resourceHover(e))return;e.preventDefault();e.dataTransfer.dropEffect='copy';});
  document.addEventListener('dragleave',e=>{if(!e.relatedTarget)clearDrop();});addEventListener('dragend',clearDrop);
  document.addEventListener('drop',e=>{const id=e.dataTransfer?.getData('application/x-mws-resource');if(!id||locked)return;e.preventDefault();clearDrop();resourceDrop(id,e);});
  document.addEventListener('keydown',e=>{if(locked||activeEdit)return;if(e.key==='Delete'||e.key==='Backspace'){e.preventDefault();if(selected)send('command',{revision,commands:[{type:'delete',id:selected}]});}if((e.ctrlKey||e.metaKey)&&['z','y'].includes(e.key.toLowerCase())){e.preventDefault();send(e.key==='y'||e.shiftKey?'redo':'undo');}});
  addEventListener('scroll',show,true);addEventListener('resize',inspect);new ResizeObserver(show).observe(document.body);
  send('ready');
})();
