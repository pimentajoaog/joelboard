# Joelboard — Shared Kit & New-App Starter

The Joelboard suite (Hub, Finance, Fit, …) is **one Vite multi-page app** with **Tailwind**.
Every app shares the same core logic, styles, design tokens, and interaction conventions so
the whole suite feels like one product. **Read this before building a new app or a new component.**

---

## Repo layout

```
joelboard/
  index.html            # Hub (entry)
  finance/index.html    # Finance (entry)
  fit/index.html        # Fit (entry)
  src/<app>.css         # each app's Tailwind stylesheet (@tailwind + :root tokens + @apply components)
  public/
    joelboard.js        # shared core logic  -> window.JB   (served at /joelboard.js)
    joelboard.css       # shared styles + components         (served at /joelboard.css)
    manifest.json, sw.js, icons
  tailwind.config.js    # tokens map to CSS vars; corePlugins.preflight = false
  vite.config.js        # MPA: rollupOptions.input = the 3 (+N) html entries
  postcss.config.js
```

## Build & deploy

- Local: `npm install` then `npm run build` (output `dist/`). `npm run dev` for dev server.
- Vercel: Build Command `npm run build`, Output `dist/`. You commit **source**; Vercel builds.
- Do NOT commit `node_modules/` or `dist/` (see `.gitignore`).
- Tooling note: large file writes via the editor have truncated before — after writing a big
  file, verify `{`/`}` brace counts (or write via shell + `cp`), then `npm run build`.

---

## Shared core — `joelboard.js` (`window.JB`)

Load with `<script src="https://accounts.google.com/gsi/client" async></script>` + `<script src="/joelboard.js"></script>`.

- **Auth:** `JB.requestToken(interactive)` (shows the pre-login "app não verificado" consent
  explainer first time / on scope change; handles iOS silent-token timeout), `JB.cachedToken()`,
  `JB.email()`, `JB.fetchEmail()`, `JB.signOut()`. Login persists across all apps.
- **Data:** `JB.api(method, url, body)` (Bearer + auto 401 silent-refresh & retry),
  `JB.resolveSheet({app, namePart:'Joelboard', requiredTabs:[...]})` → `{id, grid}`
  (Drive search by name + validates required tabs + auto-picks single match + self-heals a
  stale/wrong id; rejects `Error('JB_NEED_SHEET')` with `.files` when the app must show a gate/picker),
  `JB.sheetTabs(id)`, `JB.getSheetId(app)/setSheetId(app,id)/clearSheetId(app)` (namespaced `jb_sheet_<app>`).
- **UI helpers:** `JB.feedback(appName)` (styled bug/idea modal → owner's Google Form),
  `JB.toast(msg)`. Background **scroll-lock** behind any open `.overlay.open` is automatic.
- **Constants:** `JB.CLIENT_ID`, `JB.SCOPES`.

## Shared styles — `joelboard.css` (link in every app's `<head>`)

Plain CSS on CSS-variable tokens (adapts per app + per Finance skin). Provides:

- Aesthetic **scrollbar**, **scroll-lock** (`.jb-noscroll`), settings-modal sizing (`#setOverlay .modal`)
- **Modal kit:** `.overlay` / `.overlay.open` / `.modal` (+ `jb-modal-in`) / `.mh` (head) / `.mt` (title) / `.x` (close)
- **Input:** `.field` (+ `:focus`)
- **Primary button:** `.btn-primary`

## Design tokens (set in each app's `:root`, mapped to Tailwind utilities)

`--bg --surface --surface2 --border --text --muted --radius --radius-sm`
`--brand` (app's primary color) + `--on-brand` (text on brand) + the app accent (`--accent` or `--primary`).
Tailwind names: `bg-bg/surface/surface2`, `text-ink/muted/accent/primary`, `border-border`, `bg-brand`, etc.
Finance ships 8 skins by overriding these vars via `body[data-skin="…"]`.

---

## New app — checklist

1. **Entry:** add `newapp/index.html`; register it in `vite.config.js` `rollupOptions.input`.
   In `<head>` link `/joelboard.css`, the Google GIS script, and `/joelboard.js`; link `../src/newapp.css`.
2. **Tokens:** in `src/newapp.css` set `:root` (pick the accent → `--brand`/`--on-brand`, `--radius`, `--radius-sm`, surfaces…).
   Start the file with `@tailwind base; @tailwind components; @tailwind utilities;` then the reset block
   (copy from `src/fit.css` — preflight is off globally) then app components via `@apply` on tokens.
3. **Reuse components:** `.overlay/.modal/.mh/.mt/.x`, `.field`, `.btn-primary`, `JB.toast`, `JB.feedback`.
4. **Data:** `JB.requestToken(true)` → `JB.resolveSheet({app:'newapp', namePart:'Joelboard', requiredTabs:[...]})`
   → `JB.api(...)`; persist with `JB.setSheetId('newapp', id)`. Create the per-user sheet in the user's Drive.
5. **Shell:** dark theme + Hanken Grotesk; a `←` hub door (`location.href='/'`); tabbed settings overlay
   with `id="setOverlay"`; put **Enviar feedback** in settings.
6. Add a tile for it on the Hub.

## Conventions (always)

- **No** browser `alert/confirm/prompt` — styled in-app modals + `JB.toast` only.
- **No** `!important` — fix with specificity/order.
- Reuse the shared core/tokens/components before writing new ones; if something common diverges, unify it.
- Keep all apps consistent in **code AND design/UI/UX** — one product, many sides.
- Per-app data lives in the user's own Google Sheet (Model B); never email-as-user; OAuth Client ID is public-safe.
