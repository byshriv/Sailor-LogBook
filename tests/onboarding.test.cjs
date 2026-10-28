const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {load}=require('./helpers.cjs');
test('desktop welcome is a dialog and desktop setup skips mobile-only installation/widgets',async()=>{
  const x=load({state:{name:'',ob:0,docks:[],entries:[],pf:{snd:0,hap:0}}}),w=await x.ready();
  try{
    assert(w.document.body.classList.contains('desktop-onboarding'));assert(w.document.querySelector('#desktop-welcome-backdrop'));assert.equal(w.document.querySelector('#obv').getAttribute('role'),'dialog');
    assert(w.document.querySelector('#obv').textContent.includes('Sailor Logbook'));
    w.eval('ACT.obn()');w.document.querySelector('#nm').value='A sailor';w.eval('ACT.obn()');assert.equal(w.eval('ob'),3);
    w.eval("S.pf.fn='Often';ACT.obn()");assert(w.document.querySelector('.desktop-quote-next'));
    w.eval("QS=0;ob=4;S.pf.su=['cal'];ACT.obn()");assert.equal(w.eval('ob'),6);
    w.eval('ACT.obn()');assert.equal(w.eval('ob'),7);assert.equal(w.eval('HSS'),0);
    w.eval('ACT.nrm()');assert.equal(w.eval('ob'),9);w.eval('ACT.obb()');assert.equal(w.eval('ob'),7);
    w.eval('ACT.obn();ACT.obn();ACT.sail()');assert(!w.document.body.classList.contains('desktop-onboarding'));assert(w.document.querySelector('#tour.desktop-tour'));
    assert.equal(x.errors.length,0,x.errors.map(e=>e.message).join('\n'));
  }finally{w.close();}
});
test('desktop walkthrough targets desktop controls, can go back and releases focus when skipped',async()=>{
  const x=load(),w=await x.ready();
  try{
    w.eval('startTour()');assert(w.document.querySelector('#tour.desktop-tour'));assert.equal(w.document.querySelector('#app').inert,true);
    for(let i=0;i<w.LogbookOnboarding.guide.length;i++){
      w.eval('TR='+i+';tour()');const step=w.LogbookOnboarding.guide[i];if(step[1])assert(w.document.querySelector(step[1]),'missing target '+step[1]);
      assert(!w.document.querySelector('#tour').textContent.includes('Tap +'));
    }
    w.eval('ACT.desktopTourBack()');assert.equal(w.eval('TR'),12);w.eval('ACT.tskip()');assert.equal(w.document.querySelector('#app').inert,false);assert.equal(w.document.querySelector('#tour').style.display,'none');
    assert.equal(x.errors.length,0,x.errors.map(e=>e.message).join('\n'));
  }finally{w.close();}
});
test('mobile opening keeps the supplied artwork and can connect to an existing Dropbox logbook',async()=>{
  const x=load({width:390,state:{name:'',ob:0,docks:[],entries:[],pf:{snd:0,hap:0}}}),w=await x.ready();
  try{
    assert(!w.document.body.classList.contains('desktop-onboarding'));assert(w.document.querySelector('#slg').src.endsWith('icons/brand-icon.svg'));
    w.eval('ACT.acc()');assert(w.document.querySelector('[data-a="sync"]'));assert(!w.document.querySelector('#tsc').textContent.includes('GitHub version'));
    w.eval('ACT.sync()');assert(w.document.querySelector('[data-a="dbx"]'));assert.equal(x.errors.length,0);
  }finally{w.close();}
});
test('product and installed names are renamed while the original SVG stays unchanged',()=>{
  const html=fs.readFileSync('index.html','utf8'),manifest=JSON.parse(fs.readFileSync('manifest.webmanifest','utf8'));
  assert.equal(manifest.name,'Sailor Logbook');assert.equal(manifest.short_name,'Logbook');assert(html.includes('apple-mobile-web-app-title" content="Logbook"'));assert(!html.includes('Sailor’s LogBook'));
  assert.deepEqual(fs.readFileSync('icons/brand-icon.svg'),fs.readFileSync('svg icons and animations/sailor_logbook_logo.svg'));
  assert(manifest.icons.some(icon=>icon.src==='icons/app-icon.svg'&&icon.sizes==='any'));
});
