# Joelboard — Shared Kit & New-App Starter

The Joelboard suite (Hub, Finance, Fit, Study, Notas, Mini) is **one Vite multi-page app** with **Tailwind**.
Every app shares core logic, styles, design tokens, and interaction conventions.
**Read this before building a new app or extending shared UI.**

User-facing guides: **[docs/README.md](docs/README.md)** · Repo overview: **[README.md](README.md)**

---

## Repo layout

```
joelboard/
  index.html              # Hub
  finance/index.html
  fit/index.html
  study/index.html
  notas/index.html
  mini/index.html         # redirects to Hub Mini panel
  src/<app>.css           # Tailwind per app (@tailwind + :root + @apply)
  public/
    joelboard.js          # shared core → window.JB
    joelboard.css         # shared components + animation/polish kit
    themes.css            # body[data-skin] palettes
    <app>.js              # per-app logic (global script, not a module)
    fit-macros.js         # Fit Macros tab (loads after fit.js)
    finance-math.js       # bundled from scripts/bundle-finance-math.mjs
    finance-sheets.js     # Finance sheet I/O
    sw.js                 # PWA; cache id bumped each build
    extensions/           # Replace + Refresh source; zips via npm run zip:extensions
  tests/*.test.mjs
  docs/                   # user documentation per app
  scripts/                # build helpers (bump-sw, zip-extensions, …)
  tailwind.config.js      # preflight: false
  vite.config.js          # MPA inputs (6 entries)
```

---

## Build & deploy

| Command | Purpose |
|---------|---------|
| `npm install` | Dependencies |
| `npm run dev` | Vite dev server (+ zip extensions) |
| `npm run build` | `dist/` for production |
| `npm run check` | `node --check` on all app scripts |
| `npm test` | Node test runner |
| `npm run zip:extensions` | `joelboard-replace.zip`, `joelboard-refresh.zip` |

**Vercel:** Build `npm run build`, output `dist/`. Commit source only.

**Cache gotcha:** `/joelboard.js`, `/joelboard.css`, `/themes.css`, `/<app>.js` are **unhashed**. `public/sw.js` network-first-revalidates them (`{ cache: 'reload' }`). Cache id `C = 'joelboard-<git-short-hash>'` bumps every build. Stale core files → hard refresh / wait for new SW.

After large file writes, verify brace balance and run `npm run check`.

---

## Shared core — `joelboard.js` (`window.JB`)

Load order in every app HTML:

```html
<script src="https://accounts.google.com/gsi/client" async></script>
<script src="/joelboard.js"></script>
<script src="/<app>.js"></script>
```

### Auth

| API | Role |
|-----|------|
| `JB.signIn({ onSuccess })` | Interactive login |
| `JB.requestToken(interactive)` | Token fetch; silent with cooldown on failure |
| `JB.cachedToken()`, `JB.isSignedIn()`, `JB.hasSession()` | Session state |
| `JB.email()`, `JB.fetchEmail()` | User email |
| `JB.signOut()` | Global logout |

Login persists across all apps (shared `localStorage` email + session token in `sessionStorage`).

### Google API & sheets

| API | Role |
|-----|------|
| `JB.api(method, url, body)` | Bearer + auto 401 silent refresh |
| `JB.resolveSheet({ app, namePart, requiredTabs })` | → `{ id, grid }`; rejects `JB_NEED_SHEET` with `.files` |
| `JB.getSheetId(app)`, `setSheetId`, `clearSheetId` | `localStorage` `jb_sheet_<app>` |
| `JB.sheetTabs(id)` | Tab name → sheetId map |

**`requiredTabs`:** validated with `.some` (≥1 tab present). Pass **app-unique tabs only** — not shared `Config`, or a fresh device may bind the wrong spreadsheet. Use `ensureTabs()` after resolve to create missing tabs.

### Sync & offline

| API | Role |
|-----|------|
| `JB.onTabVisible(fn[, { intervalMs }])` | Refresh when tab visible (default 90s throttle) |
| `JB.watchSheet(app, onStale)` | Cross-tab write detection via generation counter |
| `JB.persist({ run, onSuccess, onError, btn, busy })` | Save with retry + offline outbox |
| `JB.flushOutbox`, `JB.outboxCount`, `JB.onOutboxChange` | Offline queue badge / sync |

Background reloads: wrap fetches in `JB.syncWrap(promise)` for top sync bar + header pulse.

### UI helpers

| API | Role |
|-----|------|
| `JB.toast(msg)` | Shared toast; auto `.ok` on messages starting with `✓` |
| `JB.confirm(title, msg, onYes[, opts])` | Themed yes/no dialog |
| `JB.feedback(appName)` | Bug/idea modal → Google Form |
| `JB.ddToggle(btn)`, `JB.ddClose()` | Custom dropdown `.jb-dd` |
| `JB.datePicker`, `JB.dpOpen`, `JB.dpSet`, `JB.dpGet`, `JB.fmtDate` | In-app calendar (no native `<input type=date>`) |
| `JB.tour(app, steps[, { onDone }])`, `JB.tourDone(app)` | Coach-mark onboarding |
| `JB.emptyState({ icon, title, hint, action, onclick })` | Empty list placeholder HTML |
| `JB.skeletonHtml('fit'\|'study'\|'notas')` | Loading shimmer |
| `JB.staggerChildren(el, key)` | First-render list cascade |
| `JB.searchFocus`, `searchBlur`, `searchClearVis` | Notas search bar polish |

