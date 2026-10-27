const {test}=require('node:test');
const assert=require('node:assert/strict');
const C=require('../sync-core.js');
const D=require('../dropbox-sync.js');
const {load,seed}=require('./helpers.cjs');
const pending=()=>({key:'publickey123',verifier:'a'.repeat(64),state:'verified-random-state',redirectUri:'https://logbook.shriv.work/',created:Date.now()});
function remote(initial=null){
  let body=initial,uploads=0,tokens=0;
  return {body:()=>body,uploads:()=>uploads,tokens:()=>tokens,request:async(url,init)=>{
    if(url.includes('oauth2/token')){tokens++;return Response.json({access_token:'device-access',refresh_token:'device-refresh',expires_in:3600});}
    if(url.endsWith('/download'))return body===null?Response.json({error_summary:'path/not_found/'},{status:409}):new Response(body,{headers:{'Dropbox-API-Result':JSON.stringify({rev:'r'+uploads})}});
    uploads++;body=init.body;return Response.json({rev:'r'+uploads});
  }};
}
async function callback(store,state=seed(),width=1440){
  const p=pending(),x=load({state,width,url:'https://logbook.shriv.work/?code=one-use-code&state='+p.state,session:{'slb-dropbox-pending':p},request:store.request});
  const w=await x.ready();await w.LogbookDropboxUI.handleReturn();return{x,w};
}

test('redirect OAuth uses PKCE/state and the same redirect URI at token exchange',async()=>{
  let request;const engine=D.create({device:'desktop',getState:seed,applyState(){},saveDoc:async()=>{},saveAuth:async()=>{},fetch:async(url,init)=>{request=init;return Response.json({access_token:'access',refresh_token:'refresh',expires_in:3600});}});
  try{const p=await engine.startAuth('publickey123',{redirectUri:'https://logbook.shriv.work/'}),url=new URL(p.url);assert.equal(url.searchParams.get('state'),p.state);assert.equal(url.searchParams.get('redirect_uri'),p.redirectUri);assert.equal(url.searchParams.get('code_challenge_method'),'S256');await engine.connect(p,'code',false,{deferSetup:true});assert.equal(new URLSearchParams(request.body).get('redirect_uri'),p.redirectUri);assert(engine.getAuth().needsSetup);await assert.rejects(engine.sync(),/Finish connecting/);await engine.configureEncryption(false,'');assert.equal(engine.getAuth().needsSetup,false);}finally{engine.stop();}
});

test('OAuth callback rejects mismatched state, expiry, wrong origins and canceled grants',()=>{
  const p=pending();assert.equal(D.validateCallback('https://logbook.shriv.work/?code=code&state='+p.state,p).code,'code');assert.throws(()=>D.validateCallback('https://logbook.shriv.work/?code=code&state=other',p),/verified/);assert.throws(()=>D.validateCallback('https://other.example/?code=code&state='+p.state,p),/unexpected/);assert.throws(()=>D.validateCallback('https://logbook.shriv.work/?code=code&state='+p.state,{...p,created:0}),/verified/);assert.throws(()=>D.validateCallback('https://logbook.shriv.work/?error=access_denied&state='+p.state,p),/canceled/);
});

test('callback initializes an empty App Folder automatically without encryption, including duration-free presets',async()=>{
  const store=remote(),state=seed();state.pre=[{t:'Tea',d:null,dur:0}];const{x,w}=await callback(store,state);
  try{
    await Promise.all([w.LogbookDropboxUI.handleReturn(),w.LogbookDropboxUI.handleReturn()]);
    assert.equal(store.tokens(),1);assert.equal(store.uploads(),1);assert.equal(JSON.parse(store.body()).format,'slb-records');
    assert(!w.location.search.includes('code'));assert(!w.location.search.includes('state'));assert.equal(w.sessionStorage.getItem('slb-dropbox-pending'),null);
    assert(!w.document.querySelector('[data-a="dbxChooseEncryption"]'));assert.equal(w.slbSync.getAuth().needsSetup,false);assert.equal(w.slbSync.getAuth().encrypted,false);
    assert.equal(w.eval('S.pre[0].dur'),0);assert.equal(x.errors.length,0,x.errors.map(e=>e.message).join('\n'));
  }finally{w.close();}
});

test('a fresh device automatically adopts an existing plaintext logbook',async()=>{
  const state=seed();state.name='On the phone';state.pre=[{t:'Walk',d:null,dur:0}];const store=remote(await C.encode(C.capture(C.blank(),state,'phone')));
  const{x,w}=await callback(store,{name:'',ob:0,docks:[],entries:[],pf:{snd:0,hap:0}});
  try{assert.equal(w.eval('S.ob'),1);assert.equal(w.eval('scr'),'home');assert.equal(w.eval('S.name'),'On the phone');assert.equal(w.eval('S.entries[0].t'),'Read a book');assert.equal(store.uploads(),1);assert(w.document.querySelector('#shortcut-practice'),'desktop existing-account connection starts keyboard practice');assert.equal(x.errors.length,0);}finally{w.close();}
});

