/* Sailor Logbook — MIT. Narrow mobile Calendar gesture and shared chrome refinements. */
(function(){
  const mobile=()=>!desktopMedia.matches;
  let gesture=null,blockedPointer=null,suppressedClick=null,frame=0;
  const suppressClick=event=>{suppressedClick={x:event.clientX,y:event.clientY,until:Date.now()+800};};
  function dismissMenus(event){
    if(!mobile()||scr!=='cal'||(!SH&&!TS))return false;
    if(event.target.closest('#qb,#sh .sc,#tsh .sc,#tsc,.hd'))return false;
    if(SH)closeSheet();if(TS)closeT();document.activeElement?.blur();FOC=0;
    return true;
  }
  document.addEventListener('pointerdown',event=>{
    if(dismissMenus(event)){blockedPointer=event.pointerId;suppressClick(event);event.preventDefault();event.stopImmediatePropagation();return;}
    const handle=event.target.closest('.cs .hd');if(!mobile()||scr!=='cal'||!handle||gesture||event.button>0)return;
    const block=handle.closest('.b'),target=block?S.entries.find(x=>x.id===block.dataset.e):GH;
    if(!target)return;
    event.stopImmediatePropagation();FOC=0;G2=null;SWP=null;PT.clear();
    gesture={handle,block,target,side:handle.dataset.side,id:event.pointerId,x:event.clientX,y:event.clientY,startX:event.clientX,startY:event.clientY,s:target.s,e:target.e,active:false};
    gesture.timer=setTimeout(()=>{if(!gesture)return;gesture.active=true;handle.classList.add('resize-held');try{handle.setPointerCapture(event.pointerId);}catch{}hp(5);tick();},340);
  },true);
  function bounds(){
    const cs=Q('.cs');if(!cs)return null;const rect=cs.getBoundingClientRect();let bottom=Math.min(rect.bottom,window.visualViewport?visualViewport.height+visualViewport.offsetTop:innerHeight);
    for(const selector of ['#qb','#sh .sc']){const menu=Q(selector);if(menu&&(selector==='#qb'?menu.style.display==='block':Q('#sh.on'))){const top=menu.getBoundingClientRect().top;if(top>rect.top+60)bottom=Math.min(bottom,top);}}
    return{cs,top:rect.top,bottom};
  }
  function paint(){
    const g=gesture;if(!g?.active)return;const col=(g.block||GH?.g)?.closest('.cl');if(!col)return;
    const minute=Math.max(0,Math.min(1440,Math.round((g.y-col.getBoundingClientRect().top)/hhv()*4)*15));
    const start=g.side==='t'?Math.min(minute,g.e-15):g.s,end=g.side==='b'?Math.max(minute,g.s+15):g.e;
    if(g.block){g.block.style.top='calc(var(--hh)*'+start/60+')';g.block.style.height='calc(var(--hh)*'+(end-start)/60+')';}
    else{g.target.s=start;g.target.e=end;gp();}
    g.nextS=start;g.nextE=end;
    if(SH){SH.s=start;SH.e=end;const from=Q('#ts'),to=Q('#te');if(from)from.value=fm(start);if(to)to.value=fm(Math.min(1439,end));}
    callout({clientX:g.x,clientY:g.y},g.target.date||col.dataset.k,start,end);
  }
  function autoScroll(){
    frame=0;if(!gesture?.active)return;const b=bounds();if(!b)return;
    const speed=gesture.y>b.bottom-44?Math.min(12,Math.max(1,(gesture.y-b.bottom+44)/5)):gesture.y<b.top+44?-Math.min(12,Math.max(1,(b.top+44-gesture.y)/5)):0;
    if(speed){const before=b.cs.scrollTop;b.cs.scrollTop=Math.max(0,Math.min(b.cs.scrollHeight-b.cs.clientHeight,b.cs.scrollTop+speed));if(before!==b.cs.scrollTop)paint();}
    frame=requestAnimationFrame(autoScroll);
  }
  document.addEventListener('pointermove',event=>{
    if(event.pointerId===blockedPointer){event.stopImmediatePropagation();return;}
    const g=gesture;if(!g||event.pointerId!==g.id)return;
    if(!g.active&&Math.hypot(event.clientX-g.startX,event.clientY-g.startY)>8){clearTimeout(g.timer);g.cancelled=true;}
    g.x=event.clientX;g.y=event.clientY;event.stopImmediatePropagation();
    if(g.active){event.preventDefault();paint();if(!frame)frame=requestAnimationFrame(autoScroll);}
  },true);
  function end(event){
    if(event.pointerId===blockedPointer){blockedPointer=null;event.stopImmediatePropagation();return;}
    const g=gesture;if(!g||event.pointerId!==g.id)return;
    clearTimeout(g.timer);cancelAnimationFrame(frame);frame=0;gesture=null;g.handle.classList.remove('resize-held');
    try{g.handle.releasePointerCapture(g.id);}catch{}
    if(event.type==='pointercancel'){
      g.target.s=g.s;g.target.e=g.e;if(SH){SH.s=g.s;SH.e=g.e;const from=Q('#ts'),to=Q('#te');if(from)from.value=fm(g.s);if(to)to.value=fm(Math.min(1439,g.e));}if(g.block){g.block.style.top='calc(var(--hh)*'+g.s/60+')';g.block.style.height='calc(var(--hh)*'+(g.e-g.s)/60+')';}else gp();
    }else if(g.active&&g.nextS!=null){g.target.s=g.nextS;g.target.e=g.nextE;if(g.block)sv();}
    Q('#co')?.style.setProperty('display','none');suppressClick(event);event.stopImmediatePropagation();
  }
  document.addEventListener('pointerup',end,true);document.addEventListener('pointercancel',end,true);
  document.addEventListener('click',event=>{
    const previous=suppressedClick;suppressedClick=null;
    if(previous&&Date.now()<previous.until&&Math.hypot(event.clientX-previous.x,event.clientY-previous.y)<12){event.preventDefault();event.stopImmediatePropagation();return;}
    // A slot opens Menu B on pointerup. Its following click belongs to that opening
    // gesture and must not immediately dismiss the new menu. Keyboard clicks have no pointerdown.
    if(event.detail===0&&dismissMenus(event)){event.preventDefault();event.stopImmediatePropagation();}
  },true);
  document.addEventListener('touchmove',event=>{if(gesture?.active)event.preventDefault();},{passive:false});
  function polishInput(){
    if(!document?.body)return;
    for(const input of document.querySelectorAll('input,textarea,select,form,[contenteditable="true"]')){
      if(input.id==='dbx-password')continue; // Preserve the encryption area's own password behavior.
      input.setAttribute('autocomplete','off');input.setAttribute('data-form-type','other');input.setAttribute('data-lpignore','true');input.setAttribute('data-1p-ignore','true');
      if(input.matches('input:not([type]),input[type="text"],input[type="search"],textarea')&&!input.name)input.name='logbook-'+(input.id||'text');
      if(input.id==='ti'){input.name='logbook-moment';input.setAttribute('autocorrect','off');input.setAttribute('autocapitalize','sentences');input.setAttribute('aria-label','What did you do?');}
    }
  }
  function refreshChrome(){
    if(!document?.body)return;
    const header=Q('#mobile-topbar'),input=document.activeElement;
    const typing=input?.matches('textarea,[contenteditable="true"],input:not([type="file"]):not([type="checkbox"]):not([type="radio"]):not([type="color"]):not([type="range"]):not([type="button"]):not([type="submit"]):not([type="hidden"])');
    const menu=!!Q('.sh.on,#dov.on,#bco.on,#achc.on,#slb-overlay,#desktop-context,#nv.open')||Q('#qb')?.style.display==='block'||Q('#tour')?.style.display==='block'||!!ED;
    const hidden=mobile()&&!!(menu||typing);
    if(document.body.classList.contains('mobile-chrome-hidden')!==hidden){
      const cs=Q('.cs'),before=cs?.getBoundingClientRect().top;
      document.body.classList.toggle('mobile-chrome-hidden',hidden);
      if(cs)cs.scrollTop=Math.max(0,cs.scrollTop+cs.getBoundingClientRect().top-before);
    }
    if(header)header.hidden=hidden;
    if(scr==='home'){const date=Q('#app>.scr>p.mu');if(date&&!date.classList.contains('home-page-date'))date.classList.add('home-page-date');}
    for(const image of document.querySelectorAll('.toolbar-profile img'))if(!image.alt)image.alt='Your profile picture';
  }
  const observer=new MutationObserver(()=>{polishInput();refreshChrome();});observer.observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['class','style']});
  document.addEventListener('focusin',refreshChrome);document.addEventListener('focusout',()=>requestAnimationFrame(refreshChrome));
  window.LogbookChrome={refresh:refreshChrome};polishInput();refreshChrome();
  window.LogbookMobileCalendar={get active(){return!!gesture?.active;},bounds};
})();
