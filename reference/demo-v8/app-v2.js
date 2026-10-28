/* Sailor Logbook — MIT. Progressive desktop enhancement; mobile views stay intact. */
const desktopMedia = matchMedia('(min-width: 900px)');
const desktop = () => desktopMedia.matches && scr !== 'ob';
let desktopFirstCalendar = true, desktopAnchor = null, desktopDrag = null, desktopIgnoreClick = 0;
let commandIndex = 0, commandItems = [], dialogReturnFocus = null, syncReady = false;
const desktopScreens = [['home','Home','home'],['cal','Calendar','cal'],['plan','Planner','pen'],['reflect','Reflection','bulb'],['note','Notebook','ship'],['set','Settings','set']];
let sidebarSmall = LS.getItem('slb-sidebar') === 'small' || (LS.getItem('slb-sidebar') == null && innerWidth < 1200);
const sidebarSections={decks:false,presets:false};
const sidebarDeckOpen=new Set((value=>Array.isArray(value)?value:[])(readLocal('slb-sidebar-subdecks',[])));
function hasNotebookDraft(){const input=document.activeElement;if(!input?.matches('.rn'))return false;const line=(S.nb[ND]?.lines||[]).find(x=>x.id===input.dataset.id);return input.value.trim()!==(line?.t||'').trim();}
const toolbarIcons={search:'<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 4 4"/>',sync:'<path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" /><path d="M21 3v5h-5" /><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" /><path d="M8 16H3v5" />',decks:'<path d="m12 3 9 5-9 5-9-5 9-5ZM3 12l9 5 9-5M3 16l9 5 9-5"/>',presets:'<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>',edit:'<path d="m16 3 5 5L8 21H3v-5L16 3Z"/>'};
function sidebarCollection(type){
  const decks=type==='decks',label=decks?'Decks':'Presets';
  const deckRow=(d,children=[])=>`<div class="sidebar-item-row${d.p?' sidebar-subdeck':''}"><button class="sidebar-item" data-a="desktopDeck:${d.id}" title="Open ${esc(d.n)}"><i class="deck-dot" style="background:${d.c}"></i><span>${esc(d.n)}</span></button>${children.length?`<button class="sidebar-deck-toggle" data-a="desktopDeckToggle:${d.id}" aria-expanded="${sidebarDeckOpen.has(d.id)}" aria-controls="subdecks-${d.id}" aria-label="${sidebarDeckOpen.has(d.id)?'Collapse':'Expand'} ${esc(d.n)} sub-decks">${I('<path d="m6 9 6 6 6-6"/>',14)}</button>`:''}<button class="sidebar-edit" data-a="desktopDeckEdit:${d.id}" aria-label="Edit ${esc(d.n)} deck">${I(toolbarIcons.edit,14)}</button></div>`;
  const tree=(d,seen=new Set())=>{if(seen.has(d.id))return'';const next=new Set([...seen,d.id]),children=S.docks.filter(x=>x.p===d.id&&!next.has(x.id));return deckRow(d,children)+(children.length?`<div class="sidebar-subdecks" id="subdecks-${d.id}" ${sidebarDeckOpen.has(d.id)?'':'hidden'}>${children.map(x=>tree(x,next)).join('')}</div>`:'');};
  const rows=decks?S.docks.filter(d=>!d.p).map(d=>tree(d)).join(''):
    S.pre.map((p,i)=>{const preset=prx(p);return`<div class="sidebar-item-row"><button class="sidebar-item" data-a="desktopPreset:${i}" title="Log ${esc(preset.t)}">${I(IC.plus,14)}<span>${esc(preset.t)}${preset.dur?`<small>${preset.dur} min</small>`:''}</span></button><button class="sidebar-edit" data-a="desktopPresetEdit:${i}" aria-label="Edit ${esc(preset.t)} preset">${I(toolbarIcons.edit,14)}</button></div>`;}).join('');
  return `<section class="sidebar-group"><button class="sidebar-toggle" data-a="desktopSection:${type}" aria-expanded="${sidebarSections[type]}" aria-controls="sidebar-${type}" title="${label}">${I(toolbarIcons[type],20)}<span class="nav-label">${label}</span><span class="sidebar-caret nav-label">${I('<path d="m8 10 4 4 4-4"/>',14)}</span></button><div class="sidebar-dropdown" id="sidebar-${type}" ${sidebarSections[type]?'':'hidden'}>${rows||`<p class="sidebar-empty">No ${label.toLowerCase()} yet.</p>`}<button class="sidebar-add" data-a="${decks?'desktopDeckAdd':'desktopPresetAdd'}">${I(IC.plus,15)}<span>Add ${decks?'a deck':'a preset'}</span></button></div></section>`;
}
function notebookNavigation(){
  if(!['note','sea'].includes(scr))return;
  const view=Q('#app > .scr'),heading=view?.querySelector('.ch1');if(!heading)return;
  view.querySelector('.seac')?.remove();
  if(scr==='sea'){view.querySelector('.notebook-switcher')?.remove();if(!desktopMedia.matches)Q('#nv')?.remove();return;}
  if(!view.querySelector('.notebook-switcher'))heading.insertAdjacentHTML('afterend',`<nav class="notebook-switcher" aria-label="Notebook sections"><button data-a="go:note" ${scr==='note'?'aria-current="page"':''}>${I(IC.note,16)}Notebook</button><button data-a="go:sea" ${scr==='sea'?'aria-current="page"':''}>${I(IC.ship,17)}Sea adventure</button></nav>`);
}
function notebookWorkspace(){
  const paper=Q('.nb .pg');if(!paper||paper.querySelector('.book-page'))return;
  const view=paper.closest('.nb'),title=view.querySelector('.ch1 .ct');
  if(title)title.textContent='Notebook';
  view.querySelector('.ch1')?.insertAdjacentHTML('beforeend','<p class="notebook-subtitle">A message in a bottle. A little piece of your day.</p>');
  const datebar=view.querySelector('.ch2');datebar?.classList.add('notebook-datebar');
  const left=document.createElement('section'),right=document.createElement('section');
  left.className='book-page book-writing';right.className='book-page book-drawing';
  left.setAttribute('aria-label','Daily writing');right.setAttribute('aria-label','Daily drawing');
  left.innerHTML='<div class="paper-heading"><span>01 / YOUR MOMENTS</span><span class="notebook-count"></span></div><p class="paper-label">The little things you did</p>';
  right.innerHTML='<div class="paper-heading"><span>02 / A LITTLE DOODLE</span><span>'+I(toolbarIcons.edit,14)+'</span></div><p class="paper-label">Draw your day.</p>';
  [...paper.children].forEach(child=>{if(child.dataset.a==='bottle')child.remove();else(child.classList.contains('rw')?left:right).appendChild(child);});
  paper.append(left,right);
  paper.insertAdjacentHTML('afterend','<div class="notebook-footer"><span>Little moments, kept.</span><span>Press Enter to save a line.</span></div>');
  updateNotebookCount();
}
function updateNotebookCount(){const count=Q('.notebook-count');if(count){const n=(S.nb[ND]?.lines||[]).length;count.textContent=n+' '+(n===1?'moment':'moments');}}
const originalNotebookCommit=rnCommit;
rnCommit=function(input,enter){originalNotebookCommit(input,enter);updateNotebookCount();};
function desktopContextAction(){
  if(scr==='cal'||scr==='plan')return'<button class="toolbar-secondary" data-a="desktopTask" title="New task · T">'+I(IC.pen,17)+'<span>New task</span></button>';
  if(scr==='note'){const sent=S.bt.includes(ND)&&NBE!==ND;return`<button class="toolbar-secondary notebook-send" data-a="${sent?'nbe':'bottle'}">${I(IC.ship,17)}<span>${sent?'Edit page':'Send to sea'}</span></button>`;}
  if(scr==='sea')return'<button class="toolbar-secondary" data-a="go:note">'+I(IC.note,17)+'<span>Write a message</span></button>';
  if(scr==='reflect'||scr==='rv2')return'<button class="toolbar-secondary" data-a="rv2">'+I(IC.note,17)+'<span>Review</span></button>';
  if(scr==='set'||scr==='sp')return'<button class="toolbar-secondary" data-a="bk">'+I('<path d="M12 3v12m-4-4 4 4 4-4M4 16v5h16v-5"/>',17)+'<span>Backup</span></button>';
  return'';
}
function closeDesktopDialog() {
  Q('#slb-overlay')?.remove();
  if (dialogReturnFocus?.isConnected) dialogReturnFocus.focus();
}
function desktopDialog(content, label) {
  dialogReturnFocus = document.activeElement;
  Q('#slb-overlay')?.remove();
  const overlay = document.createElement('div'); overlay.id = 'slb-overlay'; overlay.className = 'slb-overlay';
  overlay.innerHTML = `<div class="slb-dialog" role="dialog" aria-modal="true" aria-label="${esc(label)}">${content}</div>`;
  overlay.addEventListener('click', e => { if (e.target === overlay) closeDesktopDialog(); });
  document.body.appendChild(overlay);
  (overlay.querySelector('input,button,[tabindex]'))?.focus();
}
function desktopChrome() {
  document.body.classList.toggle('desktop-active', desktop());
  document.body.classList.toggle('sidebar-small', scr!=='home'||sidebarSmall);
  document.body.classList.toggle('sidebar-auto',scr!=='home');
  document.body.dataset.screen = scr;
  Q('.desktop-sidebar')?.remove(); Q('.desktop-bar')?.remove();
  notebookNavigation();
  if (!desktop()) { document.body.classList.remove('editor-open'); return; }
  const title = desktopScreens.find(x=>x[0] === scr)?.[1] || ({sea:'Sea adventure',rv2:'Review',sp:'Settings',dkp:'Deck',wg:'Widgets'})[scr] || 'Logbook';
  const side = document.createElement('aside'); side.className = 'desktop-sidebar'; side.setAttribute('aria-label','Main navigation');
  side.innerHTML = `<div class="desktop-brand">${LG(30)}<span><strong>Sailor Logbook</strong><small>A little further, every day.</small></span></div><div class="sidebar-scroll"><nav>${desktopScreens.map(([key,label,icon])=>`<button data-a="go:${key}" title="${label}" ${(scr===key||(key==='note'&&scr==='sea'))?'aria-current="page"':''}>${I(IC[icon],20)}<span class="nav-label">${label}</span></button>`).join('')}</nav><div class="sidebar-collections">${sidebarCollection('decks')}${sidebarCollection('presets')}</div></div><div class="sidebar-foot"><button data-a="desktopCommands" title="Search and commands · Ctrl+K">${I(toolbarIcons.search,20)}<span class="nav-label">Search & commands</span></button>${scr==='home'?`<button data-a="desktopCollapse" title="${sidebarSmall?'Expand':'Collapse'} sidebar" aria-expanded="${!sidebarSmall}">${I('<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M9 4v16"/>',20)}<span class="nav-label">${sidebarSmall?'Expand':'Collapse'} sidebar</span></button>`:''}<p>Open source · MIT</p></div>`;
  document.body.appendChild(side);
  const bar = document.createElement('header'); bar.className = 'desktop-bar';
  bar.innerHTML = `<div class="workspace-heading"><p class="workspace-name">${esc(title)}</p><p>${new Date().toLocaleDateString('en',{weekday:'long',month:'long',day:'numeric'})}</p></div><div class="desktop-actions"><button class="desktop-search toolbar-icon" data-a="desktopCommands" aria-label="Search moments and commands" title="Search · ${/Mac/.test(navigator.platform)?'Cmd':'Ctrl'}+K">${I(toolbarIcons.search,18)}</button><button class="toolbar-sync toolbar-icon" data-a="desktopSync" aria-label="Dropbox sync" title="Dropbox sync">${I(toolbarIcons.sync,19)}<i class="sync-indicator"></i></button>${desktopContextAction()}<button class="desktop-log" data-a="desktopNew" title="New log · N">${I(IC.plus,18)}<span>Log something</span></button><button class="toolbar-profile" data-a="go:set" aria-label="Profile and settings" title="Profile and settings">${AVH(34)}</button></div>`;
  Q('#app').prepend(bar);
  updateToolbarSync();
  if(scr==='set')document.querySelectorAll('#smain > .card').forEach(card=>{if(['Decks','Presets'].includes(card.querySelector(':scope > p')?.textContent))card.remove();});
  document.querySelectorAll('.b').forEach(b => {
    if (!b.querySelector('.hd')) b.insertAdjacentHTML('beforeend','<i class="hd" data-side="t"></i><i class="hd" data-side="b"></i>');
    b.tabIndex = 0; b.setAttribute('role','button'); b.setAttribute('aria-label',b.textContent.trim());
  });
  notebookWorkspace();
  window.LogbookDesktop?.enhance();
  updateDesktopEditor();
}
const mobileRender = R;
R = function() {
  window.LogbookOnboarding?.beforeRender();
  if(!desktopMedia.matches&&V.v===3)V.v=S.pf.dv||1;
  if (desktop() && scr === 'cal' && desktopFirstCalendar) { V.v = 7; desktopFirstCalendar = false; }
  mobileRender(); desktopChrome();window.LogbookOnboarding?.afterRender();window.LogbookSyncScheduler?.afterRender();
};
function updateDesktopEditor() {
  const isDesktop = desktop(), taskPanel = isDesktop && scr === 'cal' && !!TS && Q('#tsh').classList.contains('on');
  if(Q('#tsh').classList.contains('desktop-task')!==taskPanel)Q('#tsh').classList.toggle('desktop-task',taskPanel);
  document.body.classList.toggle('editor-open',isDesktop && ((SH?.mode === 'm' && Q('#sh').classList.contains('on')) || taskPanel));
  if (!isDesktop) return;
  const panel = taskPanel ? Q('#tsc') : SH?.mode === 'm' ? Q('#sh .sc') : null;
  if (panel && !panel.querySelector('.editor-title')) {
    panel.insertAdjacentHTML('afterbegin',`<div class="editor-title"><span>${taskPanel?'Planned task':'Your logged moment'}</span><button class="ib" data-a="${taskPanel?'cls':'desktopCloseSheet'}" aria-label="Close editor">${I(IC.x,18)}</button></div>`);
  }
  const cs = Q('.cs'); if (cs && (SH || taskPanel)) cs.style.paddingBottom = '0px';
  positionQuickAdd();
}
function positionQuickAdd() {
  if (!desktop() || SH?.mode !== 'q' || Q('#qb').style.display !== 'block') return;
  const q = Q('#qb'), g = GH?.g?.getBoundingClientRect();
  const app = Q('#app').getBoundingClientRect(), anchor = desktopAnchor || (g ? { x:g.left+12,y:g.top } : {x:app.left+70,y:170});
  const width = q.offsetWidth || 340, height = q.offsetHeight || 180;
  const left = Math.max(app.left+10,Math.min(innerWidth-width-16,anchor.x+12));
  const top = Math.max(90,Math.min(innerHeight-height-18,anchor.y+16));
  q.style.setProperty('--desktop-x',left+'px'); q.style.setProperty('--desktop-y',top+'px');
}
// Preserve mobile positioning: desktop coordinates are custom properties used only in its media query.
const baseOpenSheet = openSheet;
openSheet = function(o) {
  const result = baseOpenSheet(o);
  if (desktop()) {
    Q('.cs')?.style.setProperty('padding-bottom','0px');
    if (SH?.mode === 'q' && !SH.d) SH.d = [...S.docks].sort((a,b)=>(b.r||0)-(a.r||0))[0]?.id || null;
    updateDesktopEditor(); positionQuickAdd();
  }
  return result;
};
const baseMenu = menu;
menu = function() { baseMenu(); updateDesktopEditor(); };
// Captured ACT functions must be updated explicitly after wrapping.
ACT.desktopCloseSheet = () => closeSheet();
ACT.desktopCollapse = () => {if(scr!=='home')return;sidebarSmall = !sidebarSmall; LS.setItem('slb-sidebar',sidebarSmall?'small':'wide'); desktopChrome();};
ACT.desktopSection=type=>{if(!Object.hasOwn(sidebarSections,type))return;sidebarSections[type]=!sidebarSections[type];const button=Q(`[data-a="desktopSection:${type}"]`),content=Q('#sidebar-'+type);button?.setAttribute('aria-expanded',String(sidebarSections[type]));if(content)content.hidden=!sidebarSections[type];};
function prepareSidebarSheet(){if(SH)closeSheet();if(Q('#tsh').classList.contains('on'))closeT();}
ACT.desktopDeck=id=>{prepareSidebarSheet();ACT.dkp(id);};
ACT.desktopDeckToggle=id=>{if(sidebarDeckOpen.has(id))sidebarDeckOpen.delete(id);else sidebarDeckOpen.add(id);LS.setItem('slb-sidebar-subdecks',JSON.stringify([...sidebarDeckOpen]));const list=Q('#subdecks-'+id),button=Q(`[data-a="desktopDeckToggle:${id}"]`);if(list)list.hidden=!sidebarDeckOpen.has(id);if(button){button.setAttribute('aria-expanded',String(sidebarDeckOpen.has(id)));button.setAttribute('aria-label',(sidebarDeckOpen.has(id)?'Collapse':'Expand')+' '+(dk(id)?.n||'')+' sub-decks');}};
ACT.desktopDeckEdit=id=>{prepareSidebarSheet();ACT.dke(id);};
ACT.desktopDeckAdd=()=>{prepareSidebarSheet();ACT.dka('');};
ACT.desktopPresetAdd=()=>{prepareSidebarSheet();ACT.pra();};
ACT.desktopPresetEdit=i=>{prepareSidebarSheet();ACT.pre(i);};
ACT.desktopPreset=i=>{ACT.desktopNew();ACT.prs(i);Q('#ti')?.focus();};
ACT.desktopSync=async()=>{const engine=window.slbSync;if(!engine?.getAuth().refresh){ACT.sync();return;}if(SH||TS){toast('Finish editing before syncing.');return;}try{await engine.sync();toast('Logbook synced');}catch(e){ACT.sync();syncError(e);}};
ACT.desktopNew = () => {
  if (SH) closeSheet(); if (TS) closeT();
  if (scr !== 'cal') { scr='cal'; V.a=new Date(); R(); }
  const n=new Date(), s=Math.min(1410,Math.floor((n.getHours()*60+n.getMinutes())/15)*15);
  desktopAnchor=null; openSheet({date:K(V.a),s,e:Math.min(1440,s+(S.pf.dl||30))});
};
ACT.desktopTask = () => { closeDesktopDialog(); openT({date:K(V.a||new Date())}); updateDesktopEditor(); Q('#tt')?.focus(); };
// A board's Add task always starts a fresh editor, including after another shared sheet.
ACT.tnew = value => { prepareSidebarSheet();openT({date:value==='must'?K(new Date()):value,must:value==='must'});updateDesktopEditor();Q('#tt')?.focus(); };
ACT.desktopCommands = () => openCommands();
const baseDesktopGo=ACT.go;
ACT.go=function(screen){if(desktop()){if(SH)closeSheet();if(Q('#tsh').classList.contains('on'))closeT();closeDesktopDialog();}baseDesktopGo(screen);};
function searchCommands(query) {
  const q=query.trim().toLowerCase();
  const commands=[
    {title:'Log something',detail:'Record a moment on the calendar',shortcut:'N',run:()=>ACT.desktopNew()},
    {title:'New task',detail:'Plan something for a day',shortcut:'T',run:()=>ACT.desktopTask()},
    ...desktopScreens.map(([key,title],i)=>({title:'Go to '+title,detail:'Open '+title,shortcut:i<5?String(i+1):'',run:()=>ACT.go(key)})),
    {title:'Dropbox sync',detail:'Connect, sync or review saved conflicts',run:()=>ACT.sync()},
    {title:'Download backup',detail:'Save a JSON copy of your logbook',run:()=>ACT.bk()}
  ];
  const hits=q ? [
    ...S.entries.filter(x=>x.t.toLowerCase().includes(q)).slice(-20).reverse().map(x=>({title:x.t,detail:x.date+' · Logged moment',run:()=>{scr='cal';V.a=P(x.date);R();openSheet({id:x.id});}})),
    ...S.tasks.filter(x=>x.t.toLowerCase().includes(q)).slice(-15).reverse().map(x=>({title:x.t,detail:x.date+' · Planned task',run:()=>{scr='cal';V.a=P(x.date);R();openT({id:x.id});updateDesktopEditor();}}))
  ] : [];
  return [...commands.filter(x=>!q||(x.title+' '+x.detail).toLowerCase().includes(q)),...hits];
}
function renderCommands() {
  const query=Q('#command-query')?.value||'';
  commandItems=searchCommands(query); commandIndex=Math.max(0,Math.min(commandIndex,commandItems.length-1));
  Q('#command-results').innerHTML=commandItems.map((x,i)=>`<button class="command-item" role="option" id="command-${i}" aria-selected="${i===commandIndex}" data-command="${i}"><span>${esc(x.title)}<small>${esc(x.detail)}</small></span>${x.shortcut?`<kbd>${x.shortcut}</kbd>`:''}</button>`).join('')||'<p class="mu" style="padding:14px">No matching moments or commands.</p>';
  const input=Q('#command-query');
  if(commandItems.length) input.setAttribute('aria-activedescendant','command-'+commandIndex); else input.removeAttribute('aria-activedescendant');
}
function openCommands() {
  if (SH) closeSheet(); if (TS) closeT();
  commandIndex=0;
  desktopDialog('<div class="sync-close"><h2>Find your way</h2><button class="ib" data-dialog-close aria-label="Close search">'+I(IC.x,18)+'</button></div><label class="sync-field" for="command-query">Search moments, tasks and commands</label><input id="command-query" autocomplete="off" role="combobox" aria-expanded="true" aria-controls="command-results"><div class="command-list" id="command-results" role="listbox" aria-label="Results"></div><p class="mu" style="margin-top:15px">↑ ↓ to choose · Enter to open · Esc to close</p>','Search and commands');
  renderCommands(); Q('#command-query').focus();
}
document.addEventListener('input',e=>{if(e.target.id==='command-query'){commandIndex=0;renderCommands();}});
document.addEventListener('click',e=>{
  if(e.target.closest('[data-dialog-close]')) closeDesktopDialog();
  const item=e.target.closest('[data-command]');
  if(item){const c=commandItems[+item.dataset.command];closeDesktopDialog();c?.run();}
});
function dismissContext() { Q('#desktop-context')?.remove(); }
let contextRecord=null;
function contextAction(kind) {
  const {id,task}=contextRecord||{}; dismissContext();
  const list=task?S.tasks:S.entries, item=list.find(x=>x.id===id); if(!item)return;
  if(kind==='duplicate') { const copy=JSON.parse(JSON.stringify(item));copy.id=uid();copy.t+=' (copy)';list.push(copy); }
  else { if(SH?.id===id)closeSheet();if(TS?.id===id)closeT();if(task)S.tasks=S.tasks.filter(x=>x.id!==id);else {S.entries=S.entries.filter(x=>x.id!==id);S.best.filter(x=>x.ref===id).forEach(x=>bDel(x.id));} }
  sv();R();toast(kind==='duplicate'?'Duplicated':'Removed');
}
ACT.desktopDuplicate=()=>contextAction('duplicate'); ACT.desktopDelete=()=>contextAction('delete');
document.addEventListener('contextmenu',e=>{
  if(!desktop()||scr!=='cal')return;
  const block=e.target.closest('.b');if(!block)return;e.preventDefault();dismissContext();
  const action=block.dataset.a||'', task=action.startsWith('tedit:');contextRecord={id:task?action.slice(6):block.dataset.e,task};
  const menu=document.createElement('div');menu.id='desktop-context';menu.className='context-menu';menu.setAttribute('role','menu');
  menu.innerHTML='<button role="menuitem" data-a="desktopDuplicate">Duplicate</button><button role="menuitem" data-a="desktopDelete">Delete</button>';
  menu.style.left=Math.max(12,Math.min(innerWidth-210,e.clientX))+'px';menu.style.top=Math.max(12,Math.min(innerHeight-120,e.clientY))+'px';document.body.append(menu);menu.querySelector('button').focus();
});
document.addEventListener('pointerdown',e=>{if(!e.target.closest('#desktop-context'))dismissContext();},true);
document.addEventListener('keydown',e=>{
  if(window.LogbookOnboarding?.handleKey(e))return;
  if(window.LogbookShortcuts?.handleKey(e))return;
  const dialog=Q('#slb-overlay');
  if(dialog){
    if(e.key==='Escape'){e.preventDefault();e.stopImmediatePropagation();closeDesktopDialog();return;}
    if(e.key==='Tab'){const focus=[...dialog.querySelectorAll('button,input,[tabindex="0"]')];const first=focus[0],last=focus.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}}
    if(Q('#command-query')){
      if(['ArrowDown','ArrowUp'].includes(e.key)){e.preventDefault();commandIndex=(commandIndex+(e.key==='ArrowDown'?1:-1)+Math.max(1,commandItems.length))%Math.max(1,commandItems.length);renderCommands();Q('#command-'+commandIndex)?.scrollIntoView({block:'nearest'});}
      if(e.key==='Enter'){e.preventDefault();const c=commandItems[commandIndex];closeDesktopDialog();c?.run();}
    }
    return;
  }
  if(!desktop())return;
  const editing=e.target.closest('input,textarea,select,[contenteditable=true]');
  if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='k'){e.preventDefault();openCommands();return;}
  if(e.key==='Escape'){dismissContext();if(SH||Q('#tsh').classList.contains('on')){e.preventDefault();e.stopImmediatePropagation();if(SH)closeSheet();else closeT();}return;}
  if(editing||e.ctrlKey||e.metaKey||e.altKey||Q('#tsh').classList.contains('on')||SH)return;
  if(e.key==='Enter'&&e.target.matches('.b')){e.preventDefault();const[a,v]=e.target.dataset.a.split(':');ACT[a]?.(v);return;}
  if(e.key.toLowerCase()==='n'){e.preventDefault();ACT.desktopNew();}
  else if(e.key.toLowerCase()==='t'){e.preventDefault();ACT.desktopTask();}
  else if(/^[1-5]$/.test(e.key)){e.preventDefault();ACT.go(['home','cal','plan','reflect','note'][+e.key-1]);}
  else if(e.key==='/'){e.preventDefault();openCommands();}
  else if(scr==='cal'&&['ArrowLeft','ArrowRight'].includes(e.key)){e.preventDefault();(e.key==='ArrowLeft'?ACT.prv:ACT.nxt)();}
},true);
document.addEventListener('wheel',e=>{
  if(!desktop()||scr!=='cal'||!e.ctrlKey||!e.target.closest('.cs'))return;
  e.preventDefault();const sc=Q('.cs'),old=hhv(),point=e.clientY-sc.getBoundingClientRect().top;
  S.hh=Math.max(30,Math.min(150,old-e.deltaY*.15));Q('.gr').style.setProperty('--hh',S.hh+'px');sc.scrollTop=(sc.scrollTop+point)/old*S.hh-point;sv();positionQuickAdd();
},{passive:false});
// Mouse gestures are handled separately, leaving the phone’s touch listeners unchanged.
document.addEventListener('pointerdown',e=>{
  if(!desktop()||scr!=='cal'||e.button!==0||e.pointerType==='touch'||!e.target.closest('.cl'))return;
  e.stopImmediatePropagation();desktopIgnoreClick=0;
  const col=e.target.closest('.cl'),block=e.target.closest('.b'),handle=e.target.closest('.hd');
  const ghostHandle=e.target.closest('.gh .hd');
  if(!block&&SH&&!ghostHandle){closeSheet();desktopIgnoreClick=Date.now()+500;return;}
  if(!block&&TS){closeT();desktopIgnoreClick=Date.now()+500;return;}
  const action=block?.dataset.a||'',task=action.startsWith('tedit:'),id=task?action.slice(6):block?.dataset.e;
  const item=id?(task?S.tasks:S.entries).find(x=>x.id===id):null;
  desktopAnchor={x:e.clientX,y:e.clientY};
  desktopDrag={col,block,task,item,ghost:!!ghostHandle,handle:handle?.dataset.side,x:e.clientX,y:e.clientY,moved:false,original:item?JSON.parse(JSON.stringify(item)):ghostHandle?{s:SH.s,e:SH.e}:null,start:Math.max(0,Math.min(1425,snap((e.clientY-col.getBoundingClientRect().top)/hhv()*60)))};
  e.preventDefault();
},true);
document.addEventListener('pointermove',e=>{
  const d=desktopDrag;if(!d)return;e.stopImmediatePropagation();
  if(!d.moved&&Math.hypot(e.clientX-d.x,e.clientY-d.y)<5)return;d.moved=true;
  const target=document.elementFromPoint(e.clientX,e.clientY)?.closest('.cl')||d.col;
  const minute=Math.max(0,Math.min(1440,snap((e.clientY-target.getBoundingClientRect().top)/hhv()*60)));
  if(d.ghost&&SH&&GH){
    if(d.handle==='t')SH.s=Math.min(minute,SH.e-15);else SH.e=Math.max(SH.s+15,minute);
    GH.s=SH.s;GH.e=SH.e;gp();positionQuickAdd();return;
  }
  if(d.item){
    const start=d.task?d.original.time:d.original.s,end=d.task?Math.min(1440,start+(d.original.dur||60)):d.original.e;
    let s=start,finish=end;
    if(d.handle==='t')s=Math.max(0,Math.min(minute,end-15));
    else if(d.handle==='b')finish=Math.max(start+15,Math.min(1440,minute));
    // Planned tasks need signed movement; retain the inherited logged-block path.
    else {const delta=(e.clientY-d.y)/hhv()*60;s=Math.max(0,Math.min(1440-(end-start),start+(d.task?Math.round(delta/15)*15:snap(delta))));finish=s+end-start;}
    d.pending={s,e:finish,date:d.handle?d.original.date:target.dataset.k};
    d.block.style.top='calc(var(--hh)*'+s/60+')';d.block.style.height='calc(var(--hh)*'+(finish-s)/60+')';
    if(!d.handle&&d.block.parentNode!==target)target.append(d.block);
    d.block.classList.add('lift');
  }else{d.end=Math.max(d.start+15,minute);ghost(d.col.dataset.k,d.start,d.end);}
},true);
function endDesktopDrag(e,cancel=false){
  const d=desktopDrag;if(!d)return;desktopDrag=null;e.stopImmediatePropagation();desktopIgnoreClick=Date.now()+500;
  if(cancel){if(d.ghost&&SH&&GH){SH.s=d.original.s;SH.e=d.original.e;GH.s=SH.s;GH.e=SH.e;gp();}else{rmGh();R();}return;}
  if(d.ghost)return;
  if(d.item&&d.moved&&d.pending){
    const p=d.pending;if(d.task){Object.assign(d.item,{time:p.s,dur:p.e-p.s,date:p.date,man:0});d.item.st=autoSt(d.item);}else Object.assign(d.item,p);
    if(SH?.id===d.item.id){SH.s=p.s;SH.e=p.e;SH.date=p.date;}
    if(TS?.id===d.item.id){TS.time=fm(p.s);TS.dur=p.e-p.s;TS.date=p.date;}
    sv();R();if(SH?.mode==='m')menu();if(TS){renderT();updateDesktopEditor();}return;
  }
  if(d.item){if(d.task)openT({id:d.item.id});else openSheet({id:d.item.id});updateDesktopEditor();return;}
  openSheet({date:d.col.dataset.k,s:d.start,e:Math.min(1440,d.moved?d.end:d.start+(S.pf.dl||30))});
}
document.addEventListener('pointerup',e=>endDesktopDrag(e),true);
document.addEventListener('pointercancel',e=>endDesktopDrag(e,true),true);
document.addEventListener('click',e=>{if(desktop()&&Date.now()<desktopIgnoreClick&&e.target.closest('.cl')){e.preventDefault();e.stopImmediatePropagation();}},true);
window.addEventListener('blur',()=>{if(desktopDrag){desktopDrag=null;rmGh();R();}});
const editorObserver=new MutationObserver(()=>updateDesktopEditor());
editorObserver.observe(Q('#sh'),{attributes:true,attributeFilter:['class']});
editorObserver.observe(Q('#tsh'),{attributes:true,attributeFilter:['class']});
desktopMedia.addEventListener?.('change',()=>{if(SH)closeSheet();if(TS)closeT();R();const view=Q('.scr');if(view&&!view.classList.contains('cal'))view.scrollTop=0;});
window.addEventListener('resize',positionQuickAdd);
document.addEventListener('scroll',e=>{if(e.target.matches?.('.cs'))positionQuickAdd();},true);

