import * as esbuild from 'esbuild';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

await esbuild.build({
  entryPoints: [join(root, 'lib/finance-math.mjs')],
  bundle: true,
  format: 'iife',
  globalName: 'FinMath',
  outfile: join(root, 'public/finance-math.js'),
  banner: { js: '/* Finance math — built from lib/finance-math.mjs. Do not edit by hand. */' }
});

console.log('bundle-finance-math: wrote public/finance-math.js');
