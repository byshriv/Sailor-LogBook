const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const base='reference/demo-v8';
const files=['index.html','sw.js','manifest.webmanifest','_headers','desktop.css','motion.css','app-v2.js','onboarding.js','shortcuts.js','desktop-workspace.js','desktop-behavior.js','brand.js','sync-core.js','dropbox-sync.js','conflict-review.js','dropbox-ui.js','sync-scheduler.js','sync-status.js','oauth-landing.js','config.js','ui-v8.js','updates.js','LICENSE','THIRD_PARTY_NOTICES.md'];
for(const folder of ['fonts','icons']) for(const file of fs.readdirSync(folder)) files.push(`${folder}/${file}`);
if(process.argv.includes('--create')){
  if(fs.existsSync(base))throw Error('Frozen reference exists; do not overwrite it');
  for(const file of files){fs.mkdirSync(path.dirname(`${base}/${file}`),{recursive:true});fs.copyFileSync(file,`${base}/${file}`);}
  const hashes=Object.fromEntries(files.sort().map(file=>[file,crypto.createHash('sha256').update(fs.readFileSync(`${base}/${file}`)).digest('hex')]));
  fs.writeFileSync('reference/demo-v8.sha256.json',JSON.stringify(hashes,null,2)+'\n');
}
const hashes=JSON.parse(fs.readFileSync('reference/demo-v8.sha256.json','utf8'));
for(const[file,expected]of Object.entries(hashes)){
  const actual=crypto.createHash('sha256').update(fs.readFileSync(`${base}/${file}`)).digest('hex');
  if(actual!==expected)throw Error(`Frozen reference changed: ${file}`);
}
console.log(`Frozen demo v8 verified: ${Object.keys(hashes).length} files.`);
