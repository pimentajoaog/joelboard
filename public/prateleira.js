/* Joelboard Prateleira — Julioelboard. © 2026 Joel Soluções LTDA. */
var APP = 'prateleira';
var JULIOEL_EMAILS = ['joaogabrielpabarbosa@gmail.com', 'juliazin182@gmail.com'];
var PRATELEIRA_SHARED_SHEET = '1Dw2WXmeBTqic1whtVe4fwSBM-UJ8VDBTCIJspxHYCAo';
var REVIEW_MAX = 200;
var NOTE_MAX = 200;
var TMDB_IMG = 'https://image.themoviedb.org/t/p/w342';
var USER_NAMES = {
  'joaogabrielpabarbosa@gmail.com': 'Joel',
  'juliazin182@gmail.com': 'Julia'
};

var sheetGrid = null;
var media = [];
var ratings = [];
var sessions = [];
var curTab = 'lib';
var detailId = null;
var sessHistOpen = false;
var searchTimer = null;

function esc(s) {
  return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
function attrEsc(s) {
  return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/"/g, '&quot;');
}
function userLabel(em) { return USER_NAMES[(em || '').toLowerCase()] || (em || '').split('@')[0] || '?'; }
function julioelAllowed() { return JULIOEL_EMAILS.indexOf((JB.email() || '').toLowerCase()) > -1; }
function julioelUnlocked() { try { return localStorage.getItem('jb_julioel') === '1'; } catch (_) { return false; } }
function julioelOk() { return JB.isSignedIn() && julioelAllowed() && julioelUnlocked(); }
function tmdbKey() { return window.JB_TMDB_KEY || ''; }
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
  return { type: 'movie', id: s, key: 'movie:' + s };
}
function typeIcon(type) { return type === 'tv' ? '📺' : (type === 'game' ? '🎮' : '🎬'); }
function typeLabel(type) { return type === 'tv' ? 'Série' : (type === 'game' ? 'Jogo' : 'Filme'); }
function looksLikePosterPath(p) {
  p = String(p || '').trim();
  if (!p) return false;
  if (/^https?:\/\//i.test(p) || p.indexOf('image.tmdb.org') > -1) return true;
  return p.charAt(0) === '/' && /\.(jpg|jpeg|png|webp)$/i.test(p);
}
function normalizePosterPath(p) {
  p = String(p || '').trim();
  if (!p) return '';
  if (/^https?:\/\//i.test(p)) return p;
  if (p.indexOf('image.tmdb.org') > -1) return p.indexOf('http') === 0 ? p : 'https:' + (p.indexOf('//') === 0 ? p : '//' + p.replace(/^\/\//, ''));
  if (p.charAt(0) !== '/') p = '/' + p;
  return p;
}
function posterUrl(path) {
  path = normalizePosterPath(path);
  if (!path) return '';
  if (/^https?:\/\//i.test(path)) return path;
  return TMDB_IMG + path;
}
function imgTag(path, alt) {
  var u = posterUrl(path);
  if (!u) return '';
  return '<img src="' + attrEsc(u) + '" alt="' + attrEsc(alt || '') + '" loading="lazy" referrerpolicy="no-referrer">';
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

function boot() {
  migrateAppKeys();
  if (!julioelOk()) {
    var sub = !JB.isSignedIn()
      ? 'Entre com Google e volte ao Hub.'
      : (!julioelAllowed()
        ? 'Este cantinho não é para você. 😄'
        : 'Volte ao Hub e clique no logo <b>Joelboard</b> para desbloquear.');
    loadingHtml(gateHtml('Julioelboard Prateleira', sub, !JB.isSignedIn() ? '<button class="btn-primary" onclick="prateleiraSignIn()">Entrar</button>' : '<a class="btn ghost" href="/" style="display:inline-block;text-decoration:none">← Hub</a>'));
    return;
  }
  document.getElementById('acctEmail').textContent = userLabel(JB.email());
  if (PRATELEIRA_SHARED_SHEET) JB.setSheetId(APP, PRATELEIRA_SHARED_SHEET);
  loadingHtml(JB.skeletonHtml('prateleira'));
  resolveSheet()
    .then(loadAll)
    .then(function () { showApp(); renderMain(); JB.watchSheet(APP, reloadAll); })
    .catch(handleBootErr);
}

function handleBootErr(e) {
  var m = String((e && e.message) || '');
  if (m.indexOf('silent_timeout') > -1 || m.indexOf('auth_failed') > -1 || m.indexOf('401') > -1 || m.indexOf('cancelled') > -1) {
    loadingHtml(gateHtml('Julioelboard Prateleira', 'Sessão expirada.', '<button class="btn-primary" onclick="prateleiraSignIn()">Entrar</button>'));
    return;
  }
  if (m === 'JB_NEED_SHEET') {
    loadingHtml(gateHtml('Julioelboard Prateleira', 'Crie ou vincule a planilha compartilhada (⚙ Ajustes).', '<button class="btn-primary" onclick="openPrateleiraSet()">Configurar planilha</button>'));
    return;
  }
  loadingHtml(gateHtml('Erro', esc(m), '<button class="btn ghost" onclick="boot()">Tentar de novo</button>'));
}

function resolveSheet() {
  if (PRATELEIRA_SHARED_SHEET) JB.setSheetId(APP, PRATELEIRA_SHARED_SHEET);
  return JB.resolveSheet({ app: APP, namePart: 'Julioelboard', requiredTabs: ['Filmes', 'Avaliacoes'] })
    .catch(function (e) {
      if (String((e && e.message) || '') !== 'JB_NEED_SHEET' || !JB.getSheetId(APP)) throw e;
      return JB.sheetTabs(JB.getSheetId(APP)).then(function (grid) { return ensureTabs(grid).then(function (g) { return { id: JB.getSheetId(APP), grid: g }; }); });
    })
    .then(function (ctx) { sheetGrid = ctx.grid; return ensureTabs(sheetGrid).then(function (g) { sheetGrid = g; return ensureHeaders(); }); });
}

function ensureTabs(grid) {
  grid = grid || {};
  var missing = ['Filmes', 'Avaliacoes', 'Assistidos'].filter(function (t) { return grid[t] == null; });
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
      { range: 'Filmes!A1:F1', values: [['ID', 'Tipo', 'Título', 'Ano', 'Poster', 'Adicionado']] },
      { range: 'Avaliacoes!A1:E1', values: [['MediaID', 'Email', 'Estrelas', 'Resenha', 'Atualizado']] },
      { range: 'Assistidos!A1:D1', values: [['Data', 'MediaID', 'Email', 'Nota']] }
    ]
  }).catch(function () {});
}

function loadAll() {
  return Promise.all([
    JB.api('GET', ssUrl('/values/' + encodeURIComponent('Filmes') + '?valueRenderOption=UNFORMATTED_VALUE')),
    JB.api('GET', ssUrl('/values/' + encodeURIComponent('Avaliacoes') + '?valueRenderOption=FORMATTED_VALUE')),
    JB.api('GET', ssUrl('/values/' + encodeURIComponent('Assistidos') + '?valueRenderOption=FORMATTED_VALUE')).catch(function () { return { values: [] }; })
  ]).then(function (res) {
    media = parseMedia(res[0].values || []);
    ratings = parseRatings(res[1].values || []);
    sessions = parseSessions(res[2].values || []);
    return repairMediaPosters();
  });
}

function repairMediaPosters() {
  if (!tmdbKey()) return Promise.resolve();
  var todo = media.filter(function (m) { return m.type !== 'game' && !looksLikePosterPath(m.poster); });
  if (!todo.length) return Promise.resolve();
  return todo.reduce(function (chain, m) {
    return chain.then(function () { return fetchPosterFromTmdb(m); });
  }, Promise.resolve());
}

function fetchPosterFromTmdb(m) {
  var parsed = parseMediaId(m.key);
  if (parsed.type === 'game') return Promise.resolve();
  var apiPath = parsed.type === 'tv' ? ('/tv/' + parsed.id) : ('/movie/' + parsed.id);
  return fetch('https://api.themoviedb.org/3' + apiPath + '?api_key=' + encodeURIComponent(tmdbKey()) + '&language=pt-BR')
    .then(function (r) { return r.json(); })
    .then(function (item) {
      if (!item.poster_path) return;
      m.poster = item.poster_path;
      if (!m.sheetRow) return;
      var col = m.layout === 'new' ? 'E' : 'D';
      return JB.api('PUT', ssUrl('/values/' + encodeURIComponent('Filmes!' + col + m.sheetRow) + '?valueInputOption=RAW'), { values: [[item.poster_path]] });
    })
    .catch(function () {});
}

function reloadAll() { return loadAll().then(function () { renderMain(); if (detailId) openDetail(detailId); }); }

function parseMedia(rows) {
  var out = [];
  var header = rows[0] || [];
  var hasTipoCol = String(header[1] || '').toLowerCase() === 'tipo';
  for (var i = 1; i < rows.length; i++) {
    var r = rows[i] || [];
    if (!r[0]) continue;
    var useNew = hasTipoCol && (r[1] === 'Filme' || r[1] === 'Série' || r[1] === 'Jogo');
    if (useNew) {
      var typeN = r[1] === 'Série' ? 'tv' : (r[1] === 'Jogo' ? 'game' : 'movie');
      out.push({
        key: String(r[0]), type: typeN, title: String(r[2] || ''), year: String(r[3] || ''),
        poster: String(r[4] || ''), added: String(r[5] || ''), sheetRow: i + 1, layout: 'new'
      });
    } else {
      var parsed = parseMediaId(r[0]);
      out.push({
        key: parsed.key, type: parsed.type, title: String(r[1] || ''), year: String(r[2] || ''),
        poster: String(r[3] || ''), added: String(r[4] || ''), sheetRow: i + 1, layout: 'old'
      });
    }
  }
  return out;
}

function parseRatings(rows) {
  var out = [];
  for (var i = 1; i < rows.length; i++) {
    var r = rows[i] || [];
    if (!r[0]) continue;
    var parsed = parseMediaId(r[0]);
    out.push({ mediaId: parsed.key, email: String(r[1] || '').toLowerCase(), stars: parseInt(r[2], 10) || 0, review: String(r[3] || ''), updated: String(r[4] || ''), sheetRow: i + 1 });
  }
  return out;
}

function parseSessions(rows) {
  var out = [];
  for (var i = 1; i < rows.length; i++) {
    var r = rows[i] || [];
    if (!r[0] || !r[1]) continue;
    var parsed = parseMediaId(r[1]);
    out.push({
      date: parseSheetDate(r[0]),
      mediaId: parsed.key,
      email: String(r[2] || '').toLowerCase(),
      note: String(r[3] || ''),
      sheetRow: i + 1
    });
  }
  return out;
}

function ratingsFor(mediaId) {
  var map = {};
  ratings.forEach(function (rt) {
    if (rt.mediaId === String(mediaId)) map[rt.email] = rt;
  });
  return map;
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

function sortedMedia() {
  return media.slice().sort(function (a, b) {
    var la = latestSession(a.key), lb = latestSession(b.key);
    if (la && lb) return String(lb.date).localeCompare(String(la.date));
    if (la) return -1;
    if (lb) return 1;
    return String(b.added).localeCompare(String(a.added));
  });
}

function starsHtml(n) {
  n = Math.max(0, Math.min(5, n | 0));
  var h = '';
  for (var i = 1; i <= 5; i++) h += '<span class="mstar' + (i <= n ? ' on' : '') + '">★</span>';
  return h;
}

function renderMain() {
  var el = document.getElementById('main');
  if (curTab === 'search') {
    el.innerHTML = '<div class="searchbar"><input type="search" id="mvSearch" placeholder="Buscar filme ou série…" autocomplete="off"></div><div id="searchOut"><div class="empty">Digite para buscar no catálogo.</div></div>';
    var inp = document.getElementById('mvSearch');
    inp.oninput = function () {
      clearTimeout(searchTimer);
      searchTimer = setTimeout(function () { runSearch(inp.value); }, 350);
    };
    if (JB.searchFocus) JB.searchFocus(inp);
    return;
  }
  if (!media.length) {
    el.innerHTML = JB.emptyState({ icon: '📚', title: 'Prateleira vazia', body: 'Busque filmes ou séries para começar.', btn: 'Buscar', onclick: 'prateleiraTab(\'search\')' });
    return;
  }
  var html = '<div class="mgrid">';
  sortedMedia().forEach(function (m, idx) {
    var rs = ratingsFor(m.key);
    var blocks = JULIOEL_EMAILS.map(function (em) {
      var rt = rs[em];
      if (!rt || !rt.stars) return '';
      return '<div class="who">' + esc(userLabel(em)) + '</div><div class="row">' + starsHtml(rt.stars) + '</div>';
    }).join('');
    var latest = latestSession(m.key);
    html += '<div class="mcard" style="animation-delay:' + (idx * 0.04) + 's" data-key="' + attrEsc(m.key) + '" onclick="openDetail(this.dataset.key)">'
      + '<div class="mposter">' + (looksLikePosterPath(m.poster) ? imgTag(m.poster, m.title) : '<span class="ph">' + typeIcon(m.type) + '</span>')
      + '<span class="mbadge">' + typeIcon(m.type) + '</span></div>'
      + '<div class="mbody"><div class="mtitle">' + esc(m.title) + '</div><div class="myear">' + esc(m.year) + '</div>'
      + (latest ? '<div class="mlast"><span class="ml-dot"></span>' + esc(JB.fmtDate(latest.date)) + '</div>' : '')
      + (blocks ? '<div class="mstars">' + blocks + '</div>' : '') + '</div></div>';
  });
  html += '</div>';
  el.innerHTML = html;
  if (JB.staggerChildren) JB.staggerChildren(el.querySelector('.mgrid'), 'pr-lib');
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
        var inLib = media.some(function (x) { return x.key === key; });
        var title = type === 'tv' ? (item.name || '') : (item.title || '');
        var year = String((type === 'tv' ? item.first_air_date : item.release_date) || '').slice(0, 4) || '—';
        var poster = item.poster_path ? normalizePosterPath(item.poster_path) : '';
        return '<div class="srow" onclick="addFromTmdb(\'' + type + '\',' + item.id + ')">'
          + (poster ? imgTag(poster, title) : '<div class="ph">' + typeIcon(type) + '</div>')
          + '<div class="info"><div class="t">' + esc(title) + '</div><div class="y">'
          + esc(typeLabel(type)) + ' · ' + esc(year) + (inLib ? ' · na prateleira' : '') + '</div></div></div>';
      }).join('') + '</div>';
    })
    .catch(function () { out.innerHTML = '<div class="empty">Erro na busca.</div>'; });
}

