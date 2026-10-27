/* Sailor Logbook — MIT. Plaintext-first Dropbox setup; encryption is an optional setting. */
(function(){
  window.LogbookDropboxInfo=()=>`<details class="dropbox-info"><summary>What is Dropbox?</summary><div><p>Dropbox keeps your files securely in the cloud so your logbook stays with you across devices. Your information belongs to you: sync goes directly to your own Dropbox account, and Sailor Logbook’s developer does not collect or receive your logbook. Dropbox protects files during transfer and storage.</p><p><a href="https://www.dropbox.com/privacy" target="_blank" rel="noopener noreferrer">Dropbox privacy policy</a></p></div></details>`;
  let remoteInfo=null,encryptionForm=false,checking=false,starting=false,setupBusy=false,returnPromise=null;
  let returning=!!window.LogbookOAuthLanding||new URLSearchParams(location.search).has('code')||new URLSearchParams(location.search).has('error');
  const configuredKey=()=>window.LOGBOOK_CONFIG?.dropboxAppKey||LS.getItem('slb-dropbox-key')||'';
  const redirectUri=()=>new URL('./',location.href).href.split('?')[0].split('#')[0];
  function conflictMarkup(engine){
    return engine&&window.LogbookConflictReview?LogbookConflictReview.render(engine):'';
  }
  renderS=function(){
    syncFormOpen=true;Q('#tsh').classList.remove('desktop-task');
    const engine=window.slbSync,auth=engine?.getAuth()||{},connected=!!auth.refresh;
    let body='';
    if(!connected){
      remoteInfo=null;encryptionForm=false;
      body=`<p class="sync-copy">Keep your phone and computer in sync with your own Dropbox account. After you approve access, you’ll return here automatically.</p>${!window.LOGBOOK_CONFIG?.dropboxAppKey?`<label class="sync-field">Public app key<input id="dbx-key" value="${esc(configuredKey())}" autocomplete="off" placeholder="Dropbox app key"></label>`:''}<button class="btn" data-a="dbx" ${!syncReady||starting?'disabled':''}>${starting?'Opening Dropbox…':'Connect Dropbox'}</button><p class="sync-footnote">Access is limited to this app’s Dropbox folder. Your Dropbox password stays with Dropbox.</p>`;
    }else if(auth.needsSetup){
      if(checking)body='<p class="sync-copy">Dropbox is connected. Finding your logbook…</p>';
      else if(!remoteInfo)body='<p class="sync-copy">Dropbox is connected. Finish checking your Dropbox copy to start sync.</p><button class="btn" data-a="dbxInspect">Finish connecting</button>';
      else if(remoteInfo.encrypted||encryptionForm)body=`<p class="sync-copy">${remoteInfo.encrypted?'This Dropbox logbook is already encrypted. Enter the same passphrase you use on your other device.':'Encrypt your logbook on this device before it goes to Dropbox. Use this passphrase on every device.'}</p><label class="sync-field">${remoteInfo.encrypted?'Existing passphrase':'Choose a passphrase'}<input id="dbx-password" type="password" autocomplete="off" placeholder="${remoteInfo.encrypted?'Your existing passphrase':'At least 12 characters'}"></label><p class="sync-footnote">The passphrase stays in this tab’s memory. Keep it safe: a lost passphrase cannot be recovered. Local backups remain unencrypted.</p><div class="sync-actions"><button class="btn" data-a="dbxEncryptFinish">${remoteInfo.encrypted?'Unlock and sync':'Encrypt and sync'}</button>${!remoteInfo.encrypted?'<button class="btn g" data-a="dbxEncryptionBack">Back</button>':''}</div>`;
      else body='<p class="sync-copy">Dropbox is connected. Ready to start syncing.</p><button class="btn" data-a="dbxPlain">Start syncing</button>';
      body+='<button class="lk sync-disconnect" data-a="dis">Disconnect Dropbox</button>';
    }else if(encryptionForm&&!auth.encrypted){
      body='<p class="sync-copy">Encryption is optional. Your current sync continues until you choose Encrypt and sync. Use the same passphrase on every device.</p><label class="sync-field">Choose a passphrase<input id="dbx-password" type="password" autocomplete="off" placeholder="At least 12 characters"></label><p class="sync-footnote">The passphrase stays in this tab’s memory. A lost passphrase cannot be recovered. Local backups remain unencrypted.</p><div class="sync-actions"><button class="btn" data-a="dbxEncryptFinish">Encrypt and sync</button><button class="btn g" data-a="dbxEncryptionBack">Cancel</button></div>';
    }else{
      body=`<div class="sync-security"><span>Dropbox connected</span><strong>${auth.encrypted?'Encrypted':'Encryption off'}</strong></div>${auth.encrypted?'<label class="sync-field">Unlock this tab for encrypted sync<input id="dbx-password" type="password" autocomplete="off" placeholder="Enter your passphrase, or leave blank if already unlocked"></label><p class="sync-footnote">Enter the passphrase again after reopening the app. It is not saved on the device.</p>':'<p class="sync-copy">Your Dropbox copy is readable by anyone with access to that Dropbox account.</p>'}<div class="sync-actions"><button class="btn" data-a="syn">Sync now</button>${!auth.encrypted?'<button class="btn g" data-a="dbxEnableEncryption">Enable encryption</button>':''}<button class="btn g" data-a="dis">Disconnect</button></div>`;
    }
    Q('#tsc').innerHTML=`<div class="sync-close"><h2 class="h2">Dropbox sync</h2><button class="ib" data-a="cls" aria-label="Close sync">${I(IC.x,20)}</button></div><div class="sync-status" id="sync-status" role="status"></div>${body}${conflictMarkup(engine)}${LogbookDropboxInfo()}`;
    updateSyncStatus();
  };
  async function inspect(){
    if(checking)return;checking=true;renderS();
    try{
      remoteInfo=await slbSync.inspectRemote();
      if(slbSync.getAuth().needsSetup&&!remoteInfo.encrypted){
        await slbSync.configureEncryption(false,'');
        if(!remoteInfo.exists&&!S.ob){closeT();toast('Dropbox connected. Climb aboard to start your logbook.');return;}
        await slbSync.sync();finishJoinedSession();toast('Dropbox connected and synced.');
      }
    }catch(e){syncError(e);}finally{checking=false;if(syncFormOpen)renderS();}
  }
  async function begin(){
    const engine=await window.slbSyncReady;
    if(!engine)throw Error(syncStatus.error||'Sync storage could not be opened. Download a backup, then reload and try again.');
    const key=window.LOGBOOK_CONFIG?.dropboxAppKey||Q('#dbx-key')?.value.trim()||configuredKey();
    const pending=await engine.startAuth(key,{redirectUri:redirectUri()});
    sessionStorage.setItem('slb-dropbox-pending',JSON.stringify(pending));LS.setItem('slb-dropbox-key',key);pendingDropbox=pending;
    return pending.url;
  }
  ACT.dbx=async()=>{if(starting)return;starting=true;try{const url=await begin();location.assign(url);}catch(e){syncError(e);starting=false;renderS();}};
  ACT.dbxFinish=ACT.dbx;
  ACT.dbxInspect=inspect;
  ACT.dbxChooseEncryption=()=>{encryptionForm=true;renderS();Q('#dbx-password')?.focus();};
  ACT.dbxEncryptionBack=()=>{encryptionForm=false;renderS();};
  ACT.dbxEnableEncryption=()=>{remoteInfo={exists:true,encrypted:false};encryptionForm=true;renderS();Q('#dbx-password')?.focus();};
  async function completeSetup(encrypted){
    if(setupBusy)return;setupBusy=true;
    try{
      const password=Q('#dbx-password')?.value||'';
      if(remoteInfo?.encrypted&&!encrypted)throw Error('This logbook is already encrypted. Enter its passphrase.');
      await slbSync.configureEncryption(encrypted,password,{unlockExisting:!!remoteInfo?.encrypted});
      encryptionForm=false;await slbSync.sync();renderS();finishJoinedSession();toast(encrypted?'Encrypted and synced with Dropbox.':'Synced with Dropbox.');
    }catch(e){syncError(e);}finally{setupBusy=false;}
  }
  ACT.dbxEncryptFinish=()=>completeSetup(true);ACT.dbxPlain=()=>completeSetup(false);
  function cleanReturnUrl(){const clean=new URL(location.href);for(const key of ['code','state','error','error_description'])clean.searchParams.delete(key);history.replaceState(history.state,'',clean.pathname+clean.search+clean.hash);}
  function handleReturn(){return returnPromise||=(async()=>{
    const url=new URL(window.LogbookOAuthLanding?.url||location.href);if(!url.searchParams.has('code')&&!url.searchParams.has('error')){returning=false;return false;}
    let pending;try{pending=JSON.parse(sessionStorage.getItem('slb-dropbox-pending'));}catch{}
    cleanReturnUrl();delete window.LogbookOAuthLanding;
    try{
      const result=LogbookDropbox.validateCallback(url.href,pending);
      sessionStorage.removeItem('slb-dropbox-pending');pendingDropbox=null;
      ACT.sync();syncStatus={...syncStatus,busy:true,error:''};updateSyncStatus();
      await slbSync.connect(result.pending,result.code,false,{deferSetup:true});remoteInfo=null;
      syncStatus={...syncStatus,busy:false,error:''};await inspect();
      return true;
    }catch(e){sessionStorage.removeItem('slb-dropbox-pending');pendingDropbox=null;ACT.sync();syncError(e);return true;}finally{returning=false;}
  })();}
  window.LogbookDropboxUI={begin,handleReturn,inspect,redirectUri,get returning(){return returning||setupBusy||checking;}};
  window.slbSyncReady.then(async engine=>{if(!engine)return;if(await handleReturn())return;if(engine.getAuth().needsSetup){ACT.sync();await inspect();}});
})();
