/* Sailor Logbook — MIT. Human-readable, stable-ID conflict decisions. */
(function(){
  let displayed=new Map();
  const names={entries:'Logged moment',tasks:'Planned task',docks:'Deck',pre:'Preset',best:'Best thing',les:'Lesson',grat:'Gratitude',line:'Notebook line',nb:'Notebook page',mood:'Mood',ach:'Achievement',name:'Profile name',full:'Profile name',av:'Profile picture',order:'Home layout',hide:'Home layout',rorder:'Reflection layout',rhide:'Reflection layout',bt:'Sent bottle',seen:'Bottle history'};
  function origin(version){const actor=version?.stamp?.[1]||'',device=LS.getItem('slb-device');return actor==='bestLimit'?'rule':device&&actor.startsWith(device)?'device':'cloud';}
  function summary(type,version){
    if(!version||version.deleted)return'<p class="conflict-deleted">Removed</p><p class="mu">This version removes the item.</p>';
    const value=version.value,record=type==='line'?value.line:value;
    let title=type==='av'?'Profile picture':typeof record==='string'?(type==='pre'?parse(record).title:record):record?.t||record?.n;
    if(!title){if(Array.isArray(record))title=record.length+' selected items';else if(type==='mood')title=moodL[record]||'Mood changed';else title=typeof record==='object'?'Page updated':String(record??'Blank');}
    const details=[];
    if(record?.date)details.push(P(record.date).toLocaleDateString('en',{month:'short',day:'numeric',year:'numeric'}));
    if(type==='entries')details.push(ft(record.s)+'–'+ft(record.e));
    else if(type==='tasks'&&record.time!=null)details.push(ft(record.time)+(record.dur?' · '+record.dur+' min':''));
    else if(record?.dur)details.push(record.dur+' min');
    if(record?.d&&dk(record.d))details.push(dk(record.d).n);
    const image=type==='av'?value:record?.photo||record?.draw||record?.dd;
    return`<p class="conflict-title">${esc(title||'Blank')}</p>${details.length?`<p class="conflict-details">${esc(details.join(' · '))}</p>`:''}${record?.desc?`<p class="conflict-details">${esc(record.desc)}</p>`:''}${typeof image==='string'&&image.startsWith('data:image/')?`<img class="conflict-image" src="${esc(image)}" alt="Saved image preview">`:''}`;
  }
  function render(engine){
    const doc=engine.getDoc(),conflicts=LogbookSync.conflicts(doc);displayed=new Map();if(!conflicts.length)return'';
    return`<section class="sync-conflicts"><h3>Review conflicting edits · ${conflicts.length}</h3><p class="sync-copy">Two devices changed the same item. Both versions are saved. Choose which one to keep; independent edits merge automatically.</p>${conflicts.map(c=>{
      const type=JSON.parse(c.key)[0],current=doc.records[c.key],saved=c.version,a=origin(current),b=origin(saved),devicePair=a!==b&&[a,b].every(x=>['device','cloud'].includes(x));
      displayed.set(c.id,JSON.stringify(current?.stamp));
      let choices=[{version:current,restore:false,source:a},{version:saved,restore:true,source:b}];if(devicePair&&a==='cloud')choices.reverse();
      return`<article class="sync-conflict"><h4>${esc(names[type]||'Saved item')}</h4><div class="conflict-choices">${choices.map(choice=>{
        const label=devicePair?(choice.source==='device'?'This device':'Dropbox'):(choice.restore?'Saved alternative':'Current version'),action=choice.restore?'dbxConflictRestore':'dbxConflictKeep';
        return`<div class="conflict-choice"><h5>${label}</h5><span class="conflict-location">${choice.restore?'Saved alternative':'In your logbook now'}</span>${summary(type,choice.version)}<button class="btn g" data-a="${action}:${encodeURIComponent(c.id)}">${devicePair?'Use '+(choice.source==='device'?'this device':'Dropbox version'):choice.restore?'Use saved version':'Keep current version'}</button></div>`;
      }).join('')}</div></article>`;
    }).join('')}</section>`;
  }
  async function choose(encoded,restore){
    try{
      const id=decodeURIComponent(encoded),engine=window.slbSync,doc=engine.getDoc(),conflict=LogbookSync.conflicts(doc).find(c=>c.id===id);
      if(!conflict){renderS();toast('This conflict has already been reviewed.');return;}
      if(displayed.get(id)!==JSON.stringify(doc.records[conflict.key]?.stamp)){renderS();toast('This item changed. Review the latest versions.');return;}
      await engine.resolve(id,restore);renderS();toast('Your choice is saved.');
      if(S.ob&&engine.getAuth().refresh&&!engine.getAuth().needsSetup)await window.LogbookSyncScheduler?.request('manual',{force:true});
    }catch(error){syncError(error);}
  }
  ACT.dbxConflictKeep=id=>choose(id,false);ACT.dbxConflictRestore=id=>choose(id,true);
  window.LogbookConflictReview={render};
})();
