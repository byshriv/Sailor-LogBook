const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {load}=require('./helpers.cjs');
test('desktop screens render, sidebar collapses, search works and editor reserves timeline space',async()=>{
  const x=load();const w=await x.ready();
  try{
    assert.equal(x.errors.length,0,x.errors.map(x=>x.message).join('\n'));
    assert(w.document.querySelector('.desktop-sidebar'));
    w.eval("ACT.go('cal');V.a=P('2026-10-20');R()");assert.equal(w.eval('V.v'),7);assert.equal(w.document.querySelectorAll('.cl').length,7);
    w.eval('ACT.desktopCollapse()');assert(w.document.body.classList.contains('sidebar-small'));
    w.eval("openSheet({id:'entry1'})");await new Promise(r=>setTimeout(r,10));
    assert(w.document.body.classList.contains('editor-open'));assert(w.document.querySelector('#sh .editor-title'));
    w.eval('closeSheet();ACT.desktopCommands()');const input=w.document.querySelector('#command-query');input.value='Read a book';input.dispatchEvent(new w.Event('input',{bubbles:true}));
    assert(w.document.querySelector('#command-results').textContent.includes('Read a book'));
    w.eval('closeDesktopDialog()');
    for(const screen of ['home','reflect','note','plan','set','sea'])w.eval(`ACT.go('${screen}')`);
    w.eval("ACT.go('note')");assert.equal(w.document.querySelectorAll('.book-page').length,2);
    const row=w.document.querySelector('.rn[data-id="new"]');row.value='A calm morning';w.eval('rnCommit(document.querySelector(\'.rn[data-id="new"]\'),true)');
    assert.equal(w.document.querySelectorAll('.rn[data-id="new"]').length,1);
    w.eval('ACT.sync()');assert(w.document.querySelector('[data-a="dbx"]'));assert(!w.document.querySelector('#dbx-key'));assert(!w.document.querySelector('#tsc').textContent.includes('simulated'));
    assert.equal(x.errors.length,0,x.errors.map(x=>x.message).join('\n'));
  }finally{w.close();}
});
test('mobile keeps original navigation and avoids desktop markup',async()=>{
  const x=load({width:390}),w=await x.ready();
  try{
    for(const screen of ['home','reflect','note','cal','plan','sea']){
      w.eval(`ACT.go('${screen}')`);assert(!w.document.querySelector('.desktop-sidebar'));assert(!w.document.querySelector('.book-page'));
    }
    w.eval("ACT.go('home')");assert(w.document.querySelector('#nv'));assert.equal(x.errors.length,0);
  }finally{w.close();}
});
test('unchanged mobile views and notebook writing match the original v1 baseline',{skip:!fs.existsSync('.local/v1.html')},async()=>{
  const before=load({width:390,file:'.local/v1.html'}),after=load({width:390});
  const a=await before.ready(),b=await after.ready();
  try{
    for(const screen of ['home','reflect','cal','plan']){
      for(const w of [a,b])w.eval(`scr='${screen}';V.a=P('2026-10-20');R();R()`);
      // Exclude the explicitly requested date/input metadata and Planner dimming.
      const normalize=html=>html.replace(/class="pc past-day"/g,'class="pc"').replace(/ data-day="[^"]*"/g,'').replace(/ home-page-date/g,'').replace(/ (?:autocomplete|data-form-type|data-lpignore|data-1p-ignore)="[^"]*"/g,'').replace(/ name="logbook-[^"]*"/g,'');
      assert.equal(normalize(b.document.querySelector('#app').innerHTML),normalize(a.document.querySelector('#app').innerHTML),screen);
    }
    for(const w of [a,b])w.eval("scr='note';R();R()");
    assert.equal(b.document.querySelector('.pg').innerHTML,a.document.querySelector('.pg').innerHTML,'mobile notebook writing');
    for(const w of [a,b])w.eval("scr='sea';R();R()");
    assert.equal(b.document.querySelector('.water').innerHTML,a.document.querySelector('.water').innerHTML,'sea content');
  }finally{a.close();b.close();}
});
test('sidebar collections replace desktop settings cards and reuse deck/preset editors',async()=>{
  const x=load(),w=await x.ready();
  try{
    w.eval("S.pre=[{t:'Read daily',d:'learn',dur:45}];ACT.go('set')");
    assert(w.document.body.classList.contains('sidebar-small'));
    assert(!w.document.querySelector('#smain > .card.cur'));
    assert(![...w.document.querySelectorAll('#smain > .card > p')].some(p=>p.textContent==='Presets'));
    w.eval("ACT.desktopSection('decks');ACT.desktopSection('presets')");
    assert.equal(w.document.querySelector('#sidebar-decks').hidden,false);
    assert.equal(w.document.querySelector('#sidebar-presets').hidden,false);
    w.eval("ACT.desktopDeckEdit('learn')");assert(w.document.querySelector('#tsc').textContent.includes('deck'));
    w.eval("closeT();ACT.desktopPresetEdit('0')");assert.equal(w.document.querySelector('#pt').value,'Read daily');
    w.eval("closeT();window.TestDate=Date;Date=class extends TestDate{constructor(...args){super(...(args.length?args:['2026-10-26T12:00:00']))}};ACT.desktopPreset('0');Date=TestDate");assert.equal(w.document.querySelector('#ti').value,'Read daily');assert.equal(w.eval('SH.e-SH.s'),45);assert.equal(w.eval('SH.d'),'learn');
    w.eval("closeSheet();ACT.go('home')");assert(!w.document.body.classList.contains('sidebar-small'));
    w.eval('ACT.desktopCollapse()');assert(w.document.body.classList.contains('sidebar-small'));
    assert.equal(w.document.querySelectorAll('.desktop-actions [data-a="desktopNew"]').length,1);
    assert(!w.document.querySelector('.desktop-sidebar [data-a="desktopNew"]'));
    w.eval('ACT.desktopSync()');assert(w.document.querySelector('[data-a="dbx"]'));
    assert.equal(x.errors.length,0,x.errors.map(e=>e.message).join('\n'));
  }finally{w.close();}
});
test('Notebook keeps its section switch, while Sea adventure uses Back and no mobile nav',async()=>{
  for(const width of [390,1440]){
    const x=load({width}),w=await x.ready();
    try{
      w.eval("ACT.go('note')");assert.equal(w.document.querySelectorAll('.notebook-switcher').length,1);assert(!w.document.querySelector('.seac'));
      assert.equal(w.document.querySelector('.notebook-switcher [aria-current="page"]').textContent,'Notebook');
      if(width===1440){assert(w.document.querySelector('.book-writing'));assert(w.document.querySelector('.book-drawing'));assert(w.document.querySelector('.desktop-actions [data-a="bottle"]'));}
      const input=w.document.querySelector('.rn[data-id="new"]');input.value='A small happy thing';w.eval('rnCommit(document.querySelector(\'.rn[data-id="new"]\'),true)');
      if(width===1440)assert.equal(w.document.querySelector('.notebook-count').textContent,'1 moment');
      w.eval("ACT.go('sea')");assert(!w.document.querySelector('.notebook-switcher'));assert(w.document.querySelector('.sea [data-a="go:note"]'));
      if(width===390)assert(!w.document.querySelector('#nv'));
      else assert(w.document.querySelector('.desktop-sidebar [data-a="go:note"][aria-current="page"]'));
      assert.equal(x.errors.length,0,x.errors.map(e=>e.message).join('\n'));
    }finally{w.close();}
  }
});
test('mouse gestures move and resize entries and timed tasks and resize a typed ghost',async()=>{
  const x=load(),w=await x.ready();
  try{
    w.eval("ACT.go('cal');V.a=P('2026-10-20');R()");
    const prepare=()=>{for(const col of w.document.querySelectorAll('.cl'))col.getBoundingClientRect=()=>({top:0,left:0,width:100,height:1344});w.document.elementFromPoint=()=>w.document.querySelector('.cl[data-k="2026-10-20"]');};
    const point=(target,type,y)=>{const e=new w.MouseEvent(type,{bubbles:true,clientX:100,clientY:y,button:0});Object.defineProperty(e,'pointerId',{value:1});Object.defineProperty(e,'pointerType',{value:'mouse'});target.dispatchEvent(e);};
    prepare();let b=w.document.querySelector('[data-e="entry1"]');point(b,'pointerdown',520);point(b,'pointermove',576);point(b,'pointerup',576);
    assert.equal(w.eval('S.entries[0].s'),600);assert.equal(w.eval('S.entries[0].e'),660);
    prepare();b=w.document.querySelector('[data-a="tedit:task1"]');point(b,'pointerdown',630);point(b,'pointermove',686);point(b,'pointerup',686);
    assert.equal(w.eval('S.tasks[0].time'),720);assert.equal(w.eval('S.tasks[0].dur'),30);
    prepare();b=w.document.querySelector('[data-a="tedit:task1"]');const handle=b.querySelector('[data-side="b"]');point(handle,'pointerdown',700);point(handle,'pointermove',756);point(handle,'pointerup',756);
    assert.equal(w.eval('S.tasks[0].dur'),90);
    prepare();const col=w.document.querySelector('.cl[data-k="2026-10-20"]');point(col,'pointerdown',112);point(col,'pointerup',112);
    w.document.querySelector('#ti').value='Do not lose this draft';const ghost=w.document.querySelector('.gh [data-side="b"]');point(ghost,'pointerdown',140);point(ghost,'pointermove',280);point(ghost,'pointerup',280);
    assert.equal(w.eval('SH.e'),300);assert.equal(w.document.querySelector('#ti').value,'Do not lose this draft');
    w.eval('closeSheet();openT({id:"task1"})');await new Promise(r=>setTimeout(r,0));assert(w.document.body.classList.contains('editor-open'));
    w.eval('ACT.go("home")');assert(!w.document.querySelector('#tsh.on'));assert(!w.document.body.classList.contains('editor-open'));
    assert.equal(x.errors.length,0,x.errors.map(e=>e.message).join('\n'));
  }finally{w.close();}
});
