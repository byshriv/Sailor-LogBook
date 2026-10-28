const {test}=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const vm=require('node:vm');const {load,seed}=require('./helpers.cjs');
function pointer(w,node,type,x,y){const event=new w.MouseEvent(type,{bubbles:true,cancelable:true,clientX:x,clientY:y,button:0});Object.defineProperties(event,{pointerId:{value:7},pointerType:{value:'touch'}});node.dispatchEvent(event);}
function click(w,node,x,y){node.dispatchEvent(new w.MouseEvent('click',{bubbles:true,cancelable:true,clientX:x,clientY:y,detail:1}));}
const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));
function prepare(w){w.eval("ACT.go('cal');V.a=P('2026-10-20');V.v=1;R()");const col=w.document.querySelector('.cl');col.getBoundingClientRect=()=>({left:40,top:0,width:300,height:1344,bottom:1344});return col;}

test('mobile outside taps dismiss either Calendar menu and keyboard without opening another block',async()=>{
  const x=load({width:390}),w=await x.ready();try{
    prepare(w);w.eval("openSheet({date:'2026-10-20',s:480,e:510})");assert.equal(w.document.activeElement.id,'ti');
    let other=w.document.querySelector('[data-e="entry1"]');pointer(w,other,'pointerdown',100,520);pointer(w,other,'pointerup',100,520);click(w,other,100,520);
    assert.equal(w.eval('SH'),null);assert.notEqual(w.document.activeElement.id,'ti');assert.equal(w.document.querySelector('#qb').style.display,'none');
    w.eval("openSheet({id:'entry1'})");const input=w.document.querySelector('#ti');input.focus();other=w.document.querySelector('[data-a="tedit:task1"]');pointer(w,other,'pointerdown',140,620);pointer(w,other,'pointerup',140,620);click(w,other,140,620);
    assert.equal(w.eval('SH'),null);assert.equal(w.eval('TS'),null);assert(!w.document.querySelector('#sh.on'));assert.notEqual(w.document.activeElement.id,'ti');
    // A distinct follow-up tap must work immediately, rather than being swallowed by a long global timeout.
    other=w.document.querySelector('[data-e="entry1"]');click(w,other,100,520);assert.equal(w.eval('SH.id'),'entry1');assert.equal(x.errors.length,0);
  }finally{w.close();}
});

test('a real slot tap keeps Menu B open through the click that follows pointerup',async()=>{
  const x=load({width:390}),w=await x.ready();try{
    const col=prepare(w);pointer(w,col,'pointerdown',150,400);pointer(w,col,'pointerup',150,400);click(w,col,150,400);
    assert.equal(w.eval('SH.mode'),'q');assert.equal(w.document.querySelector('#qb').style.display,'block');assert.equal(w.document.activeElement.id,'ti');assert.equal(x.errors.length,0);
  }finally{w.close();}
});

test('mobile resize requires a stationary hold, preserves typed text and scrolls the timeline near its edge',async()=>{
  const x=load({width:390}),w=await x.ready();try{
    let col=prepare(w);w.eval("openSheet({date:'2026-10-20',s:480,e:510})");const input=w.document.querySelector('#ti');input.value='Keep this draft +lea';input.dispatchEvent(new w.Event('input',{bubbles:true}));
    let dot=w.document.querySelector('.gh .hd[data-side="b"]');pointer(w,dot,'pointerdown',200,476);pointer(w,dot,'pointermove',200,600);pointer(w,dot,'pointerup',200,600);assert.equal(w.eval('SH.e'),510);
    pointer(w,dot,'pointerdown',200,476);await delay(355);assert(w.LogbookMobileCalendar.active);pointer(w,dot,'pointermove',200,560);pointer(w,dot,'pointerup',200,560);assert.equal(w.eval('SH.e'),600);assert.equal(input.value,'Keep this draft +lea');assert.equal(w.eval('S.entries[0].e'),600);
    // The visible bottom is the menu's top, not the covered/offscreen part of the timeline.
    const cs=w.document.querySelector('.cs');let scroll=0;Object.defineProperties(cs,{scrollTop:{get:()=>scroll,set:v=>{scroll=v;},configurable:true},scrollHeight:{value:2000,configurable:true},clientHeight:{value:600,configurable:true}});
    cs.getBoundingClientRect=()=>({top:100,bottom:700});w.document.querySelector('#qb').getBoundingClientRect=()=>({top:600});col.getBoundingClientRect=()=>({top:-scroll});
    dot=w.document.querySelector('.gh .hd[data-side="b"]');pointer(w,dot,'pointerdown',200,560);await delay(355);pointer(w,dot,'pointermove',200,590);await delay(65);assert(scroll>0);assert(w.eval('SH.e')>600);pointer(w,dot,'pointerup',200,590);
    assert(!w.LogbookMobileCalendar.active);assert.equal(w.document.querySelector('#ti').value,'Keep this draft +lea');assert.equal(x.errors.length,0,x.errors.map(e=>e.message).join('\n'));
  }finally{w.close();}
});

