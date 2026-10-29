// Narrow pre-publication guard. It does not replace GitHub scanning or manual review.
const fs = require('node:fs');
const path = require('node:path');
const excluded = new Set(['node_modules', '.git', '.local', 'build', 'dist']);
const patterns = [
  /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/,
  /gh[pousr]_[A-Za-z0-9]{30,}/,
  /github_pat_[A-Za-z0-9_]{60,}/,
  /(?:access_token|refresh_token|client_secret)\s*[=:]\s*["'][A-Za-z0-9_-]{40,}["']/,
];
function visit(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (excluded.has(entry.name)) continue;
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) visit(file);
    else if (
      /\.(?:[cm]?js|tsx?|json|html|css|md|yml|kt|java|gradle|xml|properties)$/.test(entry.name)
    ) {
      const source = fs.readFileSync(file, 'utf8');
      if (patterns.some((pattern) => pattern.test(source)))
        throw Error(`Potential secret: inspect ${file}`);
    }
  }
}
visit('.');
console.log(
  'Narrow credential/private-key pattern scan passed. Manual publication review remains required.',
);
