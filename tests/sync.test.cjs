const {test}=require('node:test');
const assert=require('node:assert/strict');
const C=require('../sync-core.js');
const {seed}=require('./helpers.cjs');
const state=()=>seed();
test('independent offline records and deletes converge without data loss',()=>{
  const s=state(),base=C.capture(C.blank(),s,'base');
  const a=structuredClone(s),b=structuredClone(s);
  a.entries.push({...a.entries[0],id:'entry2',t:'A new moment'});b.tasks[0].t='Changed elsewhere';
  const da=C.capture(base,a,'phone'),db=C.capture(base,b,'desktop');
  assert.deepEqual(C.merge(da,db),C.merge(db,da));
  const merged=C.materialize(C.merge(da,db),s);
  assert.equal(merged.entries.length,2);assert.equal(merged.tasks[0].t,'Changed elsewhere');
  const deleted=structuredClone(merged);deleted.entries=deleted.entries.filter(x=>x.id!=='entry1');
  const deletion=C.capture(C.merge(da,db),deleted,'phone');
  assert.equal(C.materialize(C.merge(deletion,db),s).entries.some(x=>x.id==='entry1'),false);
});
test('simultaneous edit/delete keeps a recoverable conflict and resolution stays resolved',()=>{
  const s=state(),base=C.capture(C.blank(),s,'base'),a=structuredClone(s),b=structuredClone(s);
  a.entries[0].t='Edited on phone';b.entries=[];
  const merged=C.merge(C.capture(base,a,'phone'),C.capture(base,b,'desktop'));
  const conflicts=C.conflicts(merged);assert.equal(conflicts.length,1);
  const restored=C.resolve(merged,conflicts[0].id,true,'phone');
  assert.equal(C.conflicts(restored).length,0);
  assert.equal(C.conflicts(C.merge(restored,merged)).length,0);
  assert.deepEqual(C.merge(merged,merged),merged);
});
test('sequential edits are causal and do not create spurious conflicts',()=>{
  const s=state(),base=C.capture(C.blank(),s,'base');s.entries[0].t='First';
  const a=C.capture(base,s,'phone');s.entries[0].t='Second';
  const b=C.capture(a,s,'desktop');const merged=C.merge(a,b);
  assert.equal(C.conflicts(merged).length,0);assert.equal(C.materialize(merged,s).entries[0].t,'Second');
});
test('notebook lines merge individually, retain order and device preferences stay local',()=>{
  const s=state();s.nb={'2026-10-20':{lines:[{id:'line1',t:'One'},{id:'line2',t:'Two'}],fsk:[]}};
  const base=C.capture(C.blank(),s,'base'),a=structuredClone(s),b=structuredClone(s);
  a.nb['2026-10-20'].lines[0].t='Phone';b.nb['2026-10-20'].lines[1].t='Desktop';
  const result=C.materialize(C.merge(C.capture(base,a,'phone'),C.capture(base,b,'desktop')),{...s,pf:{st:'note'},sync:{on:1}});
  assert.deepEqual(result.nb['2026-10-20'].lines.map(x=>x.t),['Phone','Desktop']);assert.equal(result.pf.st,'note');assert.equal(result.sync.on,1);
  assert.equal(JSON.stringify(base).includes('refresh_token'),false);
});
test('AES-GCM round trip and incorrect passphrases leave the source intact',async()=>{
  const doc=C.capture(C.blank(),state(),'device');const encoded=await C.encode(doc,'a long test passphrase');
  assert.equal(encoded.includes('Read a book'),false);assert.deepEqual(await C.decode(encoded,'a long test passphrase'),doc);
  await assert.rejects(C.decode(encoded,'wrong passphrase'),/Unable to decrypt/);
  await assert.rejects(C.decode(encoded,''),/passphrase/);
});
test('malformed remote data is rejected before applying it',()=>{
  const doc=C.capture(C.blank(),state(),'device');const bad=structuredClone(doc);
  bad.records['["entries","entry1"]'].value.s=-10;assert.throws(()=>C.validate(bad),/Invalid logged time/);
  assert.throws(()=>C.validate({format:'unknown'}),/Unsupported/);
});
test('deck recency stays local and concurrent best things keep the four/day limit',()=>{
  const s=state();s.best=[];const base=C.capture(C.blank(),s,'base'),a=structuredClone(s),b=structuredClone(s);
  a.docks[0].r=100;b.docks[0].r=200;
  for(let i=0;i<4;i++){a.best.push({id:'a'+i,date:'2026-10-20',t:'A '+i});b.best.push({id:'b'+i,date:'2026-10-20',t:'B '+i});}
  const merged=C.merge(C.capture(base,a,'phone'),C.capture(base,b,'desktop'));
  const view=C.materialize(merged,a);assert.equal(view.best.length,4);assert.equal(view.docks.find(x=>x.id==='work').r,100);
  assert.equal(C.conflicts(merged).length,4);assert.equal(C.conflicts(merged).filter(x=>JSON.parse(x.key)[0]==='docks').length,0);
  assert.deepEqual(C.merge(merged,merged),merged);
});
