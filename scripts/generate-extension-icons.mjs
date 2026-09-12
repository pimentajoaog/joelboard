/* Generate Joelboard Mini suite + tool icons. */
import { mkdirSync } from 'node:fs';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const root = path.resolve(import.meta.dirname, '..');
const baseIcon = path.join(root, 'public', 'icon-192.png');
const sizes = [16, 48, 128, 192];

const extensions = {
  mini: {
    dir: path.join(root, 'public', 'extensions', 'mini', 'icons'),
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
      <circle cx="32" cy="32" r="30" fill="#0f172a" stroke="#818cf8" stroke-width="2"/>
      <path d="M20 32h24M32 20v24" stroke="#818cf8" stroke-width="5" stroke-linecap="round"/>
      <circle cx="32" cy="32" r="8" fill="none" stroke="#22d3ee" stroke-width="3"/>
    </svg>`,
  },
  replace: {
    dir: path.join(root, 'public', 'extensions', 'mini', 'replace', 'icons'),
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
      <circle cx="32" cy="32" r="30" fill="#0f2a32" stroke="#22d3ee" stroke-width="2"/>
      <path d="M20 32h24" stroke="#22d3ee" stroke-width="5" stroke-linecap="round"/>
      <path d="M32 20v24" stroke="#22d3ee" stroke-width="5" stroke-linecap="round"/>
    </svg>`,
  },
  refresh: {
    dir: path.join(root, 'public', 'extensions', 'mini', 'refresh', 'icons'),
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
      <circle cx="32" cy="32" r="30" fill="#0f2a1f" stroke="#34d399" stroke-width="2"/>
      <path d="M42 22A18 18 0 1 0 46 38" fill="none" stroke="#34d399" stroke-width="5" stroke-linecap="round"/>
      <path d="M46 16v12h-12" fill="none" stroke="#34d399" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>`,
  },
};

const base = readFileSync(baseIcon);

for (const [name, { dir, svg }] of Object.entries(extensions)) {
  mkdirSync(dir, { recursive: true });
  const badge = Buffer.from(svg);

  for (const size of sizes) {
    const badgeSize = Math.max(10, Math.round(size * 0.44));
    const margin = Math.max(0, Math.round(size * 0.02));

    const badgePng = await sharp(badge)
      .resize(badgeSize, badgeSize)
      .png()
      .toBuffer();

    const out = path.join(dir, `icon-${size}.png`);
    await sharp(base)
      .resize(size, size)
      .composite([{ input: badgePng, gravity: 'southeast', top: size - badgeSize - margin, left: size - badgeSize - margin }])
      .png()
      .toFile(out);

    console.log(`wrote ${path.relative(root, out)}`);
  }
}