Scroll-lock behind `.overlay.open` is automatic (`.jb-noscroll` on `<html>`/`<body>`).

### Theming

| API | Role |
|-----|------|
| `JB.applySkin(app)` | Apply saved skin + light/dark on load |
| `JB.renderSkinPicker(app, el[, onChange])` | Skin grid + day/night toggle |
| `JB.getSkin`, `JB.setSkin`, `JB.getMode`, `JB.setMode`, `JB.toggleMode` | Persist `jb_skin_<app>`, `jb_mode_<app>` |

Skins in `/themes.css` (`body[data-skin]`). Each app persists its own skin.

### Constants

`JB.CLIENT_ID`, `JB.SCOPES`

---

## Shared styles — `joelboard.css`

Link in every app `<head>` **before** app CSS.

Provides:

- Scrollbar, scroll-lock, settings modal sizing (`#setOverlay .modal`)
- **Modals:** `.overlay` / `.modal` / `.mh` / `.mt` / `.x` — mobile bottom sheets ≤540px
- **Dropdown:** `.jb-dd` (+ `.jb-dd-btn`, `.jb-dd-menu`, `.jb-dd-opt.is-sel`)
- **Confirm card:** `.confirm-card` (slide-in nudge, not modal)
- **Empty states:** `.jb-empty`, `.jb-empty-btn`
- **Skeletons:** `.jb-skel-*`, `.jb-skel-wrap`
- **Sync bar:** `.jb-sync`, `html.jb-syncing .header`
- **Tab pill:** `.jb-tab-pill` on `.tabbar` (auto-synced by core)
- **FAB:** `.fab` press + `.jb-fab-hide` on scroll down
- **List press:** `:active` on `.row`, `.notec`, `.erow`, `.matc`, `.mline`
- **Animation:** `jb-fade`, `jb-rise`, `jb-pop`; `.page.on`, `.tab-page.active`, `.set-pane.active` fade in
- **Toast:** `#toast`, `.jb-toast`
- **Date picker:** `.modal.jb-cal`, `.datebtn`
- **Tour:** `#jbTour`, `.jbt-*`

`prefers-reduced-motion` disables most motion.

---

## Design tokens

**Shared neutral vocabulary (every app):**

`--bg --surface --surface2 --border --text --muted --radius --radius-sm --primary --success --brand --on-brand`

**App-specific:** Finance `--income --expense --font-display`; Hub `--fit --study --notas --mini` tile colors; Fit `--accent2`.

Tailwind maps via `tailwind.config.js`. **Do not** introduce `--accent`/`--ok` outside legacy cleanup — use `--primary`/`--success`.

---

## Apps & sheet tabs (reference)

| App | `resolveSheet` app key | Distinctive tabs |
|-----|------------------------|------------------|
| Finance | `finance` | All: Transactions, Budget, Goals, … (see finance-sheets.js) |
| Fit | `fit` | Exercicios, Treinos, Sessoes, Series, Peso, MacroFoods, MacroLog, … |
| Study | `study` | Materias, Eventos (not Config alone) |
| Notas | `notas` | Notas, Itens (not Config alone) |

Each app: gate → create/link sheet → `loadData` → `show`.

---

## New app — checklist

1. **Entry:** `newapp/index.html`; add to `vite.config.js` `rollupOptions.input`.
2. **Head:** `/joelboard.css`, `/themes.css`, GIS script, `/joelboard.js`; `../src/newapp.css`.
3. **Script:** `public/newapp.js` at end of `<body>` — **no** large inline scripts.
4. **Tokens:** `:root` in `src/newapp.css`; copy reset from `src/fit.css`.
5. **Shell:** Hub door `location.href='/'`; `#setOverlay` settings; **Ajustes → feedback + tutorial**.
6. **Data:** `JB.resolveSheet({ app:'newapp', namePart:'Joelboard', requiredTabs:[...] })` → `JB.api`.
7. **Hub tile** in `index.html` + optional `HUB_NEWS` entry.
8. **Tour:** `JB.tour('newapp', STEPS)` on first boot; replay from settings.
9. **Validate:** `node --check public/newapp.js`; `npm run build`.

---

## Conventions (always)

- Each app's JS in `public/<app>.js` — classic globals, not ES modules in HTML.
- **No** `alert` / `confirm` / `prompt` — use `JB.confirm` + `JB.toast`.
- **No** `!important` — fix specificity.
- Reuse shared components before inventing new ones.
- Per-user data in user's Google Sheet (Model B); OAuth client id is public-safe.
- Only commit when asked; run `npm run check` before push.

---

## Extensions (Mini)

Source: `public/extensions/replace/`, `public/extensions/refresh/`.

Build zips: `npm run zip:extensions`. User docs: **[docs/mini.md](docs/mini.md)**.

Replace content script must tolerate **extension context invalidated** after reload — guard all `chrome.runtime` calls.

---

## Testing

`npm test` runs `tests/*.test.mjs` (finance-math, auth-token, replace-snippet, …).

Add tests for pure logic in `tests/`; extension/content scripts are checked with `node --check` via `npm run check`.