function addFromTmdb(type, tmdbId) {
  var key = mediaKey(type, tmdbId);
  if (media.some(function (m) { return m.key === key; })) {
    prateleiraTab('lib');
    openDetail(key);
    return;
  }
  if (!tmdbKey()) return;
  var path = type === 'tv' ? ('/tv/' + tmdbId) : ('/movie/' + tmdbId);
  fetch('https://api.themoviedb.org/3' + path + '?api_key=' + encodeURIComponent(tmdbKey()) + '&language=pt-BR')
    .then(function (r) { return r.json(); })
    .then(function (item) {
      var title = type === 'tv' ? (item.name || '') : (item.title || '');
      var year = String((type === 'tv' ? item.first_air_date : item.release_date) || '').slice(0, 4);
      var row = [key, typeLabel(type), title, year, item.poster_path || '', JB.fmtDate(new Date())];
      return JB.api('POST', ssUrl('/values/' + encodeURIComponent('Filmes') + ':append?valueInputOption=RAW&insertDataOption=INSERT_ROWS'), { values: [row] })
        .then(function () { return loadAll(); })
        .then(function () { JB.toast('✓ Adicionado'); prateleiraTab('lib'); openDetail(key); });
    })
    .catch(function (e) { JB.toast('Erro: ' + (e.message || '')); });
}