test('connecting an existing book on mobile does not launch the desktop keyboard tour',async()=>{
  const store=remote(await C.encode(C.capture(C.blank(),seed(),'phone'))),{w}=await callback(store,{name:'',ob:0,docks:[],entries:[],pf:{snd:0,hap:0}},390);
  try{assert.equal(w.eval('S.ob'),1);assert(!w.document.querySelector('#shortcut-practice'));}finally{w.close();}
});

test('connecting during fresh onboarding to an empty folder waits for the profile instead of uploading a blank book',async()=>{
  const store=remote(),{w}=await callback(store,{name:'',ob:0,docks:[],entries:[],pf:{snd:0,hap:0}});
  try{assert.equal(store.uploads(),0);assert(w.slbSync.getAuth().refresh);assert.equal(w.slbSync.getAuth().needsSetup,false);assert.equal(w.eval('scr'),'ob');assert(!w.document.querySelector('#tsh.on'));assert(!w.slbSync.getStatus().error);}finally{w.close();}
});

test('existing encrypted books require unlocking and are never silently replaced with plaintext',async()=>{
  const state=seed();state.pre=[{t:'Tea',d:null,dur:0}];const password='the existing secret phrase',original=await C.encode(C.capture(C.blank(),state,'phone'),password),store=remote(original);
  const{x,w}=await callback(store,{name:'',ob:0,docks:[],entries:[],pf:{snd:0,hap:0}});
  try{
    assert.equal(store.uploads(),0);assert(w.document.querySelector('#dbx-password'));assert.equal(w.slbSync.getAuth().needsSetup,true);
    w.document.querySelector('#dbx-password').value='wrong password';await w.eval('ACT.dbxEncryptFinish()');assert.equal(store.body(),original);assert.equal(store.uploads(),0);
    w.document.querySelector('#dbx-password').value=password;await w.eval('ACT.dbxEncryptFinish()');assert.equal(store.uploads(),1);assert.equal(JSON.parse(store.body()).format,'slb-encrypted');assert.equal(w.eval('S.ob'),1);assert.equal(w.eval('scr'),'home');assert.equal(w.slbSync.getAuth().encrypted,true);assert.equal(x.errors.length,0);
  }finally{w.close();}
});

test('encryption is secondary: cancel leaves ordinary sync usable and explicitly enabling it encrypts the copy',async()=>{
  const store=remote(),{w}=await callback(store);
  try{
    w.eval('ACT.dbxEnableEncryption()');assert(w.document.querySelector('#dbx-password'));assert.equal(w.slbSync.getAuth().needsSetup,false);
    w.eval('ACT.dbxEncryptionBack()');await w.eval('ACT.syn()');assert.equal(JSON.parse(store.body()).format,'slb-records');
    w.eval('ACT.dbxEnableEncryption()');w.document.querySelector('#dbx-password').value='an optional secret phrase';await w.eval('ACT.dbxEncryptFinish()');assert.equal(JSON.parse(store.body()).format,'slb-encrypted');assert.equal(w.slbSync.getAuth().encrypted,true);
  }finally{w.close();}
});

test('an invalid callback makes no token request and keeps local data intact',async()=>{
  let calls=0;const initial=seed(),x=load({url:'https://logbook.shriv.work/?code=bad&state=forged',session:{'slb-dropbox-pending':pending()},request:async()=>{calls++;throw Error('must not call');},state:initial}),w=await x.ready();
  try{await w.LogbookDropboxUI.handleReturn();assert.equal(calls,0);assert.equal(w.eval('S.entries[0].t'),initial.entries[0].t);assert(w.document.querySelector('#sync-status').textContent.includes('could not be verified'));assert(!w.location.search.includes('code'));}finally{w.close();}
});

test('expired authorization returns an actionable error and does not alter existing credentials',async()=>{
  const auth={key:'oldpublickey',refresh:'existing-refresh',access:'existing-access'},engine=D.create({device:'desktop',auth,getState:seed,applyState(){},saveDoc:async()=>{},saveAuth:async()=>{},fetch:async()=>Response.json({error:'invalid_grant'},{status:400})});
  try{await assert.rejects(engine.connect(pending(),'used-code',false),/expired or was already used/);assert.deepEqual(engine.getAuth(),auth);}finally{engine.stop();}
});
