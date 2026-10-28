const {test}=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const C=require('../sync-core.js');const {load,seed}=require('./helpers.cjs');
function conflicting(cloudActor='cloudActor',count=1){
  const initial=seed();initial.tasks=[];const device='localDevice',base=C.capture(C.blank(),initial,'initialActor');
  if(count>1){initial.entries.push({...initial.entries[0],id:'entry2'});Object.assign(base,C.capture(base,initial,'initialActor'));}
  const local=structuredClone(initial),cloud=structuredClone(initial);local.entries[0].t='Device version';cloud.entries[0].t='Dropbox version';
  if(count>1){local.entries[1].t='Device version 2';cloud.entries[1].t='Dropbox version 2';}
  const doc=C.merge(C.capture(base,local,device+'_tab'),C.capture(base,cloud,cloudActor));
  return{doc,device,state:C.materialize(doc,initial)};
}
async function choose(w,button){const[action,value]=button.dataset.a.split(':');await w.eval(`ACT[${JSON.stringify(action)}](${JSON.stringify(value)})`);}

test('sidebar sub-decks expand and collapse under their parent without navigating',async()=>{
  const state=seed();state.docks.push({id:'reading',n:'Reading',c:'#d8b94c',p:'learn'});const x=load({state}),w=await x.ready();try{
    w.eval("ACT.desktopSection('decks')");const toggle=w.document.querySelector('[data-a="desktopDeckToggle:learn"]');assert(toggle);assert(w.document.querySelector('#subdecks-learn').hidden);
    toggle.click();assert(!w.document.querySelector('#subdecks-learn').hidden);assert.equal(toggle.getAttribute('aria-expanded'),'true');assert.equal(w.eval('scr'),'home');
    w.document.querySelector('#subdecks-learn [data-a="desktopDeck:reading"]').click();assert.equal(w.eval('DK'),'reading');assert(w.document.querySelector('.scr.enter'));
    w.document.querySelector('[data-a="desktopDeckToggle:learn"]').click();assert(w.document.querySelector('#subdecks-learn').hidden);assert.equal(w.eval('DK'),'reading');assert.equal(x.errors.length,0);
  }finally{w.close();}
});

test('mobile sync has visible status text and Sea adventure has neither bottom nav nor a section toggle',async()=>{
  const x=load({width:390}),w=await x.ready();try{
    assert(w.document.body.classList.contains('mobile-sync-visible'));assert.equal(w.document.querySelector('#mobile-sync span').textContent,'Connect');
    w.eval("ACT.go('note')");assert(w.document.querySelector('.notebook-switcher'));w.eval("ACT.go('sea')");assert(!w.document.querySelector('.notebook-switcher'));assert(!w.document.querySelector('#nv'));assert(w.document.querySelector('.sea [data-a="go:note"]'));
    assert.equal(x.errors.length,0);
  }finally{w.close();}
});

test('conflict review appears only when needed, labels the versions and restores the selected Dropbox copy',async()=>{
  const c=conflicting(),x=load({state:c.state,storage:{'slb-device':c.device,'slb-sync-records':c.doc}}),w=await x.ready();try{
    assert.equal(w.slbSync.getConflictCount(),1);assert.equal(w.document.querySelector('.toolbar-sync').dataset.state,'conflict');
    w.eval('ACT.desktopSync()');const review=w.document.querySelector('.sync-conflicts');assert(review);assert(review.textContent.includes('This device'));assert(review.textContent.includes('Dropbox'));
    const cloud=[...review.querySelectorAll('.conflict-choice')].find(x=>x.querySelector('h5').textContent==='Dropbox');assert(cloud.textContent.includes('Dropbox version'));
    await choose(w,cloud.querySelector('button'));assert.equal(w.eval('S.entries[0].t'),'Dropbox version');assert.equal(w.slbSync.getConflictCount(),0);assert(!w.document.querySelector('.sync-conflicts'));assert.doesNotThrow(()=>C.validate(w.slbSync.getDoc()));assert.equal(x.errors.length,0);
  }finally{w.close();}
});

