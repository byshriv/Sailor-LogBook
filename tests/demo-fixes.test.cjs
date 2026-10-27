const {test}=require('node:test');
const assert=require('node:assert/strict');
const C=require('../sync-core.js');
const {load,seed}=require('./helpers.cjs');

test('Planner Add task opens an editable form and saves into the chosen day on mobile and desktop',async()=>{
  for(const width of [390,1440]){
    const x=load({width}),w=await x.ready();
    try{
      w.eval("ACT.go('plan')");
      const button=w.document.querySelector('.pc [data-a^="tnew:"]'),day=button.dataset.a.slice(5);
      button.click();assert(w.document.querySelector('#tsh.on'));assert(w.document.querySelector('#tt'));
      const input=w.document.querySelector('#tt');input.value='Read chapters +lea t45';input.dispatchEvent(new w.Event('input',{bubbles:true}));
      assert(w.document.querySelector('#task-deck-match').textContent.includes('Learning'));
      assert.equal(input.style.borderColor,'rgb(216, 185, 76)');
      const chip=w.document.querySelector('[data-a="tpk:learn"]');assert.equal(chip.getAttribute('aria-pressed'),'true');
      w.document.querySelector('[data-a="saveT"]').click();
      assert(w.eval(`S.tasks.some(t=>t.date==='${day}'&&t.t==='Read chapters'&&t.d==='learn'&&t.dur===45)`));
      assert.equal(w.document.querySelectorAll('.pc.past-day').length,3);
      assert.equal(x.errors.length,0,x.errors.map(e=>e.message).join('\n'));
    }finally{w.close();}
  }
});

test('choosing a calendar preset reveals Done only in Menu B and saves its deck and duration',async()=>{
  const x=load({width:390}),w=await x.ready();try{
    w.eval("S.pre=[{t:'Read daily',d:'learn',dur:45}];ACT.go('cal');V.a=P('2026-10-20');R();openSheet({date:'2026-10-20',s:600,e:630})");
    assert(!w.document.querySelector('#qb [data-a="quickDone"]'));
    w.document.querySelector('#qb [data-a="prs:0"]').click();
    const done=w.document.querySelector('#qb [data-a="quickDone"]');assert(done);done.click();
    assert(w.eval("S.entries.some(e=>e.t==='Read daily'&&e.d==='learn'&&e.e-e.s===45)"));
    assert.equal(w.eval('SH'),null);
  }finally{w.close();}
});

test('presets without a duration survive validation, local-history initialization and encrypted round trips',async()=>{
  const state=seed();state.pre=[{t:'Tea',d:null,dur:0}];
  const doc=C.capture(C.blank(),state,'device');assert.doesNotThrow(()=>C.validate(doc));
  assert.equal(C.materialize(await C.decode(await C.encode(doc,'a long enough passphrase'),'a long enough passphrase'),{pf:{}}).pre[0].dur,0);
  const x=load({state,storage:{'slb-sync-records':doc}}),w=await x.ready();try{
    assert(w.slbSync);assert.equal(w.eval('syncReady'),true);assert.equal(w.eval('S.pre[0].t'),'Tea');
  }finally{w.close();}
});

test('installed icons preserve the original mark and use opaque edge-to-edge PNG canvases',async()=>{
  const fs=require('node:fs'),sharp=require('sharp');
  const original=fs.readFileSync('svg icons and animations/sailor_logbook_logo.svg','utf8'),installed=fs.readFileSync('icons/app-icon.svg','utf8');
  assert.equal((installed.match(/<path /g)||[]).length,(original.match(/<path /g)||[]).length);
  assert(installed.includes('C585.121 780.36 577 1080 577 1080'),'the mark’s original inner curve remains');
  assert(installed.includes(original.slice(original.indexOf('<defs>'),original.indexOf('<clipPath'))),'all original gradients and paper filters remain');
  assert(!installed.includes('rx="240"'),'only the operating system rounds the install container');
  for(const [name,size]of [['icon-192.png',192],['icon-512.png',512],['icon-maskable-512.png',512],['apple-touch-icon.png',180],['favicon-32.png',32]]){
    const meta=await sharp('icons/'+name).metadata();assert.equal(meta.width,size);assert.equal(meta.height,size);assert.equal(meta.hasAlpha,false,'no transparent pre-rounded gaps');
  }
});
