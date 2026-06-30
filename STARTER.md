# Joelboard — Shared Kit & New-App Starter

The Joelboard suite (Hub, Finance, Fit, …) is **one Vite multi-page app** with **Tailwind**.
Every app shares the same core logic, styles, design tokens, and interaction conventions so
the whole suite feels like one product. **Read this before building a new app or a new component.**

---

## Repo layout

```
joelboard/
  index.html            # Hub (entry)        — markup only
  finance/index.html    # Finance (entry)    — markup only
  fit/index.html        # Fit (entry)        — markup only
  src/<app>.css         # each app's Tailwind stylesheet (@tailwind + :root tokens + @apply components)
  public/
    joelboard.js        # shared core logic  -> window.JB   (served at /joelboard.js)
    finance.js / fit.js / hub.js   # each app's OWN logic   (served at /<app>.js)
    joelboard.css       # shared styles + components         (served at /joelboard.css)
    themes.css          # shared skin palettes (body[data-skin]) (served at /themes.css)
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
  `JB.toast(msg)`, `JB.confirm(title, msg, onYes[, {yes, no, danger, onNo, html}])` (styled, theme-adaptive
  yes/no dialog that builds its own DOM — no per-app markup; `danger:true` = red confirm). Background
  **scroll-lock** behind any open `.overlay.open` is automatic.
- **Custom dropdown:** `JB.ddToggle(btn)` / `JB.ddClose()` — drive the `.jb-dd` component (see Shared styles); core auto-closes on outside-click.
- **Date picker:** `JB.datePicker(currentISO, onPick[, opts])` — in-app popup month calendar (builds its own `.overlay/.modal.jb-cal` DOM, themed, month nav, today/selected highlight, Limpar + Hoje). `onPick(iso)` gets `YYYY-MM-DD` (or `''` when cleared). **Standard pattern (used by Finance/Study/Notas — NO native `<input type=date>`):** markup is a `<button class="field datebtn" id="X" data-iso="" data-ph="dd/mm/aaaa" onclick="JB.dpOpen('X')">dd/mm/aaaa</button>`, and JS uses the glue `JB.dpOpen(id[,onChange])` / `JB.dpSet(id, iso)` (prefill) / `JB.dpGet(id)` (read ISO) / `JB.fmtDate(iso)`. The button stores ISO in `data-iso` and displays dd/mm/yyyy.
- **Guided tour:** `JB.tour(app, steps[, {onDone}])` + `JB.tourDone(app)`. Coach-mark onboarding that builds its own DOM (spotlight + tooltip). Each step `{ sel, title, body, go }` — `go` is an optional fn run before the step (switch tabs / open things) and `sel` spotlights a functional element (no `sel` = centered card). Completion persists in `localStorage` (`jb_tour_<app>`). Run on first launch (`if(!JB.tourDone('x')) JB.tour('x', STEPS)`) + a "Ver tutorial" replay button in settings.
- **Theming:** `JB.applySkin(app)` (call early on load — applies the saved skin AND day/night mode), `JB.renderSkinPicker(app, el[, onChange])`
  (renders a day/night toggle + the swatch grid into `el`, persists choice), `JB.SKINS`, `JB.getSkin(app)`, `JB.setSkin(app, id)`.
  Skins live in `/themes.css` (`body[data-skin]`); selection persists per-app in `localStorage` (`jb_skin_<app>`).
- **Day/night:** orthogonal `body[data-mode="light|dark"]` axis. `JB.getMode/setMode/toggleMode/applyMode(app)` (persist `jb_mode_<app>`). Each skin has a NATIVE mode (`SKIN_MODE` map; default→dark) and a `color-mix`-tinted OPPOSITE-mode block in `/themes.css`, so every theme has a cute light↔dark counterpart. The toggle ships inside `renderSkinPicker`, so any app with a skin picker gets it free. Press (ink accent) special-cases its dark variant. Generic no-skin modes use `body:not([data-skin])[data-mode=…]` to avoid fighting skins.
- **Constants:** `JB.CLIENT_ID`, `JB.SCOPES`.

## Shared styles — `joelboard.css` (link in every app's `<head>`)

Plain CSS on CSS-variable tokens (adapts per app + per Finance skin). Provides:

- Aesthetic **scrollbar**, **scroll-lock** (`.jb-noscroll`), settings-modal sizing (`#setOverlay .modal`)
- **Modal kit:** `.overlay` / `.overlay.open` / `.modal` (+ `jb-modal-in`) / `.mh` (head) / `.mt` (title) / `.x` (close)
- **Custom dropdown:** `.jb-dd` (markup: `.jb-dd-btn` toggled by `JB.ddToggle(this)` + `.jb-dd-menu` of `.jb-dd-opt`, mark current `.is-sel`). Add `.up` to open upward. Core handles open/close + outside-click. Theme-adaptive, scrollable — use instead of native `<select>` for a consistent in-app look.
- **Slide-in nudge/confirm card:** `.confirm-card` (+ `.show`) — bottom-right toast-style prompt, NOT a modal. Inner: `.cc-head` / `.cc-x` / `.cc-body` / `.cc-q`(` strong` = green highlight) / `.cc-btns` / `.cc-btn`(`.yes` = affirmative green). Use for low-friction confirmations & contextual nudges (see Finance `showNudge`/salary card).
- **Input:** `.field` (+ `:focus`)
- **Primary button:** `.btn-primary`
- **Animation kit:** keyframes `jb-fade` / `jb-rise` / `jb-pop` + utility classes `.jb-fade-in` / `.jb-rise-in`; press-feedback (`:active` scale) + smooth transitions are built into `.btn-primary`/`.jb-dd-btn`/`.cc-btn`, and `.jb-dd-menu` pops in. **For tab transitions, add `animation: jb-fade .22s ease` to your page-active class** (Fit/Study use `.page.on`, Finance `.tab-page.active`). Keyframes live in joelboard.css so any app can reference them.

