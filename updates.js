/* Sailor Logbook — MIT. Download updates quietly; reload only when the reader chooses. */
(function(){
  let registration=null,available=false,lastCheck=0,checking=false,reloading=false,dismissed=false;
  const supported='serviceWorker' in navigator&&/^https?:/.test(location.protocol);
  let controlled=supported&&!!navigator.serviceWorker.controller;
  const editing=()=>!!SH||!!TS||!!Q('#tsh.on')||hasNotebookDraft()||!!Q('#dov.on')||!!SKc||!!window.LogbookDropboxUI?.returning||(scr==='ob'&&ob>0)||!!window.LogbookDesktopDrag?.active||!!window.LogbookMobileCalendar?.active;
  function show(){
    if(!available||dismissed)return;
    let banner=Q('#app-update');
    if(!banner){banner=document.createElement('aside');banner.id='app-update';banner.setAttribute('aria-label','App update');banner.innerHTML='<div role="status"><strong>Update available</strong><span>A fresh version of Logbook is ready.</span></div><button class="btn" data-a="updateApply">Reload</button><button class="ib" data-a="updateLater" aria-label="Remind me later">'+I(IC.x,17)+'</button>';document.body.append(banner);}
  }
  function ready(){available=true;show();}
  function attach(reg){
    registration=reg;if(reg.waiting)ready();
    const observe=worker=>{if(!worker)return;worker.addEventListener('statechange',()=>{if(worker.state==='installed'&&(navigator.serviceWorker.controller||reg.active))ready();});};
    observe(reg.installing);reg.addEventListener('updatefound',()=>observe(reg.installing));
    return reg;
  }
  async function check(manual=false){
    if(checking)return;if(!manual&&Date.now()-lastCheck<300000)return;
    if(navigator.onLine===false){if(manual)toast('You’re offline. Updates will be checked when you reconnect.');return;}
    if(!registration){if(manual)toast('Updates are available on the installed website.');return;}
    checking=true;lastCheck=Date.now();
    try{await registration.update();if(registration.waiting)available=true;if(available){dismissed=false;show();}else if(manual)toast(registration.installing?'Downloading the update…':'No update found. Your current version is v8.');}
    catch{if(manual)toast('Couldn’t check for updates. Please try again when you’re online.');}
    finally{checking=false;}
  }
  ACT.upd=()=>check(true);
  ACT.updateLater=()=>{dismissed=true;Q('#app-update')?.remove();};
  ACT.updateApply=()=>{
    if(editing()){toast('Finish editing before reloading. Your saved logbook will stay on this device.');return;}
    if(reloading)return;sv();reloading=true;
    if(registration?.waiting){const button=Q('#app-update [data-a="updateApply"]');if(button){button.disabled=true;button.textContent='Updating…';}registration.waiting.postMessage({type:'ACTIVATE_UPDATE'});}
    else location.reload();
  };
  if(supported){
    navigator.serviceWorker.addEventListener('controllerchange',()=>{if(reloading)location.reload();else if(controlled&&registration)ready();controlled=true;});
    if(!['localhost','127.0.0.1','[::1]'].includes(location.hostname))navigator.serviceWorker.register('sw.js',{updateViaCache:'none'}).then(attach).then(()=>check()).catch(()=>{});
  }
  document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')check();});
  window.addEventListener('online',()=>check());window.addEventListener('focus',()=>check());
  setInterval(()=>{if(document.visibilityState==='visible')check();},3600000);
  window.LogbookUpdates={attach,check,get available(){return available;},get editing(){return editing();}};
})();