function sessRowHtml(s, isLatest) {
  var del = canEditPrateleira() ? '<button type="button" class="sess-del" onclick="event.stopPropagation();deleteSession(' + s.sheetRow + ')" title="Excluir registro">✕</button>' : '';
  return '<div class="sess-row' + (isLatest ? ' latest' : '') + '">'
    + '<div class="sr-main"><span class="sr-date">' + esc(JB.fmtDate(s.date)) + '</span><span class="sr-who">' + esc(userLabel(s.email)) + '</span></div>'
    + (s.note ? '<span class="sr-note">' + esc(s.note) + '</span>' : '')
    + del + '</div>';
}

function canEditPrateleira() {
  return JULIOEL_EMAILS.indexOf((JB.email() || '').toLowerCase()) > -1;
}

function sessionBlockHtml(key) {
  var list = sessionsFor(key);
  if (!list.length) {
    return '<div class="sess-block"><div class="sess-label">Assistidos</div><p class="rg">Nenhum registro ainda.</p></div>';
  }
  var latest = list[0];
  var hist = list.slice(1);
  return '<div class="sess-block"><div class="sess-label">Assistidos</div>'
    + sessRowHtml(latest, true)
    + (hist.length ? '<div class="sl-hint' + (hist.length ? ' tap' : '') + '" onclick="toggleSessHist()">' + hist.length + ' data' + (hist.length > 1 ? 's' : '') + ' anterior' + (hist.length > 1 ? 'es' : '') + ' · toque para ver</div>' : '')
    + (hist.length ? '<div id="sessHist" class="sess-hist' + (sessHistOpen ? '' : ' hidden') + '">' + hist.map(function (s) { return sessRowHtml(s, false); }).join('') + '</div>' : '')
    + '</div>';
}