/* Dropbox settings and local persistence. Tokens never enter S, backups or sync files. */
let syncStatus={busy:false,error:'',last:0}, pendingDropbox=null, syncFormOpen=false, dropboxAuthStarting=false;
function readLocal(key,fallback){try{return JSON.parse(LS.getItem(key))||fallback;}catch{return fallback;}}
function syncStatusText(){return syncStatus.busy?'Syncing your logbook…':syncStatus.error||(!window.slbSync?.getAuth().refresh?'Not connected':syncStatus.last?'Last synced '+new Date(syncStatus.last).toLocaleString():'Connected. Ready for your first sync.');}
function updateToolbarSync(){
 const button=Q('.toolbar-sync');if(!button)return;
 const engine=window.slbSync,status=engine?.getStatus()||{busy:false,error:'',last:0},connected=!!engine?.getAuth().refresh,count=engine?.getConflictCount()||0;
 button.dataset.state=status.busy?'busy':count?'conflict':status.error?'error':connected?'connected':'local';button.disabled=!!status.busy;
 button.setAttribute('aria-label',status.busy?'Syncing with Dropbox':count?'Review '+count+' sync conflicts':status.error?'Dropbox sync needs attention':connected?'Sync with Dropbox':'Connect Dropbox');
 button.title=status.busy?'Syncing your logbook…':count?count+' conflicting edits need your review.':status.error||(!connected?'Connect Dropbox':status.last?'Last synced '+new Date(status.last).toLocaleString():'Sync with Dropbox');
}
function updateSyncStatus(){const el=Q('#sync-status');if(el){el.textContent=syncStatusText();el.classList.toggle('error',!!syncStatus.error);}document.querySelectorAll('[data-a="syn"],[data-a="dbx"],[data-a="dbxFinish"]').forEach(b=>b.disabled=syncStatus.busy);updateToolbarSync();}
renderS=function(){
  syncFormOpen=true;Q('#tsh').classList.remove('desktop-task');
  const engine=window.slbSync,auth=engine?.getAuth()||{},connected=!!auth.refresh;
  const conflicts=engine?LogbookSync.conflicts(engine.getDoc()):[];
  const configured=window.LOGBOOK_CONFIG?.dropboxAppKey||auth.key||LS.getItem('slb-dropbox-key')||'';
  Q('#tsc').innerHTML=`<div class="sync-close"><h2 class="h2">Dropbox sync</h2><button class="ib" data-a="cls" aria-label="Close sync">${I(IC.x,20)}</button></div><p class="sync-copy" style="margin-top:12px">Your logbook, in your Dropbox App Folder. Your data goes directly from this browser to Dropbox.</p><div class="sync-status" id="sync-status" role="status"></div>${!connected?`${!window.LOGBOOK_CONFIG?.dropboxAppKey?`<label class="sync-field">Public app key<input id="dbx-key" value="${esc(configured)}" autocomplete="off" placeholder="Dropbox app key"></label><p class="sync-copy">Demo setup: use the public key of an App Folder app. No app secret is needed.</p>`:''}${pendingDropbox?`<p class="sync-copy">Authorize Sailor Logbook in Dropbox, then paste the code here. This request expires after 15 minutes.</p><a class="btn g" href="${esc(pendingDropbox.url)}" target="_blank" rel="noopener noreferrer" style="text-align:center;text-decoration:none">Open Dropbox authorization</a><label class="sync-field">Authorization code<input id="dbx-code" autocomplete="off" placeholder="Paste the code from Dropbox"></label>`:''}<label class="sync-check"><input type="checkbox" id="dbx-encrypted">Encrypt my Dropbox logbook</label>`:''}<label class="sync-field">${connected?(auth.encrypted?'Unlock encrypted sync':'Encryption passphrase (if your Dropbox copy is encrypted)'):'Encryption passphrase'}<input id="dbx-password" type="password" autocomplete="off" placeholder="${auth.encrypted?'Enter your existing passphrase':'Optional · at least 12 characters'}"></label><p class="sync-copy">Passphrases stay in this tab’s memory. Encrypted sync needs the same passphrase on each device and after reopening the app. Keep a local backup; a lost passphrase cannot be recovered.</p><div class="sync-actions">${connected?'<button class="btn" data-a="syn">Sync now</button><button class="btn g" data-a="dis">Disconnect</button>':`<button class="btn" data-a="${pendingDropbox?'dbxFinish':'dbx'}" ${!syncReady?'disabled':''}>${pendingDropbox?'Finish connecting':'Connect Dropbox'}</button>`}</div>${conflicts.length?`<h3 style="margin:24px 0 8px">Saved edit conflicts · ${conflicts.length}</h3><p class="sync-copy">Two devices changed the same record. The current version is in your logbook; the other version is saved below.</p>${conflicts.map((c,i)=>`<div class="sync-conflict"><small class="mu">${esc(JSON.parse(c.key)[0])}</small><p>${esc(c.version.deleted?'Deleted on another device':JSON.stringify(c.version.value,null,2))}</p><div class="sync-actions"><button class="btn g" data-a="dbxKeep:${i}">Keep current</button><button class="btn" data-a="dbxRestore:${i}">Use saved version</button></div></div>`).join('')}`:''}`;
  updateSyncStatus();
  if(pendingDropbox&&!connected)Q('#tsc .sync-actions').insertAdjacentHTML('beforeend','<button class="btn g" data-a="dbxRestart">Start again</button>');
};
function syncError(e){syncStatus={...syncStatus,busy:false,error:e.message};updateSyncStatus();toast(e.message);}
function readPassphrase(){const p=Q('#dbx-password')?.value||'';if(p)window.slbSync?.setPassword(p);return p;}
ACT.sync=()=>{if(SH)closeSheet();if(TS)closeT();renderS();Q('#tsh').classList.add('on');};
ACT.dbx=async()=>{try{
  if(dropboxAuthStarting)return;
  if(!syncReady)throw Error('Sync is still loading. Try again in a moment.');
  const key=window.LOGBOOK_CONFIG?.dropboxAppKey||Q('#dbx-key')?.value.trim();
  const encrypted=!!Q('#dbx-encrypted')?.checked,passphrase=Q('#dbx-password')?.value||'';
  dropboxAuthStarting=true;
  // The verifier is stored in this tab’s session, never in the logbook.
  pendingDropbox=await slbSync.startAuth(key);sessionStorage.setItem('slb-dropbox-pending',JSON.stringify(pendingDropbox));LS.setItem('slb-dropbox-key',key);renderS();
  Q('#dbx-encrypted').checked=encrypted;Q('#dbx-password').value=passphrase;
}catch(e){syncError(e);}finally{dropboxAuthStarting=false;}};
ACT.dbxRestart=()=>{pendingDropbox=null;sessionStorage.removeItem('slb-dropbox-pending');renderS();};
function finishJoinedSession(){if(scr==='ob'&&S.ob){closeT();S.out=0;ob=0;scr='home';sv();R();toast('Your logbook is ready on this device.');window.LogbookStorage?.ensure(true);if(desktopMedia.matches)window.LogbookShortcuts?.start();}}
ACT.dbxFinish=async()=>{try{
  const password=readPassphrase(),encrypted=!!Q('#dbx-encrypted')?.checked;
  if(encrypted&&password.length<12)throw Error('Use an encryption passphrase with at least 12 characters.');
  syncStatus.busy=true;updateSyncStatus();
  await slbSync.connect(pendingDropbox,Q('#dbx-code')?.value,encrypted);
  pendingDropbox=null;sessionStorage.removeItem('slb-dropbox-pending');renderS();await slbSync.sync();renderS();finishJoinedSession();R();
}catch(e){syncError(e);}};
ACT.syn=async()=>{try{readPassphrase();await slbSync.sync();if(syncFormOpen&&Q('#tsh').classList.contains('on'))renderS();finishJoinedSession();}catch(e){syncError(e);}};
ACT.dis=async()=>{try{await slbSync.disconnect();pendingDropbox=null;sessionStorage.removeItem('slb-dropbox-pending');S.sync={on:0,enc:0,last:0,asked:0};sv();renderS();R();toast('Disconnected. Your Dropbox file is kept.');}catch(e){syncError(e);}};
ACT.dbxKeep=async i=>{try{const c=LogbookSync.conflicts(slbSync.getDoc())[+i];if(c){await slbSync.resolve(c.id,false);renderS();}}catch(e){syncError(e);}};
ACT.dbxRestore=async i=>{try{const c=LogbookSync.conflicts(slbSync.getDoc())[+i];if(c){await slbSync.resolve(c.id,true);renderS();}}catch(e){syncError(e);}};
// Replace legacy simulation actions so none can report a fake successful sync.
ACT.enc=ACT.syn;ACT.skpe=ACT.sync;
OB[9]=()=>`<h1 class="big">Keep your logbook safe</h1><p class="mu" style="font-size:16px">Your logbook is saved in this browser. Download a backup any time in Settings, or connect Dropbox for optional sync across your devices.</p><p class="mu" style="font-size:14px">Your browser may ask to keep storage permanently when you continue.</p><button class="btn g" data-a="sync">${window.slbSync?.getAuth().refresh?'Dropbox settings':'Connect Dropbox'}</button>${window.LogbookDropboxInfo?LogbookDropboxInfo():''}<button class="btn" data-a="obn">Continue</button>`;
const realCloseT=closeT;
closeT=function(){syncFormOpen=false;Q('#tsh').classList.remove('desktop-task');realCloseT();updateDesktopEditor();};
function confirmInApp(title,message,action){
  desktopDialog(`<h2>${esc(title)}</h2><p class="sync-copy">${esc(message)}</p><div class="sync-actions"><button class="btn g" data-dialog-close>Cancel</button><button class="btn" id="confirm-in-app">${esc(title)}</button></div>`,title);
  Q('#confirm-in-app').onclick=()=>{closeDesktopDialog();action();};
}
ACT.reset=()=>confirmInApp('Erase this device’s logbook','Download a backup first. This disconnects Dropbox and clears this browser’s logbook. Your Dropbox file is kept.',async()=>{
  await window.slbSync?.disconnect();S={name:'',ob:0,docks:[],entries:[]};norm();sv();ob=0;scr='ob';closeT();R();
});
ACT.dela=ACT.reset;
ACT.lo=()=>confirmInApp('Log out','This disconnects Dropbox on this device. Your local logbook and Dropbox file are kept.',async()=>{await window.slbSync?.disconnect();S.out=1;S.sync.on=0;sv();ob=0;scr='ob';closeT();R();});
function openSyncDatabase(){return new Promise((resolve,reject)=>{
  if(!window.indexedDB){resolve(null);return;}
  const req=indexedDB.open('slb-sync',1);req.onupgradeneeded=()=>req.result.createObjectStore('data');req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(Error('Sync storage could not be opened.'));
});}
function dbRead(db){if(!db)return Promise.resolve(readLocal('slb-sync-records',null));return new Promise((resolve,reject)=>{const req=db.transaction('data').objectStore('data').get('records');req.onsuccess=()=>resolve(req.result||null);req.onerror=()=>reject(req.error);});}
function dbWrite(db,doc){if(!db){LS.setItem('slb-sync-records',JSON.stringify(doc));return Promise.resolve();}return new Promise((resolve,reject)=>{const tx=db.transaction('data','readwrite');tx.objectStore('data').put(doc,'records');tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error);});}
let syncChannel=null;
window.slbSyncReady=(async()=>{
  try{
    const db=await openSyncDatabase();let doc=await dbRead(db);
    if(doc)LogbookSync.validate(doc);
    let device=LS.getItem('slb-device');if(!device){device=crypto.randomUUID().replace(/-/g,'');LS.setItem('slb-device',device);}
    const auth=readLocal('slb-dropbox-auth',{});
    // Each tab gets a distinct actor so simultaneous tabs also preserve conflicting edits.
    const actor=device+crypto.randomUUID().replace(/-/g,'').slice(0,16);
    if(window.BroadcastChannel)syncChannel=new BroadcastChannel('slb-records-v1');
    pendingDropbox=(()=>{try{return JSON.parse(sessionStorage.getItem('slb-dropbox-pending'));}catch{return null;}})();
    const applying=()=>!SH&&!TS&&!document.activeElement?.matches('.rn')&&!Q('#dov.on')&&!window.LogbookDesktopDrag?.active;
    window.slbSync=LogbookDropbox.create({doc:doc||LogbookSync.blank(),device:actor,auth,getState:()=>S,autoSync:false,pending:LS.getItem('slb-sync-pending')==='1',
      onPending:value=>LS.setItem('slb-sync-pending',value?'1':'0'),onLocalChange:()=>window.LogbookSyncScheduler?.changed(),
      saveDoc:async value=>{await dbWrite(db,value);syncChannel?.postMessage({type:'records',doc:value});},saveAuth:value=>{LS.setItem('slb-dropbox-auth',JSON.stringify(value));S.sync={on:value.refresh?1:0,enc:value.encrypted?1:0,last:value.last||0,asked:1};LS.setItem('slb1',JSON.stringify(S));},
      canApply:()=>!SH&&!TS&&!hasNotebookDraft()&&!Q('#dov.on')&&!window.LogbookDesktopDrag?.active,
      shouldAdoptRemote:({exists}={})=>!S.entries.length&&!S.tasks.length&&!S.best.length&&!S.les.length&&!S.grat.length&&!Object.values(S.nb).some(p=>p.lines?.length||p.draw||(p.fsk||[]).length)&&(!S.ob||(exists&&!window.slbSync?.getAuth().last&&!S.pre.length&&S.docks.every(d=>!d.p&&DD.some(([name])=>name===d.n)))),
      applyState:(value,context={})=>{if(context.adopted){value.ob=1;value.out=0;}S=value;norm();LS.setItem('slb1',JSON.stringify(S));if(applying())R();},
      onStatus:value=>{const previous=syncStatus;syncStatus=value;updateSyncStatus();window.LogbookSyncScheduler?.status(value,previous);},fetch:(...args)=>fetch(...args)
    });
    if(syncChannel){syncChannel.onmessage=e=>{if(e.data?.type==='request')syncChannel.postMessage({type:'records',doc:slbSync.getDoc()});else if(e.data?.type==='records')slbSync.receive(e.data.doc).catch(syncError);};syncChannel.postMessage({type:'request'});}
    S.sync={on:auth.refresh?1:0,enc:auth.encrypted?1:0,last:auth.last||0,asked:1};
    slbSync.changed(S);syncReady=true;
    if(syncFormOpen)renderS();
    return slbSync;
  }catch(e){syncError(e);return null;}
})();
window.addEventListener('storage',e=>{if(e.key==='slb-dropbox-auth'&&window.slbSync){try{slbSync.updateAuth(JSON.parse(e.newValue)||{});S.sync={on:slbSync.getAuth().refresh?1:0,enc:slbSync.getAuth().encrypted?1:0,last:slbSync.getAuth().last||0};if(syncFormOpen)renderS();}catch{syncError(Error('Dropbox settings changed in another tab. Reload this tab.'));}}});
R();
