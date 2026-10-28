/* Sailor Logbook — MIT. Desktop storage status and mouse dragging outside Calendar. */
(function(){
  let storageState='checking',storageStarted=false,storageRequest=null;
  const storageLabels={checking:'Checking…',protected:'Protected',standard:'Standard browser storage',unavailable:'Not available'};
  function updateStorage(){
    if(typeof document==='undefined'||!document)return;
    const row=Q('[data-a="desktopStorage"] em');if(row)row.textContent=storageLabels[storageState];
  }
  function ensureStorage(request=false){
    if(!desktopMedia.matches)return Promise.resolve(storageState);
    if(storageRequest)return storageRequest;
    storageStarted=true;
    storageRequest=(async()=>{
      const api=navigator.storage;
      if(!api?.persisted||!api.persist){storageState='unavailable';return storageState;}
      let protectedStorage=await api.persisted();
      if(!protectedStorage&&(request||LS.getItem('slb-storage-requested')!=='1')){
        LS.setItem('slb-storage-requested','1');protectedStorage=await api.persist();
      }
      storageState=protectedStorage?'protected':'standard';return storageState;
    })().catch(()=>{storageState='standard';return storageState;}).finally(()=>{storageRequest=null;updateStorage();});
    return storageRequest;
  }
  function storageDialog(){
    desktopDialog(`<div class="sync-close"><h2>Keep your logbook on this device</h2><button class="ib" data-dialog-close aria-label="Close storage settings">${I(IC.x,18)}</button></div><p class="storage-result">${storageLabels[storageState]}</p><p class="sync-copy">${storageState==='protected'?'This browser has granted persistent storage, protecting the logbook from automatic storage-pressure cleanup.':'Your logbook is saved in this browser. Persistent storage depends on the browser’s permission and settings.'} Clearing site data still removes the local copy.</p><p class="sync-copy">Bookmark this website to use your logbook on the go.</p><div class="sync-actions">${storageState==='protected'?'':`<button class="btn" data-a="desktopPersist">Request persistent storage</button>`}<button class="btn g" data-a="bk">Download backup</button></div>`,'Persistent storage');
  }
  ACT.desktopStorage=async()=>{await ensureStorage();if(typeof document!=='undefined'&&document)storageDialog();};
  ACT.desktopPersist=async()=>{await ensureStorage(true);if(typeof document!=='undefined'&&document)storageDialog();};
  window.LogbookStorage={ensure:ensureStorage,status:()=>storageState,afterRender(){
    if(!desktop()||!S.ob||S.out)return;
    if(scr==='set'){
      const group=[...document.querySelectorAll('.desktop-settings-group')].find(x=>x.querySelector('h2')?.textContent==='Your data');
      if(group&&!group.querySelector('[data-a="desktopStorage"]'))group.insertAdjacentHTML('beforeend',R2('Persistent storage',storageLabels[storageState],'desktopStorage'));
    }
    updateStorage();if(!storageStarted)ensureStorage();
  }};

  let gesture=null,ignoreUntil=0;
  function preview(d){
    if(d.active)return;
    d.active=true;d.source.classList.add('desktop-drag-source');
    const rect=d.source.getBoundingClientRect(),ghost=d.source.cloneNode(true);
    ghost.removeAttribute('id');ghost.querySelectorAll('[id]').forEach(x=>x.removeAttribute('id'));
    ghost.className='desktop-drag-preview';ghost.setAttribute('aria-hidden','true');ghost.inert=true;
    Object.assign(ghost.style,{left:rect.left+'px',top:rect.top+'px',width:rect.width+'px',maxHeight:Math.min(rect.height,260)+'px'});
    document.body.append(ghost);d.ghost=ghost;document.body.classList.add('desktop-dragging');
    d.frame=requestAnimationFrame(scrollFrame);
  }
  function target(d){
    const hit=document.elementFromPoint(d.x,d.y);
    d.target?.classList.remove('desktop-drop-target');d.target=null;
    Q('#desktop-drop-line')?.remove();
    if(d.kind==='planner'){
      const column=hit?.closest('.pc[data-day]');
      if(column&&column.closest('.cols')===d.container){d.target=column;column.classList.add('desktop-drop-target');}
    }else{
      const card=hit?.closest('.bg2>[data-k]');
      if(card&&card!==d.source&&card.parentElement===d.container){
        const r=card.getBoundingClientRect(),wide=r.width>=d.container.getBoundingClientRect().width*.8;
        d.after=wide?d.y>r.top+r.height/2:d.x>r.left+r.width/2;d.target=card;
        const line=document.createElement('i');line.id='desktop-drop-line';
        Object.assign(line.style,wide?{left:r.left+'px',top:(d.after?r.bottom:r.top)+'px',width:r.width+'px',height:'3px'}:{left:(d.after?r.right:r.left)+'px',top:r.top+'px',width:'3px',height:r.height+'px'});document.body.append(line);
      }
    }
  }
  function scrollFrame(){
    const d=gesture;if(!d?.active)return;
    if(!desktop()||scr!==d.screen||!d.source.isConnected){end(true);return;}
    const area=d.kind==='planner'?d.container:d.source.closest('.scr'),r=area.getBoundingClientRect();
    if(d.kind==='planner'){
      if(d.x<r.left+38)area.scrollLeft-=9;else if(d.x>r.right-38)area.scrollLeft+=9;
    }else{
      if(d.y<r.top+45)area.scrollTop-=9;else if(d.y>r.bottom-45)area.scrollTop+=9;
    }
    target(d);d.frame=requestAnimationFrame(scrollFrame);
  }
  function end(cancel=false){
    const d=gesture;if(!d)return;gesture=null;clearTimeout(d.timer);cancelAnimationFrame(d.frame);
    d.ghost?.remove();d.source.classList.remove('desktop-drag-source');d.target?.classList.remove('desktop-drop-target');Q('#desktop-drop-line')?.remove();document.body.classList.remove('desktop-dragging');
    try{d.source.releasePointerCapture?.(d.pointer);}catch{}
    if(!d.active)return;
    ignoreUntil=Date.now()+450;
    if(cancel||!d.target||scr!==d.screen||!d.source.isConnected)return;
    if(d.kind==='planner'){
      const record=S.tasks.find(t=>t.id===d.id),date=d.target.dataset.day;
      if(!record||!/^\d{4}-\d{2}-\d{2}$/.test(date)||record.date===date)return;
      record.date=date;if(record.time!=null&&!OFF.includes(record.st)){record.man=0;record.st=autoSt(record);}
      sv();R();toast('Task moved to '+P(date).toLocaleDateString('en',{month:'short',day:'numeric'}));
    }else{
      d.container.insertBefore(d.source,d.after?d.target.nextSibling:d.target);
      S[d.screen==='reflect'?'rorder':'order']=[...d.container.querySelectorAll(':scope>[data-k]')].map(x=>x.dataset.k);sv();R();
    }
  }
  document.addEventListener('pointerdown',e=>{
    if(!desktop()||e.button!==0||e.pointerType==='touch')return;
    const dashboard=ED&&['home','reflect'].includes(scr)?e.target.closest('.bg2>[data-k]'):null;
    const task=scr==='plan'?e.target.closest('.cols .tk[data-a^="tedit:"]'):null;
    const source=dashboard||task;if(!source)return;
    // Stop all older desktop dashboard handlers, including when using card controls.
    e.stopImmediatePropagation();if(e.target.closest('button,input,textarea,select,a,[contenteditable=true]'))return;
    end(true);e.preventDefault();
    gesture={source,kind:dashboard?'dashboard':'planner',container:source.closest(dashboard?'.bg2':'.cols'),screen:scr,id:task?.dataset.a.slice(6),pointer:e.pointerId,startX:e.clientX,startY:e.clientY,x:e.clientX,y:e.clientY,active:false};
    try{source.setPointerCapture?.(e.pointerId);}catch{}
    if(dashboard)gesture.timer=setTimeout(()=>{if(gesture)preview(gesture);},300);
  },true);
  document.addEventListener('pointermove',e=>{
    const d=gesture;if(!d||e.pointerId!==d.pointer)return;
    e.stopImmediatePropagation();d.x=e.clientX;d.y=e.clientY;
    if(!d.active&&Math.hypot(d.x-d.startX,d.y-d.startY)>=6)preview(d);
    if(d.active){e.preventDefault();d.ghost.style.transform=`translate(${d.x-d.startX}px,${d.y-d.startY}px)`;target(d);}
  },true);
  document.addEventListener('pointerup',e=>{if(gesture&&e.pointerId===gesture.pointer){e.stopImmediatePropagation();end();}},true);
  document.addEventListener('pointercancel',e=>{if(gesture){e.stopImmediatePropagation();end(true);}},true);
  document.addEventListener('click',e=>{if(desktop()&&Date.now()<ignoreUntil&&e.target.closest('.cols,.bg2')){e.preventDefault();e.stopImmediatePropagation();}},true);
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&gesture){e.preventDefault();e.stopImmediatePropagation();end(true);}},true);
  window.addEventListener('blur',()=>end(true));desktopMedia.addEventListener?.('change',()=>end(true));
  window.LogbookDesktopDrag={get active(){return !!gesture;},cancel:()=>end(true)};
  LogbookStorage.afterRender();
})();
