/* Sailor Logbook — MIT. Quiet notifications and a mobile floating sync control. */
(function(){
  let scheduler=null,lastScreen=null;
  function render(){
    if(!window.slbSync)return;
    let button=Q('#mobile-sync');
    const show=!desktopMedia.matches&&S.ob&&!S.out&&scr!=='ob';
    document.body.classList.toggle('mobile-sync-visible',!!show);
    if(!show){button?.remove();Q('#mobile-topbar')?.remove();return;}
    let bar=Q('#mobile-topbar');if(!bar){bar=document.createElement('header');bar.id='mobile-topbar';bar.innerHTML='<time></time><div class="mobile-top-actions"><button class="ib" data-a="desktopCommands" aria-label="Search logbook">'+I(toolbarIcons.search,17)+'</button><button class="toolbar-profile" data-a="go:set" aria-label="Profile and settings">'+AVH(28)+'</button></div>';document.body.append(bar);}
    const date=new Date(),time=bar.querySelector('time');time.dateTime=K(date);time.textContent=date.toLocaleDateString('en',{weekday:'long',month:'short',day:'numeric'});bar.querySelector('.toolbar-profile').innerHTML=AVH(28);
    if(!button){button=document.createElement('button');button.id='mobile-sync';button.dataset.a='desktopSync';bar.querySelector('.mobile-top-actions').prepend(button);}
    const status=slbSync.getStatus(),auth=slbSync.getAuth(),offline=navigator.onLine===false,count=slbSync.getConflictCount();
    const state=status.busy?'busy':count?'conflict':offline?'offline':status.error?'error':!auth.refresh?'local':status.pending?'pending':'synced';
    const label={busy:'Syncing',conflict:'Review sync',offline:'Offline',error:'Review sync',local:'Connect',pending:'Sync',synced:'Synced'}[state];
    button.dataset.state=state;button.disabled=!!status.busy;
    button.setAttribute('aria-label',count?'Review '+count+' sync conflicts':state==='pending'?'Changes waiting to sync with Dropbox':state==='local'?'Connect Dropbox':label+' with Dropbox');
    button.title=count?count+' conflicting edits need review.':state==='offline'?'Your changes are saved on this device.':status.error||(status.last?'Last synced '+new Date(status.last).toLocaleString():'Dropbox sync');
    button.innerHTML=I(toolbarIcons.sync,17)+'<span>'+label+'</span><i></i>';
  }
  const originalRenderSync=renderS;
  renderS=function(){originalRenderSync();if(!Q('#sync-schedule-settings'))Q('#tsc').insertAdjacentHTML('beforeend',`<div id="sync-schedule-settings"><label class="sync-field">Sync schedule<select id="sync-mode"><option value="balanced" ${!S.pf.syncMode||S.pf.syncMode==='balanced'?'selected':''}>Balanced</option><option value="five-minutes" ${S.pf.syncMode==='five-minutes'?'selected':''}>Every 5 minutes</option><option value="manual" ${S.pf.syncMode==='manual'?'selected':''}>Manual only</option></select></label><p class="sync-footnote">Balanced syncs on open/return, after a pause in saved edits, on useful screen changes, and about every 90 seconds while visible. Background successes stay quiet. Closing a tab is best effort; local changes retry on the next open.</p></div>`);};
  document.addEventListener('change',e=>{if(e.target.id==='sync-mode'){S.pf.syncMode=e.target.value;sv();scheduler?.restart();if(window.slbSync?.getStatus().pending)scheduler?.changed();toast('Sync schedule updated.');}});
  const ui={
    changed:()=>{scheduler?.changed();render();},
    status:(value,previous)=>{scheduler?.status(value,previous);render();},
    afterRender:()=>{updateToolbarSync();render();scheduler?.screen(scr);lastScreen=scr;window.LogbookChrome?.refresh();},
    request:(...args)=>scheduler?.request(...args)
  };
  window.LogbookSyncScheduler=ui;
  window.slbSyncReady.then(engine=>{
    if(!engine)return;
    scheduler=LogbookSyncSchedule.create({engine,preferences:()=>S.pf,visible:()=>document.visibilityState==='visible',online:()=>navigator.onLine!==false,editing:()=>!!SH||!!TS||hasNotebookDraft()||!!Q('#dov.on')||document.body.classList.contains('desktop-tour-active')||!!window.LogbookDesktopDrag?.active,paused:()=>!!window.LogbookDropboxUI?.returning||!S.ob,notify:toast,openSettings:()=>ACT.sync(),conflictCount:()=>engine.getConflictCount()});
    ACT.desktopSync=()=>{if(engine.getConflictCount()){if(SH||TS||hasNotebookDraft()||Q('#dov.on')||window.LogbookDesktopDrag?.active){toast('Finish editing before reviewing sync conflicts.');return;}ACT.sync();return;}return scheduler.request('manual',{force:true});};
    ACT.syn=async()=>{readPassphrase();await scheduler.request('manual',{force:true});if(syncFormOpen&&Q('#tsh').classList.contains('on'))renderS();finishJoinedSession();};
    scheduler.restart();ui.afterRender();
    if(!new URLSearchParams(location.search).has('code'))scheduler.open();
  });
  document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')scheduler?.return();else scheduler?.hide();});
  window.addEventListener('focus',()=>scheduler?.return());window.addEventListener('pagehide',()=>scheduler?.request('close',{force:true}));
  window.addEventListener('pageshow',e=>{if(e.persisted)scheduler?.open();});
  window.addEventListener('online',()=>{scheduler?.request('online',{force:true});render();});window.addEventListener('offline',render);
})();
