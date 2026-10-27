const fs = require('node:fs');
const path = require('node:path');
const packages = [
  'react',
  'react-dom',
  'scheduler',
  '@reduxjs/toolkit',
  'redux',
  'redux-thunk',
  'immer',
  'reselect',
  '@capacitor/core',
  '@capacitor/android',
  'hash-wasm',
];
let text =
  fs.readFileSync('LICENSE', 'utf8') + '\n\n' + fs.readFileSync('THIRD_PARTY_NOTICES.md', 'utf8');
for (const name of packages) {
  const root = path.join('node_modules', name);
  const file = ['LICENSE', 'LICENSE.md', 'LICENSE.txt', 'license', 'license.md'].find((p) =>
    fs.existsSync(path.join(root, p)),
  );
  if (!file) throw Error(`Missing distribution notice: ${name}`);
  text += `\n\n--- ${name} ---\n` + fs.readFileSync(path.join(root, file), 'utf8');
}
for (const file of ['fonts/rethink-sans-OFL.txt', 'fonts/patrick-hand-OFL.txt'])
  text += '\n\n' + fs.readFileSync(file, 'utf8');
fs.writeFileSync('build/foundation/THIRD_PARTY_NOTICES.txt', text);
console.log('Foundation artifact includes runtime and font license notices.');
