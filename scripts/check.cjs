const fs = require('node:fs');
const vm = require('node:vm');
const cp = require('node:child_process');
fs.mkdirSync('.local',{recursive:true});
const html=fs.readFileSync('index.html','utf8');
const inline=[...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)].map(x=>x[1]).filter(Boolean).join('\n');
fs.writeFileSync('.local/extracted-app.js',inline);
for(const file of ['.local/extracted-app.js','app-v2.js','onboarding.js','shortcuts.js','desktop-workspace.js','desktop-behavior.js','brand.js','sync-core.js','dropbox-sync.js','conflict-review.js','dropbox-ui.js','sync-scheduler.js','sync-status.js','oauth-landing.js','config.js','ui-v8.js','updates.js','sw.js']) {
  cp.execFileSync(process.execPath,['--check',file],{stdio:'inherit'});
}
for(const file of ['manifest.webmanifest','package.json'])JSON.parse(fs.readFileSync(file,'utf8'));
for(const file of ['app-v2.js','sync-core.js','dropbox-sync.js'])new vm.Script(fs.readFileSync(file,'utf8'),{filename:file});
const files=vm.runInNewContext(fs.readFileSync('sw.js','utf8').split("self.addEventListener")[0]+';F');
for(const file of files)if(file!=='./'&&!fs.existsSync(file.split('?')[0]))throw Error('Missing offline asset: '+file);
console.log('Syntax, manifests and offline assets verified.');
