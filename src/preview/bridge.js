/* Trusted editing runtime. Project JavaScript NEVER executes in this document. */
(() => {
  const channel = __CHANNEL__;
  const send = (type, payload = {}) => parent.postMessage({ channel, type, ...payload }, '*');
  let selected = '', mode = 'structure', revision = 0, drag = null, activeEdit = null, locked = false;
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
  const find=id=>Array.from(document.querySelectorAll('[data-mws-id]')).find(el=>el.getAttribute('data-mws-id')===id);
  const editable=target=>target instanceof Element?target.closest('[data-mws-id]'):null;
  function show(){
    const el=find(selected);if(!el){overlay.style.display='none';return;}
    const r=el.getBoundingClientRect();Object.assign(overlay.style,{display:'block',left:r.left+'px',top:r.top+'px',width:r.width+'px',height:r.height+'px'});
  }
  function inspect(){
    show();const el=find(selected);if(!el)return;
    const r=el.getBoundingClientRect(), c=getComputedStyle(el);
    const keys=['display','position','width','height','color','background-color','font-size','padding','margin','gap','border-radius','transform','translate','flex-direction','grid-template-columns'];
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
        for(const a of Array.from(node.attributes))if(!(a.name in v.attrs)&&a.name!=='data-mws-editing')node.removeAttribute(a.name);
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
    if(activeEdit){activeEdit.removeAttribute('contenteditable');activeEdit.removeAttribute('data-mws-editing');activeEdit=null;}
    revision=data.revision;mode=data.mode;locked=!!data.locked;handle.style.pointerEvents=locked?'none':'auto';
    const pool=new Map(Array.from(document.querySelectorAll('[data-mws-id]')).map(n=>[n.getAttribute('data-mws-id'),n]));
    const body=data.body;for(const a of Array.from(document.body.attributes))if(!(a.name in body.attrs))document.body.removeAttribute(a.name);
    for(const [k,v]of Object.entries(body.attrs))if(document.body.getAttribute(k)!==v)document.body.setAttribute(k,v);
    reconcile(document.body,body.children,pool,new Set());if(styles.textContent!==data.css)styles.textContent=data.css;
    requestAnimationFrame(inspect);send('rendered',{revision});
  }
  addEventListener('message',e=>{
    if(e.source!==parent||!e.data||e.data.channel!==channel)return;
    const d=e.data;if(d.type==='render')update(d);
    if(d.type==='select'){selected=d.id;inspect();}
    if(d.type==='mode')mode=d.mode;
  });
  document.addEventListener('click',e=>{if(activeEdit)return;e.preventDefault();e.stopPropagation();select(editable(e.target));},true);
  document.addEventListener('submit',e=>e.preventDefault(),true);
  document.addEventListener('dblclick',e=>{
    if(locked)return;
    const el=editable(e.target);if(!el||el.children.length||['input','textarea','select','img','body'].includes(el.localName))return;
    e.preventDefault();activeEdit=el;const base=revision;const original=el.textContent;el.contentEditable='true';el.setAttribute('data-mws-editing','');el.focus();
    const range=document.createRange();range.selectNodeContents(el);const s=getSelection();s.removeAllRanges();s.addRange(range);
    const finish=()=>{if(activeEdit!==el)return;activeEdit=null;el.removeAttribute('contenteditable');el.removeAttribute('data-mws-editing');send('command',{revision:base,commands:[{type:'text',id:el.getAttribute('data-mws-id'),text:el.textContent}]});};
    el.addEventListener('blur',finish,{once:true});el.addEventListener('keydown',function key(e){if(e.key==='Escape'){el.textContent=original;el.blur();el.removeEventListener('keydown',key);}if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();el.blur();el.removeEventListener('keydown',key);}});
  });
  document.addEventListener('pointerdown',e=>{
    if(locked||activeEdit||e.button!==0)return;const resize=e.target===handle;const el=resize?find(selected):editable(e.target);if(!el||el.localName==='body')return;
    select(el);const r=el.getBoundingClientRect();const c=getComputedStyle(el);const translate=c.translate==='none'?[0,0]:c.translate.split(' ').map(parseFloat);
    drag={id:selected,el,startX:e.clientX,startY:e.clientY,width:r.width,height:r.height,resize,base:revision,dx:0,dy:0,translate,oldStyle:el.getAttribute('style'),moved:false,mode};
    e.preventDefault();
  });
  document.addEventListener('pointermove',e=>{
    if(!drag)return;drag.dx=e.clientX-drag.startX;drag.dy=e.clientY-drag.startY;if(Math.abs(drag.dx)+Math.abs(drag.dy)<5&&!drag.moved)return;drag.moved=true;
    if(drag.resize){drag.el.style.width=Math.max(24,drag.width+drag.dx)+'px';drag.el.style.height=Math.max(24,drag.height+drag.dy)+'px';drag.el.style.boxSizing='border-box';}
    else if(drag.mode==='free'){drag.el.style.translate=`${(drag.translate[0]||0)+drag.dx}px ${(drag.translate[1]||0)+drag.dy}px`;}
    else{const target=editable(e.target);overlay.style.borderColor=target&&target!==drag.el?'#a977e8':'#358ddb';}
    show();
  });
  document.addEventListener('pointerup',e=>{
    if(!drag)return;const d=drag;drag=null;if(d.oldStyle===null)d.el.removeAttribute('style');else d.el.setAttribute('style',d.oldStyle);show();if(!d.moved)return;
    let commands=[];
    if(d.resize)commands=[{type:'style',id:d.id,property:'width',value:Math.max(24,Math.round(d.width+d.dx))+'px'},{type:'style',id:d.id,property:'height',value:Math.max(24,Math.round(d.height+d.dy))+'px'},{type:'style',id:d.id,property:'box-sizing',value:'border-box'}];
    else if(d.mode==='free')commands=[{type:'style',id:d.id,property:'translate',value:`${Math.round((d.translate[0]||0)+d.dx)}px ${Math.round((d.translate[1]||0)+d.dy)}px`}];
    else{
      const target=editable(e.target);if(target&&target!==d.el&&!d.el.contains(target)){
        const container=['div','section','main','article','aside','header','footer','nav','body','ul','ol'].includes(target.localName);
        // Shift drops inside a container. Otherwise sort next to the target in document order.
        const parentEl=e.shiftKey&&container?target:target.parentElement?.closest('[data-mws-id]');
        if(parentEl){const r=target.getBoundingClientRect();const c=getComputedStyle(parentEl);const horizontal=c.display==='flex'&&c.flexDirection.startsWith('row');const before=horizontal?e.clientX<r.x+r.width/2:e.clientY<r.y+r.height/2;const next=target.nextElementSibling;
          commands=[{type:'move',id:d.id,parentId:parentEl.getAttribute('data-mws-id'),beforeId:parentEl===target?undefined:before?target.getAttribute('data-mws-id'):next?.getAttribute('data-mws-id')||undefined}];}
      }
    }
    if(commands.length)send('command',{revision:d.base,commands});
  });
  addEventListener('pointercancel',()=>{if(drag){if(drag.oldStyle===null)drag.el.removeAttribute('style');else drag.el.setAttribute('style',drag.oldStyle);drag=null;show();}});
  document.addEventListener('keydown',e=>{if(locked||activeEdit)return;if(e.key==='Delete'||e.key==='Backspace'){e.preventDefault();if(selected)send('command',{revision,commands:[{type:'delete',id:selected}]});}if((e.ctrlKey||e.metaKey)&&['z','y'].includes(e.key.toLowerCase())){e.preventDefault();send(e.key==='y'||e.shiftKey?'redo':'undo');}});
  addEventListener('scroll',show,true);addEventListener('resize',inspect);new ResizeObserver(show).observe(document.body);
  send('ready');
})();
