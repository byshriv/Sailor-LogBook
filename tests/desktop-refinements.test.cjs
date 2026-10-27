const {test}=require('node:test');const assert=require('node:assert/strict');const {load}=require('./helpers.cjs');
function pointer(w,node,type,x,y){const e=new w.MouseEvent(type,{bubbles:true,cancelable:true,clientX:x,clientY:y,button:0});Object.defineProperties(e,{pointerId:{value:9},pointerType:{value:'mouse'}});node.dispatchEvent(e);}
const rect=(left=0,top=0,width=200,height=150)=>({left,top,width,height,right:left+width,bottom:top+height});

test('desktop Calendar adds only a 3-day view and derives dropped task status around the now-line',async()=>{
  const x=load(),w=await x.ready();try{
    w.eval("window.RealClock=Date;Date=class extends RealClock{constructor(...args){super(...(args.length?args:['2026-10-20T14:07:00']))}};ACT.go('cal');V.a=P('2026-10-20');R()");
    w.document.querySelector('[data-a="view:3"]').click();assert.equal(w.eval('V.v'),3);assert.equal(w.document.querySelectorAll('.cl').length,3);
    for(const [minute,expected]of [[855,'todo'],[810,'doing'],[780,'done']]){
      w.eval("S.tasks[0].time=900;S.tasks[0].dur=60;S.tasks[0].date='2026-10-20';S.tasks[0].man=1;S.tasks[0].st='stuck';R()");
      const col=w.document.querySelector('.cl[data-k="2026-10-20"]');col.getBoundingClientRect=()=>rect(0,0,200,1344);w.document.elementFromPoint=()=>col;
      const block=w.document.querySelector('[data-a="tedit:task1"]');pointer(w,block,'pointerdown',100,840);pointer(w,block,'pointermove',100,minute/60*56);pointer(w,block,'pointerup',100,minute/60*56);
      assert.equal(w.eval('S.tasks[0].st'),expected);assert.equal(w.eval('S.tasks[0].man'),0);assert.equal(w.eval('S.tasks[0].time'),minute);
      assert.equal(w.document.querySelector('[data-a="tedit:task1"]').dataset.clockStatus,expected);assert.equal(w.eval('S.entries.length'),1,'dragging never converts a planned record into a log');
    }
    w.eval('desktopMedia.matches=false;innerWidth=390;R()');assert.equal(w.document.querySelectorAll('.cl').length,1);assert(!w.document.querySelector('[data-a="view:3"]'));
    assert.equal(x.errors.length,0,x.errors.map(e=>e.message).join('\n'));
  }finally{w.close();}
});

test('desktop greeting is one line and the Notebook footer sends and edits a sent page',async()=>{
  const x=load(),w=await x.ready();try{
    const greeting=w.document.querySelector('.desktop-greeting');assert(greeting.textContent.includes(' Alex'));assert(!greeting.querySelector('br'));
    w.eval("ACT.go('note');document.querySelector('.rn').value='A good day';rnCommit(document.querySelector('.rn'),0)");
    assert.equal(w.document.querySelector('.notebook-footer [data-a="bottle"]').textContent.trim(),'Send to sea');
    w.eval("ACT.bottle();ACT.go('note')");assert(w.document.querySelector('.notebook-footer [data-a="nbe"]'));
    assert.equal(x.errors.length,0,x.errors.map(e=>e.message).join('\n'));
  }finally{w.close();}
});

test('Planner dragging moves the same task to another day and cancel preserves its date',async()=>{
  const x=load(),w=await x.ready();try{
    w.eval("S.tasks=[{id:'moveTask',t:'Move this task',d:'learn',date:K(new Date()),time:null,dur:45,st:'todo',must:1}];ACT.go('plan')");
    const task=w.document.querySelector('[data-a="tedit:moveTask"]'),target=w.document.querySelectorAll('.pc')[4],date=target.dataset.day;
    task.getBoundingClientRect=()=>rect();w.document.querySelector('.cols').getBoundingClientRect=()=>rect(0,0,900,600);w.document.elementFromPoint=()=>target;
    pointer(w,task,'pointerdown',20,20);pointer(w,task,'pointermove',500,200);assert(target.classList.contains('desktop-drop-target'));pointer(w,task,'pointerup',500,200);
    assert.equal(w.eval('S.tasks[0].date'),date);assert.equal(w.eval('S.tasks[0].id'),'moveTask');assert.equal(w.eval('S.tasks[0].dur'),45);assert.equal(w.eval('S.tasks[0].must'),1);
    const moved=w.document.querySelector('[data-a="tedit:moveTask"]');moved.getBoundingClientRect=()=>rect();w.document.elementFromPoint=()=>w.document.querySelectorAll('.pc')[5];
    pointer(w,moved,'pointerdown',20,20);pointer(w,moved,'pointermove',500,200);pointer(w,moved,'pointercancel',500,200);assert.equal(w.eval('S.tasks[0].date'),date);assert(!w.document.querySelector('.desktop-drag-preview'));
    assert.equal(x.errors.length,0,x.errors.map(e=>e.message).join('\n'));
  }finally{w.close();}
});

