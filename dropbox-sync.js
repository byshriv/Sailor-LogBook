/* Sailor Logbook — MIT. Dropbox is the only network service used here. */
(function(root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./sync-core.js'));
  else root.LogbookDropbox = factory(root.LogbookSync);
})(typeof globalThis !== 'undefined' ? globalThis : this, function(Core) {
  'use strict';
  const PATH = '/sailors-logbook.json';
  function create(options) {
    const { getState, applyState, saveDoc, saveAuth, onStatus = () => {}, fetch: request = globalThis.fetch, crypto = globalThis.crypto } = options;
    let doc = options.doc || Core.blank(), auth = options.auth || {}, password = '', running = null, timer, stopped = false, epoch = 0;
    let status = { busy:false, error:'', last:auth.last || 0, pending:!!options.pending };
    const emit = next => { status = { ...status, ...next }; onStatus(status); };
    let persistence = Promise.resolve();
    function persist() {
      const snapshot = structuredClone(doc);
      persistence = persistence.catch(() => {}).then(() => saveDoc(snapshot));
      return persistence;
    }
    function changed(state = getState()) {
      const next=Core.capture(doc,state,options.device),modified=!Core.equal(next,doc);doc=next;
      if(modified){emit({pending:true});options.onPending?.(true);options.onLocalChange?.();}
      persist().catch(() => emit({ error:'Sync history could not be saved. Download a backup before closing this tab.' }));
      clearTimeout(timer);
      if (options.autoSync!==false&&auth.refresh && !auth.needsSetup && !stopped) timer = setTimeout(() => sync().catch(() => {}), 1800);
    }
    async function http(url, init) {
      const controller = new AbortController(), timeout = setTimeout(() => controller.abort(), options.timeoutMs || 30000);
      try {
        const response=await request(url, { ...init, signal:controller.signal });
        // Keep the timeout active until the body finishes, not just until headers arrive.
        const bytes=await response.arrayBuffer();
        return new Response(bytes,{status:response.status,statusText:response.statusText,headers:response.headers});
      }
      catch (e) { throw Error(e.name === 'AbortError' ? 'Dropbox took too long. Your changes remain on this device.' : 'Dropbox is unreachable. Your changes remain on this device.'); }
      finally { clearTimeout(timeout); }
    }
    async function token(params,key=auth.key) {
      const r = await http('https://api.dropboxapi.com/oauth2/token', {
        method:'POST', headers:{ 'Content-Type':'application/x-www-form-urlencoded' }, body:new URLSearchParams({ client_id:key, ...params }).toString()
      });
      if (!r.ok) {
        const failure=await r.json().catch(()=>({}));
        if(failure.error==='invalid_grant')throw Error(params.grant_type==='authorization_code'?'This Dropbox authorization link has expired or was already used. Connect Dropbox again.':'Dropbox authorization expired or was revoked. Reconnect Dropbox.');
        if(r.status>=500||r.status===429)throw Error('Dropbox authorization is temporarily unavailable. Please try connecting again shortly.');
        throw Error('Dropbox could not authorize this connection. Check the app key and registered return URL, then connect again.');
      }
      const value = await r.json();
      if (typeof value.access_token !== 'string' || !Number.isFinite(value.expires_in)) throw Error('Dropbox returned an invalid authorization response.');
      return value;
    }
    async function refresh() {
      if (!auth.refresh) throw Error('Connect Dropbox first.');
      const session = epoch;
      const value = await token({ grant_type:'refresh_token', refresh_token:auth.refresh });
      if (session !== epoch || stopped) throw Error('Dropbox connection was canceled.');
      auth = { ...auth, access:value.access_token, expires:Date.now() + value.expires_in * 1000 };
      await saveAuth(auth);
    }
    async function api(endpoint, init, retry = true) {
      if (!auth.access || auth.expires < Date.now() + 60000) await refresh();
      const r = await http('https://content.dropboxapi.com/2/files/' + endpoint, {
        method:'POST', ...init, headers:{ ...init.headers, Authorization:'Bearer ' + auth.access }
      });
      if (r.status === 401 && retry) { await refresh(); return api(endpoint, init, false); }
      if (r.status === 401) throw Error('Dropbox access was revoked. Reconnect Dropbox.');
      if (r.status === 429) throw Error('Dropbox is busy. Try syncing again in a minute.');
      return r;
    }
    async function download() {
      const r = await api('download', { headers:{ 'Dropbox-API-Arg':JSON.stringify({ path:PATH }) } });
      if (!r.ok) {
        const err = await r.json().catch(() => ({}));
        if (r.status === 409 && /^path\/not_found\//.test(err.error_summary || '')) return { doc:Core.blank(), rev:null, encrypted:false };
        throw Error('Could not read the Dropbox logbook. No data was replaced.');
      }
      const meta = JSON.parse(r.headers.get('Dropbox-API-Result') || '{}');
      if (!meta.rev) throw Error('Dropbox did not return a file revision.');
      const text = await r.text(), encrypted = JSON.parse(text).format === 'slb-encrypted';
      const remote = await Core.decode(text, password, crypto);
      return { doc:remote, rev:meta.rev, encrypted };
    }
    async function cycle() {
      const session = epoch;
      emit({ busy:true, error:'' });
      try {
        if(auth.needsSetup)throw Error('Finish connecting Dropbox in Sync settings.');
        if (options.canApply && !options.canApply()) throw Error('Finish editing, then sync again.');
        await options.beforeSync?.();
        // Capture edits made while waiting for network responses before each upload.
        for (let attempt = 0; attempt < 3; attempt++) {
          if (stopped || session !== epoch) return;
          const remote = await download();
          if (stopped || session !== epoch) return;
          const adopting=!!options.shouldAdoptRemote?.({exists:!!remote.rev});
          if(adopting&&!remote.rev)throw Error('No logbook was found in this Dropbox App Folder. Climb aboard to start one, then connect Dropbox.');
          doc = Core.capture(doc, getState(), options.device);
          // A genuinely new device has no user records to merge. Adopt the shared
          // history rather than stamping its empty starter profile over it.
          const merged = Core.validate(Core.merge(adopting?Core.blank():doc, remote.doc));
          const encrypted = remote.encrypted || !!auth.encrypted;
          if (encrypted && !password) throw Error('Enter your encryption passphrase in Sync settings.');
          const body = await Core.encode(merged, encrypted ? password : '', crypto);
          if (stopped || session !== epoch) return;
          const r = await api('upload', {
            headers:{ 'Content-Type':'application/octet-stream', 'Dropbox-API-Arg':JSON.stringify({ path:PATH, mode:remote.rev ? { '.tag':'update', update:remote.rev } : { '.tag':'add' }, autorename:false, strict_conflict:true, mute:true }) }, body
          });
          if (r.status === 409) continue;
          if (!r.ok) throw Error('Dropbox could not save your logbook. Your local copy is safe.');
          const meta = await r.json();
          if (!meta.rev) throw Error('Dropbox did not confirm the upload. Try syncing again.');
          if (stopped || session !== epoch) return;
          // Preserve local edits made during encryption/upload. They sync on the next pass.
          doc = adopting?merged:Core.merge(Core.capture(doc, getState(), options.device), merged);
          // The host updates its model but leaves an active editor’s DOM untouched.
          applyState(Core.materialize(doc, getState()),{adopted:adopting});
          await persist();
          auth = { ...auth, encrypted, last:Date.now() }; await saveAuth(auth);
          const pending=!Core.equal(doc,merged);options.onPending?.(pending);emit({ busy:false, last:auth.last, error:'',pending });
          if (pending&&options.autoSync!==false) { clearTimeout(timer); timer = setTimeout(() => sync().catch(() => {}), 2000); }
          return;
        }
        throw Error('Another device is still syncing. Try again shortly; your changes are safe.');
      } catch (e) { emit({ busy:false, error:e.message }); throw e; }
      finally { if (status.busy) emit({ busy:false }); }
    }
    function sync() {
      if (stopped) return Promise.resolve();
      if (!running) running = cycle().finally(() => { running = null; });
      return running;
    }
    async function startAuth(key, {redirectUri} = {}) {
      if (!/^[a-z0-9]{8,100}$/i.test(key)) throw Error('Enter a valid public Dropbox app key.');
      const bytes = crypto.getRandomValues(new Uint8Array(64));
      const verifier = Array.from(bytes, x => x.toString(16).padStart(2,'0')).join('');
      const hash = new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier)));
      let binary = ''; for (const b of hash) binary += String.fromCharCode(b);
      const challenge = btoa(binary).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
      const params = new URLSearchParams({ client_id:key, response_type:'code', code_challenge_method:'S256', code_challenge:challenge, token_access_type:'offline', scope:'files.content.read files.content.write' });
      let state;
      if(redirectUri){
        const redirect=new URL(redirectUri);if(redirect.protocol!=='https:'&&!(redirect.protocol==='http:'&&['localhost','127.0.0.1','[::1]'].includes(redirect.hostname)))throw Error('Dropbox needs HTTPS, or a localhost development address.');
        state=Array.from(crypto.getRandomValues(new Uint8Array(24)),x=>x.toString(16).padStart(2,'0')).join('');
        params.set('redirect_uri',redirect.href);params.set('state',state);
      }
      return { key, verifier, ...(state?{state,redirectUri}:{}), created:Date.now(), url:'https://www.dropbox.com/oauth2/authorize?' + params };
    }
    async function connect(pending, code, encrypted, {deferSetup=false}={}) {
      if (!pending?.verifier || Date.now() - pending.created > 15 * 60 * 1000) throw Error('Authorization expired. Start again.');
      if (!code?.trim()) throw Error('Paste the authorization code from Dropbox.');
      const session = ++epoch;
      const value = await token({ grant_type:'authorization_code', code:code.trim(), code_verifier:pending.verifier,...(pending.redirectUri?{redirect_uri:pending.redirectUri}:{}) },pending.key);
      if (session !== epoch) throw Error('Dropbox connection was canceled.');
      if (!value.refresh_token) throw Error('Dropbox did not grant offline access. Please reconnect.');
      auth = { key:pending.key, access:value.access_token, refresh:value.refresh_token, expires:Date.now()+value.expires_in*1000, encrypted:!!encrypted, last:0,...(deferSetup?{needsSetup:true}:{}) };
      stopped = false; epoch++; await saveAuth(auth); return auth;
    }
    async function disconnect() {
      // Clear device credentials first. Remote files are deliberately retained.
      stopped = true; epoch++; clearTimeout(timer); password = ''; auth = {};
      await saveAuth(auth); emit({ busy:false, error:'', last:0 });
    }
    function setPassword(value) { password = value; }
    async function inspectRemote(){
      const r=await api('download',{headers:{'Dropbox-API-Arg':JSON.stringify({path:PATH})}});
      if(!r.ok){const error=await r.json().catch(()=>({}));if(r.status===409&&/^path\/not_found\//.test(error.error_summary||''))return{exists:false,encrypted:false};throw Error('Could not check your Dropbox logbook. Try again.');}
      const text=await r.text();if(text.length>12*1024*1024)throw Error('Dropbox file is too large.');
      const data=JSON.parse(text);if(data.format!=='slb-records'&&data.format!=='slb-encrypted')throw Error('The Dropbox file is not a supported logbook.');
      return{exists:true,encrypted:data.format==='slb-encrypted'};
    }
    async function configureEncryption(encrypted,value,{unlockExisting=false}={}){
      // Finish an upload that already chose its file format before changing modes.
      const session=epoch;
      if(running)await running.catch(()=>{});
      if(session!==epoch||stopped||!auth.refresh)throw Error('Dropbox connection changed. Connect Dropbox again.');
      if(auth.encrypted&&!encrypted)throw Error('An encrypted logbook cannot be changed to plaintext here.');
      if(encrypted&&(!value||(value.length<12&&!unlockExisting)))throw Error('Use a passphrase with at least 12 characters.');
      const previousAuth=auth,previousPassword=password;
      if(encrypted)password=value;
      auth={...auth,encrypted:!!encrypted,needsSetup:false};
      try{await saveAuth(auth);}catch(error){auth=previousAuth;password=previousPassword;throw error;}
    }
    async function resolve(key, restore) {
      doc = Core.resolve(doc, key, restore, options.device);
      applyState(Core.materialize(doc, getState()));
      await persist();
      emit({pending:true});options.onPending?.(true);options.onLocalChange?.();
      clearTimeout(timer); if (options.autoSync!==false&&auth.refresh) timer = setTimeout(() => sync().catch(() => {}), 1800);
    }
    async function receive(incoming) {
      Core.validate(incoming);
      const merged = Core.merge(Core.capture(doc,getState(),options.device),incoming);
      if (Core.equal(doc,merged)) return;
      doc = merged; applyState(Core.materialize(doc,getState())); await persist();
    }
    function updateAuth(value) { epoch++; auth={...value}; stopped=!auth.refresh; emit({last:auth.last||0,busy:false,error:''}); }
    return { changed, sync, startAuth, connect, disconnect, setPassword, inspectRemote, configureEncryption, resolve, receive, updateAuth,
      getDoc:() => structuredClone(doc), getAuth:() => ({ ...auth }), getStatus:() => ({ ...status }), getConflictCount:()=>Object.entries(doc.records).filter(([key,value])=>!value.deleted&&JSON.parse(key)[0]==='conflict').length, flush:() => persistence,
      stop:() => { stopped = true; epoch++; clearTimeout(timer); } };
  }
  function validateCallback(url,pending,now=Date.now()){
    const callback=new URL(url),params=callback.searchParams;
    if(!params.has('code')&&!params.has('error'))return null;
    if(!pending?.state||!pending.verifier||params.get('state')!==pending.state||now-pending.created>15*60*1000)throw Error('Dropbox authorization could not be verified. Please connect again.');
    const expected=new URL(pending.redirectUri);
    if(callback.origin!==expected.origin||callback.pathname!==expected.pathname)throw Error('Dropbox returned to an unexpected address. Please connect again.');
    if(params.has('error'))throw Error(params.get('error')==='access_denied'?'Dropbox connection canceled. Your logbook stays on this device.':'Dropbox could not authorize the connection. Please try again.');
    const code=params.get('code');if(!code)throw Error('Dropbox did not return an authorization code.');
    return{code,pending};
  }
  return { create, PATH, validateCallback };
});
