/* Zip Joelboard Mini extensions for direct download. © 2026 Joel Soluções LTDA. */
import { execSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const extDir = path.join(root, 'public', 'extensions');
const src = path.join(extDir, 'replace');
const out = path.join(extDir, 'joelboard-replace.zip');

if (!existsSync(src)) {
  console.log('zip-extensions: no replace extension, skipping');
  process.exit(0);
}

try {
  if (process.platform === 'win32') {
    const ps = `Compress-Archive -Path '${src}' -DestinationPath '${out}' -Force`;
    execSync(`powershell -NoProfile -Command "${ps}"`, { stdio: 'inherit', cwd: root });
  } else {
    execSync('zip -rq joelboard-replace.zip replace', { stdio: 'inherit', cwd: extDir });
  }
  console.log('zip-extensions: wrote joelboard-replace.zip');
} catch (e) {
  console.error('zip-extensions failed:', e.message);
  process.exit(1);
}
