const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..'),out=path.join(root,'dist');
fs.mkdirSync(out,{recursive:true});
const files=['index.html','sw.js','manifest.webmanifest','_headers','desktop.css','motion.css','app-v2.js','onboarding.js','shortcuts.js','desktop-workspace.js','desktop-behavior.js','brand.js','sync-core.js','dropbox-sync.js','conflict-review.js','dropbox-ui.js','sync-scheduler.js','sync-status.js','oauth-landing.js','config.js','ui-v8.js','updates.js','DEPLOY.md','DROPBOX-SETUP.md','LICENSE','THIRD_PARTY_NOTICES.md'];
for(const file of files)fs.copyFileSync(path.join(root,file),path.join(out,file));
for(const folder of ['fonts','icons'])fs.cpSync(path.join(root,folder),path.join(out,folder),{recursive:true});
console.log('Cloudflare upload folder: '+out);
