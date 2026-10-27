const fs = require('node:fs');
const path = require('node:path');
const allowed = {
  domain: [],
  persistence: ['domain'],
  'sync-core': [],
  'sync-providers': ['sync-core'],
  platform: [],
  crypto: [],
};
for (const [pkg, deps] of Object.entries(allowed)) {
  for (const file of fs.readdirSync(`packages/${pkg}/src`).filter((f) => f.endsWith('.ts'))) {
    const source = fs.readFileSync(`packages/${pkg}/src/${file}`, 'utf8');
    for (const match of source.matchAll(/(?:from\s*|import\s*\(|import\s*)['"]([^'"]+)['"]/g)) {
      const spec = match[1];
      if (pkg === 'crypto' && spec === 'hash-wasm') continue; // Reviewed Argon2id dependency, pinned in lockfile.
      if (!spec.startsWith('.')) throw Error(`${pkg}: external dependency ${spec} requires review`);
      const resolved = path.resolve(`packages/${pkg}/src`, spec);
      const target = path.relative(path.resolve('packages'), resolved).split(path.sep)[0];
      if (target !== pkg && !deps.includes(target)) throw Error(`${pkg} cannot import ${spec}`);
    }
    if (/\b(?:window|document|localStorage|fetch)\b/.test(source))
      throw Error(`${pkg}: browser/app coupling`);
  }
}
console.log('Package dependency directions verified.');
