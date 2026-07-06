/* Zip Joelboard Mini extensions for direct download. © 2026 Joel Soluções LTDA. */
import { execSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const extDir = path.join(root, 'public', 'extensions');

const extensions = [
  { folder: 'replace', zip: 'joelboard-replace.zip' },
  { folder: 'refresh', zip: 'joelboard-refresh.zip' },
];

for (const { folder, zip } of extensions) {
  const src = path.join(extDir, folder);
  const out = path.join(extDir, zip);
  if (!existsSync(src)) {
    console.log(`zip-extensions: no ${folder} extension, skipping ${zip}`);
    continue;
  }
  try {
    if (process.platform === 'win32') {
      const ps = `Compress-Archive -Path '${src}' -DestinationPath '${out}' -Force`;
      execSync(`powershell -NoProfile -Command "${ps}"`, { stdio: 'inherit', cwd: root });
    } else {
      execSync(`zip -rq ${zip} ${folder}`, { stdio: 'inherit', cwd: extDir });
    }
    console.log(`zip-extensions: wrote ${zip}`);
  } catch (e) {
    console.error(`zip-extensions failed for ${zip}:`, e.message);
    process.exit(1);
  }
}
