/* Joelboard Recipes — app logic. © 2026 Joel Soluções LTDA.
   Classic global script; loads after /joelboard.js. */
var APP = 'recipes';
var DATA = { cookbooks: [], recipes: [], ingredients: [], steps: [] };
var recipesGrid = {};
var authDone = false;
var view = 'shelf'; /* shelf | book | recipe */
var openBookId = null;
var openRecipeId = null;
var flipIndex = 0;
var bookViewMode = 'flip';
var homeQuery = '';
var _editBookId = null;
var _editRecipeId = null;
var _iconCtx = null;
var _iconDraft = '📖';
var _bookColor = '#e07a5f';
var _searchImportBookId = null;
var _ingDraft = [];
var _stepDraft = [];
var CHECK_KEY = 'jb_recipes_checks';
var VIEW_KEY = 'jb_recipes_view';

var RECIPES_TABS = [
  ['Cookbooks', ['ID', 'Nome', 'Icone', 'Cor', 'Ordem', 'Criado']],
  ['Recipes', ['ID', 'CookbookID', 'Titulo', 'Icone', 'ImageUrl', 'Porcoes', 'Minutos', 'Notas', 'Ordem', 'Source', 'SourceID', 'Criado']],
  ['Ingredients', ['ID', 'RecipeID', 'Texto', 'Qtd', 'Unidade', 'Ordem']],
  ['Steps', ['ID', 'RecipeID', 'Texto', 'Ordem']],
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

function recipesSignOut() { JB.signOut(); location.href = '/'; }
function openSettings() {
  switchSet('tema');
  JB.renderSkinPicker(APP, $('setSkins'));
  var flip = $('setFlipPref');
  if (flip) flip.classList.toggle('on', bookViewMode === 'flip');
  $('setOverlay').classList.add('open');
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
  var tabs = ['Cookbooks', 'Recipes', 'Ingredients', 'Steps'];
  return JB.api('GET', ssUrl('/values:batchGet?ranges=' + tabs.map(encodeURIComponent).join('&ranges=') + '&valueRenderOption=UNFORMATTED_VALUE'))
    .then(function (res) {
      var vr = res.valueRanges || [];
      DATA.cookbooks = parseCookbooks(vr[0] && vr[0].values);
      DATA.recipes = parseRecipes(vr[1] && vr[1].values);
      DATA.ingredients = parseIngredients(vr[2] && vr[2].values);
      DATA.steps = parseSteps(vr[3] && vr[3].values);
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
  if (!JB.isSignedIn()) return;
  var tabs = ['Cookbooks', 'Recipes', 'Ingredients', 'Steps'];
  JB.api('GET', ssUrl('/values:batchGet?ranges=' + tabs.map(encodeURIComponent).join('&ranges=') + '&valueRenderOption=UNFORMATTED_VALUE'))
    .then(function (res) {
      var vr = res.valueRanges || [];
      DATA.cookbooks = parseCookbooks(vr[0] && vr[0].values);
      DATA.recipes = parseRecipes(vr[1] && vr[1].values);
      DATA.ingredients = parseIngredients(vr[2] && vr[2].values);
      DATA.steps = parseSteps(vr[3] && vr[3].values);
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
  if (view === 'shelf') main.innerHTML = renderShelf();
  else if (view === 'book') main.innerHTML = renderBook();
  else if (view === 'recipe') main.innerHTML = renderDetail();
  var fab = $('fab');
  if (fab) {
    fab.style.display = '';
    fab.title = view === 'shelf' ? 'Novo livro' : 'Nova receita';
  }
  patchRoute();
  var grid = main.querySelector('.shelf-grid, .recipes-grid');
  if (grid && JB.staggerChildren) JB.staggerChildren(grid, view);
  if (view === 'book' && bookViewMode === 'flip') {
    setTimeout(bindFlipGesture, 0);
  }
}

function renderShelf() {
  var q = norm(homeQuery);
  var books = DATA.cookbooks.filter(function (b) {
    if (!q) return true;
    return norm(b.name).indexOf(q) > -1;
  });
  var cards = books.map(function (b, i) {
    return '<div class="bookc" style="--kc:' + esc(b.color) + ';--jb-i:' + i + '" onclick="openBook(\'' + escAttr(b.id) + '\')">'
      + '<button type="button" class="book-edit" onclick="event.stopPropagation();openBookModal(\'' + escAttr(b.id) + '\')" title="Editar">✏</button>'
      + '<div class="book-spine"></div>'
      + '<div class="book-ico">' + esc(b.icon || '📖') + '</div>'
      + '<div class="book-title">' + esc(b.name) + '</div>'
      + '<div class="book-meta">' + countInBook(b.id) + ' receita' + (countInBook(b.id) === 1 ? '' : 's') + '</div>'
      + '</div>';
  }).join('');
  return '<div class="searchbar"><input class="field" id="homeSearch" placeholder="Buscar livros…" value="' + esc(homeQuery)
    + '" oninput="homeQuery=this.value;render()" onfocus="JB.searchFocus&&JB.searchFocus(this)"></div>'
    + '<div class="secbar"><div class="sect">Seus livros</div>'
    + '<button class="btn ghost" onclick="openSearch()">🔎 Buscar online</button></div>'
    + (cards ? '<div class="shelf-grid">' + cards + '</div>' : '<div class="empty">Nenhum livro ainda. Toque em + para criar o primeiro.</div>');
}

function norm(s) { return String(s || '').trim().toLowerCase(); }

function openBook(id) {
  openBookId = id;
  openRecipeId = null;
  flipIndex = 0;
  view = 'book';
  render();
}
function goShelf() {
  view = 'shelf';
  openBookId = null;
  openRecipeId = null;
  render();
}

function renderBook() {
  var book = bookById(openBookId);
  if (!book) return '<div class="empty">Livro não encontrado.</div><button class="back" onclick="goShelf()">← Estante</button>';
  var list = recipesInBook(book.id);
  var toggle = '<div class="view-toggle">'
    + '<button type="button" class="vbtn' + (bookViewMode === 'flip' ? ' on' : '') + '" onclick="setBookView(\'flip\')">Páginas</button>'
    + '<button type="button" class="vbtn' + (bookViewMode === 'cards' ? ' on' : '') + '" onclick="setBookView(\'cards\')">Cards</button>'
    + '</div>';
  var head = '<div class="secbar"><button class="back" onclick="goShelf()">← Estante</button>' + toggle + '</div>'
    + '<div style="margin-bottom:14px"><span style="font-size:28px;margin-right:8px">' + esc(book.icon) + '</span>'
    + '<span style="font-family:var(--font-display);font-weight:800;font-size:22px">' + esc(book.name) + '</span></div>';
  if (!list.length) {
    return head + '<div class="empty">Este livro está vazio. Toque em + para adicionar uma receita, ou busque online.</div>'
      + '<button class="btn ghost" onclick="openSearch(\'' + escAttr(book.id) + '\')">🔎 Buscar e salvar aqui</button>';
  }
  if (bookViewMode === 'cards') return head + renderCards(list, book);
  return head + renderFlip(list, book);
}

function setBookView(mode) {
  bookViewMode = mode === 'cards' ? 'cards' : 'flip';
  saveViewPref();
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

function renderFlip(list, book) {
  if (flipIndex >= list.length) flipIndex = list.length - 1;
  if (flipIndex < 0) flipIndex = 0;
  var r = list[flipIndex];
  var blurb = r.notes ? String(r.notes).slice(0, 120) : (ingsFor(r.id).length + ' ingredientes · ' + stepsFor(r.id).length + ' passos');
  var tags = '';
  if (r.minutes) tags += '<span class="ftag">' + esc(r.minutes) + ' min</span>';
  if (r.servings) tags += '<span class="ftag">' + esc(r.servings) + ' porções</span>';
  var hero = r.imageUrl
    ? '<img src="' + esc(r.imageUrl) + '" alt="">'
    : esc(r.icon || '🍽️');
  return '<div class="flip-wrap" id="flipWrap">'
    + '<div class="flip-stage"><div class="flip-page turn-in" style="--kc:' + esc(book.color) + '" onclick="openRecipe(\'' + escAttr(r.id) + '\')">'
    + '<div class="flip-hero">' + hero + '</div>'
    + '<div class="flip-title">' + esc(r.title) + '</div>'
    + '<div class="flip-blurb">' + esc(blurb) + '</div>'
    + '<div class="flip-tags">' + tags + '</div>'
    + '<div class="rg" style="text-align:center;margin-top:16px">Toque para abrir a receita</div>'
    + '</div></div>'
    + '<div class="flip-nav">'
    + '<button type="button" onclick="flipPrev()" ' + (flipIndex <= 0 ? 'disabled' : '') + '>‹</button>'
    + '<span class="flip-count">' + (flipIndex + 1) + ' / ' + list.length + '</span>'
    + '<button type="button" onclick="flipNext()" ' + (flipIndex >= list.length - 1 ? 'disabled' : '') + '>›</button>'
    + '</div></div>';
}

function flipPrev() {
  if (flipIndex <= 0) return;
  flipIndex--;
  render();
  bindFlipGesture();
}
function flipNext() {
  var list = recipesInBook(openBookId);
  if (flipIndex >= list.length - 1) return;
  flipIndex++;
  render();
  bindFlipGesture();
}
function bindFlipGesture() {
  var el = $('flipWrap');
  if (!el || el._rcBound) return;
  el._rcBound = true;
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
    + (r.notes ? '<div class="rg" style="margin-bottom:12px;line-height:1.5">' + esc(r.notes) + '</div>' : '')
    + '<div class="dsec"><h3>Ingredientes</h3>'
    + (ingHtml ? '<ul class="ing-list">' + ingHtml + '</ul>' : '<div class="rg">Nenhum ingrediente.</div>')
    + '</div>'
    + '<div class="dsec"><h3>Passo a passo</h3>'
    + (stepHtml ? '<ul class="step-list">' + stepHtml + '</ul>' : '<div class="rg">Nenhum passo.</div>')
    + '</div>'
    + '<div class="detail-actions">'
    + '<button class="btn" onclick="openRecipeModal(\'' + escAttr(r.id) + '\')">✏ Editar</button>'
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
  var row = [id, name, _iconDraft || '📖', _bookColor, String(order), created];
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
  var recs = recipesInBook(id);
  JB.confirm('Excluir este livro?', recs.length ? ('Também remove ' + recs.length + ' receita(s).') : 'Só o livro vazio.', function () {
    var chain = Promise.resolve();
    recs.forEach(function (r) {
      chain = chain.then(function () { return deleteRecipeCascade(r.id); });
    });
    chain.then(function () {
      return findRow('Cookbooks', 0, id).then(function (rn) {
        if (rn < 0) return;
        return deleteSheetRow('Cookbooks', rn);
      });
    }).then(function () {
      closeBookModal();
      if (openBookId === id) goShelf();
      return refreshQuiet();
    }).catch(function (e) { toast(e.message || 'Falha ao excluir'); });
  }, { danger: true, yes: 'Excluir' });
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
  $('recipeImage').value = r ? r.imageUrl : '';
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
  var del = $('recipeDelBtn');
  if (del) del.style.display = r ? '' : 'none';
  $('recipeOverlay').classList.add('open');
}
function closeRecipeModal() { $('recipeOverlay').classList.remove('open'); }

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
  var row = [
    id, openBookId, title, _iconDraft || '🍽️',
    (($('recipeImage') && $('recipeImage').value) || '').trim(),
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
  p.then(function () {
    closeRecipeModal();
    openRecipeId = id;
    view = 'recipe';
    return refreshQuiet();
  }).catch(function (e) { toast(e.message || 'Falha ao salvar'); });
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
  JB.confirm('Excluir esta receita?', 'Não dá pra desfazer.', function () {
    deleteRecipeCascade(id).then(function () {
      closeRecipeModal();
      if (openRecipeId === id) backToBook();
      return refreshQuiet();
    }).catch(function (e) { toast(e.message || 'Falha ao excluir'); });
  }, { danger: true, yes: 'Excluir' });
}

function deleteRecipeCascade(id) {
  return clearChildren(id).then(function () {
    return findRow('Recipes', 0, id).then(function (rn) {
      if (rn < 0) return;
      return deleteSheetRow('Recipes', rn);
    });
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
      openBookId = _searchImportBookId;
      openRecipeId = id;
      view = 'recipe';
      toast('Receita salva no livro');
      return refreshQuiet();
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
