const fs=require('node:fs');
const path=require('node:path');
const {JSDOM,VirtualConsole}=require('jsdom');
const {webcrypto}=require('node:crypto');
const seed=()=>({name:'Alex',ob:1,docks:[{id:'work',n:'Work',c:'#3d7fc2'},{id:'learn',n:'Learning',c:'#d8b94c'}],entries:[{id:'entry1',t:'Read a book',d:'learn',date:'2026-10-20',s:540,e:600,tg:{}}],tasks:[{id:'task1',t:'Plan a trip',d:'work',date:'2026-10-20',time:660,dur:30,st:'todo'}],pf:{snd:0,hap:0,nbi:1,st:'home'},ach:{}});
function load({width=1440,file='index.html',state=seed(),url='http://localhost:4173/',session={},storage={},request,storageManager}={}){
  const errors=[],vc=new VirtualConsole();vc.on('jsdomError',e=>errors.push(e));
  let html=fs.readFileSync(file,'utf8');
  html=html.replace(/<script src="([^"]+)"><\/script>/g,(_,src)=>'<script>'+fs.readFileSync(path.resolve(src),'utf8').replace(/<\/script>/g,'<\\/script>')+'</script>');
  const dom=new JSDOM(html,{url,runScripts:'dangerously',pretendToBeVisual:true,virtualConsole:vc,beforeParse(w){
    Object.defineProperty(w,'innerWidth',{value:width,writable:true});
    Object.defineProperty(w,'crypto',{value:webcrypto});
    w.TextEncoder=TextEncoder;w.TextDecoder=TextDecoder;w.structuredClone=structuredClone;
    w.Response=Response;w.Headers=Headers;
    w.matchMedia=q=>({matches:q.includes('min-width')?width>=900:false,media:q,addEventListener(){},removeEventListener(){}});
    w.HTMLCanvasElement.prototype.getContext=()=>new Proxy({measureText:()=>({width:60}),createLinearGradient:()=>({addColorStop(){}}),createRadialGradient:()=>({addColorStop(){}})},{get:(o,p)=>p in o?o[p]:()=>{}});
    w.HTMLCanvasElement.prototype.toDataURL=()=> 'data:image/png;base64,AA==';
    w.Element.prototype.animate=()=>({finished:Promise.resolve(),cancel(){}});
    w.Element.prototype.scrollIntoView=()=>{};
    w.navigator.storage=storageManager===undefined?{persist:async()=>true,persisted:async()=>true}:storageManager;
    w.fetch=request||(async()=>{throw Error('Unexpected network request in smoke test');});
    w.confirm=w.prompt=w.alert=()=>{throw Error('Browser dialog called');};
    w.localStorage.setItem('slb1',JSON.stringify(state));
    for(const[key,value]of Object.entries(session))w.sessionStorage.setItem(key,typeof value==='string'?value:JSON.stringify(value));
    for(const[key,value]of Object.entries(storage))w.localStorage.setItem(key,typeof value==='string'?value:JSON.stringify(value));
  }});
  return {dom,w:dom.window,errors,ready:async()=>{await dom.window.slbSyncReady;await new Promise(r=>setTimeout(r,15));return dom.window;}};
}
module.exports={load,seed};
