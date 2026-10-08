/**
 * Optional bulk fetch — SerpApi → public/data/precos/<id>/<YYYY-MM>.json
 * Usage: node scripts/fetch-prices.mjs [--dry-run] [--date=YYYY-MM-DD]
 * On-demand Preços in the app uses /api/precos + sheet PrecosCapturas instead.
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { loadEnvFile, repoRoot } from './lib/load-env.mjs';
import { mapSerpOffer, saneSerpOffer, prevDayMinFromRaw } from '../lib/precos-serp.mjs';
import { fetchSerpShoppingOffers } from '../lib/precos-api.mjs';

export { mapSerpOffer } from '../lib/precos-serp.mjs';

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
      const dir = join(root, 'public/data/precos', id);
      const file = join(dir, ym + '.json');
      let month = {};
      if (existsSync(file)) month = JSON.parse(readFileSync(file, 'utf8'));
      const pmin = prevDayMinFromRaw(month, today);
      const result = await fetchSerpShoppingOffers(termo, key, { prevDayMin: pmin });
      queriesUsed++;
      const offers = result.offers;
      if (!offers.length) {
        console.warn('  No offers kept for', id, '(raw', result.rawCount + ')');
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
