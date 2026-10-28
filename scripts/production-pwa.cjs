const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const root = 'build/foundation';
fs.mkdirSync(path.join(root, 'icons'), { recursive: true });
for (const name of [
  'icon-192.png',
  'icon-512.png',
  'icon-maskable-512.png',
  'apple-touch-icon.png',
])
  fs.copyFileSync('icons/' + name, root + '/icons/' + name);
fs.writeFileSync(
  root + '/manifest.webmanifest',
  JSON.stringify({
    id: '/',
    name: 'Sailor Logbook',
    short_name: 'Logbook',
    start_url: '/?phase=8',
    scope: '/',
    display: 'standalone',
    background_color: '#121010',
    theme_color: '#121010',
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
      {
        src: '/icons/icon-maskable-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  }),
);
function files(dir) {
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .flatMap((e) => (e.isDirectory() ? files(path.join(dir, e.name)) : [path.join(dir, e.name)]));
}
const all = files(root).filter((p) => !p.endsWith('sw-production.js') && !p.endsWith('_headers'));
const version = crypto
  .createHash('sha256')
  .update(all.map((p) => p + fs.readFileSync(p).toString('base64')).join(''))
  .digest('hex')
  .slice(0, 16);
const urls = all.map((p) => '/' + path.relative(root, p).replaceAll('\\', '/'));
fs.writeFileSync(
  root + '/sw-production.js',
  `const CACHE='slb-production-${version}';
const FILES=${JSON.stringify(urls)};
self.addEventListener('install',e=>e.waitUntil((async()=>{try{await (await caches.open(CACHE)).addAll(FILES);}catch(error){await caches.delete(CACHE);throw error;}})()));
// No skipWaiting or clients.claim: every old editing page must close before activation.
self.addEventListener('activate',e=>e.waitUntil((async()=>{for(const key of await caches.keys())if(key.startsWith('slb-production-')&&key!==CACHE)await caches.delete(key);})()));
self.addEventListener('fetch',e=>{const u=new URL(e.request.url);if(e.request.method!=='GET'||u.origin!==self.location.origin)return;
if(e.request.mode==='navigate'){e.respondWith(caches.open(CACHE).then(c=>c.match('/index.html')).then(r=>r||fetch(e.request)));return;}
if(FILES.includes(u.pathname))e.respondWith(caches.open(CACHE).then(c=>c.match(u.pathname)).then(r=>r||fetch(e.request)));
});`,
);
fs.writeFileSync(
  root + '/_headers',
  '/sw-production.js\n  Cache-Control: no-cache\n/index.html\n  Cache-Control: no-cache\n/assets/*\n  Cache-Control: public, max-age=31536000, immutable\n',
);
console.log(
  'Production shell precached:',
  version,
  urls.length,
  'assets. Dedicated origin required.',
);
