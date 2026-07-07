# Joelboard

Personal productivity suite by **Joel Soluções LTDA** — Finance, Fit, Study, Notas, and Chrome Mini extensions, unified under one Hub with shared Google login and design system.

**Live:** [joelboard.vercel.app](https://joelboard.vercel.app)

---

## Apps

| App | Path | What it does |
|-----|------|--------------|
| **Hub** | `/` | Launcher, Novidades changelog, themes, feedback viewer (owner) |
| **Finance** | `/finance` | Income, expenses, budget, bills, savings, work log |
| **Fit** | `/fit` | Workouts, exercise library, session logging, progress, macros |
| **Study** | `/study` | Calendar, subjects, exams, focus mode, attachments |
| **Notas** | `/notas` | Lists (shopping, tasks, notes, travel), checkboxes, due dates |
| **Mini** | Hub → Mini panel | Chrome extensions: **Replace** (text expansion) and **Refresh** (auto-reload tab) |

User guides: **[docs/](docs/README.md)**

Developer guide: **[STARTER.md](STARTER.md)**

---

## Quick start (local)

**Requirements:** Node.js 18+, npm

```bash
npm install
npm run dev
```

Open the URL Vite prints (usually `http://localhost:5173`). Google Sign-In works on localhost if the OAuth client allows it.

**Other commands:**

| Command | Purpose |
|---------|---------|
| `npm run build` | Production build → `dist/` |
| `npm run preview` | Serve `dist/` locally |
| `npm run check` | Syntax-check all app scripts |
| `npm test` | Unit tests (`tests/*.test.mjs`) |
| `npm run zip:extensions` | Rebuild `public/extensions/joelboard-*.zip` |

---

## Deploy (Vercel)

1. Connect the GitHub repo to Vercel.
2. **Build command:** `npm run build`
3. **Output directory:** `dist`
4. Commit **source only** — do not commit `node_modules/` or `dist/` (see `.gitignore`).

**Prateleira env vars (Vercel → Settings → Environment Variables):**

| Variable | Purpose |
|----------|---------|
| `VITE_TMDB_API_KEY` | Film/series search (injected at build) |
| `RAWG_API_KEY` | Game search via `/api/rawg` serverless proxy |

Each deploy bumps the service-worker cache id (`scripts/bump-sw.mjs`). Core assets (`/joelboard.js`, `/joelboard.css`, `/themes.css`, `/<app>.js`) are served at **unhashed URLs**; the PWA uses network-first revalidation. If a change does not appear after deploy, hard-refresh or wait for the new service worker.

---

## Architecture (short)

- **Vite MPA** — one HTML entry per app (`vite.config.js` → `index.html`, `finance/`, `fit/`, `study/`, `notas/`, `mini/`).
- **Shared core** — `public/joelboard.js` → `window.JB` (auth, Sheets API, UI helpers).
- **Shared styles** — `public/joelboard.css`, `public/themes.css`.
- **Per-app logic** — `public/<app>.js` (classic globals, not ES modules).
- **Per-app Tailwind** — `src/<app>.css` (`@tailwind` + `@apply`, preflight off).
- **Data** — each app stores data in the user’s own Google Spreadsheet on Drive (OAuth `spreadsheets` + `drive.file`). Sheet id cached per app in `localStorage` (`jb_sheet_<app>`).

---

## Extensions (Mini)

Zip bundles are built to `public/extensions/` and linked from the Hub Mini panel:

- `joelboard-replace.zip` — text expansion
- `joelboard-refresh.zip` — tab auto-refresh

Install: unzip → Chrome → Extensions → Developer mode → Load unpacked. Details: **[docs/mini.md](docs/mini.md)**

---

## Feedback & license

In-app feedback: **Ajustes → Enviar feedback** (any app) or Hub feedback panel (owner).

© 2026 Joel Soluções LTDA · All rights reserved.