function deleteSession(sheetRow) {
  if (!sheetRow || !sheetGrid || sheetGrid.Assistidos == null) return;
  JB.confirm('Excluir este registro?', 'A data assistida será removida da prateleira.', function () {
    JB.api('POST', ssUrl(':batchUpdate'), {
      requests: [{ deleteDimension: { range: { sheetId: sheetGrid.Assistidos, dimension: 'ROWS', startIndex: sheetRow - 1, endIndex: sheetRow } } }]
    }).then(function () { return reloadAll(); })
      .then(function () { JB.toast('✓ Removido'); })
      .catch(function (e) { JB.toast('Erro: ' + (e.message || '')); });
  }, { yes: 'Excluir', no: 'Cancelar', danger: true });
}

function logFormHtml() {
  var myEm = (JB.email() || '').toLowerCase();
  if (JULIOEL_EMAILS.indexOf(myEm) < 0) return '';
  return '<div class="sess-log"><div class="sess-label">Registrar assistida</div>'
    + '<div class="fg"><label class="fl">Data</label>'
    + '<button type="button" class="field datebtn empty" id="sessDate" data-iso="" data-ph="Escolher data…" onclick="JB.dpOpen(\'sessDate\')">Escolher data…</button></div>'
    + '<textarea class="review-in sess-note" id="sessNote" maxlength="' + NOTE_MAX + '" placeholder="Nota opcional"></textarea>'
    + '<button type="button" class="btn-primary" onclick="saveSession()">+ Registrar data</button></div>';
}