test('desktop hold-and-drag reorders Home and Reflection once, saves it and supports cancellation',async()=>{
  const x=load(),w=await x.ready();try{
    for(const screen of ['home','reflect']){
      w.eval(`ED=0;ACT.go('${screen}');ACT.ed()`);
      const grid=w.document.querySelector('.bg2'),cards=grid.querySelectorAll('[data-k]'),source=cards[0],target=cards[1],first=target.dataset.k;
      grid.getBoundingClientRect=()=>rect(0,0,600,500);source.getBoundingClientRect=()=>rect();target.getBoundingClientRect=()=>rect(200,0);w.document.elementFromPoint=()=>target;
      pointer(w,source,'pointerdown',20,20);await new Promise(r=>setTimeout(r,315));assert(w.document.querySelector('.desktop-drag-preview'));
      pointer(w,source,'pointermove',350,50);pointer(w,source,'pointerup',350,50);
      const field=screen==='home'?'order':'rorder';assert.equal(w.eval(`S.${field}[0]`),first);assert.equal(JSON.parse(w.localStorage.getItem('slb1'))[field][0],first);assert(!w.document.querySelector('.scr.enter'));
      const before=w.eval(`JSON.stringify(S.${field})`),card=w.document.querySelector('.bg2>[data-k]');card.getBoundingClientRect=()=>rect();w.document.elementFromPoint=()=>w.document.querySelectorAll('.bg2>[data-k]')[1];
      pointer(w,card,'pointerdown',20,20);pointer(w,card,'pointermove',350,50);w.LogbookDesktopDrag.cancel();assert.equal(w.eval(`JSON.stringify(S.${field})`),before);
      assert(!w.document.querySelector('.desktop-drag-preview'));assert.equal(x.errors.length,0,x.errors.map(e=>e.message).join('\n'));
    }
  }finally{w.close();}
});

test('desktop deck/sub-deck navigation animates page changes but a re-render of the same deck stays still',async()=>{
  const x=load(),w=await x.ready();try{
    w.eval("S.docks.push({id:'reading',n:'Reading',c:'#d8b94c',p:'learn'});ACT.dkp('learn');ACT.dkp('reading')");assert(w.document.querySelector('.scr.enter'));
    w.eval('R()');assert(!w.document.querySelector('.scr.enter'));
    w.eval("ACT.dkp('learn')");assert(w.document.querySelector('.scr.enter'));assert.equal(x.errors.length,0);
  }finally{w.close();}
});

test('persistent-storage status reports the browser result and can be requested again explicitly',async()=>{
  let granted=false,requests=0;
  const x=load({storageManager:{persisted:async()=>granted,persist:async()=>{requests++;return granted;}}}),w=await x.ready();try{
    await w.LogbookStorage.ensure();assert.equal(requests,1);assert.equal(w.LogbookStorage.status(),'standard');w.eval("ACT.go('set')");assert.equal(w.document.querySelector('[data-a="desktopStorage"] em').textContent,'Standard browser storage');
    granted=true;await w.LogbookStorage.ensure(true);assert.equal(w.LogbookStorage.status(),'protected');assert.equal(w.document.querySelector('[data-a="desktopStorage"] em').textContent,'Protected');
    assert.equal(x.errors.length,0);
  }finally{w.close();}
});

test('desktop welcome includes bookmarking guidance and storage gracefully handles unavailable APIs',async()=>{
  const x=load({state:{name:'',ob:0,docks:[],entries:[],pf:{snd:0,hap:0}},storageManager:null}),w=await x.ready();try{
    assert(w.document.querySelector('#obv').textContent.includes('Bookmark this website'));
    await w.LogbookStorage.ensure();assert.equal(w.LogbookStorage.status(),'unavailable');assert.equal(x.errors.length,0);
  }finally{w.close();}
});
