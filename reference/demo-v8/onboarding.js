/* Sailor Logbook — MIT. Desktop welcome overlay and a walkthrough of actual desktop controls. */
(function(){
  const originalSplash=OB[0],originalNext=ACT.obn,originalBack=ACT.obb,originalTransition=ACT.cv,originalSail=ACT.sail,originalTour=tour;
  let tourActive=false,tourTimer=0,tourTarget=null,restoreFocus=null;
  const desktopSteps=[0,1,3,4,6,7,9,10];
  const guide=[
    ['home','','Welcome aboard','Keep a cheerful record of what actually happened. A few meaningful blocks and a best thing are enough.'],
    ['home','.desktop-log','A moment, in one click','Log something lives at the top right on every screen. Press N whenever you want to record a moment.'],
    ['cal','.cs','Your week, already lived','Click an empty time slot to log something. Existing moments open in the right editor, beside the timeline.'],
    ['cal','.cs','Write it in one line','Read book +lea t45 sets a title, the Learning deck and 45 minutes. Enter saves immediately. Drag a block or its corner handles to adjust the time.'],
    ['plan','.cols','A little room for tomorrow','Plan upcoming tasks in day columns. Give a task a time to put it on the calendar. Use New task in the top bar or press T.'],
    ['home','#sidebar-decks','Your decks, close at hand','Open a deck, edit it with the pencil, or add one in this sidebar dropdown. Decks are categories; sub-decks go one level deep.','decks'],
    ['home','#sidebar-presets','Make the familiar easy','Click a preset to prepare a calendar block. The pencil edits it, and Add a preset saves another routine.','presets'],
    ['home','[data-k=best]','Keep the best part','Record up to four best things each day. A star on a logged block also adds its best thing to that day’s notebook.'],
    ['reflect','.bg2','Look back with a little kindness','Your streaks, moods, lessons and gratitude live here. Backfilled days count too.'],
    ['note','.pg','A message in a bottle','Write on the left and draw on the right. Press Enter to keep a line, then use Send to sea when the page is ready.'],
    ['sea','.water','Find a moment again','After five sent days, bottles from your past can drift back. Use Back to return to your Notebook.'],
    ['home','.toolbar-sync','The same logbook, on every device','Connect the same Dropbox account on your phone and computer. On a new device, choose Connect an existing logbook from the welcome screen. Sync status is always in this top bar.'],
    ['home','.desktop-search','Find your way quickly','Ctrl+K or Cmd+K opens search and commands. Use 1–5 to move between the main screens, arrows to change calendar periods, and Esc to close an editor.'],
    ['set','.desktop-actions','You’re ready to keep your logbook','Bookmark this website to use your logbook on the go. Download a backup from this top bar whenever you need one. You can replay this walkthrough from Settings → Help.']
  ];
  OB[0]=()=>{
    if(!desktopMedia.matches)return originalSplash();
    return`<div class="desktop-welcome"><p class="welcome-eyebrow">A PERSONAL RECORD OF YOUR DAYS</p><h1 class="big">${S.out?'Welcome back'+(S.name?', '+esc(S.name):''):'Sailor Logbook'}</h1><p class="welcome-copy">${S.out?'Your logbook is right where you left it.':'A personal book for the little things you do in the day.'}</p><div class="welcome-actions"><button class="btn" data-a="cv:${S.out?'inn':'obn'}">${S.out?'Open my logbook':'Climb aboard'}</button><button class="btn g" data-a="cv:acc">Connect an existing logbook</button></div><p class="welcome-private">Bookmark this website to use your logbook on the go.</p></div>`;
  };
  ACT.obn=function(){
    const desktopOnboarding=desktopMedia.matches&&scr==='ob';
    if(desktopOnboarding&&ob===6){HSD=1;HSS=0;}
    originalNext();
    if(desktopOnboarding&&HSS){HSS=0;ob=7;R();}
    if(desktopOnboarding&&ob===8){ob=9;R();}
  };
  ACT.obb=function(){
    if(desktopMedia.matches&&scr==='ob'){
      if(ob===9){ob=7;R();return;}
      if(ob===7){ob=6;HSS=0;R();return;}
    }
    originalBack();
  };
  ACT.cv=function(action){if(desktopMedia.matches&&scr==='ob'){hp(6);ACT[action]?.();return;}originalTransition(action);};
  ACT.sail=function(){
    if(!desktopMedia.matches){originalSail();return;}
    S.ob=1;S.out=0;sv();scr='home';ob=0;HSS=0;R();startTour();
  };
  ACT.acc=function(){
    Q('#tsc').innerHTML='<div class="sync-close"><h2 class="h2">Bring your logbook aboard</h2><button class="ib" data-a="cls" aria-label="Close">'+I(IC.x,18)+'</button></div><p class="sync-copy" style="margin-top:16px">Connect the same Dropbox account you use on your other device, or restore a local backup.</p><button class="btn" data-a="sync">Connect Dropbox</button><button class="btn g" style="margin-top:10px" data-a="rs">Restore a backup file</button>';
    Q('#tsh').classList.add('on');
  };
  ACT.dbx2=()=>ACT.sync();
  function afterRender(){
    const opening=desktopMedia.matches&&scr==='ob';
    document.body.classList.toggle('desktop-onboarding',opening);
    let backdrop=Q('#desktop-welcome-backdrop');
    if(opening){
      if(!backdrop){backdrop=document.createElement('div');backdrop.id='desktop-welcome-backdrop';backdrop.setAttribute('aria-hidden','true');backdrop.inert=true;backdrop.innerHTML='<div class="welcome-background-brand">'+LogbookBrand.mark(28)+'<span>Sailor Logbook</span></div><div class="welcome-background-grid"><i></i><i></i><i></i><i></i><i></i><i></i></div>';document.body.prepend(backdrop);}
      const pane=Q('#obv');
      if(pane){
        pane.setAttribute('role','dialog');pane.setAttribute('aria-modal','true');pane.setAttribute('aria-label',ob===0?'Welcome to Sailor Logbook':'Set up your logbook');
        if(QS&&!pane.querySelector('.desktop-quote-next'))pane.insertAdjacentHTML('beforeend','<button class="btn desktop-quote-next" data-a="obn">Continue</button>');
        let illustration=Q('#welcome-illustration');
        if(!illustration){illustration=document.createElement('aside');illustration.id='welcome-illustration';illustration.innerHTML='<img src="icons/brand-icon.svg" alt="Sailor Logbook"><div><p>A LITTLE FURTHER, EVERY DAY</p><h2>Keep track of how far<br>your ship has sailed.</h2><span>A logbook for the life you’re living.</span></div><div class="welcome-wave" aria-hidden="true"></div>';Q('#app').prepend(illustration);}
        const n=Math.max(0,desktopSteps.indexOf(ob));
        illustration.dataset.step=String(n);
        let progress=Q('#desktop-ob-progress');if(!progress){progress=document.createElement('div');progress.id='desktop-ob-progress';Q('#app').append(progress);}
        progress.innerHTML=ob===0?'':`<span>${n} / ${desktopSteps.length-1}</span><div>${desktopSteps.slice(1).map((_,i)=>`<i class="${i<n?'done':''}"></i>`).join('')}</div>`;
      }
    }else{backdrop?.remove();Q('#welcome-illustration')?.remove();Q('#desktop-ob-progress')?.remove();}
    if(tourActive){Q('#app').inert=true;Q('.desktop-sidebar')?.setAttribute('inert','');}
  }
  function hideTour(offerShortcuts=false){
    clearTimeout(tourTimer);tourActive=false;tourTarget=null;
    Q('#tour').style.display='none';Q('#tour').classList.remove('desktop-tour','tour-centered');
    Q('#spot').style.display='none';const dim=Q('#dimb');if(dim)dim.style.display='none';
    document.body.classList.remove('desktop-tour-active','tour-sidebar-expanded');Q('#app').inert=false;Q('.desktop-sidebar')?.removeAttribute('inert');
    S.pf.desktopTour=1;sv();
    if(restoreFocus?.isConnected)restoreFocus.focus();else Q('.desktop-search')?.focus();
    if(offerShortcuts)window.LogbookShortcuts?.offer();
  }
  function positionTour(){
    if(!tourActive)return;
    const spot=Q('#spot'),card=Q('#tour');
    if(!tourTarget){spot.style.display='none';card.classList.add('tour-centered');card.style.left='';card.style.top='';return;}
    const r=tourTarget.getBoundingClientRect(),pad=7;
    Object.assign(spot.style,{display:'block',left:Math.max(8,r.left-pad)+'px',top:Math.max(8,r.top-pad)+'px',width:Math.min(innerWidth-16,r.width+pad*2)+'px',height:Math.min(innerHeight-16,r.height+pad*2)+'px'});
    card.classList.remove('tour-centered');
    const width=card.offsetWidth||380,height=card.offsetHeight||300;
    let x=r.right+20,y=r.top;
    if(x+width>innerWidth-24){x=innerWidth-width-28;y=r.bottom+20;}
    if(y+height>innerHeight-24)y=innerHeight-height-28;
    Object.assign(card.style,{left:Math.max(24,x)+'px',top:Math.max(24,y)+'px'});
  }
  tour=function(){
    if(!desktopMedia.matches){if(tourActive)hideTour();return originalTour();}
    if(TR>=guide.length){hideTour(true);return;}
    if(!tourActive)restoreFocus=document.activeElement;
    tourActive=true;clearTimeout(tourTimer);
    const step=guide[Math.max(0,TR)];
    sidebarSections.decks=step[4]==='decks';sidebarSections.presets=step[4]==='presets';
    document.body.classList.toggle('tour-sidebar-expanded',!!step[4]);
    SPk='';SQ='';scr=step[0];R();
    let dim=Q('#dimb');if(!dim){dim=document.createElement('div');dim.id='dimb';document.body.append(dim);}dim.style.display='block';
    const card=Q('#tour');card.className='tourc desktop-tour';card.style.display='block';card.setAttribute('role','dialog');card.setAttribute('aria-modal','true');card.setAttribute('aria-labelledby','desktop-tour-title');
    card.innerHTML=`<div class="guide-top"><span>${TR+1} of ${guide.length}</span><button class="ib" data-a="tskip" aria-label="Close walkthrough">${I(IC.x,18)}</button></div><h2 id="desktop-tour-title">${step[2]}</h2><p class="guide-copy">${step[3]}</p>${TR===3?'<div class="guide-syntax">Read book <span>+lea</span> <b>t45</b></div>':''}<div class="guide-dots">${guide.map((_,i)=>`<i class="${i===TR?'on':''}"></i>`).join('')}</div><div class="guide-actions"><button class="btn g" data-a="${TR?'desktopTourBack':'tskip'}">${TR?'Back':'Skip tour'}</button><button class="btn" data-a="tnx">${TR===guide.length-1?'Start my logbook':'Next'}</button></div>`;
    document.body.classList.add('desktop-tour-active');
    tourTarget=step[1]?Q(step[1]):null;
    if(tourTarget?.closest('.sidebar-scroll'))tourTarget.scrollIntoView({block:'nearest'});
    positionTour();tourTimer=setTimeout(positionTour,230);
    card.querySelector('[data-a="tnx"]').focus();
  };
  ACT.desktopTourBack=()=>{TR=Math.max(0,TR-1);tour();};
  const originalSkip=ACT.tskip;
  ACT.tskip=()=>{if(tourActive){TR=guide.length;hideTour();}else originalSkip();};
  function handleKey(e){
    if(tourActive){
      if(['Escape','ArrowRight','ArrowLeft'].includes(e.key)){e.preventDefault();e.stopImmediatePropagation();if(e.key==='Escape')ACT.tskip();else if(e.key==='ArrowRight')ACT.tnx();else ACT.desktopTourBack();return true;}
      if(e.key==='Tab'){trapFocus(e,Q('#tour'));e.stopImmediatePropagation();return true;}
      // Let native Enter/Space activate the focused tour button only.
      e.stopImmediatePropagation();return true;
    }
    if(desktopMedia.matches&&scr==='ob'){
      if(e.key==='Tab')trapFocus(e,Q('#tsh.on')||Q('#obv'));
      if(e.key==='Enter'&&e.target.id==='nm'){e.preventDefault();e.stopImmediatePropagation();ACT.obn();return true;}
    }
    return false;
  }
  function trapFocus(e,container){
    if(!container)return;const list=[...container.querySelectorAll('button,input,textarea,select,a[href]')].filter(el=>!el.disabled&&!el.closest('[hidden]'));
    const first=list[0],last=list.at(-1);if(!first)return;
    if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}
  }
  function beforeRender(){if(desktopMedia.matches&&scr==='ob'){if(ob===8)ob=9;if(HSS){HSS=0;if(ob===6)ob=7;}}}
  window.LogbookOnboarding={beforeRender,afterRender,handleKey,guide,hideTour};
  window.addEventListener('resize',positionTour);
  desktopMedia.addEventListener?.('change',()=>{if(tourActive&&!desktopMedia.matches){const step=TR;hideTour();TR=Math.min(step,T3.length-1);originalTour();}});
  R();
})();
