/* Sailor Logbook — MIT. Desktop-specific composition using the shared data/views. */
(function(){
  function enhance(){
    if(!desktop())return;
    const view=Q('#app > .scr');if(!view)return;
    view.classList.add('desktop-workspace');
    if(scr==='cal'){
      const header=view.querySelector('.ch1'),second=view.querySelector('.ch2');
      if(header&&second&&!view.querySelector('.calendar-controls')){
        header.classList.add('calendar-toolbar');header.querySelector('[aria-label="Planner"]')?.remove();
        const controls=document.createElement('div');controls.className='calendar-controls';
        controls.innerHTML='<button class="desktop-today" data-a="today">Today</button>';
        second.querySelector('[data-a="view:2"]')?.remove();second.querySelector('[data-a="view:4"]')?.remove();
        second.querySelector('[data-a="view:1"]')?.insertAdjacentHTML('afterend',`<button data-a="view:3" class="${V.v===3?'on':''}">3 days</button>`);
        const segment=second.querySelector('.seg');segment?.setAttribute('aria-label','Calendar view');
        while(second.firstChild)controls.append(second.firstChild);second.remove();header.append(controls);
      }
      view.querySelectorAll('.b[data-a^="tedit:"]').forEach(block=>{
        const task=S.tasks.find(t=>t.id===block.dataset.a.slice(6));if(!task)return;
        const state=task.man?task.st:autoSt(task);block.dataset.clockStatus=state;
        if(state==='doing'){block.style.background=dc(task.d);block.style.color=tc(dc(task.d));}
        block.setAttribute('aria-label',task.t+' · '+(stl[state]||state));
        block.title=block.getAttribute('aria-label');
        if(state==='doing'&&(task.dur||60)>=45&&!block.querySelector('.clock-status'))block.insertAdjacentHTML('beforeend','<small class="clock-status">Working on it</small>');
      });
    }
    if(scr==='plan'){
      const header=view.querySelector('.ch1'),title=header?.querySelector('.ct');if(title)title.textContent='Planner';
      header?.querySelector('[data-a="go:cal"]')?.remove();
      if(header&&!header.querySelector('[data-a="desktopPlanToday"]'))header.insertAdjacentHTML('beforeend','<button class="desktop-today" data-a="desktopPlanToday">Today</button>');
      view.querySelectorAll('.pc').forEach(column=>{const date=column.querySelector('[data-a^="tnew:"]')?.dataset.a.slice(5);column.dataset.day=date||'';column.classList.toggle('today-column',date===K(new Date()));});
    }
    if(scr==='home'){
      const greeting=view.querySelector('.hrow .big');if(greeting){const hour=new Date().getHours();greeting.textContent=(hour<12?'Good morning':hour<18?'Good afternoon':'Good evening')+(S.name?' '+S.name:'');greeting.classList.add('desktop-greeting');greeting.title=greeting.textContent;}
      const hero=view.querySelector(':scope > .card.cur');
      if(hero&&!hero.querySelector('.home-hero-copy')){const copy=document.createElement('div');copy.className='home-hero-copy';[...hero.children].filter(x=>!x.classList.contains('tr')).forEach(x=>copy.append(x));hero.prepend(copy);hero.classList.add('desktop-home-hero');}
    }
    if(scr==='note'){
      const footer=view.querySelector('.notebook-footer'),sent=S.bt.includes(ND)&&NBE!==ND;
      if(footer&&!footer.querySelector('.notebook-send'))footer.insertAdjacentHTML('beforeend',`<button class="btn notebook-send" data-a="${sent?'nbe':'bottle'}">${I(IC.ship,17)}${sent?'Edit sent page':'Send to sea'}</button>`);
    }
    if(scr==='set'){
      const main=Q('#smain');
      if(main&&!main.querySelector('.settings-panels')){
        const rows=[...main.querySelectorAll('.rw2')],profile=rows.find(x=>x.dataset.a==='spg:acc');
        const groups=[['Workspace',['spg:prefs','go:wg']],['Your data',['sync','spg:data']],['Help & about',['spg:help','spg:about']],['This device',['lo']]];
        main.innerHTML='';
        if(profile){const account=document.createElement('div');account.className='settings-account';account.append(profile);main.append(account);}
        const panels=document.createElement('div');panels.className='settings-panels';
        for(const [title,actions]of groups){const group=document.createElement('section');group.className='desktop-settings-group';group.innerHTML='<h2>'+title+'</h2>';for(const action of actions){const row=rows.find(r=>r.dataset.a===action);if(row)group.append(row);}panels.append(group);}main.append(panels);
      }
    }
    if(scr==='sp'&&SPk==='help'&&!view.querySelector('[data-a="shortcuts"]'))view.querySelector('.card')?.insertAdjacentHTML('afterbegin',R2('Keyboard shortcuts','?','shortcuts'));
    window.LogbookStorage?.afterRender();
    view.querySelectorAll('.tk[data-a^="tedit:"],.tk [data-a^="tedit:"]').forEach(el=>{el.tabIndex=0;el.setAttribute('role','button');});
  }
  ACT.desktopPlanToday=()=>{const board=Q('.cols'),today=Q('.today-column');if(board&&today){board.scrollTo?.({left:today.offsetLeft-18,behavior:matchMedia('(prefers-reduced-motion:reduce)').matches?'instant':'smooth'});}};
  window.LogbookDesktop={enhance};
  R();
})();
