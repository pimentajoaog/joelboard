/* Joelboard Prateleira — Julioelboard. © 2026 Joel Soluções LTDA. */
var APP = 'prateleira';
var JULIOEL_EMAILS = ['joaogabrielpabarbosa@gmail.com', 'juliazin182@gmail.com'];
var PRATELEIRA_SHARED_SHEET = '1Dw2WXmeBTqic1whtVe4fwSBM-UJ8VDBTCIJspxHYCAo';
var REVIEW_MAX = 200;
var TMDB_IMG = 'https://image.tmdb.org/t/p/w342';
var USER_NAMES = {
  'joaogabrielpabarbosa@gmail.com': 'Joel',
  'juliazin182@gmail.com': 'Julia'
};
var DEFAULT_USER_ICONS = {
  'joaogabrielpabarbosa@gmail.com': '🐻',
  'juliazin182@gmail.com': '🐬'
};

var sheetGrid = null;
var media = [];
var sessions = [];
var curTab = 'lib';
var detailId = null;
var editSessionRow = null;
var sessHistOpen = false;
var searchTimer = null;
var searchMode = 'screen';
var posterCache = {};
var addBusy = {};

var LIB_FILTERS_KEY = 'jb_pr_lib_filters';
var LIB_SORT_KEY = 'jb_pr_lib_sort';
var MEDIA_FILTER_TYPES = [
  { id: 'movie', label: 'Filmes', icon: '🎬' },
  { id: 'tv', label: 'Séries', icon: '📺' },
  { id: 'game', label: 'Jogos', icon: '🎮' },
  { id: 'music', label: 'Música', icon: '🎵' }
];
var libFilters = { movie: true, tv: true, game: true, music: true };
var libSort = 'recent';

function esc(s) {
  return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
function attrEsc(s) {
  return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/"/g, '&quot;');
}
function userLabel(em) { return USER_NAMES[(em || '').toLowerCase()] || (em || '').split('@')[0] || '?'; }

function userIconKey(em) {
  return 'jb_pr_icon_' + String(em || '').toLowerCase().replace(/[^a-z0-9@._-]/g, '');
}

function getUserIcon(em) {
  em = (em || '').toLowerCase();
  try {
    var saved = localStorage.getItem(userIconKey(em));
    if (saved) return saved.slice(0, 8);
  } catch (_) {}
  return DEFAULT_USER_ICONS[em] || '👤';
}

function setUserIcon(em, icon) {
  try {
    var val = String(icon || '').trim().slice(0, 8);
    if (val) localStorage.setItem(userIconKey(em), val);
    else localStorage.removeItem(userIconKey(em));
  } catch (_) {}
}

function userIconHtml(em) {
  return '<span class="shelf-uicon" aria-hidden="true">' + esc(getUserIcon(em)) + '</span>';
}
function julioelAllowed() { return JULIOEL_EMAILS.indexOf((JB.email() || '').toLowerCase()) > -1; }
function julioelUnlocked() { try { return localStorage.getItem('jb_julioel') === '1'; } catch (_) { return false; } }
function julioelOk() { return JB.isSignedIn() && julioelAllowed() && julioelUnlocked(); }
function tmdbKey() { return window.JB_TMDB_KEY || ''; }
function gamesUrl(params) {
  var qs = new URLSearchParams(params || {});
  return '/api/games?' + qs.toString();
}
function gamesFetch(params) {
  return fetch(gamesUrl(params)).then(function (r) {
    if (!r.ok) throw new Error('games-' + r.status);
    return r.json();
  });
}
function musicUrl(params) {
  var qs = new URLSearchParams(params || {});
  return '/api/music?' + qs.toString();
}
function musicFetch(params) {
  return fetch(musicUrl(params)).then(function (r) {
    if (!r.ok) throw new Error('music-' + r.status);
    return r.json();
  });
}
function isCatalogGameId(id) { return /^\d+$/.test(String(id || '')); }
function isCatalogMusicId(id) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(id || ''));
}
function parseSheetIdInput(raw) {
  raw = String(raw || '').trim();
  if (!raw) return '';
  var m = raw.match(/\/spreadsheets\/([a-zA-Z0-9_-]{20,})/);
  if (m) return m[1];
  if (/^[a-zA-Z0-9_-]{20,}$/.test(raw)) return raw;
  m = raw.match(/[a-zA-Z0-9_-]{30,}/);
  return m ? m[0] : '';
}
function sheetAccessErr(e) {
  var m = String((e && e.message) || '');
  var hm = m.match(/HTTP (\d+)/);
  var st = hm ? +hm[1] : 0;
  if (st === 403 || m.indexOf('403') > -1) return 'Sem acesso a esta planilha. Peça pro Joel compartilhar com ' + (JB.email() || 'você') + ' como Editor.';
  if (st === 404 || m.indexOf('404') > -1) return 'Planilha não encontrada. Confira o link ou ID.';
  return m || 'Erro ao abrir planilha';
}
function ssUrl(p) { return 'https://sheets.googleapis.com/v4/spreadsheets/' + JB.getSheetId(APP) + p; }

function todayISO() {
  var d = new Date();
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}
function parseSheetDate(s) {
  s = String(s || '').trim();
  if (!s) return '';
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  var m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (m) return m[3] + '-' + String(m[2]).padStart(2, '0') + '-' + String(m[1]).padStart(2, '0');
  return s;
}
function mediaKey(type, id) { return type + ':' + id; }
function parseMediaId(raw) {
  var s = String(raw || '');
  if (s.indexOf('tv:') === 0) return { type: 'tv', id: s.slice(3), key: s };
  if (s.indexOf('movie:') === 0) return { type: 'movie', id: s.slice(6), key: s };
  if (s.indexOf('game:') === 0) return { type: 'game', id: s.slice(5), key: s };
  if (s.indexOf('music:') === 0) return { type: 'music', id: s.slice(6), key: s };
  return { type: 'movie', id: s, key: 'movie:' + s };
}
function typeIcon(type) {
  if (type === 'tv') return '📺';
  if (type === 'game') return '🎮';
  if (type === 'music') return '🎵';
  return '🎬';
}
function typeLabel(type) {
  if (type === 'tv') return 'Série';
  if (type === 'game') return 'Jogo';
  if (type === 'music') return 'Música';
  return 'Filme';
}

/** Movies-style poster URL — keep this dead simple. */
function tmdbPosterSrc(path) {
  path = String(path || '').trim();
  if (!path) return '';
  if (path.indexOf('http://') === 0 || path.indexOf('https://') === 0) return path;
  if (path.indexOf('//') === 0) return 'https:' + path;
  return TMDB_IMG + (path.charAt(0) === '/' ? path : '/' + path);
}

function posterPathFor(m) {
  if (!m) return '';
  return posterCache[m.key] || m.poster || '';
}

