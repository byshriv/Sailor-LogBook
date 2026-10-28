const {test}=require('node:test');
const assert=require('node:assert/strict');
const C=require('../sync-core.js');
const {create}=require('../dropbox-sync.js');
const {seed}=require('./helpers.cjs');
test('enabling encryption waits for an in-flight plaintext upload before choosing the next file format',async()=>{
  let release,entered,body,rev=0,configured=false;
  const started=new Promise(resolve=>entered=resolve),pause=new Promise(resolve=>release=resolve);
  const engine=create({device:'desktop',auth:{key:'publickey',access:'device-token',refresh:'device-refresh',expires:Date.now()+3600000},autoSync:false,getState:seed,applyState(){},saveDoc:async()=>{},saveAuth:async()=>{},fetch:async(url,init)=>{
    if(url.endsWith('/download'))return body?new Response(body,{headers:{'Dropbox-API-Result':JSON.stringify({rev:'r'+rev})}}):Response.json({error_summary:'path/not_found/'},{status:409});
    if(!rev){entered();await pause;}body=init.body;rev++;return Response.json({rev:'r'+rev});
  }});
  try{
    const first=engine.sync();await started;
    const configure=engine.configureEncryption(true,'an optional secret phrase').then(()=>configured=true);
    await new Promise(resolve=>setImmediate(resolve));assert.equal(configured,false);
    release();await first;await configure;await engine.sync();
    assert.equal(JSON.parse(body).format,'slb-encrypted');assert.equal(engine.getAuth().encrypted,true);
  }finally{release?.();engine.stop();}
});
const json=(body,status=200,headers={})=>new Response(JSON.stringify(body),{status,headers});
function mockStore({initial=null,conflictOnce=false,expired=false,offline=false,onUpload}={}){
  let data=initial,rev=initial?'r1':null,uploads=0,refreshes=0;
  const calls=[];
  const fetch=async(url,init)=>{
    calls.push({url,init});
    if(offline)throw Error('offline');
    if(url.endsWith('/oauth2/token')){
      refreshes++;return json({access_token:'test-access',refresh_token:'test-refresh',expires_in:14400});
    }
    if(expired&&refreshes===0)return json({},401);
    if(url.endsWith('/download'))return data==null?json({error_summary:'path/not_found/'},409):new Response(data,{headers:{'Dropbox-API-Result':JSON.stringify({rev})}});
    if(url.endsWith('/upload')){
      uploads++;
      const args=JSON.parse(init.headers['Dropbox-API-Arg']);
      if(conflictOnce&&uploads===1){
        const s=seed();s.entries.push({...s.entries[0],id:'other',t:'Concurrent remote upload'});data=JSON.stringify(C.capture(C.blank(),s,'remote'));rev='r2';return json({error_summary:'path/conflict/file/'},409);
      }
      assert.equal(args.autorename,false);assert.equal(args.strict_conflict,true);
      if(rev)assert.equal(args.mode.update,rev);else assert.equal(args.mode['.tag'],'add');
      onUpload?.();data=init.body;rev='r'+(uploads+2);return json({rev});
    }
    throw Error('Unexpected endpoint');
  };
  return {fetch,calls,data:()=>data,uploads:()=>uploads,refreshes:()=>refreshes};
}
function engine(store,extra={}){
  let state=seed(),savedDoc,savedAuth;
  const e=create({device:'local',getState:()=>state,applyState:s=>{state=s;},saveDoc:async d=>{savedDoc=d;},saveAuth:async a=>{savedAuth=a;},auth:{key:'publickey123',access:'access',refresh:'refresh',expires:Date.now()+3600000},fetch:store.fetch,...extra});
  e.changed();
  return {e,state:()=>state,edit:fn=>{fn(state);e.changed();},saved:()=>savedDoc,auth:()=>savedAuth};
}
test('first sync uses create-only upload and keeps credentials out of the remote file',async()=>{
  const store=mockStore(),x=engine(store);
  try{await x.e.sync();assert.equal(store.uploads(),1);assert.equal(x.e.getStatus().error,'');assert.equal(x.e.getStatus().pending,false);assert(x.e.getStatus().last>0);assert(!store.data().includes('refresh'));assert.equal(C.validate(JSON.parse(store.data())).format,'slb-records');}finally{x.e.stop();}
});
test('upload revision race re-downloads and merges instead of overwriting',async()=>{
  const store=mockStore({conflictOnce:true}),x=engine(store);
  try{await x.e.sync();assert.equal(store.uploads(),2);assert(x.state().entries.some(x=>x.id==='other'));}finally{x.e.stop();}
});
test('expired access token refreshes once then completes the same sync',async()=>{
  const store=mockStore({expired:true}),x=engine(store);
  try{await x.e.sync();assert.equal(store.refreshes(),1);assert.equal(x.auth().access,'test-access');assert.equal(store.uploads(),1);}finally{x.e.stop();}
});
test('offline failure does not claim success or replace local state',async()=>{
  const store=mockStore({offline:true}),x=engine(store),before=structuredClone(x.state());
  try{await assert.rejects(x.e.sync(),/unreachable/);assert.deepEqual(x.state(),before);assert.equal(x.e.getStatus().last,0);assert.equal(x.e.getStatus().busy,false);}finally{x.e.stop();}
});
test('a local edit during upload survives and remains pending for the next upload',async()=>{
  let x;const store=mockStore({onUpload:()=>x.edit(s=>{s.entries[0].t='Edit during upload';})});x=engine(store);
  try{await x.e.sync();assert.equal(x.state().entries[0].t,'Edit during upload');assert.equal(C.materialize(x.e.getDoc(),seed()).entries[0].t,'Edit during upload');}finally{x.e.stop();}
});
test('invalid remote records abort before upload or apply',async()=>{
  const store=mockStore({initial:JSON.stringify({format:'other',records:{}})}),x=engine(store),before=structuredClone(x.state());
  try{await assert.rejects(x.e.sync(),/Unsupported/);assert.equal(store.uploads(),0);assert.deepEqual(x.state(),before);}finally{x.e.stop();}
});
test('PKCE uses SHA-256 with a fresh verifier and sends no client secret',async()=>{
  const store=mockStore(),x=engine(store,{auth:{}});
  try{
    const pending=await x.e.startAuth('publickey123'),other=await x.e.startAuth('publickey123');
    assert.notEqual(pending.verifier,other.verifier);
    const url=new URL(pending.url);assert.equal(url.searchParams.get('code_challenge_method'),'S256');assert.equal(url.searchParams.get('token_access_type'),'offline');
    const expected=Buffer.from(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(pending.verifier))).toString('base64url');
    assert.equal(url.searchParams.get('code_challenge'),expected);
    await x.e.connect(pending,'test-code',false);assert.equal(x.auth().refresh,'test-refresh');
    assert.equal(new URLSearchParams(store.calls[0].init.body).get('code_verifier'),pending.verifier);assert(!store.calls[0].init.body.includes('client_secret'));
  }finally{x.e.stop();}
});
test('disconnect while downloading never uploads or restores credentials',async()=>{
  let release;const paused=new Promise(r=>{release=r;});
  const store=mockStore();const original=store.fetch;
  store.fetch=async(url,init)=>{if(url.endsWith('/download'))await paused;return original(url,init);};
  const x=engine(store);
  try{const running=x.e.sync();await new Promise(r=>setImmediate(r));await x.e.disconnect();release();await running;assert.equal(store.uploads(),0);assert.deepEqual(x.e.getAuth(),{});}finally{x.e.stop();}
});
test('encrypted remote data requires its passphrase and is never downgraded',async()=>{
  const initial=await C.encode(C.capture(C.blank(),seed(),'remote'),'a shared secret phrase');
  const store=mockStore({initial}),x=engine(store);
  try{
    await assert.rejects(x.e.sync(),/passphrase/);assert.equal(store.uploads(),0);
    x.e.setPassword('wrong');await assert.rejects(x.e.sync(),/decrypt/);assert.equal(store.uploads(),0);
    x.e.setPassword('a shared secret phrase');await x.e.sync();assert.equal(JSON.parse(store.data()).format,'slb-encrypted');assert.equal(x.e.getAuth().encrypted,true);
  }finally{x.e.stop();}
});
test('active editors pause sync and local history failures never report success',async()=>{
  const store=mockStore(),paused=engine(store,{canApply:()=>false});
  try{await assert.rejects(paused.e.sync(),/Finish editing/);assert.equal(store.calls.length,0);}finally{paused.e.stop();}
  const failed=engine(store,{saveDoc:async()=>{throw Error('Storage quota');}});
  try{await assert.rejects(failed.e.sync(),/Storage quota/);assert.equal(failed.e.getStatus().last,0);}finally{failed.e.stop();}
});
test('cross-tab envelopes preserve independent edits and concurrent versions',async()=>{
  const store=mockStore(),base=C.capture(C.blank(),seed(),'base');
  const a=engine(store,{doc:base,device:'tabA'}),b=engine(store,{doc:base,device:'tabB'});
  try{
    a.edit(s=>{s.entries[0].t='A local edit';});b.edit(s=>{s.tasks[0].t='Another local edit';});
    await a.e.receive(b.e.getDoc());await b.e.receive(a.e.getDoc());
    assert.equal(a.state().tasks[0].t,'Another local edit');assert.equal(b.state().entries[0].t,'A local edit');
    a.edit(s=>{s.entries[0].t='A competing edit';});b.edit(s=>{s.entries[0].t='B competing edit';});
    await a.e.receive(b.e.getDoc());assert(C.conflicts(a.e.getDoc()).length>=1);
  }finally{a.e.stop();b.e.stop();}
});
test('a stalled response body is aborted and never reports a successful sync',async()=>{
  const store={fetch:async(url,init)=>({arrayBuffer:()=>new Promise((resolve,reject)=>{init.signal.addEventListener('abort',()=>reject(new DOMException('Aborted','AbortError')));})})};
  const x=engine(store,{timeoutMs:20});
  try{await assert.rejects(x.e.sync(),/took too long/);assert.equal(x.e.getStatus().last,0);assert.equal(x.e.getStatus().busy,false);}finally{x.e.stop();}
});
