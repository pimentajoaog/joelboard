/**
 * Sync public/data/precos-watch.json from Finance sheet tab PrecosBuscas.
 * Skips quietly when FINANCE_PRECOS_SHEET_ID or service account creds are missing.
 *
 * Usage: node scripts/sync-precos-watch-from-sheet.mjs [--dry-run]
 */
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { loadEnvFile, repoRoot } from './lib/load-env.mjs';
import {
  loadServiceAccountCredentials,
  getServiceAccountAccessToken,
  fetchSheetValues
} from './lib/google-sheets-sa.mjs';
import { buscasRowsToWatch, formatPrecosWatchJson } from '../lib/precos-watch.mjs';

const TAB = 'PrecosBuscas';

async function main() {
  loadEnvFile();
  const dryRun = process.argv.includes('--dry-run');
  const sheetId = (process.env.FINANCE_PRECOS_SHEET_ID || '').trim();
  const creds = loadServiceAccountCredentials();

  if (!sheetId || !creds) {
    console.log('Skip precos watch sync (set FINANCE_PRECOS_SHEET_ID + GOOGLE_SERVICE_ACCOUNT_JSON).');
    return;
  }

  const token = await getServiceAccountAccessToken(creds);
  const rows = await fetchSheetValues(sheetId, TAB, token);
  const watch = buscasRowsToWatch(rows);
  if (!watch.length) {
    console.warn('PrecosBuscas has no active rows — watch file would be empty.');
  }

  const outPath = join(repoRoot(), 'public/data/precos-watch.json');
  const body = formatPrecosWatchJson(watch);
  if (dryRun) {
    console.log('Dry-run would write', watch.length, 'entries to', outPath);
    console.log(body);
    return;
  }
  writeFileSync(outPath, body, 'utf8');
  console.log('Wrote', watch.length, 'watch entries →', outPath);
}

const isMain = process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url;
if (isMain) {
  main().catch(function (e) {
    console.error(e.message || e);
    process.exit(1);
  });
}
