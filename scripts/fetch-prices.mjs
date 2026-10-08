/**
 * Daily Preços fetch — SerpApi Google Shopping → public/data/precos/<id>/<YYYY-MM>.json
 * Usage: node scripts/fetch-prices.mjs [--dry-run] [--date=YYYY-MM-DD]
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { loadEnvFile, repoRoot } from './lib/load-env.mjs';
import { flattenShopping, mapSerpOffer } from '../lib/precos-serp.mjs';

export { mapSerpOffer } from '../lib/precos-serp.mjs';

function saneOffer(o, prevDayMin) {
  if (!o || o.preco < 100 || o.preco > 200000) return false;
  if (prevDayMin != null && prevDayMin > 500 && o.preco < prevDayMin * 0.35) return false;
  if (prevDayMin != null && o.preco > prevDayMin * 2.5) return false;
  return true;
}

function prevDayMin(monthData, today) {
  const keys = Object.keys(monthData || {}).filter(k => k < today).sort();
  if (!keys.length) return null;
  const last = keys[keys.length - 1];
  const offers = monthData[last] || [];
  let min = null;
  offers.forEach(function (o) {
    if (o.preco != null && (min == null || o.preco < min)) min = o.preco;
  });
  return min;
}

async function fetchShopping(key, q) {
  const url = new URL('https://serpapi.com/search.json');
  url.searchParams.set('engine', 'google_shopping');
  url.searchParams.set('q', q);
  url.searchParams.set('gl', 'br');
  url.searchParams.set('hl', 'pt-br');
  url.searchParams.set('google_domain', 'google.com.br');
  url.searchParams.set('api_key', key);
  const res = await fetch(url);
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || res.statusText || 'SerpApi failed');
  return json;
}

function readWatch(root) {
  const p = join(root, 'public/data/precos-watch.json');
  return JSON.parse(readFileSync(p, 'utf8'));
}

async function main() {
  loadEnvFile();
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const dateArg = args.find(a => a.startsWith('--date='));
  const today = dateArg ? dateArg.split('=')[1] : new Date().toISOString().slice(0, 10);
  const ym = today.slice(0, 7);
  const root = repoRoot();
  const key = process.env.SERPAPI_KEY;

  if (!key) {
    console.error('Missing SERPAPI_KEY');
    process.exit(1);
  }

  let queriesUsed = 0;
  const watch = readWatch(root);
  let changed = false;

  for (const entry of watch) {
    const id = entry.id;
    const termo = entry.termo || entry.q;
    if (!id || !termo) continue;
    try {
      console.log('Fetching', id, '—', termo);
      const json = await fetchShopping(key, termo);
      queriesUsed++;
      const items = flattenShopping(json);
      const dir = join(root, 'public/data/precos', id);
      const file = join(dir, ym + '.json');
      let month = {};
      if (existsSync(file)) month = JSON.parse(readFileSync(file, 'utf8'));
      const pmin = prevDayMin(month, today);
      const offers = [];
      items.forEach(function (it) {
        const o = mapSerpOffer(it);
        if (o && saneOffer(o, pmin)) offers.push(o);
      });
      if (!offers.length) {
        console.warn('  No offers kept for', id, '(raw', items.length + ')');
        continue;
      }
      month[today] = offers;
      if (dryRun) {
        console.log('  Dry-run would write', offers.length, 'offers to', file);
        continue;
      }
      mkdirSync(dir, { recursive: true });
      writeFileSync(file, JSON.stringify(month, null, 2) + '\n', 'utf8');
      changed = true;
      console.log('  Wrote', offers.length, 'offers →', file);
    } catch (e) {
      console.error('  Failed', id + ':', e.message);
    }
  }

  console.log('SerpApi queries this run:', queriesUsed);
  if (!changed && !dryRun) console.log('No files updated.');
}

const isMain = process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url;
if (isMain) {
  main().catch(function (e) {
    console.error(e);
    process.exit(1);
  });
}
