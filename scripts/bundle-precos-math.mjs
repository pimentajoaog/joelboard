import * as esbuild from 'esbuild';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

await esbuild.build({
  entryPoints: [join(root, 'lib/precos-math.mjs')],
  bundle: true,
  format: 'iife',
  globalName: 'PrecosMath',
  outfile: join(root, 'public/precos-math.js'),
  banner: { js: '/* Preços math — built from lib/precos-math.mjs. Do not edit by hand. */' }
});

console.log('bundle-precos-math: wrote public/precos-math.js');
