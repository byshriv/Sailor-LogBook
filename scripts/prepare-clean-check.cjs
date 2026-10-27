const fs = require('node:fs');
const path = require('node:path');
const target = '.local/phase1-clean-check';
if (fs.existsSync(target)) throw Error('Clean check target exists; preserve evidence and choose a new directory');
fs.mkdirSync(target, { recursive: true });
const folders = ['apps', 'packages', 'tests', 'scripts', 'docs', 'reference', '.github', 'fonts', 'icons', 'research', 'svg icons and animations'];
for (const dir of folders) fs.cpSync(dir, path.join(target, dir), { recursive: true });
for (const entry of fs.readdirSync('.', { withFileTypes: true })) {
  if (entry.isFile() && !/\.(?:zip|log)$/.test(entry.name) && !entry.name.startsWith('.env')) {
    fs.copyFileSync(entry.name, path.join(target, entry.name));
  }
}
console.log(`Fresh source check prepared at ${path.resolve(target)}; no node_modules/.local/private Git state copied.`);