## Design tokens (set in each app's `:root`, mapped to Tailwind utilities)

**Shared neutral vocabulary (every app uses these exact names — domain-free):**
`--bg --surface --surface2 --border --text --muted --radius --radius-sm`
`--primary` (the app's accent/brand color) · `--success` (positive/affirmative green) · `--brand` (= `--primary`) + `--on-brand` (text on brand).
**App-domain extras** (NOT shared — each app's own): Finance `--income --expense --warning --savings --shadow --font-body --font-display` (Finance aliases the shared token: `--success: var(--income)`, so it tracks every skin); Hub `--fit` (Fit's brand color for its tile); Fit `--accent2` (soft brand tint).
Tailwind names map 1:1: `bg-bg/surface/surface2`, `text-ink(→--text)/muted/primary/success`, `border-border`, `bg-brand`. **Do NOT introduce `--accent`/`--ok`/`--income` outside Finance** — `--accent`/`--ok` were Fit's old names (now `--primary`/`--success`); `--income` is Finance-domain only.
Theme = override these vars under `body[data-skin="…"]`. Themes stay **per-app** (skin saved in each app's own sheet/storage). Finance ships 8 skins.

---

## New app — checklist

1. **Entry:** add `newapp/index.html`; register it in `vite.config.js` `rollupOptions.input`.
   In `<head>` link `/joelboard.css`, `/themes.css` (shared skins), the Google GIS script, and `/joelboard.js`; link `../src/newapp.css`.
   **Keep the app's JS in its OWN `public/newapp.js`** (classic global `<script src="/newapp.js"></script>`
   at end of `<body>`, after `/joelboard.js`) — never inline a big `<script>` in the HTML. The `.html` is markup only.
2. **Tokens:** in `src/newapp.css` set `:root` (pick the accent → `--brand`/`--on-brand`, `--radius`, `--radius-sm`, surfaces…).
   Start the file with `@tailwind base; @tailwind components; @tailwind utilities;` then the reset block
   (copy from `src/fit.css` — preflight is off globally) then app components via `@apply` on tokens.
3. **Reuse components:** `.overlay/.modal/.mh/.mt/.x`, `.field`, `.btn-primary`, `.confirm-card`, `JB.toast`, `JB.feedback`, `JB.confirm`.
   **Theming:** call `JB.applySkin('newapp')` once on load, and drop `JB.renderSkinPicker('newapp', el)` into a settings "Tema" section — the 8 skins + persistence come free.
4. **Data:** `JB.requestToken(true)` → `JB.resolveSheet({app:'newapp', namePart:'Joelboard', requiredTabs:[...]})`
   → `JB.api(...)`; persist with `JB.setSheetId('newapp', id)`. Create the per-user sheet in the user's Drive.
   **`requiredTabs` validation is `.some` (≥1 present), so pass only tabs UNIQUE to this app** — never the
   shared `Config` tab, or resolveSheet will match another app's sheet on a fresh device (e.g. Study uses
   `['Materias','Eventos']`, not `['…','Config']`). Use a small `ensureTabs()` to create any missing tabs (incl. Config) after resolve.
5. **Shell:** dark theme + Hanken Grotesk; a `←` hub door (`location.href='/'`); tabbed settings overlay
   with `id="setOverlay"`; put **Enviar feedback** in settings.
6. Add a tile for it on the Hub.

## Conventions (always)

- **Each app's JS lives in its own `public/<app>.js`** (classic global script, after `/joelboard.js`); HTML is markup only. Validate with `node --check public/<app>.js`.
- **No** browser `alert/confirm/prompt` — styled in-app modals + `JB.toast` only.
- **No** `!important` — fix with specificity/order.
- Reuse the shared core/tokens/components before writing new ones; if something common diverges, unify it.
- Keep all apps consistent in **code AND design/UI/UX** — one product, many sides.
- Per-app data lives in the user's own Google Sheet (Model B); never email-as-user; OAuth Client ID is public-safe.