test('mobile selected-entry resize commits only after holding and cancel restores its original timing',async()=>{
  const x=load({width:390}),w=await x.ready();try{
    prepare(w);w.eval("openSheet({id:'entry1'})");const col=w.document.querySelector('.cl');col.getBoundingClientRect=()=>({top:0});
    const dot=w.document.querySelector('.b.sel .hd[data-side="b"]');pointer(w,dot,'pointerdown',200,560);await delay(355);pointer(w,dot,'pointermove',200,672);assert.equal(w.eval('S.entries[0].e'),600);assert.equal(w.eval('SH.e'),720);pointer(w,dot,'pointercancel',200,672);assert.equal(w.eval('SH.e'),600);assert.equal(w.eval('S.entries[0].e'),600);
    pointer(w,dot,'pointerdown',200,560);await delay(355);pointer(w,dot,'pointermove',200,672);pointer(w,dot,'pointerup',200,672);assert.equal(w.eval('S.entries[0].e'),720);assert.equal(JSON.parse(w.localStorage.getItem('slb1')).entries[0].e,720);assert.equal(x.errors.length,0);
  }finally{w.close();}
});

test('Menu B keeps presets beside More Options and discourages browser credential/address autofill',async()=>{
  const x=load({width:390}),w=await x.ready();try{
    prepare(w);w.eval("openSheet({date:'2026-10-20',s:480,e:510})");await delay(0);
    assert(w.document.querySelector('.quick-options #prs'));assert(w.document.querySelector('.quick-options>[data-a="mq"]'));
    const input=w.document.querySelector('#ti');assert.equal(input.autocomplete,'off');assert.equal(input.name,'logbook-moment');assert.equal(input.getAttribute('data-form-type'),'other');
    assert.equal(input.getAttribute('data-lpignore'),'true');assert.equal(input.getAttribute('data-1p-ignore'),'true');assert.equal(x.errors.length,0);
  }finally{w.close();}
});

test('Dropbox help is shared with the safe-storage slide and connection actions remain the same',async()=>{
  for(const width of [390,1440]){const state=seed();state.ob=0;const x=load({width,state}),w=await x.ready();try{
    w.eval('ob=9;R()');assert(w.document.querySelector('#obv [data-a="sync"]'));assert(w.document.querySelector('#obv .dropbox-info'));
    w.document.querySelector('#obv [data-a="sync"]').click();assert(w.document.querySelector('[data-a="dbx"]'));const info=w.document.querySelector('#tsc .dropbox-info');assert(info);assert(info.textContent.includes('developer does not collect or receive your logbook'));assert(info.querySelector('a[href="https://www.dropbox.com/privacy"]'));assert.equal(w.document.querySelector('#sync-status').textContent,'Not connected');assert(!w.document.querySelector('#tsc').textContent.includes('Connect Dropbox to keep a copy'));
    assert.equal(x.errors.length,0);
  }finally{w.close();}}
});

