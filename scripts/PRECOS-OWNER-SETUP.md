# Preços — on-demand search (current)

Preços uses **Buscar preços agora** in Contas: each click calls `/api/precos` (SerpApi on the server) and saves that day’s offers in your Finance sheet tab **`PrecosCapturas`**. History, charts, discount logic, and store links work from those snapshots.

## Vercel / production

1. Repository or Vercel env: **`SERPAPI_KEY`** (same as local `.env`).
2. Redeploy after adding the key.

No Google service account or GitHub Actions required.

## Local dev

1. `SERPAPI_KEY=…` in `.env`
2. `npm run dev` — Vite proxies `/api/precos` like Recipes/TMDB.

## Optional maintainer script

`node scripts/fetch-prices.mjs` still writes sample JSON under `public/data/precos/` for the **Experimentar exemplo RX 9070 XT** demo only.
