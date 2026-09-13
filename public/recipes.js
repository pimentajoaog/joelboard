/* Joelboard Recipes — app logic. © 2026 Joel Soluções LTDA.
   Classic global script; loads after /joelboard.js. */
var APP = 'recipes';
var DATA = { cookbooks: [], recipes: [], ingredients: [], steps: [], plans: [] };
var recipesGrid = {};
var authDone = false;
var view = 'shelf'; /* shelf | book | recipe */
var openBookId = null;
var openRecipeId = null;
var flipIndex = 0;
var bookViewMode = 'flip';
var bookQuery = '';
var _peekBookId = null;
var _editBookId = null;
var _editRecipeId = null;
var _iconCtx = null;
var _iconDraft = '📖';
var _bookColor = '#e07a5f';
var _searchImportBookId = null;
var _ingDraft = [];
var _stepDraft = [];
var _recipeImgFile = null;
var _recipeImgLocalUrl = '';
var CHECK_KEY = 'jb_recipes_checks';
var VIEW_KEY = 'jb_recipes_view';
var SPREAD_KEY = 'jb_recipes_spread';
var spreadMode = 'pair'; /* pair = 2 receitas por spread | recipe = 1 receita nas duas folhas */
var _turnDir = 0;
var _spreadIntro = true;

var RECIPES_TABS = [
  ['Cookbooks', ['ID', 'Nome', 'Icone', 'Cor', 'Ordem', 'Criado']],
  ['Recipes', ['ID', 'CookbookID', 'Titulo', 'Icone', 'ImageUrl', 'Porcoes', 'Minutos', 'Notas', 'Ordem', 'Source', 'SourceID', 'Criado']],
  ['Ingredients', ['ID', 'RecipeID', 'Texto', 'Qtd', 'Unidade', 'Ordem']],
  ['Steps', ['ID', 'RecipeID', 'Texto', 'Ordem']],
  ['Plans', ['ID', 'RecipeID', 'Data', 'Criado']],
  ['Settings', ['Chave', 'Valor']]
];

var FOOD_ICONS = [
  { g: 'Livros', icons: ['📖', '📕', '📗', '📘', '📙', '📓', '⚡', '❤️', '⭐'] },
  { g: 'Café da manhã', icons: ['🍳', '🥞', '🧇', '🥐', '🥯', '🍞', '🧈', '🧀'] },
  { g: 'Pratos', icons: ['🍝', '🍜', '🍲', '🍛', '🍣', '🍤', '🥗', '🍕', '🌮', '🌯', '🥙', '🥪'] },
  { g: 'Carnes & peixes', icons: ['🥩', '🍗', '🥓', '🦴', '🐟', '🦐', '🦞'] },
  { g: 'Doces', icons: ['🧁', '🍰', '🎂', '🍪', '🍩', '🍫', '🍬', '🍮', '🍨'] },
  { g: 'Bebidas', icons: ['☕', '🍵', '🧃', '🥤', '🧋', '🍷', '🍸', '🍺'] },
  { g: 'Horta', icons: ['🥦', '🥕', '🌽', '🍅', '🥑', '🍄', '🌶️', '🫒', '🍋'] }
];
var BOOK_COLORS = ['#e07a5f', '#f59e0b', '#34d399', '#22d3ee', '#60a5fa', '#a78bfa', '#f472b6', '#fb7185', '#94a3b8'];

