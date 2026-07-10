/* Generate distinct Joelboard Mini extension icons with corner badges. */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const root = path.resolve(import.meta.dirname, '..');
const baseIcon = path.join(root, 'public', 'icon-192.png');
const sizes = [16, 48, 128, 192];

const extensions = {
  replace: {
    bg: '#0f2a32',
    stroke: '#22d3ee',
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
      <circle cx="32" cy="32" r="30" fill="#0f2a32" stroke="#22d3ee" stroke-width="2"/>
      <path d="M20 32h24" stroke="#22d3ee" stroke-width="5" stroke-linecap="round"/>
      <path d="M32 20v24" stroke="#22d3ee" stroke-width="5" stroke-linecap="round"/>
    </svg>`,
  },
  refresh: {
    bg: '#0f2a1f',
    stroke: '#34d399',
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
      <circle cx="32" cy="32" r="30" fill="#0f2a1f" stroke="#34d399" stroke-width="2"/>
      <path d="M42 22A18 18 0 1 0 46 38" fill="none" stroke="#34d399" stroke-width="5" stroke-linecap="round"/>
      <path d="M46 16v12h-12" fill="none" stroke="#34d399" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>`,
  },
  report: {
    bg: '#2a1f0f',
    stroke: '#f59e0b',
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
      <circle cx="32" cy="32" r="30" fill="#2a1f0f" stroke="#f59e0b" stroke-width="2"/>
      <rect x="18" y="14" width="28" height="36" rx="5" fill="none" stroke="#f59e0b" stroke-width="3.5"/>
      <path d="M24 24h16M24 32h12M24 40h14" stroke="#f59e0b" stroke-width="3" stroke-linecap="round"/>
    </svg>`,
  },
};

const base = readFileSync(baseIcon);

for (const [name, { svg }] of Object.entries(extensions)) {
  const outDir = path.join(root, 'public', 'extensions', name, 'icons');
  const badge = Buffer.from(svg);

  for (const size of sizes) {
    const badgeSize = Math.max(10, Math.round(size * 0.44));
    const margin = Math.max(0, Math.round(size * 0.02));

    const badgePng = await sharp(badge)
      .resize(badgeSize, badgeSize)
      .png()
      .toBuffer();

    const out = path.join(outDir, `icon-${size}.png`);
    await sharp(base)
      .resize(size, size)
      .composite([{ input: badgePng, gravity: 'southeast', top: size - badgeSize - margin, left: size - badgeSize - margin }])
      .png()
      .toFile(out);

    console.log(`wrote ${path.relative(root, out)}`);
  }
}
