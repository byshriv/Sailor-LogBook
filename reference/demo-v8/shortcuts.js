/* Sailor Logbook — MIT. Familiar app shortcuts, with an optional desktop-only practice tour. */
(function(){
  const groups=[
    ['Create & find',[['N','Log something'],['T / Shift A','New task'],['Shift P','New deck'],['Alt N','Open Notebook'],['Ctrl/Cmd K / Shift F','Search and commands'],['?','Show keyboard shortcuts']]],
    ['Move around',[['1–6','Home, Calendar, Planner, Reflection, Notebook, Settings'],['Shift S','Open Calendar'],['Shift L','Open Planner'],['Shift T','Go to today'],['Shift D','Focus the sidebar'],[',','Open Settings'],['Esc','Close the current overlay or editor']]],
    ['Work with items',[['J / K','Focus the next / previous item'],['Enter / E','Edit the focused item'],['D','Toggle the focused task’s done status'],['Ctrl/Cmd D','Duplicate the focused item'],['Delete / Backspace','Delete the focused item, with confirmation'],['Ctrl/Cmd Enter','Save the current editor']]],
    ['Calendar & sync',[['← / →','Previous / next calendar period'],['+ / −','Zoom the time grid'],['0','Reset calendar zoom'],['Ctrl + scroll','Zoom around the pointer'],['Ctrl/Cmd S','Sync Dropbox outside an editor']]]
  ];
  let practice=-1;
  const practiceSteps=[['A moment, without a mouse','Press N to start a log from anywhere outside a text field.','N'],['Plan something','Shift+A opens a new task. T is a shorter alternative.','Shift A'],['Find your way','Ctrl+K on Windows/Linux or Cmd+K on a Mac opens search and commands.','Ctrl/Cmd K'],['You’re in control','Esc closes an editor or overlay. Try it to reach your shortcut reference.','Esc'],['View all keyboard shortcuts','Keep this reference close. Press ? to open it whenever you need it.','']];
  const reference=()=>`<div class="shortcut-help">${groups.map(([title,items])=>`<section><h3>${title}</h3>${items.map(([keys,label])=>`<div class="shortcut-row"><span>${label}</span><kbd>${keys}</kbd></div>`).join('')}</section>`).join('')}</div>`;
  function help(){if(!desktop())return;practice=-1;desktopDialog(`<div class="sync-close"><h2>Keyboard shortcuts</h2><button class="ib" data-dialog-close aria-label="Close keyboard shortcuts">${I(IC.x,18)}</button></div><p class="sync-copy" style="margin-top:12px">Shortcuts work while the app has focus. Ordinary typing and browser tab shortcuts are left alone.</p><div class="shortcut-help">${groups.map(([title,items])=>`<section><h3>${title}</h3>${items.map(([keys,label])=>`<div class="shortcut-row"><span>${label}</span><kbd>${keys}</kbd></div>`).join('')}</section>`).join('')}</div><button class="btn g" data-a="shortcutPracticeStart">Try the shortcut tour</button>`,'Keyboard shortcuts');Q('.slb-dialog').classList.add('shortcut-dialog');}
  function offer(){
    if(!desktop()||S.pf.shortcutOfferSeen)return;
    S.pf.shortcutOfferSeen=1;sv();
    desktopDialog('<p class="welcome-eyebrow">ONE OPTIONAL EXTRA</p><h2 style="margin-top:12px">Want a quick keyboard tour?</h2><p class="sync-copy">Try four useful shortcuts in a safe practice area. It won’t create or change your entries. You can always press ? to find the full list later.</p><div class="sync-actions"><button class="btn g" data-a="shortcutDecline">No thanks</button><button class="btn" data-a="shortcutPracticeStart">Show me</button></div>','Optional keyboard shortcut tour');
  }
  function renderPractice(){
    const [title,copy,keys]=practiceSteps[practice];
    const last=practice===practiceSteps.length-1,examples=['<strong>Read book</strong><span>Learning · 45 minutes</span>','<strong>Plan tomorrow</strong><span>A task, with an optional time.</span>','<strong>Search moments and commands</strong><span>Find a log or jump to another page.</span>','<strong>Close the current editor</strong><span>Return to your workspace.</span>'];
    desktopDialog(`<div id="shortcut-practice"><div class="sync-close"><p class="mu">Keyboard tour · ${practice+1} of ${practiceSteps.length}</p><button class="ib" data-a="shortcutPracticeSkip" aria-label="Close shortcut tour">${I(IC.x,18)}</button></div><div class="shortcut-progress" aria-hidden="true">${practiceSteps.map((_,i)=>`<i class="${i<=practice?'on':''}"></i>`).join('')}</div><h2>${title}</h2><p class="sync-copy">${copy}</p>${last?reference():`<div class="shortcut-key-stage"><kbd>${keys}</kbd><div class="shortcut-example">${examples[practice]}</div></div><p class="sync-footnote">Safe practice. Press the shortcut or choose Next.</p>`}<div class="sync-actions">${practice?'<button class="btn g" data-a="shortcutPracticeBack">Back</button>':'<button class="btn g" data-a="shortcutPracticeSkip">Skip</button>'}<button class="btn" data-a="shortcutPracticeNext">${last?'Done':'Next'}</button></div></div>`,'Keyboard shortcut practice');
    if(last)Q('.slb-dialog').classList.add('shortcut-dialog');
  }
  function finishPractice(){practice=-1;S.pf.shortcutTour=1;sv();closeDesktopDialog();toast('Press ? whenever you need the shortcuts.');}
  ACT.shortcuts=help;ACT.shortcutDecline=()=>{S.pf.shortcutOffer='declined';sv();closeDesktopDialog();};
  ACT.shortcutPracticeStart=()=>{if(!desktop())return;practice=0;renderPractice();};
  ACT.shortcutPracticeBack=()=>{if(practice>0){practice--;renderPractice();}};
  ACT.shortcutPracticeNext=()=>{if(practice<practiceSteps.length-1){practice++;renderPractice();}else finishPractice();};
  ACT.shortcutPracticeSkip=finishPractice;
  function consume(e,action){e.preventDefault();e.stopImmediatePropagation();action();return true;}
  function itemFromFocus(){const el=document.activeElement?.closest('.b,[data-a^="tedit:"],[data-a^="edit:"]');if(!el||!Q('#app').contains(el))return null;const value=el.dataset.a||'',task=value.startsWith('tedit:');return{id:task?value.slice(6):el.dataset.e||value.slice(5),task,element:el};}
  function focusItem(delta){const items=[...Q('#app').querySelectorAll('.b,.tk[data-a^="tedit:"],.tk [data-a^="tedit:"]')];if(!items.length)return;const current=items.indexOf(document.activeElement?.closest('.b,.tk[data-a],.tk [data-a]'));const next=items[Math.max(0,Math.min(items.length-1,current<0?0:current+delta))];next.tabIndex=0;next.focus();next.scrollIntoView({block:'nearest'});}
  function zoom(delta){if(scr!=='cal')return;const c=Q('.cs'),old=hhv();S.hh=delta===0?56:Math.max(30,Math.min(150,old+delta));Q('.gr')?.style.setProperty('--hh',S.hh+'px');if(c)c.scrollTop=c.scrollTop/old*S.hh;sv();}
  function handleKey(e){
    if(!desktop())return false;
    if(practice>=0&&!Q('#shortcut-practice'))practice=-1;
    if(practice>=0){
      if(e.key==='Tab'||e.target.closest('button')&&['Enter',' '].includes(e.key))return false;
      const k=e.key.toLowerCase(),mod=e.ctrlKey||e.metaKey;
      if(e.key==='Escape'&&practice!==3)return consume(e,finishPractice);
      const expected=[!mod&&!e.shiftKey&&k==='n',e.shiftKey&&k==='a',mod&&k==='k',e.key==='Escape'][practice];
      if(expected)return consume(e,()=>ACT.shortcutPracticeNext());
      return false;
    }
    if(Q('#slb-overlay'))return false;
    const editing=e.target.closest('input,textarea,select,[contenteditable=true]'),mod=e.ctrlKey||e.metaKey,k=e.key.toLowerCase();
    if(mod&&e.key==='Enter'&&(SH||TS))return consume(e,()=>{if(SH?.mode==='q')logNow();else if(SH)ACT.save();else saveT();});
    if(editing)return false;
    if(e.key==='?')return consume(e,help);
    if(mod&&k==='s'){if(SH||TS)return false;return consume(e,()=>ACT.desktopSync());}
    if(Q('#tsh').classList.contains('on')||SH)return false;
    if(mod&&k==='d'){const item=itemFromFocus();if(item)return consume(e,()=>{contextRecord=item;contextAction('duplicate');});return false;}
    if(mod)return false;
    if(e.altKey&&k==='n')return consume(e,()=>ACT.go('note'));
    if(e.altKey)return false;
    if(['+','=','-','0'].includes(k)&&scr==='cal')return consume(e,()=>zoom(k==='0'?0:k==='-'?-8:8));
    if(e.shiftKey){
      const action={a:()=>ACT.desktopTask(),p:()=>ACT.desktopDeckAdd(),f:()=>openCommands(),d:()=>Q('.desktop-sidebar [aria-current="page"]')?.focus(),s:()=>ACT.go('cal'),l:()=>ACT.go('plan'),t:()=>{ACT.go('cal');ACT.today();}}[k];
      if(action)return consume(e,action);return false;
    }
    if(k==='6'||k===',')return consume(e,()=>ACT.go('set'));
    if(k==='w')return consume(e,()=>ACT.go('home'));
    if(k==='j'||k==='k')return consume(e,()=>focusItem(k==='j'?1:-1));
    const item=itemFromFocus();
    if(item&&k==='d'&&item.task)return consume(e,()=>{const task=S.tasks.find(t=>t.id===item.id);if(task)task.man=1;ACT.tdone(item.id);});
    if(item&&['e','Enter'].includes(e.key))return consume(e,()=>ACT[item.task?'tedit':'edit'](item.id));
    if(item&&['Delete','Backspace'].includes(e.key))return consume(e,()=>confirmInApp('Delete this item','This removes the selected item from your logbook.',()=>{contextRecord=item;contextAction('delete');}));
    return false;
  }
  const baseSearch=searchCommands;
  searchCommands=function(query){const list=baseSearch(query);if(!query.trim()||/shortcut|keyboard|help/i.test(query))list.push({title:'Keyboard shortcuts',detail:'View the shortcut list or try a short tour',shortcut:'?',run:help});return list;};
  window.LogbookShortcuts={offer,help,handleKey,groups,start:()=>{if(desktop()){S.pf.shortcutOfferSeen=1;sv();ACT.shortcutPracticeStart();}}};
})();
