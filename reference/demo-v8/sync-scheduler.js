/* Sailor Logbook — MIT. Bounded, selective foreground sync; close-time sends are best effort. */
(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.LogbookSyncSchedule=factory();})(typeof globalThis!=='undefined'?globalThis:this,function(){
  function create({engine,preferences=()=>({}),visible=()=>true,online=()=>true,editing=()=>false,paused=()=>false,notify=()=>{},openSettings=()=>{},now=()=>Date.now(),setTimer=setTimeout,clearTimer=clearTimeout,conflictCount=()=>0}){
    let changeTimer=null,periodic=null,running=null,lastAttempt=-Infinity,lastScreen=null,lastNotice=-Infinity,lastError='',recovery=false,locked=false,knownConflicts=conflictCount();
    const mode=()=>preferences().syncMode||'balanced';
    const interval=()=>mode()==='five-minutes'?300000:90000;
    const ready=()=>!!engine.getAuth().refresh&&!engine.getAuth().needsSetup&&!paused();
    function restart(){if(periodic)clearTimer(periodic);periodic=null;if(mode()!=='manual')periodic=setTimer(async()=>{await request('interval');restart();},interval());}
    async function request(reason='manual',{force=false}={}){
      const manual=reason==='manual';
      if(!ready()){if(manual)openSettings();return false;}
      if(!manual&&mode()==='manual')return false;
      if(!online()){recovery=true;if(manual)notify('You’re offline. Changes are saved on this device.');return false;}
      if(!visible()&&!['hidden','close'].includes(reason))return false;
      if(['hidden','close'].includes(reason)&&!engine.getStatus().pending)return false;
      if(locked&&!manual)return false;
      if(editing()){if(manual)notify('Finish editing before syncing.');else if(engine.getStatus().pending)changed();return false;}
      if(running)return running;
      if(!force&&!manual&&now()-lastAttempt<15000)return false;
      lastAttempt=now();if(changeTimer)clearTimer(changeTimer);changeTimer=null;
      running=(async()=>{
        try{
          await Promise.resolve().then(()=>engine.sync());locked=false;
          const count=conflictCount();
          if(count>knownConflicts)notify('New edit conflicts are saved. Review them in Dropbox sync.');
          else if(manual)notify('Synced with Dropbox.');
          else if(recovery)notify('Back online. Your logbook is synced.');
          knownConflicts=count;recovery=false;lastError='';return true;
        }catch(e){
          const message=e.message||'Dropbox sync could not finish.';locked=/passphrase|decrypt|revoked|authorization|reconnect/i.test(message);recovery=!locked;
          if(manual||visible()&&(message!==lastError||now()-lastNotice>300000)){notify(message);lastNotice=now();lastError=message;}
          if(manual&&locked)openSettings();return false;
        }finally{running=null;}
      })();return running;
    }
    function changed(){if(changeTimer)clearTimer(changeTimer);changeTimer=null;if(mode()==='balanced'&&ready())changeTimer=setTimer(()=>request('pause'),15000);}
    function screen(screen){if(lastScreen!=null&&screen!==lastScreen)request('screen');lastScreen=screen;}
    function status(value,previous){if(!value.error&&value.last>(previous?.last||0))locked=false;if(!value.busy&&previous?.busy&&value.pending)changed();}
    function stop(){if(changeTimer)clearTimer(changeTimer);if(periodic)clearTimer(periodic);changeTimer=periodic=null;}
    return{request,changed,screen,status,restart,stop,open:()=>request('open',{force:true}),return:()=>request('return'),hide:()=>request('hidden',{force:true})};
  }
  return{create};
});