function openDetail(id) {
  detailId = id;
  sessHistOpen = false;
  var m = media.find(function (x) { return x.key === String(id); });
  if (!m) return;
  document.getElementById('detailTitle').textContent = m.title;
  var rs = ratingsFor(m.key);
  var myEm = (JB.email() || '').toLowerCase();
  var blocks = JULIOEL_EMAILS.map(function (em) {
    var rt = rs[em] || { stars: 0, review: '' };
    var canEdit = em === myEm;
    if (!canEdit) {
      return '<div class="rate-block"><div class="who">' + esc(userLabel(em)) + '</div>'
        + (rt.stars ? '<div class="star-pick" style="pointer-events:none">' + starsHtml(rt.stars) + '</div>' : '<p class="rg">Sem avaliação ainda.</p>')
        + (rt.review ? '<p class="rg" style="margin-top:8px;white-space:pre-wrap">' + esc(rt.review) + '</p>' : '') + '</div>';
    }
    var stars = '';
    for (var s = 1; s <= 5; s++) {
      stars += '<button type="button" class="' + (s <= rt.stars ? 'on' : '') + '" data-star="' + s + '" onclick="pickStar(this,' + s + ')">★</button>';
    }
    return '<div class="rate-block"><div class="who">' + esc(userLabel(em)) + ' (você)</div>'
      + '<div class="star-pick" id="starPick" data-val="' + (rt.stars || 0) + '">' + stars + '</div>'
      + '<textarea class="review-in" maxlength="' + REVIEW_MAX + '" placeholder="Resenha curta (opcional)" oninput="revCount(this)">' + esc(rt.review) + '</textarea>'
      + '<div class="rev-count"><span class="rc">' + String((rt.review || '').length) + '</span>/' + REVIEW_MAX + '</div></div>';
  }).join('');
  document.getElementById('detailBody').innerHTML = '<div class="dhero">'
    + (looksLikePosterPath(m.poster) ? imgTag(m.poster, m.title) : '<div class="ph">' + typeIcon(m.type) + '</div>')
    + '<div class="dmeta"><h2>' + esc(m.title) + '</h2><p>' + esc(typeLabel(m.type)) + ' · ' + esc(m.year) + '</p></div></div>'
    + sessionBlockHtml(m.key) + logFormHtml() + blocks
    + (JULIOEL_EMAILS.indexOf(myEm) > -1 ? '<button class="btn-primary" style="width:100%;margin-top:4px" onclick="saveDetail()">Salvar minha avaliação</button>' : '');
  JB.dpSet('sessDate', todayISO());
  document.getElementById('detailOv').classList.add('open');
}

