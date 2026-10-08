/**
 * One-shot SerpApi Google Shopping spike for Preços field mapping.
 * Usage: SERPAPI_KEY=... node scripts/spike-serpapi-precos.mjs
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { loadEnvFile, repoRoot } from './lib/load-env.mjs';

loadEnvFile();
const key = process.env.SERPAPI_KEY;
if (!key) {
  console.error('Missing SERPAPI_KEY (env or .env)');
  process.exit(1);
}

const q = 'RX 9070 XT';
const url = new URL('https://serpapi.com/search.json');
url.searchParams.set('engine', 'google_shopping');
url.searchParams.set('q', q);
url.searchParams.set('gl', 'br');
url.searchParams.set('hl', 'pt-br');
url.searchParams.set('google_domain', 'google.com.br');
url.searchParams.set('api_key', key);

const res = await fetch(url);
const text = await res.text();
let json;
try { json = JSON.parse(text); } catch (_) {
  console.error('Non-JSON response', res.status, text.slice(0, 500));
  process.exit(1);
}
if (!res.ok) {
  console.error('SerpApi error', res.status, json.error || json);
  process.exit(1);
}

const outDir = join(repoRoot(), 'scripts', 'samples');
mkdirSync(outDir, { recursive: true });
const outPath = join(outDir, 'serpapi-google-shopping-rx-9070-xt.json');
writeFileSync(outPath, JSON.stringify(json, null, 2) + '\n', 'utf8');

const items = json.shopping_results || json.categorized_shopping_results?.flatMap(c => c.shopping_results || []) || [];
console.log('Saved', outPath);
console.log('shopping_results count:', items.length);
if (items[0]) {
  console.log('First item keys:', Object.keys(items[0]).join(', '));
  console.log('Sample:', JSON.stringify(items[0], null, 2).slice(0, 1200));
}
if (json.search_metadata) console.log('search_metadata:', JSON.stringify(json.search_metadata));
