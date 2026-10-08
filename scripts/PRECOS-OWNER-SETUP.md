# Preços — owner sync (your Finance sheet → daily fetch)

One-time setup so **Nova busca** in Contas updates the nightly SerpApi job without editing `precos-watch.json` by hand.

## 1. Google Cloud service account

1. [Google Cloud Console](https://console.cloud.google.com/) → create or pick a project.
2. **APIs & Services → Enable APIs** → enable **Google Sheets API**.
3. **IAM → Service Accounts → Create** (name e.g. `joelboard-precos-read`).
4. Keys → **Add key → JSON** → save the file (never commit it).

## 2. Share your Finance spreadsheet

1. Open your **Joelboard Finance** spreadsheet in Drive (the one Contas uses).
2. **Share** → add the service account email (`…@….iam.gserviceaccount.com`) as **Viewer**.
3. Copy the spreadsheet ID from the URL:  
   `https://docs.google.com/spreadsheets/d/SHEET_ID_HERE/edit`

The job reads tab **`PrecosBuscas`** (same as the app).

## 3. GitHub repository secrets

| Secret | Value |
|--------|--------|
| `SERPAPI_KEY` | Already set |
| `FINANCE_PRECOS_SHEET_ID` | Spreadsheet ID from step 2 |
| `GOOGLE_SERVICE_ACCOUNT_JSON` | Entire contents of the JSON key file (one line is fine) |

## 4. Local `.env` (optional)

```env
SERPAPI_KEY=…
FINANCE_PRECOS_SHEET_ID=…
GOOGLE_SERVICE_ACCOUNT_JSON={"type":"service_account",…}
```

Or point to the key file:

```env
GOOGLE_APPLICATION_CREDENTIALS=C:/path/to/key.json
```

Then:

```bash
node scripts/sync-precos-watch-from-sheet.mjs
node scripts/fetch-prices.mjs
```

## 5. Verify

**Actions → Preços daily fetch → Run workflow**

Check the log for `Wrote N watch entries` and `Wrote … offers`. After deploy, new buscas (non-archived) appear in `/data/precos-watch.json` and get fetched on the next run.

**Delay:** up to ~24h until the scheduled cron, or run the workflow manually after adding a busca.