test('mobile header includes date, search, sync and profile; desktop profile uses the saved picture',async()=>{
  for(const width of [320,390,1440]){const state=seed();state.av='data:image/png;base64,AA==';const x=load({width,state}),w=await x.ready();try{
    const bar=w.document.querySelector(width<900?'#mobile-topbar':'.desktop-bar');assert(bar.querySelector('[data-a="go:set"] img'));assert(bar.querySelector(width<900?'time':'.workspace-heading'));assert(bar.querySelector(width<900?'[data-a="desktopCommands"]':'.desktop-search'));
    if(width<900){assert(bar.querySelector('#mobile-sync span'));bar.querySelector('[data-a="desktopCommands"]').click();assert(w.document.querySelector('#command-query'));w.eval('closeDesktopDialog()');}
    bar.querySelector('[data-a="go:set"]').click();assert.equal(w.eval('scr'),'set');assert.equal(x.errors.length,0);
  }finally{w.close();}}
});

test('nested sidebar disclosure and parent deck pages include descendant logs and planned tasks once',async()=>{
  const state=seed();state.docks.push({id:'reading',n:'Reading',c:'#d8b94c',p:'learn'},{id:'fiction',n:'Fiction',c:'#d8b94c',p:'reading'});state.entries[0].d='fiction';state.tasks[0].d='fiction';state.tasks[0].date='2099-01-01';
  const x=load({state}),w=await x.ready();try{
    w.eval("ACT.desktopSection('decks');ACT.desktopDeckToggle('learn')");const parent=w.document.querySelector('[data-a="desktopDeck:learn"]');assert.equal(parent.textContent,'Learning');assert(w.document.querySelector('#subdecks-learn [data-a="desktopDeckToggle:reading"]'));assert(w.document.querySelector('#subdecks-reading').hidden);
    w.eval("ACT.desktopDeckToggle('reading');ACT.desktopDeck('learn')");assert.equal(w.document.querySelectorAll('#dlist [data-a="edit:entry1"]').length,1);assert.equal(w.document.querySelectorAll('#dlist [data-a="tedit:task1"]').length,1);
    w.eval("S.docks.find(d=>d.id==='learn').p='fiction'");assert.deepEqual(JSON.parse(w.eval("JSON.stringify(dockIds('learn'))")),['learn','reading','fiction'],'bad imported cycles cannot loop forever');assert.equal(x.errors.length,0);
  }finally{w.close();}
});

test('update notices do not reload or activate in the middle of editing and can be deferred',async()=>{
  const x=load(),w=await x.ready();try{
    const reg=new w.EventTarget();let updates=0,messages=[];reg.waiting={postMessage:value=>messages.push(value)};reg.update=async()=>{updates++;};
    w.LogbookUpdates.attach(reg);assert(w.document.querySelector('#app-update'));assert.equal(messages.length,0);
    w.eval('ACT.updateLater()');assert(!w.document.querySelector('#app-update'));await w.LogbookUpdates.check(true);assert(w.document.querySelector('#app-update'));assert.equal(updates,1);
    w.eval("ACT.go('cal');openSheet({date:'2026-10-20',s:480,e:510});ACT.updateApply()");assert.equal(messages.length,0);assert(w.document.querySelector('#ti'));w.eval('closeSheet();ACT.updateApply()');assert.equal(messages.length,1);assert.equal(messages[0].type,'ACTIVATE_UPDATE');assert.equal(w.document.querySelector('[data-a="updateApply"]').disabled,true);assert.equal(x.errors.length,0);
  }finally{w.close();}
});

test('v8 worker waits for an update choice, retains unrelated caches and supports explicit activation',async()=>{
  const listeners={},deleted=[],opened=[],waiting=[];let skipped=0;const caches={open:async version=>{opened.push(version);return{addAll:async()=>{}};},keys:async()=>['slb-v7','slb-v8','slb-v8-r2','slb-v8-r3','another-app'],delete:async key=>deleted.push(key)};
  const self={registration:{active:{}},addEventListener:(type,fn)=>listeners[type]=fn,skipWaiting:async()=>{skipped++;},clients:{claim:async()=>{}}};vm.runInNewContext(fs.readFileSync('sw.js','utf8'),{self,caches,URL,Response,fetch});
  const event=data=>({data,waitUntil:promise=>waiting.push(promise)});listeners.install(event());await Promise.all(waiting.splice(0));assert.equal(skipped,0);assert.equal(opened[0],'slb-v8-r3');
  listeners.message(event({type:'ACTIVATE_UPDATE'}));await Promise.all(waiting.splice(0));assert.equal(skipped,1);listeners.activate(event());await Promise.all(waiting.splice(0));assert.deepEqual(deleted,['slb-v7','slb-v8','slb-v8-r2']);
});

