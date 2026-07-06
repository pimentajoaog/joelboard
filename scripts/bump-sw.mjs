/* Bump service-worker cache id on each build (git short hash). © 2026 Joel Soluções LTDA. */
import { execSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const swPath = path.join(path.resolve(import.meta.dirname, '..'), 'public', 'sw.js');
let tag = 'dev';
try {
  tag = execSync('git rev-parse --short HEAD', { encoding: 'utf8', cwd: path.dirname(swPath) }).trim();
} catch (_) {
  tag = String(Date.now());
}
const ver = `joelboard-${tag}`;
const src = readFileSync(swPath, 'utf8');
const next = src.replace(/const C = 'joelboard-[^']*';/, `const C = '${ver}';`);
if (next === src) {
  console.error('bump-sw: could not update cache id in public/sw.js');
  process.exit(1);
}
writeFileSync(swPath, next);
console.log(`bump-sw: cache id → ${ver}`);
