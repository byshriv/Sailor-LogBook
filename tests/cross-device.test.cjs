const {test}=require('node:test');
const assert=require('node:assert/strict');
const C=require('../sync-core.js');
const {create,PATH}=require('../dropbox-sync.js');
const {seed}=require('./helpers.cjs');
function dropbox(){
  let body=null,revision=0,uploads=0;const tokens=new Set(['desktop-token','mobile-token']);
  return{uploads:()=>uploads,read:()=>body,fetch:async(url,init)=>{
    await new Promise(r=>setImmediate(r));
    assert(tokens.has(init.headers.Authorization?.slice(7)),'each device uses its own OAuth token');
    const args=JSON.parse(init.headers['Dropbox-API-Arg']);assert.equal(args.path,PATH);
    if(url.endsWith('/download'))return body==null?Response.json({error_summary:'path/not_found/'},{status:409}):new Response(body,{headers:{'Dropbox-API-Result':JSON.stringify({rev:'rev'+revision})}});
    assert(url.endsWith('/upload'));
    const expected=body==null?args.mode['.tag']==='add':args.mode.update==='rev'+revision;
    if(!expected)return Response.json({error_summary:'path/conflict/file/'},{status:409});
    body=init.body;revision++;uploads++;return Response.json({rev:'rev'+revision});
  }};
}
function fresh(prefs={}){return{name:'',ob:0,docks:[],entries:[],tasks:[],best:[],mood:{},nb:{},bt:[],seen:{},pre:[],les:[],grat:[],pf:prefs,sync:{}};}
function device(kind,initial,store,{encrypted=false,password='',doc}={}){
  let state=structuredClone(initial),saved;
  const engine=create({device:kind,doc,auth:{key:'shared-public-app',access:kind+'-token',refresh:kind+'-refresh',expires:Date.now()+3600000,encrypted},getState:()=>state,
    shouldAdoptRemote:()=>!state.ob&&!state.entries.length&&!state.tasks.length,
    applyState:(next,context={})=>{if(context.adopted)next.ob=1;state=next;},saveDoc:async value=>{saved=structuredClone(value);},saveAuth:async()=>{},fetch:store.fetch});
  if(password)engine.setPassword(password);engine.changed();
  return{engine,state:()=>state,edit:fn=>{fn(state);engine.changed();},saved:()=>saved};
}
test('separate desktop and fresh mobile devices share one logbook, not credentials or preferences',async()=>{
  const store=dropbox(),initial=seed();initial.name='The owner';initial.pf={st:'cal',h24:1};initial.nb={'2026-10-20':{lines:[{id:'lineA',t:'Desktop memory'}],fsk:[]}};
  const desktop=device('desktop',initial,store),mobile=device('mobile',fresh({st:'note',h24:0}),store);
  try{
    await desktop.engine.sync();await mobile.engine.sync();
    assert.equal(mobile.state().ob,1);assert.equal(mobile.state().name,'The owner');assert.equal(mobile.state().docks.length,2);assert.equal(mobile.state().entries.length,1);
    assert.equal(mobile.state().pf.st,'note');assert.equal(desktop.state().pf.st,'cal');
    assert.equal(JSON.parse(store.read()).records['["name"]'].value,'The owner');
    mobile.edit(s=>{s.entries.push({id:'mobileEntry',t:'A walk from my phone',d:'work',date:'2026-10-21',s:420,e:450});});
    desktop.edit(s=>{s.nb['2026-10-20'].lines[0].t='An edited desktop memory';});
    await mobile.engine.sync();await desktop.engine.sync();await mobile.engine.sync();
    assert(desktop.state().entries.some(e=>e.id==='mobileEntry'));assert.equal(mobile.state().nb['2026-10-20'].lines[0].t,'An edited desktop memory');
    assert.deepEqual(C.flatten(desktop.state()),C.flatten(mobile.state()));
    assert(!store.read().includes('desktop-token'));assert(!store.read().includes('mobile-refresh'));
    desktop.edit(s=>{s.entries=s.entries.filter(e=>e.id!=='entry1');});await desktop.engine.sync();await mobile.engine.sync();
    assert(!mobile.state().entries.some(e=>e.id==='entry1'));
  }finally{desktop.engine.stop();mobile.engine.stop();}
});
test('a fresh desktop joins an encrypted mobile logbook only with the matching passphrase',async()=>{
  const store=dropbox(),phone=device('mobile',seed(),store,{encrypted:true,password:'the shared encryption phrase'}),desktop=device('desktop',fresh({st:'home'}),store);
  try{
    await phone.engine.sync();const before=store.read(),count=store.uploads();
    await assert.rejects(desktop.engine.sync(),/passphrase/);assert.equal(store.uploads(),count);assert.equal(store.read(),before);assert.equal(desktop.state().ob,0);
    desktop.engine.setPassword('incorrect phrase');await assert.rejects(desktop.engine.sync(),/decrypt/);assert.equal(store.read(),before);
    desktop.engine.setPassword('the shared encryption phrase');await desktop.engine.sync();
    assert.equal(desktop.state().ob,1);assert.equal(desktop.state().entries[0].t,'Read a book');assert.equal(desktop.engine.getAuth().encrypted,true);assert.equal(JSON.parse(store.read()).format,'slb-encrypted');
    desktop.edit(s=>{s.tasks[0].t='Edited on the computer';});await desktop.engine.sync();await phone.engine.sync();assert.equal(phone.state().tasks[0].t,'Edited on the computer');
  }finally{phone.engine.stop();desktop.engine.stop();}
});
test('an empty Dropbox folder cannot finish a new-device join or upload an empty starter file',async()=>{
  const store=dropbox(),phone=device('mobile',fresh(),store);
  try{await assert.rejects(phone.engine.sync(),/No logbook was found/);assert.equal(store.uploads(),0);assert.equal(store.read(),null);assert.equal(phone.state().ob,0);}finally{phone.engine.stop();}
});
test('simultaneous changes on different devices survive revision retries and retain conflicting versions',async()=>{
  const store=dropbox(),desktop=device('desktop',seed(),store),phone=device('mobile',fresh(),store);
  try{
    await desktop.engine.sync();await phone.engine.sync();
    desktop.edit(s=>{s.entries[0].t='Desktop version';});phone.edit(s=>{s.entries[0].t='Phone version';});
    await Promise.all([desktop.engine.sync(),phone.engine.sync()]);await desktop.engine.sync();await phone.engine.sync();
    const both=new Set([desktop.state().entries[0].t,...C.conflicts(desktop.engine.getDoc()).map(x=>x.version.value?.t)]);
    assert(both.has('Desktop version'));assert(both.has('Phone version'));assert.equal(desktop.state().entries[0].t,phone.state().entries[0].t);
  }finally{desktop.engine.stop();phone.engine.stop();}
});