test('mobile header uses a full weekday and yields its space to menus, keyboard, search and customization',async()=>{
  const state=seed();state.ach={'Maiden Voyage':1};const x=load({width:320,state}),w=await x.ready();try{
    const header=w.document.querySelector('#mobile-topbar');assert.match(header.querySelector('time').textContent,/^(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday), /);assert(w.document.querySelector('.home-page-date'));
    assert(!header.hidden);w.document.querySelector('#bi').focus();assert(header.hidden);w.document.querySelector('#bi').blur();await delay(25);assert(!header.hidden);
    prepare(w);w.eval("openSheet({date:'2026-10-20',s:480,e:510})");await delay(0);assert(header.hidden);assert(w.document.body.classList.contains('mobile-chrome-hidden'));
    w.eval('closeSheet()');await delay(0);assert(!header.hidden);w.eval("openSheet({id:'entry1'})");await delay(0);assert(header.hidden);w.eval('closeSheet();ACT.desktopCommands()');await delay(0);assert(header.hidden);
    w.eval("closeDesktopDialog();ACT.go('home');ED=1;R()");assert(header.hidden);w.eval('ED=0;R()');assert(!header.hidden);
    w.eval("ACT.sync()");await delay(0);assert(header.hidden);w.eval('closeT()');await delay(0);assert(!header.hidden);assert.equal(x.errors.length,0,x.errors.map(e=>e.message).join('\n'));
  }finally{w.close();}
});

test('text fields across the app discourage autofill while the encryption password keeps its own attributes',async()=>{
  const x=load({width:390}),w=await x.ready();try{
    for(const action of ["ACT.ped()","closeT();ACT.go('note')","ACT.go('set')","ACT.desktopCommands()","closeDesktopDialog();ACT.tnew('2026-10-20')"]){
      w.eval(action);await delay(0);const fields=[...w.document.querySelectorAll('input:not([type=file]),textarea,select')].filter(x=>x.id!=='dbx-password');assert(fields.length);
      for(const input of fields){assert.equal(input.getAttribute('autocomplete'),'off');assert.equal(input.getAttribute('data-form-type'),'other');assert.equal(input.getAttribute('data-lpignore'),'true');}
    }
    w.eval("closeT();slbSync.updateAuth({refresh:'test-only',encrypted:false});ACT.sync();ACT.dbxEnableEncryption()");await delay(0);const password=w.document.querySelector('#dbx-password');assert.equal(password.type,'password');assert.equal(password.getAttribute('autocomplete'),'off');assert.equal(password.getAttribute('data-form-type'),null);assert.equal(password.getAttribute('data-lpignore'),null);assert.equal(x.errors.length,0);
  }finally{w.close();}
});

test('profile saving updates the actual image on both headers and sync uses the official Lucide paths',async()=>{
  for(const width of [390,1440]){const x=load({width}),w=await x.ready();try{
    w.eval("ACT.ped();AE.av='data:image/png;base64,AA==';ACT.pedsv()");await delay(0);const image=w.document.querySelector('.toolbar-profile img');assert(image);assert.equal(image.getAttribute('src'),'data:image/png;base64,AA==');assert.equal(image.alt,'Your profile picture');
    const svg=w.document.querySelector(width<900?'#mobile-sync svg':'.toolbar-sync svg');assert.equal(svg.querySelectorAll('path').length,4);assert.equal(svg.querySelector('path').getAttribute('d'),'M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8');assert.equal(x.errors.length,0);
  }finally{w.close();}}
});