function posterVisual(path, icon) {
  var u = tmdbPosterSrc(path);
  if (!u) return '<span class="ph">' + icon + '</span>';
  return '<span class="poster-bg" style="background-image:url(\'' + u.replace(/\\/g, '\\\\').replace(/'/g, "\\'") + '\')"></span>';
}

function libraryMedia() {
  var seen = {};
  return media.filter(function (m) {
    if (!sessionsFor(m.key).length || seen[m.key]) return false;
    seen[m.key] = true;
    return true;
  });
}

function loadLibPrefs() {
  try {
    var f = localStorage.getItem(LIB_FILTERS_KEY);
    if (f) {
      var parsed = JSON.parse(f);
      MEDIA_FILTER_TYPES.forEach(function (t) {
        if (!t.soon && parsed[t.id] != null) libFilters[t.id] = !!parsed[t.id];
      });
    }
    var s = localStorage.getItem(LIB_SORT_KEY);
    if (s) libSort = s;
  } catch (_) {}
}

function saveLibPrefs() {
  try {
    localStorage.setItem(LIB_FILTERS_KEY, JSON.stringify(libFilters));
    localStorage.setItem(LIB_SORT_KEY, libSort);
  } catch (_) {}
}

function activeLibFilterTypes() {
  var active = MEDIA_FILTER_TYPES.filter(function (t) {
    return !t.soon && libFilters[t.id];
  }).map(function (t) { return t.id; });
  if (!active.length) {
    return MEDIA_FILTER_TYPES.filter(function (t) { return !t.soon; }).map(function (t) { return t.id; });
  }
  return active;
}

function filteredLibraryMedia() {
  var allowed = activeLibFilterTypes();
  return libraryMedia().filter(function (m) { return allowed.indexOf(m.type) >= 0; });
}

function mediaRatingScore(m) {
  var byUser = latestStarsByUser(m.key);
  var nums = JULIOEL_EMAILS.map(function (em) {
    var s = byUser[em];
    return s && s.stars ? s.stars : 0;
  }).filter(function (n) { return n > 0; });
  if (!nums.length) return 0;
  return nums.reduce(function (a, b) { return a + b; }, 0) / nums.length;
}

function jlboSortRank(m) {
  var st = jlboShelfState(m);
  if (st === 'full') return 2;
  if (st !== 'none') return 1;
  return 0;
}

function sortedFilteredMedia() {
  var list = filteredLibraryMedia().slice();
  var cmpTitle = function (a, b) {
    return String(a.title || '').localeCompare(String(b.title || ''), 'pt', { sensitivity: 'base' });
  };
  if (libSort === 'alpha') return list.sort(function (a, b) { return cmpTitle(a, b); });
  if (libSort === 'alpha-desc') return list.sort(function (a, b) { return cmpTitle(b, a); });
  if (libSort === 'rating') {
    return list.sort(function (a, b) {
      return mediaRatingScore(b) - mediaRatingScore(a) || cmpTitle(a, b);
    });
  }
  if (libSort === 'type') {
    return list.sort(function (a, b) {
      var ta = typeLabel(a.type), tb = typeLabel(b.type);
      if (ta !== tb) return ta.localeCompare(tb, 'pt');
      return cmpTitle(a, b);
    });
  }
  if (libSort === 'year') {
    return list.sort(function (a, b) {
      return String(b.year || '').localeCompare(String(a.year || '')) || cmpTitle(a, b);
    });
  }
  if (libSort === 'year-asc') {
    return list.sort(function (a, b) {
      return String(a.year || '').localeCompare(String(b.year || '')) || cmpTitle(a, b);
    });
  }
  if (libSort === 'added') {
    return list.sort(function (a, b) {
      return String(b.added || '').localeCompare(String(a.added || '')) || cmpTitle(a, b);
    });
  }
  if (libSort === 'jlbo') {
    return list.sort(function (a, b) {
      return jlboSortRank(b) - jlboSortRank(a) || cmpTitle(a, b);
    });
  }
  return list.sort(function (a, b) {
    var la = latestSession(a.key), lb = latestSession(b.key);
    if (la && lb) return String(lb.date).localeCompare(String(la.date));
    if (la) return -1;
    if (lb) return 1;
    return String(b.added || '').localeCompare(String(a.added || ''));
  });
}

function libToolbarHtml() {
  var chips = MEDIA_FILTER_TYPES.map(function (t) {
    var on = !t.soon && libFilters[t.id];
    var cls = 'lib-chip' + (on ? ' on' : '') + (t.soon ? ' soon' : '');
    var extra = t.soon ? ' disabled title="Em breve"' : (' onclick="toggleLibFilter(\'' + t.id + '\')"');
    return '<button type="button" class="' + cls + '" data-ft="' + t.id + '"' + extra + '>'
      + t.icon + ' ' + esc(t.label) + (t.soon ? ' <span class="lib-soon">em breve</span>' : '') + '</button>';
  }).join('');
  var sorts = [
    { id: 'recent', label: 'Último registro' },
    { id: 'alpha', label: 'A → Z' },
    { id: 'alpha-desc', label: 'Z → A' },
    { id: 'rating', label: 'Melhor avaliação' },
    { id: 'type', label: 'Tipo' },
    { id: 'year', label: 'Ano (novo → antigo)' },
    { id: 'year-asc', label: 'Ano (antigo → novo)' },
    { id: 'added', label: 'Adicionados recentemente' },
    { id: 'jlbo', label: 'JLBOE™ primeiro' }
  ];
  var opts = sorts.map(function (s) {
    return '<option value="' + s.id + '"' + (libSort === s.id ? ' selected' : '') + '>' + esc(s.label) + '</option>';
  }).join('');
  return '<div class="lib-toolbar">'
    + '<div class="lib-filters"><span class="lib-tb-label">Filtrar</span><div class="lib-chips">' + chips + '</div></div>'
    + '<div class="lib-sort"><label class="lib-tb-label" for="libSortSel">Ordenar</label>'
    + '<select class="field lib-sort-sel" id="libSortSel" onchange="setLibSort(this.value)">' + opts + '</select></div>'
    + '</div>';
}

function toggleLibFilter(type) {
  var meta = MEDIA_FILTER_TYPES.find(function (t) { return t.id === type; });
  if (!meta || meta.soon) return;
  libFilters[type] = !libFilters[type];
  saveLibPrefs();
  if (curTab === 'lib') renderMain();
}

function setLibSort(val) {
  libSort = val || 'recent';
  saveLibPrefs();
  if (curTab === 'lib') renderMain();
}
function lockAdd(id) {
  if (addBusy[id]) return false;
  addBusy[id] = true;
  return true;
}
function unlockAdd(id) { delete addBusy[id]; }
function onShelf(key) { return sessionsFor(key).length > 0; }

function gameId() {
  return 'g' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

function findGameByTitle(title) {
  var t = String(title || '').trim().toLowerCase();
  if (!t) return null;
  return media.find(function (m) { return m.type === 'game' && m.title.toLowerCase() === t; }) || null;
}

function findMusicByTitle(title) {
  var t = String(title || '').trim().toLowerCase();
  if (!t) return null;
  return media.find(function (m) { return m.type === 'music' && m.title.toLowerCase() === t; }) || null;
}

function setSearchMode(mode) {
  searchMode = mode === 'game' ? 'game' : (mode === 'music' ? 'music' : 'screen');
  renderMain();
}

function migrateAppKeys() {
  try {
    if (!localStorage.getItem('jb_sheet_' + APP) && localStorage.getItem('jb_sheet_movies')) {
      localStorage.setItem('jb_sheet_' + APP, localStorage.getItem('jb_sheet_movies'));
    }
    if (!localStorage.getItem('jb_skin_' + APP) && localStorage.getItem('jb_skin_movies')) {
      localStorage.setItem('jb_skin_' + APP, localStorage.getItem('jb_skin_movies'));
    }
  } catch (_) {}
}

function loadingHtml(h) { document.getElementById('loading').innerHTML = h; document.getElementById('loading').classList.remove('hidden'); document.getElementById('app').classList.add('hidden'); }
function showApp() { document.getElementById('loading').classList.add('hidden'); document.getElementById('app').classList.remove('hidden'); }
function gateHtml(title, sub, btn) {
  return '<div class="gate"><div class="gt">' + esc(title) + '</div><div class="gs">' + sub + '</div>' + (btn || '') + '</div>';
}
function isAuthErr(e) {
  var m = String((e && e.message) || '');
  return m.indexOf('silent_timeout') > -1 || m.indexOf('auth_failed') > -1 || m.indexOf('401') > -1
    || m.indexOf('cancelled') > -1 || m.indexOf('signed_out') > -1 || m.indexOf('silent_cooldown') > -1
    || m.indexOf('auth_cancelled') > -1 || m.indexOf('superseded') > -1;
}
function showAuthGate(msg) {
  loadingHtml(gateHtml(
    'Julioelboard Prateleira',
    msg || 'Sessão expirada. Entre de novo para continuar.',
    '<button class="btn-primary" onclick="prateleiraSignIn()">Entrar</button>'
      + '<a class="btn ghost" href="/" style="display:inline-block;text-decoration:none;margin-top:10px">← Hub</a>'
  ));
}

function whenTmdbReady(fn) {
  if (tmdbKey()) { fn(); return; }
  var n = 0;
  var t = setInterval(function () {
    if (tmdbKey() || ++n > 40) { clearInterval(t); fn(); }
  }, 25);
}

function boot() {
  migrateAppKeys();
  if (!julioelOk()) {
    if (!JB.isSignedIn()) {
      showAuthGate(JB.email() ? 'Sessão expirada. Entre de novo para continuar.' : 'Entre com Google para acessar a Prateleira.');
      return;
    }
    if (!julioelAllowed()) {
      loadingHtml(gateHtml('Julioelboard Prateleira', 'Este cantinho não é para você. 😄', '<a class="btn ghost" href="/" style="display:inline-block;text-decoration:none">← Hub</a>'));
      return;
    }
    loadingHtml(gateHtml('Julioelboard Prateleira', 'Volte ao Hub e clique no logo <b>Joelboard</b> para desbloquear.', '<a class="btn ghost" href="/" style="display:inline-block;text-decoration:none">← Hub</a>'));
    return;
  }
  document.getElementById('acctEmail').textContent = userLabel(JB.email());
  loadingHtml(JB.skeletonHtml('prateleira'));
  whenTmdbReady(function () {
    resolveSheet()
      .then(loadAll)
      .then(function () { showApp(); renderMain(); JB.watchSheet(APP, reloadAll); })
      .catch(handleBootErr);
  });
}

function handleBootErr(e) {
  var m = String((e && e.message) || '');
  if (isAuthErr(e)) {
    showAuthGate();
    return;
  }
  if (m === 'JB_NEED_SHEET') {
    loadingHtml(gateHtml('Julioelboard Prateleira', 'Crie ou vincule a planilha compartilhada (⚙ Ajustes).', '<button class="btn-primary" onclick="openPrateleiraSet()">Configurar planilha</button>'));
    return;
  }
  loadingHtml(gateHtml('Erro', esc(m), '<button class="btn ghost" onclick="boot()">Tentar de novo</button>'));
}

function resolveSheet() {
  var id = (JB.getSheetId(APP) || '').trim();
  if (!id && PRATELEIRA_SHARED_SHEET) {
    id = PRATELEIRA_SHARED_SHEET;
    JB.setSheetId(APP, id);
  }
  if (!id) return Promise.reject(new Error('JB_NEED_SHEET'));
  return JB.sheetTabs(id).then(function (grid) {
    return ensureTabs(grid).then(function (g) {
      sheetGrid = g;
      JB.setSheetId(APP, id);
      return ensureHeaders();
    });
  }).catch(function (e) {
    if (String((e && e.message) || '') === 'JB_NEED_SHEET') throw e;
    throw new Error(sheetAccessErr(e));
  });
}

function ensureTabs(grid) {
  grid = grid || {};
  var missing = ['Filmes', 'Assistidos'].filter(function (t) { return grid[t] == null; });
  if (!missing.length) return Promise.resolve(grid);
  return JB.api('POST', ssUrl(':batchUpdate'), {
    requests: missing.map(function (title) { return { addSheet: { properties: { title: title } } }; })
  }).then(function (res) {
    (res.replies || []).forEach(function (rep) {
      if (rep && rep.addSheet) grid[rep.addSheet.properties.title] = rep.addSheet.properties.sheetId;
    });
    return grid;
  });
}

function ensureHeaders() {
  return JB.api('POST', ssUrl('/values:batchUpdate'), {
    valueInputOption: 'RAW',
    data: [
      { range: 'Filmes!A1:H1', values: [['ID', 'Tipo', 'Título', 'Ano', 'Poster', 'Adicionado', 'JLBOE Joel', 'JLBOE Julia']] },
      { range: 'Assistidos!A1:E1', values: [['Data', 'MediaID', 'Email', 'Estrelas', 'Resenha']] }
    ]
  }).catch(function () {});
}

function loadAll() {
  posterCache = {};
  return Promise.all([
    JB.api('GET', ssUrl('/values/' + encodeURIComponent('Filmes') + '?valueRenderOption=FORMATTED_VALUE')),
    JB.api('GET', ssUrl('/values/' + encodeURIComponent('Assistidos') + '?valueRenderOption=FORMATTED_VALUE')).catch(function () { return { values: [] }; }),
    JB.api('GET', ssUrl('/values/' + encodeURIComponent('Avaliacoes') + '?valueRenderOption=FORMATTED_VALUE')).catch(function () { return { values: [] }; })
  ]).then(function (res) {
    media = parseMedia(res[0].values || []);
    sessions = parseSessions(res[1].values || []);
    return migrateLegacyRatings(res[2].values || []);
  }).then(function () {
    return migrateSessionJboeToMedia();
  }).then(function () {
    return refreshAllPosters();
  });
}

function parseLegacyRatings(rows) {
  var out = [];
  for (var i = 1; i < rows.length; i++) {
    var r = rows[i] || [];
    if (!r[0]) continue;
    var parsed = parseMediaId(r[0]);
    out.push({
      mediaId: parsed.key,
      email: String(r[1] || '').toLowerCase(),
      stars: parseInt(r[2], 10) || 0,
      review: String(r[3] || ''),
      updated: parseSheetDate(r[4] || ''),
      sheetRow: i + 1
    });
  }
  return out;
}

function legacyMigrateKey() {
  return 'jb_pr_av_migrated_' + (JB.getSheetId(APP) || '');
}

function markLegacyMigrated() {
  try { localStorage.setItem(legacyMigrateKey(), '1'); } catch (_) {}
}

function legacyAlreadyMigrated() {
  try { return localStorage.getItem(legacyMigrateKey()) === '1'; } catch (_) { return false; }
}

function deleteSheetRows(tab, rowNums) {
  if (!sheetGrid || sheetGrid[tab] == null || !rowNums.length) return Promise.resolve();
  var reqs = rowNums.slice().sort(function (a, b) { return b - a; }).map(function (row) {
    return { deleteDimension: { range: { sheetId: sheetGrid[tab], dimension: 'ROWS', startIndex: row - 1, endIndex: row } } };
  });
  return JB.api('POST', ssUrl(':batchUpdate'), { requests: reqs });
}

function migrateLegacyRatings(avaliacoesRows) {
  if (legacyAlreadyMigrated()) return Promise.resolve();
  var legacy = parseLegacyRatings(avaliacoesRows || []);
  if (!legacy.length) { markLegacyMigrated(); return Promise.resolve(); }
  var toAppend = [];
  var avRowsToDelete = [];
  legacy.forEach(function (rt) {
    if (!rt.stars && !rt.review) return;
    var has = sessions.some(function (s) {
      return s.mediaId === rt.mediaId && s.email === rt.email && (s.stars || s.review);
    });
    if (has) return;
    toAppend.push([rt.updated || todayISO(), rt.mediaId, rt.email, String(rt.stars || ''), rt.review || '']);
    if (rt.sheetRow) avRowsToDelete.push(rt.sheetRow);
  });
  if (!toAppend.length) {
    var staleAv = legacy.map(function (rt) { return rt.sheetRow; }).filter(Boolean);
    return deleteSheetRows('Avaliacoes', staleAv).then(function () { markLegacyMigrated(); });
  }
  return JB.api('POST', ssUrl('/values/' + encodeURIComponent('Assistidos') + ':append?valueInputOption=RAW&insertDataOption=INSERT_ROWS'), { values: toAppend })
    .then(function () { return deleteSheetRows('Avaliacoes', avRowsToDelete); })
    .then(function () {
      return JB.api('GET', ssUrl('/values/' + encodeURIComponent('Assistidos') + '?valueRenderOption=FORMATTED_VALUE'));
    })
    .then(function (res) {
      sessions = parseSessions(res.values || []);
      markLegacyMigrated();
    });
}

function refreshAllPosters() {
  var todo = media.filter(function (m) {
    if (m.type === 'game') return isCatalogGameId(parseMediaId(m.key).id);
    if (m.type === 'music') return isCatalogMusicId(parseMediaId(m.key).id);
    return !!tmdbKey();
  });
  if (!todo.length) return Promise.resolve();
  return todo.reduce(function (chain, m) {
    return chain.then(function () {
      if (m.type === 'game') return fetchPosterFromCatalog(m);
      if (m.type === 'music') return fetchPosterFromMusic(m);
      return fetchPosterFromTmdb(m);
    });
  }, Promise.resolve());
}

function fetchPosterFromCatalog(m) {
  var parsed = parseMediaId(m.key);
  if (parsed.type !== 'game' || !isCatalogGameId(parsed.id)) return Promise.resolve();
  return gamesFetch({ game: parsed.id })
    .then(function (item) {
      var poster = item.background_image || '';
      if (!poster) return;
      m.poster = poster;
      posterCache[m.key] = poster;
      if (!m.sheetRow) return;
      var col = m.layout === 'new' ? 'E' : 'D';
      return JB.api('PUT', ssUrl('/values/' + encodeURIComponent('Filmes!' + col + m.sheetRow) + '?valueInputOption=RAW'), { values: [[poster]] });
    })
    .catch(function () {});
}

function fetchPosterFromMusic(m) {
  var parsed = parseMediaId(m.key);
  if (parsed.type !== 'music' || !isCatalogMusicId(parsed.id)) return Promise.resolve();
  return musicFetch({ album: parsed.id })
    .then(function (item) {
      var poster = item.cover || '';
      if (!poster) return;
      m.poster = poster;
      posterCache[m.key] = poster;
      if (!m.sheetRow) return;
      var col = m.layout === 'new' ? 'E' : 'D';
      return JB.api('PUT', ssUrl('/values/' + encodeURIComponent('Filmes!' + col + m.sheetRow) + '?valueInputOption=RAW'), { values: [[poster]] });
    })
    .catch(function () {});
}

function fetchPosterFromTmdb(m) {
  var parsed = parseMediaId(m.key);
  if (parsed.type === 'game' || parsed.type === 'music') return Promise.resolve();
  var apiPath = parsed.type === 'tv' ? ('/tv/' + parsed.id) : ('/movie/' + parsed.id);
  return fetch('https://api.themoviedb.org/3' + apiPath + '?api_key=' + encodeURIComponent(tmdbKey()) + '&language=pt-BR')
    .then(function (r) { return r.json(); })
    .then(function (item) {
      if (!item.poster_path) return;
      m.poster = item.poster_path;
      posterCache[m.key] = item.poster_path;
      if (!m.sheetRow) return;
      var col = m.layout === 'new' ? 'E' : 'D';
      return JB.api('PUT', ssUrl('/values/' + encodeURIComponent('Filmes!' + col + m.sheetRow) + '?valueInputOption=RAW'), { values: [[item.poster_path]] });
    })
    .catch(function () {});
}

function reloadAll() {
  return loadAll().then(function () {
    renderMain();
    if (detailId && !media.find(function (m) { return m.key === String(detailId); })) closeDetail();
    else if (detailId) openDetail(detailId);
  }).catch(function (e) {
    if (isAuthErr(e)) showAuthGate();
    else JB.toast('Erro ao atualizar: ' + (e.message || ''));
  });
}

function jlboEmailCol(em) {
  if (em === JULIOEL_EMAILS[0]) return 'G';
  if (em === JULIOEL_EMAILS[1]) return 'H';
  return null;
}

function parseMedia(rows) {
  var out = [];
  var header = rows[0] || [];
  var hasTipoCol = String(header[1] || '').toLowerCase() === 'tipo';
  var hasJlboCols = String(header[6] || '').toLowerCase().indexOf('jlbo') >= 0;
  for (var i = 1; i < rows.length; i++) {
    var r = rows[i] || [];
    if (!r[0]) continue;
    var useNew = hasTipoCol && (r[1] === 'Filme' || r[1] === 'Série' || r[1] === 'Jogo' || r[1] === 'Música');
    if (useNew) {
      var typeN = r[1] === 'Série' ? 'tv' : (r[1] === 'Jogo' ? 'game' : (r[1] === 'Música' ? 'music' : 'movie'));
      var jlbo = {};
      if (hasJlboCols) {
        jlbo[JULIOEL_EMAILS[0]] = jlboTruthy(r[6]);
        jlbo[JULIOEL_EMAILS[1]] = jlboTruthy(r[7]);
      }
      out.push({
        key: String(r[0]), type: typeN, title: String(r[2] || ''), year: String(r[3] || ''),
        poster: String(r[4] || ''), added: String(r[5] || ''), jlbo: jlbo, sheetRow: i + 1, layout: 'new'
      });
    } else {
      var parsed = parseMediaId(r[0]);
      out.push({
        key: parsed.key, type: parsed.type, title: String(r[1] || ''), year: String(r[2] || ''),
        poster: String(r[3] || ''), added: String(r[4] || ''), jlbo: {}, sheetRow: i + 1, layout: 'old'
      });
    }
  }
  return out;
}

function jlboTruthy(v) {
  var s = String(v == null ? '' : v).trim().toLowerCase();
  return s === '1' || s === 'sim' || s === 'true' || s === 'yes' || s === 'jboe' || s === '✓';
}

function parseSessions(rows) {
  var out = [];
  var header = rows[0] || [];
  var h3 = String(header[3] || '').toLowerCase();
  var hasStarsCol = h3 === 'estrelas';
  var legacyNote = h3 === 'nota';
  var hasJboeCol = String(header[5] || '').toLowerCase() === 'jboe';
  for (var i = 1; i < rows.length; i++) {
    var r = rows[i] || [];
    if (!r[0] || !r[1]) continue;
    var parsed = parseMediaId(r[1]);
    out.push({
      date: parseSheetDate(r[0]),
      mediaId: parsed.key,
      email: String(r[2] || '').toLowerCase(),
      stars: hasStarsCol ? (parseInt(r[3], 10) || 0) : 0,
      review: hasStarsCol ? String(r[4] || '') : (legacyNote ? String(r[3] || '') : String(r[4] || '')),
      legacyJboe: hasJboeCol ? jlboTruthy(r[5]) : false,
      sheetRow: i + 1
    });
  }
  return out;
}

function sessionJboeMigrateKey() {
  return 'jb_pr_jlbo_migrated_' + (JB.getSheetId(APP) || '');
}

function markSessionJboeMigrated() {
  try { localStorage.setItem(sessionJboeMigrateKey(), '1'); } catch (_) {}
}

function sessionJboeAlreadyMigrated() {
  try { return localStorage.getItem(sessionJboeMigrateKey()) === '1'; } catch (_) { return false; }
}

function migrateSessionJboeToMedia() {
  if (sessionJboeAlreadyMigrated()) return Promise.resolve();
  var updates = [];
  media.forEach(function (m) {
    if (m.layout !== 'new' || !m.sheetRow) return;
    JULIOEL_EMAILS.forEach(function (em) {
      if (m.jlbo && m.jlbo[em]) return;
      var stamped = sessions.some(function (s) {
        return s.mediaId === m.key && s.email === em && s.legacyJboe;
      });
      if (!stamped) return;
      var col = jlboEmailCol(em);
      if (!col) return;
      if (!m.jlbo) m.jlbo = {};
      m.jlbo[em] = true;
      updates.push(
        JB.api('PUT', ssUrl('/values/' + encodeURIComponent('Filmes!' + col + m.sheetRow) + '?valueInputOption=RAW'), { values: [['1']] })
      );
    });
  });
  if (!updates.length) {
    markSessionJboeMigrated();
    return Promise.resolve();
  }
  return Promise.all(updates).then(function () { markSessionJboeMigrated(); });
}

function userHasJlbo(m, em) {
  return !!(m && m.jlbo && m.jlbo[(em || '').toLowerCase()]);
}

function mediaHasFullJlbo(mediaId) {
  var m = media.find(function (x) { return x.key === String(mediaId); });
  if (!m) return false;
  return JULIOEL_EMAILS.every(function (em) { return userHasJlbo(m, em); });
}

function jlboShelfState(m) {
  var joel = userHasJlbo(m, JULIOEL_EMAILS[0]);
  var julia = userHasJlbo(m, JULIOEL_EMAILS[1]);
  if (joel && julia) return 'full';
  if (joel) return 'half-joel';
  if (julia) return 'half-julia';
  return 'none';
}

function jlboCornerHtml(state) {
  if (!state || state === 'none') return '';
  var cls = 'shelf-jlbo-corner';
  if (state === 'full') cls += ' full';
  else cls += ' half ' + state;
  return '<span class="' + cls + '">' + jlboSealHtml() + '</span>';
}

function userCanStampMedia(m, em) {
  var s = latestStarsByUser(m.key)[(em || '').toLowerCase()];
  return !!(s && s.stars === 5);
}

function updateMediaJlbo(mediaId, em, on) {
  var m = media.find(function (x) { return x.key === String(mediaId); });
  if (!m || m.layout !== 'new' || !m.sheetRow) return Promise.resolve();
  var col = jlboEmailCol(em);
  if (!col) return Promise.resolve();
  if (!m.jlbo) m.jlbo = {};
  m.jlbo[em] = !!on;
  return JB.api('PUT', ssUrl('/values/' + encodeURIComponent('Filmes!' + col + m.sheetRow) + '?valueInputOption=RAW'), { values: [[on ? '1' : '']] });
}

function sessionsFor(mediaId) {
  return sessions.filter(function (s) { return s.mediaId === String(mediaId); }).sort(function (a, b) {
    return String(b.date).localeCompare(String(a.date));
  });
}

function latestSession(mediaId) {
  var list = sessionsFor(mediaId);
  return list.length ? list[0] : null;
}

function latestStarsByUser(mediaId) {
  var map = {};
  sessionsFor(mediaId).forEach(function (s) {
    if (!map[s.email]) map[s.email] = s;
  });
  return map;
}

function sessionByRow(sheetRow) {
  return sessions.find(function (s) { return s.sheetRow === sheetRow; });
}

function sortedMedia() {
  return sortedFilteredMedia();
}

function jlboSealHtml(title) {
  return '<span class="jlbo-stamp" title="' + attrEsc(title || 'Julioel Brand Of Excellence™') + '"><span class="jlbo-jl">JL</span><span class="jlbo-tm">™</span></span>';
}

function starsHtml(n, showJlbo) {
  n = Math.max(0, Math.min(5, n | 0));
  var h = '';
  for (var i = 1; i <= 5; i++) h += '<span class="mstar' + (i <= n ? ' on' : '') + '">★</span>';
  if (showJlbo) h += jlboSealHtml();
  return h;
}

var SHELF_PER_ROW = 7;

function shelfTilt(i) {
  return ((i * 17 + 3) % 7) - 3;
}

function shelfFootHtml(m) {
  var byUser = latestStarsByUser(m.key);
  var rows = JULIOEL_EMAILS.map(function (em) {
    var s = byUser[em];
    if (!s || !s.stars) return '';
    return '<div class="shelf-foot-row">' + userIconHtml(em) + '<span class="shelf-foot-stars">' + starsHtml(s.stars) + '</span></div>';
  }).join('');
  return rows ? '<div class="shelf-foot">' + rows + '</div>' : '';
}

function shelfItemHtml(m, idx) {
  var byUser = latestStarsByUser(m.key);
  var latest = latestSession(m.key);
  var jlboState = jlboShelfState(m);
  var starsMini = JULIOEL_EMAILS.map(function (em) {
    var s = byUser[em];
    if (!s || !s.stars) return '';
    return '<span class="shelf-who"><span class="shelf-who-name">' + esc(userLabel(em)) + '</span>' + starsHtml(s.stars) + '</span>';
  }).join('');
  var hover = '';
  if (latest || starsMini) {
    hover = '<div class="shelf-hover">'
      + (latest ? '<span class="shelf-date">' + esc(JB.fmtDate(latest.date)) + '</span>' : '')
      + (starsMini ? '<div class="shelf-ratings">' + starsMini + '</div>' : '')
      + '</div>';
  }
  return '<div class="shelf-item' + (jlboState === 'full' ? ' jlbo-glow' : '') + (m.type === 'game' ? ' is-game' : '') + '"'
    + ' style="--tilt:' + shelfTilt(idx) + 'deg;--si:' + idx + '" data-key="' + attrEsc(m.key) + '" onclick="openDetail(this.dataset.key)">'
    + hover
    + '<div class="shelf-tilt"><div class="shelf-cover' + (jlboState !== 'none' ? ' has-jlbo' : '') + '">' + posterVisual(posterPathFor(m), typeIcon(m.type))
    + '<span class="mbadge">' + typeIcon(m.type) + '</span>'
    + jlboCornerHtml(jlboState)
    + '</div></div>'
    + '<div class="shelf-meta"><div class="shelf-label"><span class="shelf-title">' + esc(m.title) + '</span>'
    + (m.year ? '<span class="shelf-year">' + esc(m.year) + '</span>' : '')
    + '</div>' + shelfFootHtml(m) + '</div></div>';
}

function renderShelfStack(items) {
  var html = '<div class="shelf-stack">';
  for (var i = 0; i < items.length; i += SHELF_PER_ROW) {
    var chunk = items.slice(i, i + SHELF_PER_ROW);
    html += '<div class="shelf-row"><div class="shelf-stage"><div class="shelf-items" style="--shelf-cols:' + chunk.length + '">';
    chunk.forEach(function (m, j) { html += shelfItemHtml(m, i + j); });
    html += '</div><div class="shelf-plank" aria-hidden="true"></div></div></div>';
  }
  return html + '</div>';
}

function renderMain() {
  var el = document.getElementById('main');
  if (curTab === 'search') {
    var pills = '<div class="search-modes"><button type="button" class="smode' + (searchMode === 'screen' ? ' on' : '') + '" onclick="setSearchMode(\'screen\')">Filmes & séries</button>'
      + '<button type="button" class="smode' + (searchMode === 'game' ? ' on' : '') + '" onclick="setSearchMode(\'game\')">Jogos</button>'
      + '<button type="button" class="smode' + (searchMode === 'music' ? ' on' : '') + '" onclick="setSearchMode(\'music\')">Música</button></div>';
    if (searchMode === 'game') {
      el.innerHTML = pills
        + '<div class="searchbar"><input type="search" id="gameSearch" placeholder="Buscar jogo no catálogo…" autocomplete="off"></div>'
        + '<div class="game-add-row"><input class="field" id="gameYear" placeholder="Ano (só ao adicionar manual)" inputmode="numeric" maxlength="4"></div>'
        + '<div id="searchOut"><div class="empty">Digite para buscar no catálogo.</div></div>';
      var ginp = document.getElementById('gameSearch');
      ginp.oninput = function () {
        clearTimeout(searchTimer);
        searchTimer = setTimeout(function () { runGameSearch(ginp.value); }, 200);
      };
      if (JB.searchFocus) JB.searchFocus(ginp);
      return;
    }
    if (searchMode === 'music') {
      el.innerHTML = pills
        + '<div class="searchbar"><input type="search" id="musicSearch" placeholder="Buscar álbum no MusicBrainz…" autocomplete="off"></div>'
        + '<div class="game-add-row"><input class="field" id="musicYear" placeholder="Ano (só ao adicionar manual)" inputmode="numeric" maxlength="4"></div>'
        + '<div id="searchOut"><div class="empty">Digite para buscar no catálogo.</div></div>';
      var minp = document.getElementById('musicSearch');
      minp.oninput = function () {
        clearTimeout(searchTimer);
        searchTimer = setTimeout(function () { runMusicSearch(minp.value); }, 350);
      };
      if (JB.searchFocus) JB.searchFocus(minp);
      return;
    }
    el.innerHTML = pills
      + '<div class="searchbar"><input type="search" id="mvSearch" placeholder="Buscar filme ou série…" autocomplete="off"></div>'
      + '<div id="searchOut"><div class="empty">Digite para buscar no catálogo.</div></div>';
    var inp = document.getElementById('mvSearch');
    inp.oninput = function () {
      clearTimeout(searchTimer);
      searchTimer = setTimeout(function () { runSearch(inp.value); }, 350);
    };
    if (JB.searchFocus) JB.searchFocus(inp);
    return;
  }
  if (!libraryMedia().length) {
    el.innerHTML = JB.emptyState({ icon: '📚', title: 'Prateleira vazia', body: 'Busque filmes, séries, jogos ou álbuns e registrem quando assistirem/jogarem/ouvirem.', btn: 'Buscar', onclick: 'prateleiraTab(\'search\')' });
    return;
  }
  var items = sortedFilteredMedia();
  var body = items.length
    ? renderShelfStack(items)
    : '<div class="empty">Nada neste filtro — ligue outro tipo acima.</div>';
  el.innerHTML = libToolbarHtml() + body;
}

function prateleiraTab(tab) {
  curTab = tab;
  document.querySelectorAll('#mainTabs .tab').forEach(function (b) { b.classList.toggle('on', b.getAttribute('data-tab') === tab); });
  renderMain();
}

function runSearch(q) {
  var out = document.getElementById('searchOut');
  q = (q || '').trim();
  if (!q) { out.innerHTML = '<div class="empty">Digite para buscar no catálogo.</div>'; return; }
  if (!tmdbKey()) { out.innerHTML = '<div class="empty">Chave TMDb não configurada (VITE_TMDB_API_KEY).</div>'; return; }
  out.innerHTML = '<div class="empty">Buscando…</div>';
  fetch('https://api.themoviedb.org/3/search/multi?api_key=' + encodeURIComponent(tmdbKey()) + '&language=pt-BR&query=' + encodeURIComponent(q))
    .then(function (r) { return r.json(); })
    .then(function (data) {
      var list = (data.results || []).filter(function (x) { return x.media_type === 'movie' || x.media_type === 'tv'; });
      if (!list.length) { out.innerHTML = '<div class="empty">Nada encontrado.</div>'; return; }
      out.innerHTML = '<div class="sresults">' + list.slice(0, 14).map(function (item) {
        var type = item.media_type === 'tv' ? 'tv' : 'movie';
        var key = mediaKey(type, item.id);
        var inSheet = media.some(function (x) { return x.key === key; });
        var shelf = onShelf(key);
        var title = type === 'tv' ? (item.name || '') : (item.title || '');
        var year = String((type === 'tv' ? item.first_air_date : item.release_date) || '').slice(0, 4) || '—';
        var tag = shelf ? ' · na prateleira' : (inSheet ? ' · registrar' : '');
        return '<div class="srow" onclick="addFromTmdb(\'' + type + '\',' + item.id + ')">'
          + '<div class="sposter">' + posterVisual(item.poster_path || '', typeIcon(type)) + '</div>'
          + '<div class="info"><div class="t">' + esc(title) + '</div><div class="y">'
          + esc(typeLabel(type)) + ' · ' + esc(year) + tag + '</div></div></div>';
      }).join('') + '</div>';
    })
    .catch(function () { out.innerHTML = '<div class="empty">Erro na busca.</div>'; });
}

function gameSearchRowHtml(m) {
  var tag = onShelf(m.key) ? ' · na prateleira' : ' · registrar';
  return '<div class="srow" data-key="' + attrEsc(m.key) + '" onclick="openDetail(this.dataset.key)">'
    + '<div class="sposter">' + posterVisual(posterPathFor(m), '🎮') + '</div>'
    + '<div class="info"><div class="t">' + esc(m.title) + '</div><div class="y">Jogo' + (m.year ? ' · ' + esc(m.year) : '') + tag + '</div></div></div>';
}

function runGameSearch(q) {
  var out = document.getElementById('searchOut');
  q = (q || '').trim();
  var ql = q.toLowerCase();
  var local = media.filter(function (m) {
    return m.type === 'game' && (!ql || m.title.toLowerCase().indexOf(ql) >= 0);
  });
  if (!q) {
    if (local.length) {
      out.innerHTML = '<div class="sresults">' + local.map(gameSearchRowHtml).join('') + '</div>';
    } else {
      out.innerHTML = '<div class="empty">Digite para buscar no catálogo.</div>';
    }
    return;
  }
  out.innerHTML = '<div class="empty">Buscando…</div>';
  gamesFetch({ search: q, page_size: '14' })
    .then(function (data) {
      var list = data.results || [];
      var html = '';
      if (local.length) {
        html += '<div class="sresults">' + local.map(gameSearchRowHtml).join('') + '</div>';
      }
      if (list.length) {
        html += '<div class="sresults">' + list.map(function (item) {
          var key = mediaKey('game', item.id);
          var inSheet = media.some(function (x) { return x.key === key; });
          var shelf = onShelf(key);
          var year = String(item.released || '').slice(0, 4) || '—';
          var tag = shelf ? ' · na prateleira' : (inSheet ? ' · registrar' : '');
          var poster = item.background_image || '';
          return '<div class="srow" onclick="addFromCatalog(' + item.id + ')">'
            + '<div class="sposter">' + posterVisual(poster, '🎮') + '</div>'
            + '<div class="info"><div class="t">' + esc(item.name || '') + '</div><div class="y">Jogo · ' + esc(year) + tag + '</div></div></div>';
        }).join('') + '</div>';
      } else if (!local.length) {
        html += '<div class="empty">Nada encontrado no catálogo.</div>';
      }
      if (!findGameByTitle(q) && !list.some(function (item) { return String(item.name || '').trim().toLowerCase() === ql; })) {
        html += '<button type="button" class="btn-primary game-add-btn" onclick="addManualGame()">+ Adicionar manualmente “' + esc(q) + '”</button>';
      }
      out.innerHTML = html || '<div class="empty">Nada encontrado.</div>';
    })
    .catch(function () {
      var html = '';
      if (local.length) {
        html += '<div class="sresults">' + local.map(gameSearchRowHtml).join('') + '</div>';
      } else {
        html += '<div class="empty">Catálogo indisponível — adicione manualmente.</div>';
      }
      if (!findGameByTitle(q)) {
        html += '<button type="button" class="btn-primary game-add-btn" onclick="addManualGame()">+ Adicionar “' + esc(q) + '”</button>';
      }
      out.innerHTML = html;
    });
}

function addFromCatalog(catalogId) {
  var key = mediaKey('game', catalogId);
  if (media.some(function (m) { return m.key === key; })) {
    openDetail(key);
    return;
  }
  if (!lockAdd(key)) return;
  gamesFetch({ game: String(catalogId) })
    .then(function (item) {
      if (media.some(function (m) { return m.key === key; })) {
        openDetail(key);
        return;
      }
      var title = item.name || '';
      var year = String(item.released || '').slice(0, 4);
      var poster = item.background_image || '';
      if (poster) posterCache[key] = poster;
      var row = [key, 'Jogo', title, year, poster, JB.fmtDate(new Date())];
      return JB.api('POST', ssUrl('/values/' + encodeURIComponent('Filmes') + ':append?valueInputOption=RAW&insertDataOption=INSERT_ROWS'), { values: [row] })
        .then(function () { return loadAll(); })
        .then(function () { JB.toast('✓ Registre quando jogarem'); openDetail(key); });
    })
    .catch(function (e) { JB.toast('Erro: ' + (e.message || '')); })
    .finally(function () { unlockAdd(key); });
}

function addManualGame() {
  var titleEl = document.getElementById('gameSearch');
  var yearEl = document.getElementById('gameYear');
  var title = titleEl ? (titleEl.value || '').trim() : '';
  var year = yearEl ? (yearEl.value || '').trim().slice(0, 4) : '';
  if (!title) { JB.toast('Digite o nome do jogo'); return; }
  var existing = findGameByTitle(title);
  if (existing) { openDetail(existing.key); return; }
  var lockId = 'manual:' + title.toLowerCase();
  if (!lockAdd(lockId)) return;
  var key = mediaKey('game', gameId());
  var row = [key, 'Jogo', title, year, '', JB.fmtDate(new Date())];
  JB.api('POST', ssUrl('/values/' + encodeURIComponent('Filmes') + ':append?valueInputOption=RAW&insertDataOption=INSERT_ROWS'), { values: [row] })
    .then(function () { return loadAll(); })
    .then(function () { JB.toast('✓ Registre quando jogarem'); openDetail(key); })
    .catch(function (e) { JB.toast('Erro: ' + (e.message || '')); })
    .finally(function () { unlockAdd(lockId); });
}

function musicSearchRowHtml(m) {
  var tag = onShelf(m.key) ? ' · na prateleira' : ' · registrar';
  return '<div class="srow" data-key="' + attrEsc(m.key) + '" onclick="openDetail(this.dataset.key)">'
    + '<div class="sposter">' + posterVisual(posterPathFor(m), '🎵') + '</div>'
    + '<div class="info"><div class="t">' + esc(m.title) + '</div><div class="y">Música' + (m.year ? ' · ' + esc(m.year) : '') + tag + '</div></div></div>';
}

function runMusicSearch(q) {
  var out = document.getElementById('searchOut');
  q = (q || '').trim();
  var ql = q.toLowerCase();
  var local = media.filter(function (m) {
    return m.type === 'music' && (!ql || m.title.toLowerCase().indexOf(ql) >= 0);
  });
  if (!q) {
    if (local.length) {
      out.innerHTML = '<div class="sresults">' + local.map(musicSearchRowHtml).join('') + '</div>';
    } else {
      out.innerHTML = '<div class="empty">Digite para buscar no MusicBrainz.</div>';
    }
    return;
  }
  out.innerHTML = '<div class="empty">Buscando…</div>';
  musicFetch({ search: q })
    .then(function (data) {
      var list = data.results || [];
      var html = '';
      if (local.length) {
        html += '<div class="sresults">' + local.map(musicSearchRowHtml).join('') + '</div>';
      }
      if (list.length) {
        html += '<div class="sresults">' + list.map(function (item) {
          var key = mediaKey('music', item.id);
          var inSheet = media.some(function (x) { return x.key === key; });
          var shelf = onShelf(key);
          var year = String(item.released || '').slice(0, 4) || '—';
          var artist = String(item.artist || '').trim();
          var tag = shelf ? ' · na prateleira' : (inSheet ? ' · registrar' : '');
          var poster = item.cover || '';
          var sub = 'Música' + (artist ? ' · ' + esc(artist) : '') + ' · ' + esc(year) + tag;
          return '<div class="srow" onclick="addFromMusicBrainz(\'' + attrEsc(item.id) + '\')">'
            + '<div class="sposter">' + posterVisual(poster, '🎵') + '</div>'
            + '<div class="info"><div class="t">' + esc(item.name || '') + '</div><div class="y">' + sub + '</div></div></div>';
        }).join('') + '</div>';
      } else if (!local.length) {
        html += '<div class="empty">Nada encontrado no MusicBrainz.</div>';
      }
      if (!findMusicByTitle(q) && !list.some(function (item) { return String(item.name || '').trim().toLowerCase() === ql; })) {
        html += '<button type="button" class="btn-primary game-add-btn" onclick="addManualMusic()">+ Adicionar manualmente “' + esc(q) + '”</button>';
      }
      out.innerHTML = html || '<div class="empty">Nada encontrado.</div>';
    })
    .catch(function () {
      var html = '';
      if (local.length) {
        html += '<div class="sresults">' + local.map(musicSearchRowHtml).join('') + '</div>';
      } else {
        html += '<div class="empty">MusicBrainz indisponível — adicione manualmente.</div>';
      }
      if (!findMusicByTitle(q)) {
        html += '<button type="button" class="btn-primary game-add-btn" onclick="addManualMusic()">+ Adicionar “' + esc(q) + '”</button>';
      }
      out.innerHTML = html;
    });
}

function addFromMusicBrainz(mbid) {
  var key = mediaKey('music', mbid);
  if (media.some(function (m) { return m.key === key; })) {
    openDetail(key);
    return;
  }
  if (!lockAdd(key)) return;
  musicFetch({ album: String(mbid) })
    .then(function (item) {
      if (media.some(function (m) { return m.key === key; })) {
        openDetail(key);
        return;
      }
      var title = item.name || '';
      var year = String(item.released || '').slice(0, 4);
      var poster = item.cover || '';
      if (poster) posterCache[key] = poster;
      var row = [key, 'Música', title, year, poster, JB.fmtDate(new Date())];
      return JB.api('POST', ssUrl('/values/' + encodeURIComponent('Filmes') + ':append?valueInputOption=RAW&insertDataOption=INSERT_ROWS'), { values: [row] })
        .then(function () { return loadAll(); })
        .then(function () { JB.toast('✓ Registre quando ouvirem'); openDetail(key); });
    })
    .catch(function (e) { JB.toast('Erro: ' + (e.message || '')); })
    .finally(function () { unlockAdd(key); });
}

function addManualMusic() {
  var titleEl = document.getElementById('musicSearch');
  var yearEl = document.getElementById('musicYear');
  var title = titleEl ? (titleEl.value || '').trim() : '';
  var year = yearEl ? (yearEl.value || '').trim().slice(0, 4) : '';
  if (!title) { JB.toast('Digite o nome do álbum'); return; }
  var existing = findMusicByTitle(title);
  if (existing) { openDetail(existing.key); return; }
  var lockId = 'manual:' + title.toLowerCase();
  if (!lockAdd(lockId)) return;
  var key = mediaKey('music', gameId());
  var row = [key, 'Música', title, year, '', JB.fmtDate(new Date())];
  JB.api('POST', ssUrl('/values/' + encodeURIComponent('Filmes') + ':append?valueInputOption=RAW&insertDataOption=INSERT_ROWS'), { values: [row] })
    .then(function () { return loadAll(); })
    .then(function () { JB.toast('✓ Registre quando ouvirem'); openDetail(key); })
    .catch(function (e) { JB.toast('Erro: ' + (e.message || '')); })
    .finally(function () { unlockAdd(lockId); });
}

function addFromTmdb(type, tmdbId) {
  var key = mediaKey(type, tmdbId);
  if (media.some(function (m) { return m.key === key; })) {
    openDetail(key);
    return;
  }
  if (!lockAdd(key)) return;
  if (!tmdbKey()) { unlockAdd(key); return; }
  var path = type === 'tv' ? ('/tv/' + tmdbId) : ('/movie/' + tmdbId);
  fetch('https://api.themoviedb.org/3' + path + '?api_key=' + encodeURIComponent(tmdbKey()) + '&language=pt-BR')
    .then(function (r) { return r.json(); })
    .then(function (item) {
      if (media.some(function (m) { return m.key === key; })) {
        openDetail(key);
        return;
      }
      var title = type === 'tv' ? (item.name || '') : (item.title || '');
      var year = String((type === 'tv' ? item.first_air_date : item.release_date) || '').slice(0, 4);
      if (item.poster_path) posterCache[key] = item.poster_path;
      var row = [key, typeLabel(type), title, year, item.poster_path || '', JB.fmtDate(new Date())];
      return JB.api('POST', ssUrl('/values/' + encodeURIComponent('Filmes') + ':append?valueInputOption=RAW&insertDataOption=INSERT_ROWS'), { values: [row] })
        .then(function () { return loadAll(); })
        .then(function () { JB.toast('✓ Registre quando assistirem'); openDetail(key); });
    })
    .catch(function (e) { JB.toast('Erro: ' + (e.message || '')); })
    .finally(function () { unlockAdd(key); });
}

function sessRowHtml(s, isLatest) {
  var myEm = (JB.email() || '').toLowerCase();
  var mine = canEditPrateleira() && s.email === myEm;
  var edit = mine ? '<button type="button" class="sess-edit" onclick="event.stopPropagation();editSession(' + s.sheetRow + ')" title="Editar registro">✎</button>' : '';
  var del = mine ? '<button type="button" class="sess-del" onclick="event.stopPropagation();deleteSession(' + s.sheetRow + ')" title="Excluir registro">✕</button>' : '';
  return '<div class="sess-row' + (isLatest ? ' latest' : '') + (editSessionRow === s.sheetRow ? ' editing' : '') + '" data-sheet-row="' + s.sheetRow + '">'
    + '<div class="sr-main"><span class="sr-date">' + esc(JB.fmtDate(s.date)) + '</span><span class="sr-who">' + esc(userLabel(s.email)) + '</span></div>'
    + (s.stars ? '<div class="sr-stars">' + starsHtml(s.stars) + '</div>' : '')
    + (s.review ? '<span class="sr-note">' + esc(s.review) + '</span>' : '')
    + '<div class="sr-actions">' + edit + del + '</div></div>';
}

function canEditPrateleira() {
  return JULIOEL_EMAILS.indexOf((JB.email() || '').toLowerCase()) > -1;
}

function sessionBlockHtml(key) {
  var list = sessionsFor(key);
  if (!list.length) {
    return '<div class="sess-block"><div class="sess-label">Registros</div><p class="rg">Nenhum registro ainda.</p></div>';
  }
  var hist = list.slice(1);
  return '<div class="sess-block"><div class="sess-label">Registros</div>'
    + sessRowHtml(list[0], true)
    + (hist.length ? '<div class="sl-hint tap" onclick="toggleSessHist()">' + hist.length + ' data' + (hist.length > 1 ? 's' : '') + ' anterior' + (hist.length > 1 ? 'es' : '') + ' · toque para ver</div>' : '')
    + (hist.length ? '<div id="sessHist" class="sess-hist' + (sessHistOpen ? '' : ' hidden') + '">' + hist.map(function (s) { return sessRowHtml(s, false); }).join('') + '</div>' : '')
    + '</div>';
}

function deleteSession(sheetRow) {
  if (!sheetRow || !sheetGrid || sheetGrid.Assistidos == null) return;
  JB.confirm('Excluir este registro?', 'A data e avaliação serão removidas.', function () {
    JB.api('POST', ssUrl(':batchUpdate'), {
      requests: [{ deleteDimension: { range: { sheetId: sheetGrid.Assistidos, dimension: 'ROWS', startIndex: sheetRow - 1, endIndex: sheetRow } } }]
    }).then(function () { return reloadAll(); })
      .then(function () { JB.toast('✓ Removido'); })
      .catch(function (e) { JB.toast('Erro: ' + (e.message || '')); });
  }, { yes: 'Excluir', no: 'Cancelar', danger: true });
}

function jlboBlockHtml(m) {
  if (!canEditPrateleira()) return '';
  var myEm = (JB.email() || '').toLowerCase();
  var rows = JULIOEL_EMAILS.map(function (em) {
    var sealed = userHasJlbo(m, em);
    return '<div class="jlbo-who"><span>' + esc(userLabel(em)) + '</span>' + (sealed ? jlboSealHtml() : '<span class="jlbo-pending">—</span>') + '</div>';
  }).join('');
  var canStamp = userCanStampMedia(m, myEm);
  var mineOn = userHasJlbo(m, myEm);
  var manage = '';
  if (canStamp) {
    manage = '<button type="button" class="jlbo-manage' + (mineOn ? ' on' : '') + '" id="jlboManageBtn" data-on="' + (mineOn ? '1' : '0') + '" onclick="toggleJlboManage()">'
      + jlboSealHtml() + '<span>' + (mineOn ? 'Selado · toque para remover' : 'Selar este título com JLBOE™') + '</span></button>';
  } else if (!mineOn) {
    manage = '<p class="jlbo-hint">Dê 5 estrelas no seu último registro para poder selar.</p>';
  } else {
    manage = '<p class="jlbo-hint">Você selou este título. Julia ainda não — sem glow completo.</p>';
  }
  return '<div class="jlbo-block"><div class="sess-label">JLBOE™ no título</div><div class="jlbo-status">' + rows + '</div>' + manage + '</div>';
}

function logFormHtml(m) {
  var myEm = (JB.email() || '').toLowerCase();
  if (JULIOEL_EMAILS.indexOf(myEm) < 0) return '';
  var verb = logVerb(m.type);
  var stars = '';
  for (var s = 1; s <= 5; s++) {
    stars += '<button type="button" data-star="' + s + '" onclick="pickLogStar(' + s + ')">★</button>';
  }
  return '<div class="sess-log"><div class="sess-label">Registrar ' + verb + '</div>'
    + '<div class="fg"><label class="fl">Data</label>'
    + '<button type="button" class="field datebtn empty" id="sessDate" data-iso="" data-ph="Escolher data…" onclick="JB.dpOpen(\'sessDate\')">Escolher data…</button></div>'
    + '<div class="fg"><label class="fl">Estrelas</label><div class="star-pick" id="logStars" data-val="0">' + stars + '</div></div>'
    + '<div class="jlbo-pick hidden" id="jlboPick"><button type="button" class="jlbo-btn" id="jlboBtn" data-on="0" onclick="toggleJlbo()">'
    + '<span class="jlbo-seal-preview">' + jlboSealHtml() + '</span>'
    + '<span class="jlbo-btn-txt"><span class="jlbo-btn-label">Julioel Brand Of Excellence™</span>'
    + '<span class="jlbo-btn-sub">sela o título · não o registro · só com 5 estrelas</span></span></button></div>'
    + '<textarea class="review-in" id="sessReview" maxlength="' + REVIEW_MAX + '" placeholder="Resenha curta (opcional)" oninput="revCount(this)"></textarea>'
    + '<div class="rev-count"><span class="rc">0</span>/' + REVIEW_MAX + '</div>'
    + '<div class="sess-form-actions">'
    + '<button type="button" class="btn-primary" id="sessSaveBtn" onclick="saveSession()">Registrar</button>'
    + '<button type="button" class="btn-ghost hidden" id="sessCancelEdit" onclick="cancelSessionEdit()">Cancelar edição</button>'
    + '</div></div>';
}

function logVerb(type) {
  if (type === 'game') return 'jogada';
  if (type === 'music') return 'ouvida';
  return 'assistida';
}

function openDetail(id) {
  detailId = id;
  editSessionRow = null;
  sessHistOpen = false;
  var m = media.find(function (x) { return x.key === String(id); });
  if (!m) return;
  document.getElementById('detailTitle').textContent = m.title;
  document.getElementById('detailBody').innerHTML = '<div class="dhero' + (mediaHasFullJlbo(m.key) ? ' jlbo-glow' : '') + '">'
    + '<div class="mposter dhero-poster">' + posterVisual(posterPathFor(m), typeIcon(m.type)) + '</div>'
    + '<div class="dmeta"><h2>' + esc(m.title) + '</h2><p>' + esc(typeLabel(m.type)) + ' · ' + esc(m.year) + '</p></div></div>'
    + jlboBlockHtml(m) + sessionBlockHtml(m.key) + logFormHtml(m);
  resetSessionForm();
  document.getElementById('detailOv').classList.add('open');
}

function resetSessionForm() {
  var m = media.find(function (x) { return x.key === String(detailId); });
  JB.dpSet('sessDate', todayISO());
  var starsWrap = document.getElementById('logStars');
  if (starsWrap) {
    starsWrap.setAttribute('data-val', '0');
    starsWrap.querySelectorAll('button').forEach(function (b) { b.classList.remove('on'); });
  }
  syncJlboPick(0);
  var reviewEl = document.getElementById('sessReview');
  if (reviewEl) {
    reviewEl.value = '';
    revCount(reviewEl);
  }
  syncSessionFormUi(m);
}

function syncSessionFormUi(m) {
  var log = document.querySelector('.sess-log');
  if (!log) return;
  var label = log.querySelector('.sess-label');
  var saveBtn = document.getElementById('sessSaveBtn');
  var cancelBtn = document.getElementById('sessCancelEdit');
  var editing = !!editSessionRow;
  if (label) label.textContent = editing ? 'Editar registro' : ('Registrar ' + logVerb(m && m.type));
  if (saveBtn) saveBtn.textContent = editing ? 'Salvar alterações' : 'Registrar';
  if (cancelBtn) cancelBtn.classList.toggle('hidden', !editing);
}

function fillSessionForm(s) {
  if (!s) return;
  JB.dpSet('sessDate', s.date);
  pickLogStar(s.stars || 0);
  var reviewEl = document.getElementById('sessReview');
  if (reviewEl) {
    reviewEl.value = s.review || '';
    revCount(reviewEl);
  }
}

function setJlboToggle(on) {
  var btn = document.getElementById('jlboBtn');
  if (!btn) return;
  btn.setAttribute('data-on', on ? '1' : '0');
  btn.classList.toggle('on', !!on);
  var manage = document.getElementById('jlboManageBtn');
  if (manage) {
    manage.setAttribute('data-on', on ? '1' : '0');
    manage.classList.toggle('on', !!on);
  }
}

function toggleJlboManage() {
  var btn = document.getElementById('jlboManageBtn');
  if (!btn || !detailId) return;
  var em = (JB.email() || '').toLowerCase();
  var m = media.find(function (x) { return x.key === String(detailId); });
  if (!m || !userCanStampMedia(m, em)) return;
  var on = btn.getAttribute('data-on') !== '1';
  updateMediaJlbo(detailId, em, on).then(function () {
    return reloadAll();
  }).then(function () {
    JB.toast(on ? '✓ Título selado com JLBOE™' : '✓ Selo removido');
  }).catch(function (e) { JB.toast('Erro: ' + (e.message || '')); });
}

function editSession(sheetRow) {
  var s = sessionByRow(sheetRow);
  if (!s) return;
  var em = (JB.email() || '').toLowerCase();
  if (s.email !== em) return;
  editSessionRow = sheetRow;
  fillSessionForm(s);
  var m = media.find(function (x) { return x.key === String(detailId); });
  syncSessionFormUi(m);
  document.querySelectorAll('.sess-row').forEach(function (row) {
    row.classList.toggle('editing', parseInt(row.getAttribute('data-sheet-row'), 10) === sheetRow);
  });
  var log = document.querySelector('.sess-log');
  if (log) log.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function cancelSessionEdit() {
  editSessionRow = null;
  resetSessionForm();
  document.querySelectorAll('.sess-row.editing').forEach(function (row) { row.classList.remove('editing'); });
}

function toggleSessHist() {
  sessHistOpen = !sessHistOpen;
  var el = document.getElementById('sessHist');
  if (el) el.classList.toggle('hidden', !sessHistOpen);
}

function closeDetail() { document.getElementById('detailOv').classList.remove('open'); detailId = null; editSessionRow = null; sessHistOpen = false; }

function syncJlboPick(stars) {
  var pick = document.getElementById('jlboPick');
  var btn = document.getElementById('jlboBtn');
  if (!pick || !btn) return;
  var m = media.find(function (x) { return x.key === String(detailId); });
  var em = (JB.email() || '').toLowerCase();
  if (stars === 5 && m && userCanStampMedia(m, em)) {
    pick.classList.remove('hidden');
    setJlboToggle(userHasJlbo(m, em));
    return;
  }
  pick.classList.add('hidden');
  btn.setAttribute('data-on', '0');
  btn.classList.remove('on');
}

function pickLogStar(n) {
  var wrap = document.getElementById('logStars');
  if (!wrap) return;
  wrap.setAttribute('data-val', String(n));
  wrap.querySelectorAll('button').forEach(function (b) {
    b.classList.toggle('on', parseInt(b.getAttribute('data-star'), 10) <= n);
  });
  syncJlboPick(n);
}

function toggleJlbo() {
  var btn = document.getElementById('jlboBtn');
  if (!btn) return;
  var on = btn.getAttribute('data-on') !== '1';
  setJlboToggle(on);
}

function revCount(ta) {
  var el = ta.parentNode.querySelector('.rc');
  if (el) el.textContent = String((ta.value || '').length);
}

function saveSession() {
  if (!detailId) return;
  var em = (JB.email() || '').toLowerCase();
  if (JULIOEL_EMAILS.indexOf(em) < 0) return;
  var iso = JB.dpGet('sessDate');
  if (!iso) { JB.toast('Escolha a data'); return; }
  var starsWrap = document.getElementById('logStars');
  var stars = parseInt(starsWrap && starsWrap.getAttribute('data-val'), 10) || 0;
  var reviewEl = document.getElementById('sessReview');
  var review = reviewEl ? (reviewEl.value || '').trim().slice(0, REVIEW_MAX) : '';
  var jlboBtn = document.getElementById('jlboBtn');
  var stampOn = stars === 5 && jlboBtn && !jlboBtn.closest('.hidden') && jlboBtn.getAttribute('data-on') === '1';
  var row = [iso, String(detailId), em, String(stars), review];
  var editing = editSessionRow;
  var req = editing
    ? JB.api('PUT', ssUrl('/values/' + encodeURIComponent('Assistidos!A' + editSessionRow + ':E' + editSessionRow) + '?valueInputOption=RAW'), { values: [row] })
    : JB.api('POST', ssUrl('/values/' + encodeURIComponent('Assistidos') + ':append?valueInputOption=RAW&insertDataOption=INSERT_ROWS'), { values: [row] });
  req.then(function () {
    if (stars !== 5 || !jlboBtn || jlboBtn.closest('.hidden')) return Promise.resolve();
    return updateMediaJlbo(detailId, em, stampOn);
  }).then(function () { return reloadAll(); })
    .then(function () {
      JB.toast(editing ? '✓ Atualizado' : (stampOn ? '✓ Título selado com JLBOE™' : '✓ Registrado'));
      editSessionRow = null;
      resetSessionForm();
    })
    .catch(function (e) { JB.toast('Erro: ' + (e.message || '')); });
}

function createSharedSheet() {
  JB.api('POST', 'https://sheets.googleapis.com/v4/spreadsheets', {
    properties: { title: 'Julioelboard Prateleira' },
    sheets: [{ properties: { title: 'Filmes' } }, { properties: { title: 'Assistidos' } }]
  }).then(function (ss) {
    JB.setSheetId(APP, ss.spreadsheetId);
    sheetGrid = { Filmes: ss.sheets[0].properties.sheetId, Assistidos: ss.sheets[1].properties.sheetId };
    return ensureHeaders().then(function () {
      document.getElementById('sheetInfo').textContent = 'ID: ' + ss.spreadsheetId;
      document.getElementById('sheetIdIn').value = ss.spreadsheetId;
      JB.toast('Planilha criada — compartilhe com Julia');
      closePrateleiraSet();
      return boot();
    });
  }).catch(function (e) { JB.toast('Erro: ' + (e.message || '')); });
}

function saveSheetId() {
  var id = parseSheetIdInput(document.getElementById('sheetIdIn').value);
  if (!id) { JB.toast('Cole o link ou ID da planilha'); return; }
  JB.sheetTabs(id).then(function () {
    JB.setSheetId(APP, id);
    document.getElementById('sheetIdIn').value = id;
    document.getElementById('sheetInfo').textContent = 'ID: ' + id;
    JB.toast('✓ Planilha vinculada');
    closePrateleiraSet();
    boot();
  }).catch(function (e) { JB.toast(sheetAccessErr(e)); });
}

function useDefaultSheet() {
  if (!PRATELEIRA_SHARED_SHEET) return;
  document.getElementById('sheetIdIn').value = PRATELEIRA_SHARED_SHEET;
  saveSheetId();
}

function openPrateleiraSet() {
  prateleiraSetTab('tema');
  document.getElementById('sheetInfo').textContent = JB.getSheetId(APP) ? ('ID: ' + JB.getSheetId(APP)) : 'Nenhuma planilha vinculada.';
  document.getElementById('sheetIdIn').value = JB.getSheetId(APP) || '';
  JB.renderSkinPicker(APP, document.getElementById('prateleiraSkins'));
  var em = (JB.email() || '').toLowerCase();
  var iconIn = document.getElementById('prUserIcon');
  var iconPrev = document.getElementById('prIconPreview');
  var perfilPane = document.querySelector('#setOverlay [data-pane="perfil"]');
  var perfilTab = document.querySelector('#setOverlay .set-tab[data-st="perfil"]');
  if (perfilPane && perfilTab) {
    var show = JULIOEL_EMAILS.indexOf(em) > -1;
    perfilTab.style.display = show ? '' : 'none';
    if (!show && perfilPane.style.display !== 'none') prateleiraSetTab('tema');
  }
  if (iconIn && iconPrev) {
    var ic = getUserIcon(em);
    iconIn.value = ic;
    iconPrev.textContent = ic;
    iconIn.oninput = function () {
      iconPrev.textContent = (iconIn.value || '').trim().slice(0, 8) || getUserIcon(em);
    };
  }
  document.getElementById('setOverlay').classList.add('open');
}

function savePrateleiraIcon() {
  var em = (JB.email() || '').toLowerCase();
  if (JULIOEL_EMAILS.indexOf(em) < 0) return;
  var iconIn = document.getElementById('prUserIcon');
  setUserIcon(em, iconIn ? iconIn.value : '');
  if (curTab === 'lib') renderMain();
  JB.toast('✓ Ícone salvo');
}
function prateleiraSetTab(name) {
  document.querySelectorAll('#setOverlay .set-tab').forEach(function (b) {
    b.classList.toggle('active', b.getAttribute('data-st') === name);
  });
  document.querySelectorAll('#setOverlay .set-pane').forEach(function (p) {
    var on = p.getAttribute('data-pane') === name;
    p.style.display = on ? '' : 'none';
  });
}
function closePrateleiraSet() { document.getElementById('setOverlay').classList.remove('open'); }

function prateleiraSignIn() { JB.signIn({ onSuccess: boot }); }
function prateleiraSignOut() { try { localStorage.removeItem('jb_julioel'); } catch (_) {} JB.signOut(); location.href = '/'; }

function startPrateleira() {
  loadLibPrefs();
  if (!JB.hasSession()) { boot(); return; }
  JB.ensureToken(false).then(function () {
    boot();
  }).catch(function (e) {
    if (isAuthErr(e)) showAuthGate();
    else boot();
  });
}

JB.applySkin(APP);
startPrateleira();