test('the device version can be restored even when Dropbox was the initially selected winner',async()=>{
  const c=conflicting('zzzCloud'),x=load({state:c.state,storage:{'slb-device':c.device,'slb-sync-records':c.doc}}),w=await x.ready();try{
    assert.equal(w.eval('S.entries[0].t'),'Dropbox version');w.eval('ACT.sync()');const local=[...w.document.querySelectorAll('.conflict-choice')].find(x=>x.querySelector('h5').textContent==='This device');
    assert(local.querySelector('button').dataset.a.startsWith('dbxConflictRestore:'));await choose(w,local.querySelector('button'));assert.equal(w.eval('S.entries[0].t'),'Device version');assert.equal(w.slbSync.getConflictCount(),0);
  }finally{w.close();}
});

test('a stale conflict comparison asks for fresh review instead of overwriting a newer edit',async()=>{
  const c=conflicting(),x=load({state:c.state,storage:{'slb-device':c.device,'slb-sync-records':c.doc}}),w=await x.ready();try{
    w.eval('ACT.sync()');const button=w.document.querySelector('[data-a^="dbxConflictRestore:"]');w.eval("S.entries[0].t='A newer edit';sv()");await choose(w,button);
    assert.equal(w.eval('S.entries[0].t'),'A newer edit');assert.equal(w.slbSync.getConflictCount(),1);assert(w.document.querySelector('.sync-conflicts').textContent.includes('A newer edit'));
    w.eval("closeT();ACT.go('cal');openSheet({date:'2026-10-20',s:600,e:630});document.querySelector('#ti').value='Unsaved draft';ACT.desktopSync()");assert.equal(w.document.querySelector('#ti').value,'Unsaved draft');assert(!w.document.querySelector('#tsh.on'));
  }finally{w.close();}
});

test('keeping the device version preserves it, and choosing a Dropbox deletion removes only that item',async()=>{
  const c=conflicting(),x=load({state:c.state,storage:{'slb-device':c.device,'slb-sync-records':c.doc}}),w=await x.ready();try{
    w.eval('ACT.sync()');await choose(w,w.document.querySelector('[data-a^="dbxConflictKeep:"]'));assert.equal(w.eval('S.entries[0].t'),'Device version');assert.equal(w.slbSync.getConflictCount(),0);
  }finally{w.close();}
  const initial=seed();initial.tasks=[];const base=C.capture(C.blank(),initial,'baseActor'),local=structuredClone(initial),cloud=structuredClone(initial);local.entries[0].t='Keep or remove';cloud.entries=[];
  const doc=C.merge(C.capture(base,local,'localDevice_tab'),C.capture(base,cloud,'cloudActor'));
  const y=load({state:C.materialize(doc,local),storage:{'slb-device':'localDevice','slb-sync-records':doc}}),v=await y.ready();try{
    v.eval('ACT.sync()');const deleted=[...v.document.querySelectorAll('.conflict-choice')].find(x=>x.querySelector('h5').textContent==='Dropbox');assert(deleted.textContent.includes('Removed'));
    await choose(v,deleted.querySelector('button'));assert.equal(v.eval('S.entries.length'),0);assert.equal(v.slbSync.getConflictCount(),0);
  }finally{v.close();}
});

test('conflict buttons use stable IDs when a different conflict is resolved while review remains open',async()=>{
  const c=conflicting('cloudActor',2),x=load({state:c.state,storage:{'slb-device':c.device,'slb-sync-records':c.doc}}),w=await x.ready();try{
    w.eval('ACT.sync()');const second=[...w.document.querySelectorAll('.conflict-choice')].find(x=>x.textContent.includes('Dropbox version 2')).querySelector('button');
    const first=C.conflicts(w.slbSync.getDoc()).find(x=>JSON.parse(x.key)[1]==='entry1');await w.slbSync.resolve(first.id,false);
    await choose(w,second);assert.equal(w.eval("S.entries.find(x=>x.id==='entry1').t"),'Device version');assert.equal(w.eval("S.entries.find(x=>x.id==='entry2').t"),'Dropbox version 2');assert.equal(w.slbSync.getConflictCount(),0);
  }finally{w.close();}
});

test('normal sync has no conflict prompt, validation still rejects bad preset durations, and the deployment is v8',async()=>{
  const x=load(),w=await x.ready();try{w.eval('ACT.sync()');assert(!w.document.querySelector('.sync-conflicts'));assert.equal(w.slbSync.getConflictCount(),0);}finally{w.close();}
  for(const dur of [-1,1441]){const state=seed();state.pre=[{t:'Invalid',d:null,dur}];assert.throws(()=>C.validate(C.capture(C.blank(),state,'testActor')),/Invalid preset/);}
  assert(fs.readFileSync('sw.js','utf8').includes("const V='slb-v8-r3'"));
});
