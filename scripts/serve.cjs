const http=require('node:http');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const allowed=new Set(['index.html','sw.js','manifest.webmanifest','desktop.css','motion.css','app-v2.js','onboarding.js','shortcuts.js','desktop-workspace.js','desktop-behavior.js','brand.js','config.js','ui-v8.js','updates.js','sync-core.js','dropbox-sync.js','conflict-review.js','dropbox-ui.js','sync-scheduler.js','sync-status.js','oauth-landing.js']);
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json','.webmanifest':'application/manifest+json','.woff2':'font/woff2','.png':'image/png','.svg':'image/svg+xml'};
const port=Number(process.env.PORT||4173);
http.createServer((req,res)=>{
  let name;try{name=decodeURIComponent(new URL(req.url,'http://localhost').pathname).slice(1)||'index.html';}catch{res.writeHead(400).end();return;}
  if((!allowed.has(name)&&!name.startsWith('fonts/')&&!name.startsWith('icons/'))||name.includes('..')||name.includes('\\')){res.writeHead(404).end();return;}
  const file=path.resolve(root,name);
  if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}
  fs.readFile(file,(err,data)=>{if(err){res.writeHead(404).end();return;}res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream','Cache-Control':'no-store'});res.end(data);});
}).listen(port,'127.0.0.1',()=>console.log('Local: http://127.0.0.1:'+port));
