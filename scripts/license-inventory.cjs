const fs = require('node:fs');
const lock = JSON.parse(fs.readFileSync('package-lock.json', 'utf8'));
const inventory = Object.entries(lock.packages)
  .filter(([p]) => p)
  .map(([p, v]) => ({
    path: p,
    version: v.version,
    license: v.license ?? 'REVIEW REQUIRED',
    development: !!v.dev,
  }));
fs.mkdirSync('docs', { recursive: true });
fs.writeFileSync('docs/dependency-inventory.json', JSON.stringify(inventory, null, 2) + '\n');
console.log(
  `Inventory: ${inventory.length} lockfile entries. Review required: ${inventory.filter((v) => v.license === 'REVIEW REQUIRED').length}`,
);