function $(id) { return document.getElementById(id); }
function uuid() {
  return 'xxxxxxxxxxxx4xxxyxxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    var r = Math.random() * 16 | 0;
    return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
  });
}
function esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
function escAttr(s) { return String(s == null ? '' : s).replace(/\\/g, '\\\\').replace(/'/g, "\\'"); }
function loadingHtml(h) { $('loading').style.display = 'block'; $('loading').innerHTML = h; $('app').style.display = 'none'; }
function showApp() { $('loading').style.display = 'none'; $('app').style.display = 'block'; }
function toast(m) { JB.toast(m); }
function todayISO() { return JB.todayYmd ? JB.todayYmd() : new Date().toISOString().slice(0, 10); }
function ssUrl(p) { return 'https://sheets.googleapis.com/v4/spreadsheets/' + JB.getSheetId(APP) + p; }
function loadViewPref() {
  try {
    var v = localStorage.getItem(VIEW_KEY);
    bookViewMode = (v === 'cards') ? 'cards' : 'flip';
  } catch (_) { bookViewMode = 'flip'; }
}
function saveViewPref() {
  try { localStorage.setItem(VIEW_KEY, bookViewMode); } catch (_) {}
}
function loadSpreadPref() {
  try {
    var v = localStorage.getItem(SPREAD_KEY);
    spreadMode = (v === 'recipe') ? 'recipe' : 'pair';
  } catch (_) { spreadMode = 'pair'; }
}
function saveSpreadPref() {
  try { localStorage.setItem(SPREAD_KEY, spreadMode); } catch (_) {}
}
/* Duas folhas só cabem no desktop; no celular é sempre uma página por vez. */
function wideSpread() {
  try { return window.matchMedia('(min-width:721px)').matches; } catch (_) { return true; }
}
function spreadStep() { return (spreadMode === 'pair' && wideSpread()) ? 2 : 1; }
function loadChecks() {
  try { return JSON.parse(localStorage.getItem(CHECK_KEY) || '{}') || {}; } catch (_) { return {}; }
}
function saveChecks(map) {
  try { localStorage.setItem(CHECK_KEY, JSON.stringify(map || {})); } catch (_) {}
}
function isChecked(recipeId, ingId) {
  var m = loadChecks();
  return !!(m[recipeId] && m[recipeId][ingId]);
}
function toggleCheck(recipeId, ingId) {
  var m = loadChecks();
  if (!m[recipeId]) m[recipeId] = {};
  m[recipeId][ingId] = !m[recipeId][ingId];
  saveChecks(m);
}
/* Passos usam o mesmo mapa: ids de ingrediente e de passo são uuids distintos. */
function stepIsDone(recipeId, stepId) { return isChecked(recipeId, stepId); }
function toggleStepCheck(recipeId, stepId) {
  toggleCheck(recipeId, stepId);
  render();
}
function doneCount(recipeId, rows) {
  var n = 0;
  rows.forEach(function (x) { if (isChecked(recipeId, x.id)) n++; });
  return n;
}
function hasAnyChecks(recipeId) {
  var m = loadChecks()[recipeId];
  if (!m) return false;
  for (var k in m) if (m[k]) return true;
  return false;
}
function resetRecipeChecks(recipeId) {
  var m = loadChecks();
  if (!m[recipeId]) return;
  delete m[recipeId];
  saveChecks(m);
  render();
}

function recipesSignOut() { JB.signOut(); location.href = '/'; }
function openSettings() {
  switchSet('tema');
  JB.renderSkinPicker(APP, $('setSkins'));
  var flip = $('setFlipPref');
  if (flip) flip.classList.toggle('on', bookViewMode === 'flip');
  paintSpreadPref();
  $('setOverlay').classList.add('open');
}
function paintSpreadPref() {
  var host = $('setSpreadPref');
  if (!host) return;
  host.querySelectorAll('.vbtn').forEach(function (b) {
    b.classList.toggle('on', b.getAttribute('data-spread') === spreadMode);
  });
}
function setSpreadMode(mode) {
  spreadMode = mode === 'recipe' ? 'recipe' : 'pair';
  saveSpreadPref();
  paintSpreadPref();
  flipIndex = 0;
  _spreadIntro = true;
  if (view === 'book' && bookViewMode === 'flip') render();
}
function closeSettings() { $('setOverlay').classList.remove('open'); }
function switchSet(name) {
  document.querySelectorAll('#setOverlay .set-tab').forEach(function (b) {
    b.classList.toggle('active', b.getAttribute('data-st') === name);
  });
  document.querySelectorAll('#setOverlay .set-pane').forEach(function (p) {
    p.style.display = p.getAttribute('data-pane') === name ? '' : 'none';
  });
}
function toggleFlipPref() {
  bookViewMode = bookViewMode === 'flip' ? 'cards' : 'flip';
  saveViewPref();
  var flip = $('setFlipPref');
  if (flip) flip.classList.toggle('on', bookViewMode === 'flip');
  if (view === 'book') render();
}

/* ---- boot / sheet ---- */
function startRecipes() {
  loadViewPref();
  loadSpreadPref();
  if (JB.isGhost && JB.isGhost()) {
    authDone = true;
    var fx = JB.ghostFixture && JB.ghostFixture('recipes');
    recipesGrid = (fx && fx.grid) || {};
    DATA = (fx && fx.data) || { cookbooks: [], recipes: [], ingredients: [], steps: [], plans: [] };
    if (!DATA.plans) DATA.plans = [];
    showApp();
    render();
    return;
  }
  if (JB.cachedToken && JB.cachedToken()) {
    authDone = true;
    bootSheet();
    return;
  }
  if (!JB.hasSession()) {
    showSignIn();
    return;
  }
  if (JB.bootAuthIfExpired(function () {
    authDone = false;
    showSignIn(true);
  }, function () {
    authDone = true;
    bootSheet();
  })) {
    loadingHtml(JB.skeletonHtml('recipes'));
    return;
  }
  loadingHtml(JB.skeletonHtml('recipes'));
  JB.requestToken(false).then(function () {
    authDone = true;
    bootSheet();
  }).catch(function () { showSignIn(); });
}

function showSignIn(expired) {
  loadingHtml(
    '<div class="gate"><div class="gt">Joelboard Recipes</div>'
    + '<div class="gs">' + (expired ? 'Sessão expirada. Entre de novo.' : 'Entre com Google para seus livros de receita.') + '</div>'
    + '<button class="btn-primary" onclick="recipesSignIn()">Entrar com Google</button></div>'
  );
}
function recipesSignIn() {
  JB.signIn({ onSuccess: function () { authDone = true; bootSheet(); } });
}

function bootSheet() {
  loadingHtml(JB.skeletonHtml('recipes'));
  if (JB.paintAcct) JB.paintAcct();
  else if ($('acctEmail')) $('acctEmail').textContent = JB.email() || '';
  JB.resolveSheet({
    app: APP,
    namePart: 'Joelboard',
    requiredTabs: RECIPES_TABS.map(function (t) { return t[0]; })
  }).then(function (ctx) {
    recipesGrid = (ctx && ctx.grid) || {};
    return ensureTabs().then(loadAll);
  }).catch(function (e) {
    var m = String((e && e.message) || '');
    if (m.indexOf('silent_timeout') > -1 || m.indexOf('auth_failed') > -1 || m.indexOf('401') > -1 || m.indexOf('cancelled') > -1) {
      showSignIn();
      return;
    }
    if (m === 'JB_NEED_SHEET') {
      var f = (e.files || []);
      if (f.length) offerPick(f);
      else gate();
      return;
    }
    loadingHtml(JB.bootRetryHtml('bootSheet()', {
      inputId: 'rcUrl', pasteCall: 'linkSheet()', errId: 'rcErr',
      msg: (JB.isTransientErr && JB.isTransientErr(e)) ? undefined : ('Erro: ' + m)
    }));
  });
}

function gate() {
  loadingHtml(
    '<div class="gate"><div class="gt">Joelboard Recipes</div>'
    + '<div class="gs">Crie seu livro de receitas no Drive (planilha pessoal).</div>'
    + '<button class="btn-primary" onclick="createSheet()">✨ Criar meu Recipes</button>'
    + '<div class="rg" style="margin-top:16px">Ou cole o link de uma planilha existente:</div>'
    + '<input class="field" id="rcUrl" placeholder="Link da planilha" style="margin-top:8px;text-align:left">'
    + '<button class="btn ghost" style="margin-top:10px" onclick="linkSheet()">Vincular</button>'
    + '<div id="rcErr" style="color:var(--expense,#f87171);font-size:12px;margin-top:8px"></div></div>'
  );
}

function offerPick(files) {
  var list = (files || []).map(function (f) {
    return '<button class="btn ghost" style="width:100%;margin-bottom:8px" onclick="pick(\'' + escAttr(f.id) + '\')">' + esc(f.name || f.id) + '</button>';
  }).join('');
  loadingHtml(
    '<div class="gate"><div class="gt">Escolher planilha</div><div class="gs">Encontramos estas planilhas:</div>'
    + list
    + '<button class="btn-primary" style="margin-top:8px" onclick="createSheet()">✨ Criar nova</button></div>'
  );
}

function pick(id) { JB.setSheetId(APP, id); bootSheet(); }
function linkSheet() {
  var u = (($('rcUrl') && $('rcUrl').value) || '').trim();
  var m = u.match(/[a-zA-Z0-9_-]{30,}/);
  if (!m) {
    if ($('rcErr')) $('rcErr').textContent = 'Link inválido.';
    return;
  }
  JB.setSheetId(APP, m[0]);
  bootSheet();
}

function createSheet() {
  loadingHtml('<div class="gate"><div class="gs">Criando planilha…</div></div>');
  var title = '🍳 Joelboard — Recipes';
  JB.api('POST', 'https://sheets.googleapis.com/v4/spreadsheets', {
    properties: { title: title },
    sheets: RECIPES_TABS.map(function (t) { return { properties: { title: t[0] } }; })
  }).then(function (ss) {
    JB.setSheetId(APP, ss.spreadsheetId);
    recipesGrid = {};
    (ss.sheets || []).forEach(function (sh) {
      recipesGrid[sh.properties.title] = sh.properties.sheetId;
    });
    var data = RECIPES_TABS.map(function (t) { return { range: t[0] + '!A1', values: [t[1]] }; });
    return JB.api('POST', ssUrl('/values:batchUpdate'), { valueInputOption: 'RAW', data: data })
      .then(function () {
        if (JB.placeSpreadsheetInAppFolder) {
          return JB.placeSpreadsheetInAppFolder(ss.spreadsheetId, APP).catch(function () {});
        }
      })
      .then(function () { return seedIntoSheet(); })
      .then(bootSheet);
  }).catch(function (e) {
    loadingHtml('<div class="gate"><div class="gs" style="color:var(--primary)">Erro ao criar: ' + esc(e.message) + '</div></div>');
  });
}

function ensureTabs() {
  var missing = RECIPES_TABS.filter(function (t) { return recipesGrid[t[0]] == null; });
  if (!missing.length) return Promise.resolve();
  return JB.api('POST', ssUrl(':batchUpdate'), {
    requests: missing.map(function (t) { return { addSheet: { properties: { title: t[0] } } }; })
  }).then(function (res) {
    (res.replies || []).forEach(function (rep) {
      if (rep && rep.addSheet) recipesGrid[rep.addSheet.properties.title] = rep.addSheet.properties.sheetId;
    });
    var data = missing.map(function (t) { return { range: t[0] + '!A1', values: [t[1]] }; });
    return JB.api('POST', ssUrl('/values:batchUpdate'), { valueInputOption: 'RAW', data: data });
  }).then(function () {}).catch(function () {
    // Tabs may already exist (race / stale grid) — refresh titles from the sheet.
    return JB.sheetTabs(JB.getSheetId(APP)).then(function (grid) {
      recipesGrid = grid || recipesGrid;
    });
  });
}

function seedIntoSheet() {
  return fetch('/recipes-seed.json', { cache: 'no-store' }).then(function (r) {
    if (!r.ok) return null;
    return r.json();
  }).then(function (seed) {
    if (!seed) return null;
    var created = todayISO();
    var books = (seed.cookbooks || []).map(function (b, i) {
      return [b.id, b.name, b.icon || '📖', b.color || '#e07a5f', String(b.order != null ? b.order : i), created];
    });
    var recipes = [];
    var ings = [];
    var steps = [];
    (seed.recipes || []).forEach(function (r, ri) {
      recipes.push([
        r.id, r.cookbookId, r.title, r.icon || '🍽️', r.imageUrl || '',
        r.servings || '', r.minutes || '', r.notes || '', String(r.order != null ? r.order : ri),
        'seed', '', created
      ]);
      (r.ingredients || []).forEach(function (ing, ii) {
        ings.push([uuid(), r.id, ing.text || '', ing.qty || '', ing.unit || '', String(ii)]);
      });
      (r.steps || []).forEach(function (st, si) {
        steps.push([uuid(), r.id, st.text || '', String(si)]);
      });
    });
    var data = [];
    if (books.length) data.push({ range: 'Cookbooks!A2', values: books });
    if (recipes.length) data.push({ range: 'Recipes!A2', values: recipes });
    if (ings.length) data.push({ range: 'Ingredients!A2', values: ings });
    if (steps.length) data.push({ range: 'Steps!A2', values: steps });
    if (!data.length) return null;
    return JB.api('POST', ssUrl('/values:batchUpdate'), { valueInputOption: 'RAW', data: data });
  }).catch(function () { return null; });
}

function loadAll() {
  var tabs = ['Cookbooks', 'Recipes', 'Ingredients', 'Steps', 'Plans'];
  return JB.api('GET', ssUrl('/values:batchGet?ranges=' + tabs.map(encodeURIComponent).join('&ranges=') + '&valueRenderOption=UNFORMATTED_VALUE'))
    .then(function (res) {
      var vr = res.valueRanges || [];
      DATA.cookbooks = parseCookbooks(vr[0] && vr[0].values);
      DATA.recipes = parseRecipes(vr[1] && vr[1].values);
      DATA.ingredients = parseIngredients(vr[2] && vr[2].values);
      DATA.steps = parseSteps(vr[3] && vr[3].values);
      DATA.plans = parsePlans(vr[4] && vr[4].values);
      showApp();
      render();
      if (!window._rcTabSync) {
        window._rcTabSync = 1;
        JB.onTabVisible(refreshQuiet);
        JB.watchSheet(APP, refreshQuiet);
      }
      if (JB.onRoute) JB.onRoute(applyRoute);
      applyRoute();
    }).catch(function (e) {
      var m = String(e.message || '');
      if (m.indexOf('403') > -1 || m.indexOf('404') > -1) {
        JB.clearSheetId(APP);
        bootSheet();
        return;
      }
      loadingHtml('<div class="gate"><div class="gs">Erro: ' + esc(m) + '</div><button class="btn ghost" onclick="bootSheet()">Tentar de novo</button></div>');
    });
}

function refreshQuiet() {
  if (!JB.isSignedIn()) return Promise.resolve();
  if (JB.isGhost && JB.isGhost()) { render(); return Promise.resolve(); }
  var tabs = ['Cookbooks', 'Recipes', 'Ingredients', 'Steps', 'Plans'];
  return JB.api('GET', ssUrl('/values:batchGet?ranges=' + tabs.map(encodeURIComponent).join('&ranges=') + '&valueRenderOption=UNFORMATTED_VALUE'))
    .then(function (res) {
      var vr = res.valueRanges || [];
      DATA.cookbooks = parseCookbooks(vr[0] && vr[0].values);
      DATA.recipes = parseRecipes(vr[1] && vr[1].values);
      DATA.ingredients = parseIngredients(vr[2] && vr[2].values);
      DATA.steps = parseSteps(vr[3] && vr[3].values);
      DATA.plans = parsePlans(vr[4] && vr[4].values);
      render();
    }).catch(function () {});
}

function parseCookbooks(rows) {
  var out = [];
  for (var i = 1; i < (rows || []).length; i++) {
    var r = rows[i] || [];
    if (!r[0]) continue;
    out.push({
      id: String(r[0]), name: String(r[1] || ''), icon: String(r[2] || '📖'),
      color: String(r[3] || '#e07a5f'), order: Number(r[4]) || 0, created: String(r[5] || '')
    });
  }
  out.sort(function (a, b) { return a.order - b.order || a.name.localeCompare(b.name); });
  return out;
}
function parseRecipes(rows) {
  var out = [];
  for (var i = 1; i < (rows || []).length; i++) {
    var r = rows[i] || [];
    if (!r[0]) continue;
    out.push({
      id: String(r[0]), cookbookId: String(r[1] || ''), title: String(r[2] || ''),
      icon: String(r[3] || '🍽️'), imageUrl: String(r[4] || ''), servings: String(r[5] || ''),
      minutes: String(r[6] || ''), notes: String(r[7] || ''), order: Number(r[8]) || 0,
      source: String(r[9] || ''), sourceId: String(r[10] || ''), created: String(r[11] || '')
    });
  }
  out.sort(function (a, b) { return a.order - b.order || a.title.localeCompare(b.title); });
  return out;
}
function parseIngredients(rows) {
  var out = [];
  for (var i = 1; i < (rows || []).length; i++) {
    var r = rows[i] || [];
    if (!r[0]) continue;
    out.push({
      id: String(r[0]), recipeId: String(r[1] || ''), text: String(r[2] || ''),
      qty: String(r[3] || ''), unit: String(r[4] || ''), order: Number(r[5]) || 0
    });
  }
  out.sort(function (a, b) { return a.order - b.order; });
  return out;
}
function parseSteps(rows) {
  var out = [];
  for (var i = 1; i < (rows || []).length; i++) {
    var r = rows[i] || [];
    if (!r[0]) continue;
    out.push({
      id: String(r[0]), recipeId: String(r[1] || ''), text: String(r[2] || ''), order: Number(r[3]) || 0
    });
  }
  out.sort(function (a, b) { return a.order - b.order; });
  return out;
}
function sheetsDateLocal(v) {
  if (JB.cal && JB.cal.sheetsDate) return JB.cal.sheetsDate(v);
  if (v == null || v === '') return '';
  if (typeof v === 'number') {
    var d = new Date(Date.UTC(1899, 11, 30));
    d.setUTCDate(d.getUTCDate() + Math.floor(v));
    return d.getUTCFullYear() + '-' + String(d.getUTCMonth() + 1).padStart(2, '0') + '-' + String(d.getUTCDate()).padStart(2, '0');
  }
  var s = String(v).trim();
  return /^\d{4}-\d{2}-\d{2}/.test(s) ? s.slice(0, 10) : s;
}
function parsePlans(rows) {
  var out = [];
  for (var i = 1; i < (rows || []).length; i++) {
    var r = rows[i] || [];
    if (!r[0]) continue;
    out.push({
      id: String(r[0]), recipeId: String(r[1] || ''), date: sheetsDateLocal(r[2]), created: String(r[3] || '')
    });
  }
  out.sort(function (a, b) { return String(a.date).localeCompare(String(b.date)) || String(a.id).localeCompare(String(b.id)); });
  return out;
}

function bookById(id) {
  for (var i = 0; i < DATA.cookbooks.length; i++) if (DATA.cookbooks[i].id === id) return DATA.cookbooks[i];
  return null;
}
function recipeById(id) {
  for (var i = 0; i < DATA.recipes.length; i++) if (DATA.recipes[i].id === id) return DATA.recipes[i];
  return null;
}
function recipesInBook(bookId) {
  return DATA.recipes.filter(function (r) { return r.cookbookId === bookId; });
}
function ingsFor(recipeId) {
  return DATA.ingredients.filter(function (x) { return x.recipeId === recipeId; });
}
function stepsFor(recipeId) {
  return DATA.steps.filter(function (x) { return x.recipeId === recipeId; });
}
function plansFor(recipeId) {
  return (DATA.plans || []).filter(function (p) { return p.recipeId === recipeId; });
}
function countInBook(bookId) { return recipesInBook(bookId).length; }

/* ---- routing ---- */
function applyRoute() {
  var q = JB.qsGet ? JB.qsGet() : {};
  if (q.r) {
    var rec = recipeById(q.r);
    if (rec) {
      openRecipeId = rec.id;
      openBookId = rec.cookbookId;
      view = 'recipe';
      render();
      return;
    }
  }
  if (q.b) {
    if (bookById(q.b)) {
      openBookId = q.b;
      openRecipeId = null;
      view = 'book';
      var list = recipesInBook(openBookId);
      flipIndex = 0;
      if (q.i != null) {
        var ix = Number(q.i);
        if (ix >= 0 && ix < list.length) flipIndex = ix;
      }
      render();
      return;
    }
  }
  view = 'shelf';
  openBookId = null;
  openRecipeId = null;
  render();
}
function patchRoute() {
  if (!JB.qsPatch) return;
  if (view === 'recipe' && openRecipeId) JB.qsPatch({ b: openBookId || undefined, r: openRecipeId, i: undefined });
  else if (view === 'book' && openBookId) JB.qsPatch({ b: openBookId, r: undefined, i: flipIndex || undefined });
  else JB.qsPatch({ b: undefined, r: undefined, i: undefined });
}

/* ---- render ---- */
function fabAction() {
  if (view === 'shelf') openBookModal(null);
  else if (view === 'book') openRecipeModal(null);
  else if (view === 'recipe') openRecipeModal(openRecipeId);
}

function render() {
  var main = $('main');
  if (!main) return;
  if (JB.paintAcct) JB.paintAcct();
  document.body.classList.toggle('recipes-shelf', view === 'shelf');
  document.body.classList.toggle('recipes-book', view === 'book' && bookViewMode === 'flip');
  /* marcar um ingrediente repinta a página: mantém a rolagem das folhas.
     Virar a página ou abrir o livro começa do topo. */
  var sameSpread = !_turnDir && !_spreadIntro;
  var keepScroll = [];
  main.querySelectorAll('.leaf-body').forEach(function (el) { keepScroll.push(el.scrollTop); });
  if (view === 'shelf') main.innerHTML = renderShelf();
  else if (view === 'book') main.innerHTML = renderBook();
  else if (view === 'recipe') main.innerHTML = renderDetail();
  if (sameSpread) {
    var bodies = main.querySelectorAll('.leaf-body');
    if (keepScroll.length === bodies.length) {
      bodies.forEach(function (el, i) { el.scrollTop = keepScroll[i]; });
    }
  }
  var fab = $('fab');
  if (fab) {
    fab.style.display = '';
    fab.title = view === 'shelf' ? 'Novo livro' : 'Nova receita';
  }
  patchRoute();
  var grid = main.querySelector('.bookcase-row, .recipes-grid');
  if (grid && JB.staggerChildren) JB.staggerChildren(grid, view);
  if (view === 'shelf') {
    layoutShelf();
    bindShelfLayout();
  }
  if (view === 'book' && bookViewMode === 'flip') {
    setTimeout(bindFlipGesture, 0);
  }
}

function bookShelfFit(count) {
  var n = Math.max(count, 1);
  var t = Math.min(1, (n - 1) / 7);
  var vh = window.innerHeight || 800;
  var maxH = Math.min(520, Math.round(vh * 0.58));
  var minH = 320;
  var maxW = 86;
  var minW = 48;
  var h = Math.round(maxH - t * (maxH - minH));
  return {
    w: Math.round(maxW - t * (maxW - minW)),
    h: h,
    spread: Math.round(h * 1.24)
  };
}

function bookSpineDims(b, i, count) {
  var fit = bookShelfFit(count);
  var h = 0;
  var s = String(b.id || b.name || i);
  for (var n = 0; n < s.length; n++) h = ((h << 5) - h + s.charCodeAt(n)) | 0;
  var u = Math.abs(h);
  return {
    w: Math.max(46, fit.w + (u % 5) - 2),
    h: Math.max(320, fit.h + ((u >> 3) % 5) * 8 - 16),
    spread: fit.spread,
    tilt: ((i * 17 + 3) % 7) - 3,
    curved: (u % 5) === 0 || (u % 5) === 3
  };
}

function layoutShelf() {
  var row = document.querySelector('.bookcase-row');
  if (!row) return;
  var slots = row.querySelectorAll('.book-slot');
  var n = slots.length;
  if (!n) return;
  var gap = 8;
  var avail = Math.max(240, row.clientWidth - 32);
  var minW = 42;
  var w = parseFloat(slots[0].style.getPropertyValue('--bw')) || 70;
  var need = n * w + (n - 1) * gap;
  if (need > avail) {
    w = Math.max(minW, Math.floor((avail - (n - 1) * gap) / n));
    slots.forEach(function (el) { el.style.setProperty('--bw', w + 'px'); });
    need = n * w + (n - 1) * gap;
  }
  row.classList.toggle('is-scroll', need > avail);
  var maxSpread = Math.max(260, Math.min(640, row.clientWidth - w - 48));
  slots.forEach(function (el) {
    var h = parseFloat(el.style.getPropertyValue('--bh')) || 380;
    el.style.setProperty('--spread', Math.round(Math.min(maxSpread, Math.max(280, h * 1.16))) + 'px');
  });
}

/* Keep the opened book inside the shelf bounds instead of overflowing sideways */
function centerOpenBook(el) {
  if (!el) return;
  var box = el.closest('.bookcase');
  if (!box) return;
  var cs = getComputedStyle(el);
  var bw = parseFloat(cs.getPropertyValue('--bw')) || el.offsetWidth;
  var spread = parseFloat(cs.getPropertyValue('--spread')) || 420;
  var open = bw + spread;
  var slot = el.getBoundingClientRect();
  var bounds = box.getBoundingClientRect();
  var pad = 12;
  var dx = -(open - bw) / 2;
  var left = slot.left + dx;
  var right = left + open;
  if (left < bounds.left + pad) dx += (bounds.left + pad) - left;
  else if (right > bounds.right - pad) dx -= right - (bounds.right - pad);
  el.style.setProperty('--ocx', Math.round(dx) + 'px');
}

function bindShelfLayout() {
  var row = document.querySelector('.bookcase-row');
  if (row) {
    row.querySelectorAll('.book-slot').forEach(function (el) {
      fillBookPeek(el);
      el.addEventListener('mouseenter', function () { centerOpenBook(el); fillBookPeek(el); });
      el.addEventListener('focus', function () { centerOpenBook(el); fillBookPeek(el); });
    });
  }
  if (bindShelfLayout._on) return;
  bindShelfLayout._on = true;
  window.addEventListener('resize', function () {
    if (view === 'shelf') layoutShelf();
  });
}

function fineHoverShelf() {
  try {
    return window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  } catch (_) {
    return true;
  }
}

function onBookActivate(id) {
  if (!fineHoverShelf()) {
    if (_peekBookId !== id) {
      _peekBookId = id;
      syncShelfPeek();
      return;
    }
  }
  _peekBookId = null;
  openBook(id);
}

function syncShelfPeek() {
  var row = document.querySelector('.bookcase-row');
  if (!row) return;
  row.querySelectorAll('.book-slot').forEach(function (el) {
    var on = el.getAttribute('data-id') === _peekBookId;
    if (on) { centerOpenBook(el); fillBookPeek(el); }
    el.classList.toggle('is-peek', on);
    el.setAttribute('aria-expanded', on ? 'true' : 'false');
  });
}

/* ---- estante: espiada em duas páginas de verdade do livro ---- */
/* Sorteia duas receitas a cada abertura; a última página vira "fim". */
function fillBookPeek(el) {
  if (!el) return;
  var left = el.querySelector('.book-leaf.is-left .book-page');
  var right = el.querySelector('.book-leaf.is-right .book-page');
  if (!left && !right) return;
  var pick = pickPeekPair(el.getAttribute('data-id'));
  var budget = peekLineBudget(el);
  /* Livro vazio: folha em branco e só um "fim", nunca dois. */
  if (left) left.innerHTML = pick[0] ? peekPageHtml(pick[0], 1, budget) : '';
  if (right) right.innerHTML = peekPageHtml(pick[1], 2, budget);
}

function pickPeekPair(bookId) {
  var list = recipesInBook(bookId).slice();
  for (var i = list.length - 1; i > 0; i--) {
    var j = Math.floor(Math.random() * (i + 1));
    var t = list[i]; list[i] = list[j]; list[j] = t;
  }
  return [list[0] || null, list[1] || null];
}

/* Quantas linhas cabem na folha. Espelha a escala de .book-page no CSS
   (--pgs = clamp(9px, --bh * .03, 14px)); mexeu lá, mexa aqui.
   8.4em cobre título, tempo, régua, rótulos, fólio e as linhas de "mais N". */
function peekLineBudget(el) {
  var bh = parseFloat(getComputedStyle(el).getPropertyValue('--bh')) || 420;
  var fs = Math.min(14, Math.max(9, bh * 0.03));
  var paper = bh + 26 - fs * 2.8;
  return Math.max(3, Math.floor((paper - fs * 8.4) / (fs * 1.69)));
}

/* Divide as linhas entre os dois blocos e devolve a sobra pro maior. */
function peekSplit(nIngs, nSteps, budget) {
  if (!nIngs) return [0, Math.min(nSteps, budget)];
  if (!nSteps) return [Math.min(nIngs, budget), 0];
  var a = Math.min(nIngs, Math.max(2, Math.round(budget * 0.55)));
  var b = Math.min(nSteps, budget - a);
  return [Math.min(nIngs, budget - b), b];
}

function peekLines(items, cap, render) {
  var cut = items.length > cap;
  var show = cut ? Math.max(1, cap - 1) : items.length;
  var html = items.slice(0, show).map(render).join('');
  if (cut) html += '<div class="bp-more">… mais ' + (items.length - show) + '</div>';
  return html;
}

function peekPageHtml(r, folio, budget) {
  if (!r) return '<div class="bp-end">fim</div>';
  var ings = ingsFor(r.id);
  var steps = stepsFor(r.id);
  var cap = peekSplit(ings.length, steps.length, budget || 8);
  var body = '';
  if (cap[0]) {
    body += '<div class="bp-sec"><div class="bp-label">Mise en place</div>'
      + '<div class="bp-lines">' + peekLines(ings, cap[0], function (ing) {
        var label = [ing.qty, ing.unit, ing.text].filter(Boolean).join(' ');
        return '<div class="bp-line"><i class="bp-box"></i><span>' + esc(label) + '</span></div>';
      }) + '</div></div>';
  }
  if (cap[1]) {
    body += '<div class="bp-sec"><div class="bp-label">Passo a passo</div>'
      + '<div class="bp-lines">' + peekLines(steps, cap[1], function (st, i) {
        return '<div class="bp-line"><i class="bp-num">' + (i + 1) + '</i><span>' + esc(st.text) + '</span></div>';
      }) + '</div></div>';
  }
  if (!body) {
    body = '<div class="bp-sec"><div class="bp-label">Receita</div>'
      + '<div class="bp-lines"><div class="bp-line"><span>' + esc(r.notes || 'Sem ingredientes ainda.') + '</span></div></div></div>';
  }
  var meta = [];
  if (r.minutes) meta.push(esc(r.minutes) + ' min');
  if (r.servings) meta.push(esc(r.servings) + ' porções');
  return '<div class="bp-head"><span class="bp-ico">' + esc(r.icon || '🍽️') + '</span>'
    + '<span class="bp-title">' + esc(r.title) + '</span></div>'
    + (meta.length ? '<div class="bp-meta">' + meta.join(' · ') + '</div>' : '')
    + '<div class="bp-rule"></div>'
    + body
    + '<div class="bp-folio">' + folio + '</div>';
}

function clearBookPeek(ev) {
  if (!_peekBookId) return;
  if (ev && ev.target && ev.target.closest && ev.target.closest('.book-slot')) return;
  _peekBookId = null;
  syncShelfPeek();
}

function renderShelf() {
  var books = DATA.cookbooks;
  var spines = books.map(function (b, i) {
    var d = bookSpineDims(b, i, books.length);
    var n = countInBook(b.id);
    var peeked = _peekBookId === b.id;
    var cls = 'book-slot' + (peeked ? ' is-peek' : '') + (d.curved ? ' is-curved' : '');
    return '<div role="button" tabindex="0" class="' + cls + '"'
      + ' data-id="' + esc(b.id) + '"'
      + ' style="--kc:' + esc(b.color || '#e07a5f') + ';--bw:' + d.w + 'px;--bh:' + d.h + 'px;--spread:' + d.spread + 'px;--tilt:' + d.tilt + 'deg;--jb-i:' + i + '"'
      + ' aria-label="' + esc(b.name) + ', ' + n + ' receita' + (n === 1 ? '' : 's') + '"'
      + ' aria-expanded="' + (peeked ? 'true' : 'false') + '"'
      + ' onclick="onBookActivate(\'' + escAttr(b.id) + '\')"'
      + ' onkeydown="if(event.key===\'Enter\'||event.key===\' \'){event.preventDefault();onBookActivate(\'' + escAttr(b.id) + '\')}"'
      + '>'
      + '<div class="book-pop">'
      + '<div class="book-openlabel" aria-hidden="true">'
      + '<span class="bol-ico">' + esc(b.icon || '📖') + '</span>'
      + '<span class="bol-name">' + esc(b.name) + '</span>'
      + '</div>'
      + '<div class="book-spine-face">'
      + '<span class="book-spine-ico" aria-hidden="true">' + esc(b.icon || '📖') + '</span>'
      + '<span class="book-spine-title">' + esc(b.name) + '</span>'
      + '</div>'
      + '<div class="book-open" aria-hidden="true">'
      + '<div class="book-leaf is-left"><span class="book-page-lines"></span><div class="book-page"></div></div>'
      + '<div class="book-leaf is-right"><span class="book-page-lines"></span><div class="book-page"></div></div>'
      + '</div>'
      + '</div>'
      + '</div>';
  }).join('');
  return (spines
    ? '<div class="bookcase">'
      + '<div class="bookcase-row" style="--n:' + books.length + '">' + spines + '</div>'
      + '<div class="bookcase-ledge" aria-hidden="true"></div>'
      + '</div>'
    : '<div class="empty">Nenhum livro ainda. Toque em + para criar o primeiro.</div>');
}

function norm(s) { return String(s || '').trim().toLowerCase(); }

function openBook(id) {
  _peekBookId = null;
  openBookId = id;
  openRecipeId = null;
  flipIndex = 0;
  bookQuery = '';
  view = 'book';
  _spreadIntro = true;
  render();
}
function goShelf() {
  view = 'shelf';
  openBookId = null;
  openRecipeId = null;
  _peekBookId = null;
  bookQuery = '';
  render();
}

function recipeMatches(r, q) {
  if (norm(r.title).indexOf(q) > -1) return true;
  if (norm(r.notes).indexOf(q) > -1) return true;
  return ingsFor(r.id).some(function (x) { return norm(x.text).indexOf(q) > -1; });
}
function visibleRecipes(bookId) {
  var all = recipesInBook(bookId);
  var q = norm(bookQuery);
  if (!q) return all;
  return all.filter(function (r) { return recipeMatches(r, q); });
}
function onBookSearch(v) {
  bookQuery = v;
  flipIndex = 0;
  render();
  refocusBookSearch();
}
function clearBookSearch() {
  bookQuery = '';
  flipIndex = 0;
  render();
  refocusBookSearch();
}
/* render() rebuilds #main, so put the caret back where the user left it */
function refocusBookSearch() {
  var el = $('bookSearch');
  if (!el) return;
  el.focus();
  try { el.setSelectionRange(el.value.length, el.value.length); } catch (_) {}
}

function renderBook() {
  var book = bookById(openBookId);
  if (!book) return '<div class="empty">Livro não encontrado.</div><button class="back" onclick="goShelf()">← Estante</button>';
  var total = countInBook(book.id);
  var list = visibleRecipes(book.id);
  var toggle = '<div class="view-toggle">'
    + '<button type="button" class="vbtn' + (bookViewMode === 'flip' ? ' on' : '') + '" onclick="setBookView(\'flip\')">Páginas</button>'
    + '<button type="button" class="vbtn' + (bookViewMode === 'cards' ? ' on' : '') + '" onclick="setBookView(\'cards\')">Cards</button>'
    + '</div>';
  var head = '<div class="secbar"><button class="back" onclick="goShelf()">← Estante</button>'
    + '<div class="book-head-actions">'
    + '<button type="button" class="btn ghost" onclick="openBookModal(\'' + escAttr(book.id) + '\')">Editar</button>'
    + toggle
    + '</div></div>'
    + '<div class="book-title-row" style="margin-bottom:14px"><span style="font-size:28px;margin-right:8px">' + esc(book.icon) + '</span>'
    + '<span style="font-family:var(--font-display);font-weight:800;font-size:22px">' + esc(book.name) + '</span></div>';
  if (!total) {
    return head + '<div class="empty">Este livro está vazio. Comece pela primeira receita — do zero ou buscando online.</div>'
      + '<button class="btn" style="display:block;margin:0 auto" onclick="openRecipeModal(null)">+ Nova receita</button>';
  }
  var tools = '<div class="book-tools">'
    + '<div class="jb-search">'
    + '<input class="field jb-search-input" id="bookSearch" type="search" placeholder="Buscar receita…"'
    + ' value="' + esc(bookQuery) + '" oninput="onBookSearch(this.value)"'
    + ' onfocus="JB.searchFocus(this)" onblur="JB.searchBlur(this)">'
    + '<button type="button" class="jb-search-clear" id="bookSearchClear" onclick="clearBookSearch()" aria-label="Limpar busca"'
    + ' style="display:' + (bookQuery ? 'flex' : 'none') + '">✕</button>'
    + '</div>'
    + '</div>';
  if (!list.length) {
    return head + tools + '<div class="empty">Nada com “' + esc(bookQuery) + '” neste livro.</div>';
  }
  if (bookViewMode === 'cards') return head + tools + renderCards(list, book);
  return head + tools + renderSpread(list, book);
}

function setBookView(mode) {
  bookViewMode = mode === 'cards' ? 'cards' : 'flip';
  saveViewPref();
  _spreadIntro = true;
  render();
}

function renderCards(list, book) {
  var cards = list.map(function (r, i) {
    var meta = [];
    if (r.minutes) meta.push(r.minutes + ' min');
    if (r.servings) meta.push(r.servings + ' porções');
    var ico = r.imageUrl
      ? '<img src="' + esc(r.imageUrl) + '" alt="">'
      : esc(r.icon || '🍽️');
    return '<div class="recipec" style="--kc:' + esc(book.color) + ';--jb-i:' + i + '" onclick="openRecipe(\'' + escAttr(r.id) + '\')">'
      + '<div class="rc-top"><div class="rc-ico">' + ico + '</div><div class="rc-title">' + esc(r.title) + '</div></div>'
      + (meta.length ? '<div class="rc-meta">' + esc(meta.join(' · ')) + '</div>' : '')
      + '</div>';
  }).join('');
  return '<div class="recipes-grid">' + cards + '</div>';
}

/* ---- open book spread (Páginas) ---- */
/* O livro tem uma folha final "fim" depois das receitas. */
function spreadPageCount(list) { return list.length + 1; }

function spreadLeafAt(list, i, side) {
  if (i < 0 || i > list.length) return blankLeaf(side);
  if (i === list.length) return endLeaf(side);
  return recipeFullLeaf(list[i], side);
}

function renderSpread(list, book) {
  var step = spreadStep();
  var total = spreadPageCount(list);
  if (flipIndex >= total) flipIndex = total - 1;
  if (flipIndex < 0) flipIndex = 0;
  flipIndex = Math.floor(flipIndex / step) * step;
  var kc = esc(book.color || '#e07a5f');
  var leaves;
  if (spreadMode === 'recipe' && wideSpread() && flipIndex < list.length) {
    var r = list[flipIndex];
    leaves = recipeHeadLeaf(r, 'left') + recipeStepsLeaf(r, 'right');
  } else if (step === 2) {
    leaves = spreadLeafAt(list, flipIndex, 'left') + spreadLeafAt(list, flipIndex + 1, 'right');
  } else if (wideSpread()) {
    leaves = spreadLeafAt(list, flipIndex, 'left') + blankLeaf('right');
  } else {
    leaves = spreadLeafAt(list, flipIndex, 'solo');
  }
  var lastStart = Math.max(0, (Math.ceil(total / step) - 1) * step);
  var atStart = flipIndex <= 0;
  var atEnd = flipIndex >= lastStart;
  var intro = _spreadIntro ? ' is-intro' : '';
  _spreadIntro = false;
  _turnDir = 0;
  return '<div class="spread-wrap" id="flipWrap" style="--kc:' + kc + '">'
    + '<button type="button" class="spread-arrow is-prev" onclick="flipPrev()" aria-label="Página anterior"'
    + (atStart ? ' disabled' : '') + '>‹</button>'
    + '<div class="book-body' + intro + '">'
    + '<span class="book-ribbon" aria-hidden="true"></span>'
    + '<div class="spread" id="spreadStage">'
    + leaves
    + '<span class="spread-gutter" aria-hidden="true"></span>'
    + '</div>'
    + '</div>'
    + '<button type="button" class="spread-arrow is-next" onclick="flipNext()" aria-label="Próxima página"'
    + (atEnd ? ' disabled' : '') + '>›</button>'
    + '</div>';
}

function leafFolio(side, label) {
  return '<div class="leaf-folio ' + side + '">' + esc(label) + '</div>';
}

/* Com foto, o carimbo de ícone sai de cena — a foto vira o destaque da página. */
function recipeHero(r) {
  if (r.imageUrl) return '';
  return '<div class="leaf-hero">' + esc(r.icon || '🍽️') + '</div>';
}

function recipeShot(r) {
  if (!r.imageUrl) return '';
  return '<figure class="leaf-shot">'
    + '<img src="' + esc(r.imageUrl) + '" alt="" onerror="rcShotFail(this)">'
    + '</figure>';
}
function rcShotFail(img) {
  var fig = img && img.parentNode;
  if (fig && fig.parentNode) fig.parentNode.removeChild(fig);
}

function recipeTags(r) {
  var tags = '';
  if (r.minutes) tags += '<span class="ftag">' + esc(r.minutes) + ' min</span>';
  if (r.servings) tags += '<span class="ftag">' + esc(r.servings) + ' porções</span>';
  return tags ? '<div class="leaf-tags">' + tags + '</div>' : '';
}

function recipeTitleBlock(r) {
  return recipeHero(r)
    + '<div class="leaf-title">' + esc(r.title) + '</div>'
    + recipeTags(r)
    + recipePlanChips(r)
    + (r.notes ? '<div class="leaf-notes">' + esc(r.notes) + '</div>' : '');
}

function fmtPlanDate(iso) {
  if (JB.cal && JB.cal.fmtBR) return JB.cal.fmtBR(iso);
  var p = String(iso || '').split('-');
  if (p.length < 3) return iso || '';
  return p[2] + '/' + p[1];
}

function recipePlanChips(r) {
  var list = plansFor(r.id);
  if (!list.length) return '';
  return '<div class="plan-chips">' + list.map(function (p) {
    return '<span class="plan-chip">'
      + '<span>' + esc(fmtPlanDate(p.date)) + '</span>'
      + '<button type="button" class="plan-chip-x" onclick="event.stopPropagation();removeRecipePlan(\'' + escAttr(p.id) + '\')"'
      + ' title="Remover prazo" aria-label="Remover prazo">×</button>'
      + '</span>';
  }).join('') + '</div>';
}

function leafActions(r) {
  var has = hasAnyChecks(r.id);
  return '<div class="leaf-actions">'
    + '<button type="button" class="leaf-act" onclick="openRecipeModal(\'' + escAttr(r.id) + '\')"'
    + ' title="Editar receita" aria-label="Editar receita">✏</button>'
    + '<button type="button" class="leaf-act' + (has ? '' : ' is-dim') + '"'
    + (has ? '' : ' disabled')
    + ' onclick="resetRecipeChecks(\'' + escAttr(r.id) + '\')"'
    + ' title="Limpar checks" aria-label="Limpar checks">↺</button>'
    + '<button type="button" class="leaf-act" onclick="scheduleRecipe(\'' + escAttr(r.id) + '\')"'
    + ' title="Agendar no Calendar" aria-label="Agendar no Calendar">📅</button>'
    + '</div>';
}

function miseSection(r) {
  var ings = ingsFor(r.id);
  var done = doneCount(r.id, ings);
  var rows = ings.map(function (ing) {
    var on = isChecked(r.id, ing.id);
    var label = [ing.qty, ing.unit, ing.text].filter(Boolean).join(' ');
    return '<li class="' + (on ? 'on' : '') + '">'
      + '<button type="button" class="ichk' + (on ? ' on' : '') + '"'
      + ' onclick="toggleIngCheck(\'' + escAttr(r.id) + '\',\'' + escAttr(ing.id) + '\')"'
      + ' aria-pressed="' + (on ? 'true' : 'false') + '" aria-label="' + esc(label) + '"></button>'
      + '<span>' + esc(label) + '</span></li>';
  }).join('');
  var shot = recipeShot(r);
  return '<div class="leaf-sec' + (shot ? ' has-shot' : '') + '">'
    + '<h3>Mise en place' + (ings.length ? '<em>' + done + '/' + ings.length + '</em>' : '') + '</h3>'
    + '<div class="mise-wrap">'
    + '<div class="mise-col">'
    + (rows ? '<ul class="ing-list">' + rows + '</ul>' : '<div class="rg">Nenhum ingrediente.</div>')
    + '</div>'
    + shot
    + '</div>'
    + '</div>';
}

function stepsSection(r) {
  var steps = stepsFor(r.id);
  var done = doneCount(r.id, steps);
  var rows = steps.map(function (st, i) {
    var on = stepIsDone(r.id, st.id);
    return '<li class="' + (on ? 'on' : '') + '">'
      + '<button type="button" class="step-num' + (on ? ' on' : '') + '"'
      + ' onclick="toggleStepCheck(\'' + escAttr(r.id) + '\',\'' + escAttr(st.id) + '\')"'
      + ' aria-pressed="' + (on ? 'true' : 'false') + '" aria-label="Passo ' + (i + 1) + '">'
      + (on ? '✓' : (i + 1)) + '</button>'
      + '<span>' + esc(st.text) + '</span></li>';
  }).join('');
  return '<div class="leaf-sec">'
    + '<h3>Passo a passo' + (steps.length ? '<em>' + done + '/' + steps.length + '</em>' : '') + '</h3>'
    + (rows ? '<ul class="step-list">' + rows + '</ul>' : '<div class="rg">Nenhum passo.</div>')
    + '</div>';
}

function leafEditBtn(r) {
  return leafActions(r);
}

/* Uma receita inteira em uma folha (modo pares, ou celular). */
function recipeFullLeaf(r, side) {
  if (!r) return endLeaf(side);
  return '<div class="leaf is-' + side + '">'
    + leafActions(r)
    + '<div class="leaf-body">'
    + recipeTitleBlock(r)
    + miseSection(r)
    + stepsSection(r)
    + '</div>'
    + leafFolio(side, recipePageLabel(r))
    + '</div>';
}

/* Modo receita: capa + mise en place na esquerda, passos na direita. */
function recipeHeadLeaf(r, side) {
  if (!r) return endLeaf(side);
  return '<div class="leaf is-' + side + '">'
    + leafActions(r)
    + '<div class="leaf-body">' + recipeTitleBlock(r) + miseSection(r) + '</div>'
    + leafFolio(side, recipePageLabel(r))
    + '</div>';
}
function recipeStepsLeaf(r, side) {
  if (!r) return endLeaf(side);
  return '<div class="leaf is-' + side + '">'
    + '<div class="leaf-body">' + stepsSection(r) + '</div>'
    + leafFolio(side, 'Modo de fazer')
    + '</div>';
}

/* Última folha: mantém o "fim" e oferece criar a próxima receita. */
function endLeaf(side) {
  return '<div class="leaf is-' + side + ' is-end">'
    + '<div class="leaf-body">'
    + '<div class="leaf-end-wrap">'
    + '<div class="leaf-end">fim</div>'
    + '<div class="leaf-end-rule" aria-hidden="true"></div>'
    + '<button type="button" class="leaf-add" onclick="openRecipeModal(null)">+ Nova receita</button>'
    + '<div class="rg leaf-end-hint">Escreva do zero ou busque online.</div>'
    + '</div>'
    + '</div>'
    + '</div>';
}

function blankLeaf(side) {
  return '<div class="leaf is-' + side + ' is-blank" aria-hidden="true"><div class="leaf-body"></div></div>';
}

function recipePageLabel(r) {
  var list = visibleRecipes(openBookId);
  for (var i = 0; i < list.length; i++) {
    if (list[i].id === r.id) return (i + 1) + ' / ' + list.length;
  }
  return '';
}

function flipPrev() {
  if (flipIndex <= 0) return;
  var keep = captureLeaf('right');
  flipIndex = Math.max(0, flipIndex - spreadStep());
  _turnDir = -1;
  render();
  bindFlipGesture();
  playPageTurn(-1, keep);
}
function flipNext() {
  var list = visibleRecipes(openBookId);
  var step = spreadStep();
  if (flipIndex + step >= spreadPageCount(list)) return;
  var keep = captureLeaf('left');
  flipIndex += step;
  _turnDir = 1;
  render();
  bindFlipGesture();
  playPageTurn(1, keep);
}

function reducedMotion() {
  try { return window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (_) { return false; }
}

/* Guarda a página que ficará escondida atrás da folha em movimento. */
function captureLeaf(side) {
  if (!wideSpread() || reducedMotion()) return null;
  var el = document.querySelector('.spread .leaf.is-' + side);
  if (!el) return null;
  var body = el.querySelector('.leaf-body');
  return { side: side, html: el.outerHTML, scroll: body ? body.scrollTop : 0 };
}

/* Folha de papel que gira sobre o vinco. A página de destino viaja no verso
   dela: fica escondida (a antiga continua à vista) até a folha assentar. */
function playPageTurn(dir, keep) {
  if (reducedMotion()) return;
  var stage = $('spreadStage');
  if (!stage) return;
  var junk = stage.querySelectorAll('.page-turn, .leaf-ghost');
  for (var i = 0; i < junk.length; i++) junk[i].parentNode.removeChild(junk[i]);
  var solo = !wideSpread();
  var side = dir > 0 ? 'left' : 'right';
  var dest = solo ? null : stage.querySelector('.leaf.is-' + side);
  var gone = [];
  if (dest) {
    dest.classList.add('is-arriving');
    if (keep && keep.html && keep.side === side) {
      var ghost = document.createElement('div');
      ghost.className = 'leaf-ghost is-' + side;
      ghost.setAttribute('aria-hidden', 'true');
      ghost.innerHTML = keep.html;
      stage.appendChild(ghost);
      var gb = ghost.querySelector('.leaf-body');
      if (gb) gb.scrollTop = keep.scroll || 0;
      gone.push(ghost);
    }
  }
  var el = document.createElement('div');
  el.className = 'page-turn ' + (dir > 0 ? 'is-fwd' : 'is-back') + (solo ? ' is-solo' : '');
  el.setAttribute('aria-hidden', 'true');
  el.innerHTML = '<span class="pt-face pt-front"></span><span class="pt-face pt-back"></span>';
  stage.appendChild(el);
  gone.push(el);
  var drop = function () {
    gone.forEach(function (n) { if (n.parentNode) n.parentNode.removeChild(n); });
    if (dest) dest.classList.remove('is-arriving');
  };
  el.addEventListener('animationend', drop);
  setTimeout(drop, 1000);
}
function bindFlipGesture() {
  var el = $('flipWrap');
  if (!el || el._rcBound) return;
  el._rcBound = true;
  el.setAttribute('tabindex', '0');
  var x0 = 0;
  el.addEventListener('touchstart', function (e) {
    if (!e.touches || !e.touches[0]) return;
    x0 = e.touches[0].clientX;
  }, { passive: true });
  el.addEventListener('touchend', function (e) {
    if (!e.changedTouches || !e.changedTouches[0]) return;
    var dx = e.changedTouches[0].clientX - x0;
    if (dx > 48) flipPrev();
    else if (dx < -48) flipNext();
  }, { passive: true });
  el.addEventListener('keydown', function (e) {
    if (e.key === 'ArrowLeft') { e.preventDefault(); flipPrev(); }
    else if (e.key === 'ArrowRight') { e.preventDefault(); flipNext(); }
  });
  bindSpreadResize();
}

/* Cruzar o breakpoint muda quantas folhas cabem, então repinta. */
function bindSpreadResize() {
  if (bindSpreadResize._on) return;
  bindSpreadResize._on = true;
  var wasWide = wideSpread();
  window.addEventListener('resize', function () {
    var now = wideSpread();
    if (now === wasWide) return;
    wasWide = now;
    if (view === 'book' && bookViewMode === 'flip') render();
  });
}

function openRecipe(id) {
  openRecipeId = id;
  var r = recipeById(id);
  if (r) openBookId = r.cookbookId;
  view = 'recipe';
  render();
}
function backToBook() {
  openRecipeId = null;
  view = 'book';
  _spreadIntro = true;
  render();
  bindFlipGesture();
}

function renderDetail() {
  var r = recipeById(openRecipeId);
  if (!r) return '<div class="empty">Receita não encontrada.</div><button class="back" onclick="backToBook()">← Livro</button>';
  var book = bookById(r.cookbookId);
  var ings = ingsFor(r.id);
  var steps = stepsFor(r.id);
  var hero = r.imageUrl
    ? '<div class="detail-hero"><img src="' + esc(r.imageUrl) + '" alt=""></div>'
    : '<div class="detail-hero"><div class="big-ico">' + esc(r.icon || '🍽️') + '</div></div>';
  var meta = '';
  if (r.minutes) meta += '<span class="ftag">' + esc(r.minutes) + ' min</span>';
  if (r.servings) meta += '<span class="ftag">' + esc(r.servings) + ' porções</span>';
  if (book) meta += '<span class="ftag">' + esc(book.icon + ' ' + book.name) + '</span>';
  var ingHtml = ings.map(function (ing) {
    var on = isChecked(r.id, ing.id);
    var label = [ing.qty, ing.unit, ing.text].filter(Boolean).join(' ');
    return '<li class="' + (on ? 'on' : '') + '">'
      + '<button type="button" class="ichk' + (on ? ' on' : '') + '" onclick="toggleIngCheck(\'' + escAttr(r.id) + '\',\'' + escAttr(ing.id) + '\')"></button>'
      + '<span>' + esc(label) + '</span></li>';
  }).join('');
  var stepHtml = steps.map(function (st, i) {
    return '<li><span class="step-num">' + (i + 1) + '</span><span>' + esc(st.text) + '</span></li>';
  }).join('');
  return '<div class="detail">'
    + '<div class="secbar"><button class="back" onclick="backToBook()">← ' + esc((book && book.name) || 'Livro') + '</button></div>'
    + hero
    + '<div class="detail-title">' + esc(r.title) + '</div>'
    + '<div class="detail-meta">' + meta + '</div>'
    + recipePlanChips(r)
    + (r.notes ? '<div class="rg" style="margin-bottom:12px;line-height:1.5">' + esc(r.notes) + '</div>' : '')
    + '<div class="dsec"><h3>Ingredientes</h3>'
    + (ingHtml ? '<ul class="ing-list">' + ingHtml + '</ul>' : '<div class="rg">Nenhum ingrediente.</div>')
    + '</div>'
    + '<div class="dsec"><h3>Passo a passo</h3>'
    + (stepHtml ? '<ul class="step-list">' + stepHtml + '</ul>' : '<div class="rg">Nenhum passo.</div>')
    + '</div>'
    + '<div class="detail-actions">'
    + '<button class="btn" onclick="openRecipeModal(\'' + escAttr(r.id) + '\')">✏ Editar</button>'
    + '<button class="btn ghost' + (hasAnyChecks(r.id) ? '' : ' is-dim') + '"'
    + (hasAnyChecks(r.id) ? '' : ' disabled')
    + ' onclick="resetRecipeChecks(\'' + escAttr(r.id) + '\')">↺ Limpar checks</button>'
    + '<button class="btn ghost" onclick="scheduleRecipe(\'' + escAttr(r.id) + '\')">📅 Agendar</button>'
    + '</div></div>';
}

function toggleIngCheck(recipeId, ingId) {
  toggleCheck(recipeId, ingId);
  render();
}

/* ---- icon picker ---- */
function renderIconPickerBody() {
  var h = '';
  FOOD_ICONS.forEach(function (g) {
    h += '<div class="icon-pick-label">' + esc(g.g) + '</div><div class="icon-pick-grid">';
    g.icons.forEach(function (ic) {
      h += '<button type="button" class="icon-pick-btn' + (ic === _iconDraft ? ' on' : '') + '" onclick="pickIcon(\'' + escAttr(ic) + '\')">' + ic + '</button>';
    });
    h += '</div>';
  });
  h += '<div class="fg" style="margin-top:12px"><label class="fl">Ou cole um emoji</label>'
    + '<input class="field" id="iconCustom" placeholder="ex.: 🦞" onkeydown="if(event.key===\'Enter\')applyCustomIcon()">'
    + '<button class="btn ghost" style="margin-top:8px;width:100%" onclick="applyCustomIcon()">Usar</button></div>';
  return h;
}
function openIconPicker(ctx) {
  _iconCtx = ctx;
  var b = $('iconPickBody');
  if (b) b.innerHTML = renderIconPickerBody();
  $('iconOverlay').classList.add('open');
}
function closeIconPicker() { $('iconOverlay').classList.remove('open'); }
function pickIcon(ic) {
  _iconDraft = ic;
  paintIconWrap(_iconCtx);
  closeIconPicker();
}
function applyCustomIcon() {
  var v = normalizeIcon(($('iconCustom') && $('iconCustom').value) || '');
  if (!v) return;
  pickIcon(v);
}
function normalizeIcon(s) {
  var p = Array.from(String(s || '').trim());
  return p.length ? p.slice(0, 2).join('') : '';
}
function paintIconWrap(ctx) {
  var el = $(ctx === 'book' ? 'bookIconWrap' : 'recipeIconWrap');
  if (!el) return;
  el.innerHTML = '<button type="button" class="icon-pick-btn on" onclick="openIconPicker(\'' + ctx + '\')" style="width:auto;padding:0 14px;display:inline-flex;align-items:center;gap:8px">'
    + '<span style="font-size:22px">' + esc(_iconDraft) + '</span><span style="font-size:12px;font-weight:800;color:var(--muted)">Trocar</span></button>';
}

/* ---- book modal ---- */
function openBookModal(id) {
  _editBookId = id;
  var b = id ? bookById(id) : null;
  _iconDraft = (b && b.icon) || '📖';
  _bookColor = (b && b.color) || '#e07a5f';
  $('bookModalTitle').textContent = b ? 'Editar livro' : 'Novo livro';
  $('bookName').value = b ? b.name : '';
  paintIconWrap('book');
  paintBookColors();
  var del = $('bookDelBtn');
  if (del) del.style.display = b ? '' : 'none';
  $('bookOverlay').classList.add('open');
}
function closeBookModal() { $('bookOverlay').classList.remove('open'); }
function paintBookColors() {
  var el = $('bookColorWrap');
  if (!el) return;
  if (JB.mountColorControl) {
    JB.mountColorControl(el, {
      value: _bookColor,
      title: 'Cor do livro',
      presets: BOOK_COLORS,
      onChange: function (h) { _bookColor = h; }
    });
    return;
  }
  el.innerHTML = BOOK_COLORS.map(function (c) {
    return '<button type="button" class="color-sw' + (c === _bookColor ? ' on' : '') + '" style="background:' + c + '" onclick="pickBookColor(\'' + c + '\')"></button>';
  }).join('');
}
function pickBookColor(c) { _bookColor = c; paintBookColors(); }

function saveBookModal() {
  var name = (($('bookName') && $('bookName').value) || '').trim();
  if (!name) { toast('Dê um nome ao livro'); return; }
  var id = _editBookId || uuid();
  var created = todayISO();
  var order = DATA.cookbooks.length;
  if (_editBookId) {
    var cur = bookById(_editBookId);
    if (cur) order = cur.order;
  }
  var color = (JB.colorControlValue && JB.colorControlValue($('bookColorWrap'))) || _bookColor;
  var row = [id, name, _iconDraft || '📖', color, String(order), created];
  var p = _editBookId
    ? findRow('Cookbooks', 0, id).then(function (rn) {
      if (rn < 0) throw new Error('Livro não encontrado');
      return JB.api('PUT', ssUrl('/values/Cookbooks!A' + rn + ':F' + rn + '?valueInputOption=RAW'), { values: [row] });
    })
    : JB.api('POST', ssUrl('/values/Cookbooks!A:F:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS'), { values: [row] });
  p.then(function () {
    closeBookModal();
    return refreshQuiet();
  }).catch(function (e) { toast(e.message || 'Falha ao salvar'); });
}

function deleteBookModal() {
  if (!_editBookId) return;
  var id = _editBookId;
  var book = bookById(id);
  var recs = recipesInBook(id);
  var title = 'Excluir livro?';
  var msg = recs.length
    ? ('“' + (book && book.name ? book.name : 'Este livro') + '” e as ' + recs.length
      + ' receita' + (recs.length === 1 ? '' : 's')
      + ' dentro (ingredientes e passos) serão excluídos. Não dá pra desfazer.')
    : ('“' + (book && book.name ? book.name : 'Este livro') + '” está vazio e será excluído. Não dá pra desfazer.');
  JB.confirm(title, msg, function () {
    toast('Excluindo…');
    deleteBookCascade(id).then(function () {
      closeBookModal();
      if (openBookId === id || (openRecipeId && recipeById(openRecipeId) && recipeById(openRecipeId).cookbookId === id)) {
        goShelf();
      }
      return refreshQuiet();
    }).then(function () {
      toast('Livro excluído');
    }).catch(function (e) { toast(e.message || 'Falha ao excluir'); });
  }, { danger: true, yes: 'Excluir livro', no: 'Cancelar' });
}

/** Wipe a cookbook and every recipe / ingredient / step / plan that belongs to it. */
function deleteBookCascade(bookId) {
  var recipeIds = {};
  recipesInBook(bookId).forEach(function (r) { recipeIds[r.id] = true; });
  return Promise.all([
    JB.api('GET', ssUrl('/values/Ingredients?valueRenderOption=UNFORMATTED_VALUE')),
    JB.api('GET', ssUrl('/values/Steps?valueRenderOption=UNFORMATTED_VALUE')),
    JB.api('GET', ssUrl('/values/Recipes?valueRenderOption=UNFORMATTED_VALUE')),
    JB.api('GET', ssUrl('/values/Cookbooks?valueRenderOption=UNFORMATTED_VALUE')),
    recipesGrid.Plans != null
      ? JB.api('GET', ssUrl('/values/Plans?valueRenderOption=UNFORMATTED_VALUE'))
      : Promise.resolve({ values: [] })
  ]).then(function (pack) {
    var ingRows = collectRowNumsAny(pack[0].values, 1, recipeIds);
    var stepRows = collectRowNumsAny(pack[1].values, 1, recipeIds);
    var planRows = collectRowNumsAny(pack[4].values, 1, recipeIds);
    var recipeRows = [];
    var recipeVals = pack[2].values || [];
    for (var i = 1; i < recipeVals.length; i++) {
      var rr = recipeVals[i] || [];
      if (recipeIds[String(rr[0] || '')] || String(rr[1] || '') === String(bookId)) {
        recipeRows.push(i + 1);
      }
    }
    var bookRow = -1;
    var bookVals = pack[3].values || [];
    for (var j = 1; j < bookVals.length; j++) {
      if (String((bookVals[j] || [])[0] || '') === String(bookId)) {
        bookRow = j + 1;
        break;
      }
    }
    var reqs = [];
    function pushDeletes(sheetId, rows) {
      if (sheetId == null) return;
      rows.sort(function (a, b) { return b - a; }).forEach(function (rn) {
        reqs.push({
          deleteDimension: {
            range: { sheetId: sheetId, dimension: 'ROWS', startIndex: rn - 1, endIndex: rn }
          }
        });
      });
    }
    pushDeletes(recipesGrid.Ingredients, ingRows);
    pushDeletes(recipesGrid.Steps, stepRows);
    pushDeletes(recipesGrid.Plans, planRows);
    pushDeletes(recipesGrid.Recipes, recipeRows);
    if (bookRow > 0) pushDeletes(recipesGrid.Cookbooks, [bookRow]);
    if (!reqs.length) return null;
    return JB.api('POST', ssUrl(':batchUpdate'), { requests: reqs });
  }).then(function () {
    purgeRecipeChecks(Object.keys(recipeIds));
    DATA.plans = (DATA.plans || []).filter(function (p) { return !recipeIds[p.recipeId]; });
    if (JB.cal && JB.cal.clearHubCache) JB.cal.clearHubCache();
  });
}

function collectRowNumsAny(values, idCol, idMap) {
  var out = [];
  for (var i = 1; i < (values || []).length; i++) {
    var key = String((values[i] || [])[idCol] || '');
    if (idMap[key]) out.push(i + 1);
  }
  return out;
}

function purgeRecipeChecks(ids) {
  if (!ids || !ids.length) return;
  var m = loadChecks();
  var changed = false;
  ids.forEach(function (id) {
    if (m[id]) { delete m[id]; changed = true; }
  });
  if (changed) saveChecks(m);
}

/* ---- prazos no Calendar (aba Plans) ---- */
function scheduleRecipe(recipeId) {
  if (!recipeById(recipeId)) return;
  if (!JB.datePicker) { toast('Seletor de data indisponível'); return; }
  JB.datePicker(todayISO(), function (iso) {
    if (!iso) return;
    addRecipePlan(recipeId, iso);
  }, { clearLabel: 'Cancelar' });
}

function addRecipePlan(recipeId, date) {
  date = sheetsDateLocal(date);
  if (!date || !recipeId) return;
  var dup = (DATA.plans || []).some(function (p) {
    return p.recipeId === recipeId && p.date === date;
  });
  if (dup) { toast('Já agendado para esse dia'); return; }
  var plan = { id: uuid(), recipeId: recipeId, date: date, created: todayISO() };
  if (JB.isGhost && JB.isGhost()) {
    DATA.plans = (DATA.plans || []).concat([plan]);
    if (JB.cal && JB.cal.clearHubCache) JB.cal.clearHubCache();
    render();
    toast('Prazo adicionado');
    return;
  }
  JB.api('POST', ssUrl('/values/Plans!A:D:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS'), {
    values: [[plan.id, plan.recipeId, plan.date, plan.created]]
  }).then(function () {
    DATA.plans = (DATA.plans || []).concat([plan]);
    if (JB.cal && JB.cal.clearHubCache) JB.cal.clearHubCache();
    render();
    toast('Prazo no Calendar');
  }).catch(function (e) { toast(e.message || 'Falha ao agendar'); });
}

function removeRecipePlan(planId) {
  var plan = null;
  for (var i = 0; i < (DATA.plans || []).length; i++) {
    if (DATA.plans[i].id === planId) { plan = DATA.plans[i]; break; }
  }
  if (!plan) return;
  if (JB.isGhost && JB.isGhost()) {
    DATA.plans = DATA.plans.filter(function (p) { return p.id !== planId; });
    if (JB.cal && JB.cal.clearHubCache) JB.cal.clearHubCache();
    render();
    return;
  }
  findRow('Plans', 0, planId).then(function (rn) {
    if (rn < 0) return;
    return deleteSheetRow('Plans', rn);
  }).then(function () {
    DATA.plans = (DATA.plans || []).filter(function (p) { return p.id !== planId; });
    if (JB.cal && JB.cal.clearHubCache) JB.cal.clearHubCache();
    render();
  }).catch(function (e) { toast(e.message || 'Falha ao remover'); });
}

function deletePlansForRecipes(recipeIds) {
  var idMap = {};
  (recipeIds || []).forEach(function (id) { idMap[String(id)] = true; });
  if (!Object.keys(idMap).length) return Promise.resolve();
  if (JB.isGhost && JB.isGhost()) {
    DATA.plans = (DATA.plans || []).filter(function (p) { return !idMap[p.recipeId]; });
    return Promise.resolve();
  }
  if (recipesGrid.Plans == null) return Promise.resolve();
  return JB.api('GET', ssUrl('/values/Plans?valueRenderOption=UNFORMATTED_VALUE')).then(function (res) {
    var rows = collectRowNumsAny(res.values, 1, idMap);
    var reqs = [];
    rows.sort(function (a, b) { return b - a; }).forEach(function (rn) {
      reqs.push({
        deleteDimension: {
          range: { sheetId: recipesGrid.Plans, dimension: 'ROWS', startIndex: rn - 1, endIndex: rn }
        }
      });
    });
    if (!reqs.length) return null;
    return JB.api('POST', ssUrl(':batchUpdate'), { requests: reqs });
  }).then(function () {
    DATA.plans = (DATA.plans || []).filter(function (p) { return !idMap[p.recipeId]; });
  });
}

/* ---- recipe modal ---- */
function openRecipeModal(id) {
  if (!openBookId && !id) {
    toast('Abra um livro primeiro');
    return;
  }
  _editRecipeId = id;
  var r = id ? recipeById(id) : null;
  if (r) openBookId = r.cookbookId;
  _iconDraft = (r && r.icon) || '🍽️';
  $('recipeModalTitle').textContent = r ? 'Editar receita' : 'Nova receita';
  $('recipeTitle').value = r ? r.title : '';
  $('recipeServings').value = r ? r.servings : '';
  $('recipeMinutes').value = r ? r.minutes : '';
  $('recipeNotes').value = r ? r.notes : '';
  _ingDraft = r ? ingsFor(r.id).map(function (x) {
    return { id: x.id, text: x.text, qty: x.qty, unit: x.unit };
  }) : [{ id: '', text: '', qty: '', unit: '' }];
  _stepDraft = r ? stepsFor(r.id).map(function (x) {
    return { id: x.id, text: x.text };
  }) : [{ id: '', text: '' }];
  paintIconWrap('recipe');
  paintIngLines();
  paintStepLines();
  setRecipeImageValue(r ? r.imageUrl : '', null);
  var del = $('recipeDelBtn');
  if (del) del.style.display = r ? '' : 'none';
  var online = $('recipeOnlineRow');
  if (online) online.style.display = r ? 'none' : '';
  $('recipeOverlay').classList.add('open');
}
function closeRecipeModal() {
  $('recipeOverlay').classList.remove('open');
  clearRecipeImgLocal();
}
/* Atalho do "Nova receita": importa pronto em vez de digitar tudo. */
function searchFromRecipeModal() {
  var bid = openBookId || '';
  closeRecipeModal();
  openSearch(bid);
}

/* ---- recipe image attach (drag / paste / file / URL) ---- */
function clearRecipeImgLocal() {
  if (_recipeImgLocalUrl) {
    try { URL.revokeObjectURL(_recipeImgLocalUrl); } catch (_) {}
  }
  _recipeImgLocalUrl = '';
  _recipeImgFile = null;
}
function recipeImgEls() {
  return {
    wrap: $('recipeImgPick'),
    hidden: $('recipeImage'),
    preview: $('recipeImgPreview'),
    previewWrap: $('recipeImgPreviewWrap'),
    empty: $('recipeImgEmpty'),
    urlRow: $('recipeImgUrlRow'),
    url: $('recipeImageUrl'),
    file: $('recipeImgFile')
  };
}
function setRecipeImageValue(url, file) {
  var el = recipeImgEls();
  clearRecipeImgLocal();
  _recipeImgFile = file || null;
  url = String(url || '').trim();
  if (el.hidden) el.hidden.value = file ? '' : url;
  if (el.url) el.url.value = (!file && url && url.indexOf('data:') !== 0) ? url : '';
  if (el.urlRow) el.urlRow.hidden = true;
  if (file) {
    _recipeImgLocalUrl = URL.createObjectURL(file);
    paintRecipeImgPreview(_recipeImgLocalUrl);
  } else if (url) {
    paintRecipeImgPreview(url);
  } else {
    paintRecipeImgPreview('');
  }
}
function paintRecipeImgPreview(src) {
  var el = recipeImgEls();
  if (!el.wrap) return;
  var has = !!src;
  el.wrap.classList.toggle('has-img', has);
  if (el.previewWrap) el.previewWrap.hidden = !has;
  if (el.preview) {
    el.preview.removeAttribute('src');
    if (src) el.preview.src = src;
  }
}
function pickRecipeImgFile() {
  var el = recipeImgEls();
  if (el.file) { el.file.value = ''; el.file.click(); }
}
function onRecipeImgFile(inp) {
  var f = inp && inp.files && inp.files[0];
  if (f) acceptRecipeImageFile(f);
}
function toggleRecipeImgUrl() {
  var el = recipeImgEls();
  if (!el.urlRow) return;
  var open = el.urlRow.hidden;
  el.urlRow.hidden = !open;
  if (open && el.url) { el.url.focus(); el.url.select(); }
}
function onRecipeImgUrl(v) {
  v = String(v || '').trim();
  clearRecipeImgLocal();
  var el = recipeImgEls();
  if (el.hidden) el.hidden.value = v;
  paintRecipeImgPreview(v);
}
function clearRecipeImg() {
  setRecipeImageValue('', null);
  var el = recipeImgEls();
  if (el.file) el.file.value = '';
}
function recipeImgDrag(ev, on) {
  ev.preventDefault();
  var wrap = $('recipeImgPick');
  if (wrap) wrap.classList.toggle('is-drag', !!on);
}
function recipeImgDrop(ev) {
  ev.preventDefault();
  recipeImgDrag(ev, false);
  var files = ev.dataTransfer && ev.dataTransfer.files;
  var f = files && files[0];
  if (f) acceptRecipeImageFile(f);
}
function acceptRecipeImageFile(file) {
  if (!file || String(file.type || '').indexOf('image/') !== 0) {
    toast('Use uma imagem (JPG, PNG, WebP…)');
    return;
  }
  if (file.size > 12 * 1024 * 1024) {
    toast('Imagem grande demais (máx. 12 MB)');
    return;
  }
  setRecipeImageValue('', file);
}
function recipeImgFromClipboard(ev) {
  var ov = $('recipeOverlay');
  if (!ov || !ov.classList.contains('open')) return;
  var items = (ev.clipboardData && ev.clipboardData.items) || [];
  for (var i = 0; i < items.length; i++) {
    if (items[i].type && items[i].type.indexOf('image/') === 0) {
      var f = items[i].getAsFile();
      if (f) {
        ev.preventDefault();
        acceptRecipeImageFile(f);
        return;
      }
    }
  }
}
document.addEventListener('paste', recipeImgFromClipboard);

function compressRecipeImage(file) {
  return new Promise(function (resolve, reject) {
    var url = URL.createObjectURL(file);
    var img = new Image();
    img.onload = function () {
      URL.revokeObjectURL(url);
      var max = 1400;
      var w = img.naturalWidth || 1;
      var h = img.naturalHeight || 1;
      var scale = Math.min(1, max / Math.max(w, h));
      var cw = Math.max(1, Math.round(w * scale));
      var ch = Math.max(1, Math.round(h * scale));
      var c = document.createElement('canvas');
      c.width = cw; c.height = ch;
      var ctx = c.getContext('2d');
      ctx.drawImage(img, 0, 0, cw, ch);
      c.toBlob(function (blob) {
        if (!blob) return reject(new Error('Não deu para comprimir a imagem'));
        var base = String(file.name || 'receita').replace(/\.[^.]+$/, '') || 'receita';
        var name = base + '.jpg';
        try { resolve(new File([blob], name, { type: 'image/jpeg' })); }
        catch (_) { blob.name = name; resolve(blob); }
      }, 'image/jpeg', 0.84);
    };
    img.onerror = function () {
      URL.revokeObjectURL(url);
      reject(new Error('Imagem inválida'));
    };
    img.src = url;
  });
}
function fileToDataUrl(file) {
  return new Promise(function (resolve, reject) {
    var r = new FileReader();
    r.onload = function () { resolve(String(r.result || '')); };
    r.onerror = function () { reject(new Error('Falha ao ler a imagem')); };
    r.readAsDataURL(file);
  });
}
function driveRecipeImageUrl(fileId) {
  return 'https://drive.google.com/thumbnail?id=' + encodeURIComponent(fileId) + '&sz=w1200';
}
function resolveRecipeImageUrl() {
  var el = recipeImgEls();
  var typed = ((el.hidden && el.hidden.value) || '').trim();
  if (!_recipeImgFile) return Promise.resolve(typed);
  toast('Enviando imagem…');
  return compressRecipeImage(_recipeImgFile).then(function (ready) {
    if (JB.isGhost && JB.isGhost()) {
      return fileToDataUrl(ready).then(function (dataUrl) {
        if (dataUrl.length > 45000) throw new Error('Imagem grande demais neste modo');
        return dataUrl;
      });
    }
    if (!JB.ensureAppFolder || !JB.uploadFileToFolder) throw new Error('Upload indisponível');
    return JB.ensureAppFolder('recipes').then(function (folderId) {
      var name = 'recipe-' + Date.now() + '-' + (ready.name || 'img.jpg');
      return JB.uploadFileToFolder(ready, name, folderId);
    }).then(function (f) {
      if (!f || !f.id) throw new Error('Falha no upload');
      return JB.api('POST',
        'https://www.googleapis.com/drive/v3/files/' + encodeURIComponent(f.id) + '/permissions',
        { role: 'reader', type: 'anyone' }
      ).catch(function () { return null; }).then(function () {
        return driveRecipeImageUrl(f.id);
      });
    });
  });
}

function paintIngLines() {
  var el = $('recipeIngList');
  if (!el) return;
  el.innerHTML = _ingDraft.map(function (line, i) {
    return '<div class="edit-line">'
      + '<input class="field" placeholder="Ingrediente" value="' + esc(line.text) + '" oninput="_ingDraft[' + i + '].text=this.value">'
      + '<input class="field" placeholder="Qtd" value="' + esc(line.qty) + '" oninput="_ingDraft[' + i + '].qty=this.value">'
      + '<button type="button" class="rm" onclick="rmIngLine(' + i + ')">×</button></div>';
  }).join('');
}
function paintStepLines() {
  var el = $('recipeStepList');
  if (!el) return;
  el.innerHTML = _stepDraft.map(function (line, i) {
    return '<div class="edit-line step">'
      + '<input class="field" placeholder="Passo ' + (i + 1) + '" value="' + esc(line.text) + '" oninput="_stepDraft[' + i + '].text=this.value">'
      + '<button type="button" class="rm" onclick="rmStepLine(' + i + ')">×</button></div>';
  }).join('');
}
function addIngLine() { _ingDraft.push({ id: '', text: '', qty: '', unit: '' }); paintIngLines(); }
function addStepLine() { _stepDraft.push({ id: '', text: '' }); paintStepLines(); }
function rmIngLine(i) { _ingDraft.splice(i, 1); if (!_ingDraft.length) _ingDraft.push({ id: '', text: '', qty: '', unit: '' }); paintIngLines(); }
function rmStepLine(i) { _stepDraft.splice(i, 1); if (!_stepDraft.length) _stepDraft.push({ id: '', text: '' }); paintStepLines(); }

function saveRecipeModal() {
  var title = (($('recipeTitle') && $('recipeTitle').value) || '').trim();
  if (!title) { toast('Dê um título'); return; }
  if (!openBookId) { toast('Sem livro'); return; }
  var id = _editRecipeId || uuid();
  var created = todayISO();
  var order = recipesInBook(openBookId).length;
  if (_editRecipeId) {
    var cur = recipeById(_editRecipeId);
    if (cur) order = cur.order;
  }
  resolveRecipeImageUrl().then(function (imageUrl) {
    var row = [
      id, openBookId, title, _iconDraft || '🍽️',
      imageUrl || '',
      (($('recipeServings') && $('recipeServings').value) || '').trim(),
      (($('recipeMinutes') && $('recipeMinutes').value) || '').trim(),
      (($('recipeNotes') && $('recipeNotes').value) || '').trim(),
      String(order), _editRecipeId ? (recipeById(_editRecipeId).source || '') : 'manual',
      _editRecipeId ? (recipeById(_editRecipeId).sourceId || '') : '', created
    ];
    var p = _editRecipeId
      ? findRow('Recipes', 0, id).then(function (rn) {
        if (rn < 0) throw new Error('Receita não encontrada');
        return JB.api('PUT', ssUrl('/values/Recipes!A' + rn + ':L' + rn + '?valueInputOption=RAW'), { values: [row] })
          .then(function () { return replaceRecipeChildren(id); });
      })
      : JB.api('POST', ssUrl('/values/Recipes!A:L:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS'), { values: [row] })
        .then(function () { return replaceRecipeChildren(id); });
    var inBook = view === 'book';
    return p.then(function () {
      closeRecipeModal();
      if (!inBook) {
        openRecipeId = id;
        view = 'recipe';
      }
      return refreshQuiet().then(function () {
        if (inBook) focusRecipePage(id);
      });
    });
  }).catch(function (e) { toast(e.message || 'Falha ao salvar'); });
}

/* Salvar de dentro do livro não deve expulsar da leitura: vira para a página. */
function focusRecipePage(id) {
  if (view !== 'book' || bookViewMode !== 'flip') return;
  var list = visibleRecipes(openBookId);
  var idx = -1;
  for (var i = 0; i < list.length; i++) {
    if (list[i].id === id) { idx = i; break; }
  }
  if (idx < 0) return;
  var step = spreadStep();
  var target = Math.floor(idx / step) * step;
  if (target === flipIndex) return;
  flipIndex = target;
  render();
  bindFlipGesture();
}

function replaceRecipeChildren(recipeId) {
  return clearChildren(recipeId).then(function () {
    var ings = _ingDraft.filter(function (x) { return String(x.text || '').trim(); }).map(function (x, i) {
      return [x.id || uuid(), recipeId, String(x.text).trim(), String(x.qty || '').trim(), String(x.unit || '').trim(), String(i)];
    });
    var steps = _stepDraft.filter(function (x) { return String(x.text || '').trim(); }).map(function (x, i) {
      return [x.id || uuid(), recipeId, String(x.text).trim(), String(i)];
    });
    var data = [];
    if (ings.length) data.push({ range: 'Ingredients!A:F', values: ings });
    if (steps.length) data.push({ range: 'Steps!A:D', values: steps });
    if (!data.length) return null;
    var chain = Promise.resolve();
    if (ings.length) {
      chain = chain.then(function () {
        return JB.api('POST', ssUrl('/values/Ingredients!A:F:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS'), { values: ings });
      });
    }
    if (steps.length) {
      chain = chain.then(function () {
        return JB.api('POST', ssUrl('/values/Steps!A:D:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS'), { values: steps });
      });
    }
    return chain;
  });
}

function clearChildren(recipeId) {
  return Promise.all([
    JB.api('GET', ssUrl('/values/Ingredients?valueRenderOption=UNFORMATTED_VALUE')),
    JB.api('GET', ssUrl('/values/Steps?valueRenderOption=UNFORMATTED_VALUE'))
  ]).then(function (pair) {
    var ingRows = collectRowNums(pair[0].values, 1, recipeId);
    var stepRows = collectRowNums(pair[1].values, 1, recipeId);
    var sheetIdIng = recipesGrid.Ingredients;
    var sheetIdStep = recipesGrid.Steps;
    var reqs = [];
    // delete from bottom so indices stay valid
    ingRows.sort(function (a, b) { return b - a; }).forEach(function (rn) {
      reqs.push({ deleteDimension: { range: { sheetId: sheetIdIng, dimension: 'ROWS', startIndex: rn - 1, endIndex: rn } } });
    });
    stepRows.sort(function (a, b) { return b - a; }).forEach(function (rn) {
      reqs.push({ deleteDimension: { range: { sheetId: sheetIdStep, dimension: 'ROWS', startIndex: rn - 1, endIndex: rn } } });
    });
    if (!reqs.length) return null;
    return JB.api('POST', ssUrl(':batchUpdate'), { requests: reqs });
  });
}

function collectRowNums(values, idCol, id) {
  var out = [];
  for (var i = 1; i < (values || []).length; i++) {
    if (String((values[i] || [])[idCol] || '') === String(id)) out.push(i + 1);
  }
  return out;
}

function deleteRecipeModal() {
  if (!_editRecipeId) return;
  var id = _editRecipeId;
  JB.confirm('Excluir esta receita?', 'Ingredientes, passos e a receita somem. Não dá pra desfazer.', function () {
    deleteRecipeCascade(id).then(function () {
      purgeRecipeChecks([id]);
      closeRecipeModal();
      if (openRecipeId === id) backToBook();
      return refreshQuiet();
    }).catch(function (e) { toast(e.message || 'Falha ao excluir'); });
  }, { danger: true, yes: 'Excluir', no: 'Cancelar' });
}

function deleteRecipeCascade(id) {
  return clearChildren(id).then(function () {
    return deletePlansForRecipes([id]);
  }).then(function () {
    return findRow('Recipes', 0, id).then(function (rn) {
      if (rn < 0) return;
      return deleteSheetRow('Recipes', rn);
    });
  }).then(function () {
    if (JB.cal && JB.cal.clearHubCache) JB.cal.clearHubCache();
  });
}

function findRow(tab, idCol, id) {
  return JB.api('GET', ssUrl('/values/' + encodeURIComponent(tab) + '?valueRenderOption=UNFORMATTED_VALUE')).then(function (res) {
    var rows = res.values || [];
    for (var i = 1; i < rows.length; i++) {
      if (String((rows[i] || [])[idCol] || '') === String(id)) return i + 1;
    }
    return -1;
  });
}

function deleteSheetRow(tab, rowNum) {
  var sid = recipesGrid[tab];
  if (sid == null) return Promise.reject(new Error('Aba ' + tab + ' ausente'));
  return JB.api('POST', ssUrl(':batchUpdate'), {
    requests: [{ deleteDimension: { range: { sheetId: sid, dimension: 'ROWS', startIndex: rowNum - 1, endIndex: rowNum } } }]
  });
}

/* ---- search / TheMealDB ---- */
function openSearch(bookId) {
  _searchImportBookId = bookId || openBookId || (DATA.cookbooks[0] && DATA.cookbooks[0].id) || '';
  if ($('searchQ')) $('searchQ').value = '';
  if ($('searchResults')) $('searchResults').innerHTML = '';
  $('searchOverlay').classList.add('open');
  setTimeout(function () { if ($('searchQ')) $('searchQ').focus(); }, 50);
}
function closeSearch() { $('searchOverlay').classList.remove('open'); }

function runSearch() {
  var q = (($('searchQ') && $('searchQ').value) || '').trim();
  if (!q) { toast('Digite algo para buscar'); return; }
  var el = $('searchResults');
  if (el) el.innerHTML = '<div class="rg">Buscando…</div>';
  fetch('/api/recipes?q=' + encodeURIComponent(q)).then(function (r) { return r.json().then(function (j) { return { ok: r.ok, j: j }; }); })
    .then(function (pack) {
      if (!pack.ok) throw new Error((pack.j && pack.j.error) || 'Busca falhou');
      var results = pack.j.results || [];
      if (!el) return;
      if (!results.length) {
        el.innerHTML = '<div class="empty">Nada encontrado. Tente em inglês (ex.: pasta, chicken).</div>';
        return;
      }
      el.innerHTML = results.map(function (m) {
        return '<button type="button" class="search-hit" onclick="importMeal(\'' + escAttr(m.sourceId) + '\')">'
          + (m.image ? '<img src="' + esc(m.image) + '" alt="">' : '<div style="width:56px;height:56px;border-radius:12px;background:var(--surface);display:flex;align-items:center;justify-content:center;font-size:24px">🍽️</div>')
          + '<div><b>' + esc(m.title) + '</b><span>' + esc([m.area, m.category].filter(Boolean).join(' · ')) + '</span></div>'
          + '</button>';
      }).join('');
    }).catch(function (e) {
      if (el) el.innerHTML = '<div class="empty">' + esc(e.message || 'Erro na busca') + '</div>';
    });
}

function importMeal(sourceId) {
  if (!_searchImportBookId) {
    toast('Crie um livro antes de importar');
    return;
  }
  toast('Importando…');
  fetch('/api/recipes?id=' + encodeURIComponent(sourceId)).then(function (r) { return r.json().then(function (j) { return { ok: r.ok, j: j }; }); })
    .then(function (pack) {
      if (!pack.ok || !pack.j.meal) throw new Error((pack.j && pack.j.error) || 'Detalhe indisponível');
      var m = pack.j.meal;
      var id = uuid();
      var created = todayISO();
      var order = recipesInBook(_searchImportBookId).length;
      var icon = guessIcon(m.category);
      var row = [id, _searchImportBookId, m.title, icon, m.image || '', '', '', '', String(order), 'themealdb', String(m.sourceId || sourceId), created];
      return JB.api('POST', ssUrl('/values/Recipes!A:L:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS'), { values: [row] })
        .then(function () {
          var ings = (m.ingredients || []).map(function (x, i) {
            return [uuid(), id, x.text || '', x.qty || '', x.unit || '', String(i)];
          });
          var steps = (m.steps || []).map(function (x, i) {
            return [uuid(), id, x.text || '', String(i)];
          });
          var chain = Promise.resolve();
          if (ings.length) {
            chain = chain.then(function () {
              return JB.api('POST', ssUrl('/values/Ingredients!A:F:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS'), { values: ings });
            });
          }
          if (steps.length) {
            chain = chain.then(function () {
              return JB.api('POST', ssUrl('/values/Steps!A:D:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS'), { values: steps });
            });
          }
          return chain.then(function () { return id; });
        });
    }).then(function (id) {
      closeSearch();
      var inBook = view === 'book' && openBookId === _searchImportBookId;
      openBookId = _searchImportBookId;
      if (!inBook) {
        openRecipeId = id;
        view = 'recipe';
      }
      toast('Receita salva no livro');
      return refreshQuiet().then(function () {
        if (inBook) focusRecipePage(id);
      });
    }).catch(function (e) { toast(e.message || 'Falha ao importar'); });
}

function guessIcon(cat) {
  cat = String(cat || '').toLowerCase();
  if (cat.indexOf('dessert') > -1 || cat.indexOf('sweet') > -1) return '🧁';
  if (cat.indexOf('breakfast') > -1) return '🥞';
  if (cat.indexOf('seafood') > -1) return '🐟';
  if (cat.indexOf('chicken') > -1 || cat.indexOf('beef') > -1 || cat.indexOf('pork') > -1 || cat.indexOf('lamb') > -1) return '🍗';
  if (cat.indexOf('pasta') > -1) return '🍝';
  if (cat.indexOf('vegan') > -1 || cat.indexOf('vegetarian') > -1) return '🥗';
  if (cat.indexOf('drink') > -1) return '🍹';
  return '🍽️';
}

/* ---- lifecycle ---- */
document.addEventListener('click', clearBookPeek);
JB.onSessionExpired(function () {
  authDone = false;
  showSignIn(true);
});
JB.onAuthRestored(function () {
  if (!JB.isSignedIn() || authDone) return;
  authDone = true;
  bootSheet();
});

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', startRecipes);
} else {
  startRecipes();
}