function toggleSessHist() {
  sessHistOpen = !sessHistOpen;
  var el = document.getElementById('sessHist');
  if (el) el.classList.toggle('hidden', !sessHistOpen);
}

function closeDetail() { document.getElementById('detailOv').classList.remove('open'); detailId = null; sessHistOpen = false; }

function pickStar(btn, n) {
  var wrap = document.getElementById('starPick');
  if (!wrap) return;
  wrap.setAttribute('data-val', String(n));
  wrap.querySelectorAll('button').forEach(function (b) {
    b.classList.toggle('on', parseInt(b.getAttribute('data-star'), 10) <= n);
  });
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
  var noteEl = document.getElementById('sessNote');
  var note = noteEl ? (noteEl.value || '').trim().slice(0, NOTE_MAX) : '';
  var row = [iso, String(detailId), em, note];
  JB.api('POST', ssUrl('/values/' + encodeURIComponent('Assistidos') + ':append?valueInputOption=RAW&insertDataOption=INSERT_ROWS'), { values: [row] })
    .then(function () { return reloadAll(); })
    .then(function () { JB.toast('✓ Registrado'); if (noteEl) noteEl.value = ''; })
    .catch(function (e) { JB.toast('Erro: ' + (e.message || '')); });
}

function saveDetail() {
  if (!detailId) return;
  var em = (JB.email() || '').toLowerCase();
  if (JULIOEL_EMAILS.indexOf(em) < 0) return;
  var wrap = document.getElementById('starPick');
  var stars = parseInt(wrap && wrap.getAttribute('data-val'), 10) || 0;
  var reviewEl = wrap && wrap.parentNode.querySelector('.review-in:not(.sess-note)');
  var review = reviewEl ? (reviewEl.value || '').trim().slice(0, REVIEW_MAX) : '';
  if (!stars) { JB.toast('Escolha as estrelas'); return; }
  var existing = ratings.find(function (r) { return r.mediaId === String(detailId) && r.email === em; });
  var row = [String(detailId), em, String(stars), review, JB.fmtDate(new Date())];
  var p;
  if (existing && existing.sheetRow) {
    p = JB.api('PUT', ssUrl('/values/' + encodeURIComponent('Avaliacoes!A' + existing.sheetRow + ':E' + existing.sheetRow) + '?valueInputOption=RAW'), { values: [row] });
  } else {
    p = JB.api('POST', ssUrl('/values/' + encodeURIComponent('Avaliacoes') + ':append?valueInputOption=RAW&insertDataOption=INSERT_ROWS'), { values: [row] });
  }
  p.then(function () { return reloadAll(); })
    .then(function () { JB.toast('✓ Salvo'); closeDetail(); })
    .catch(function (e) { JB.toast('Erro: ' + (e.message || '')); });
}

function createSharedSheet() {
  JB.api('POST', 'https://sheets.googleapis.com/v4/spreadsheets', {
    properties: { title: 'Julioelboard Prateleira' },
    sheets: [{ properties: { title: 'Filmes' } }, { properties: { title: 'Avaliacoes' } }, { properties: { title: 'Assistidos' } }]
  }).then(function (ss) {
    JB.setSheetId(APP, ss.spreadsheetId);
    sheetGrid = { Filmes: ss.sheets[0].properties.sheetId, Avaliacoes: ss.sheets[1].properties.sheetId, Assistidos: ss.sheets[2].properties.sheetId };
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
  var id = (document.getElementById('sheetIdIn').value || '').trim();
  if (!id) return;
  JB.setSheetId(APP, id);
  JB.toast('ID salvo');
  closePrateleiraSet();
  boot();
}

function openPrateleiraSet() {
  prateleiraSetTab('tema');
  document.getElementById('sheetInfo').textContent = JB.getSheetId(APP) ? ('ID: ' + JB.getSheetId(APP)) : 'Nenhuma planilha vinculada.';
  document.getElementById('sheetIdIn').value = JB.getSheetId(APP) || '';
  JB.renderSkinPicker(APP, document.getElementById('prateleiraSkins'));
  document.getElementById('setOverlay').classList.add('open');
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

JB.applySkin(APP);
if (JB.hasSession()) JB.ensureToken(false).then(boot).catch(boot);
else boot();
