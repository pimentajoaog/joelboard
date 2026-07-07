/* Joelboard Movies — Julioelboard app. © 2026 Joel Soluções LTDA. */
var JULIOEL_EMAILS = ['joaogabrielpabarbosa@gmail.com', 'juliazin182@gmail.com'];
var MOVIES_SHARED_SHEET = '1Dw2WXmeBTqic1whtVe4fwSBM-UJ8VDBTCIJspxHYCAo';
var REVIEW_MAX = 200;
var TMDB_IMG = 'https://image.tmdb.org/t/p/w342';
var USER_NAMES = {
  'joaogabrielpabarbosa@gmail.com': 'Joel',
  'juliazin182@gmail.com': 'Julia'
};

var moviesGrid = null;
var movies = [];
var ratings = [];
var curTab = 'lib';
var detailId = null;
var searchTimer = null;

function esc(s) {
  return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
function userLabel(em) { return USER_NAMES[(em || '').toLowerCase()] || (em || '').split('@')[0] || '?'; }
function julioelAllowed() { return JULIOEL_EMAILS.indexOf((JB.email() || '').toLowerCase()) > -1; }
function julioelUnlocked() { try { return localStorage.getItem('jb_julioel') === '1'; } catch (_) { return false; } }
function julioelOk() { return JB.isSignedIn() && julioelAllowed() && julioelUnlocked(); }
function tmdbKey() { return window.JB_TMDB_KEY || ''; }
function ssUrl(p) { return 'https://sheets.googleapis.com/v4/spreadsheets/' + JB.getSheetId('movies') + p; }

function loadingHtml(h) { document.getElementById('loading').innerHTML = h; document.getElementById('loading').classList.remove('hidden'); document.getElementById('app').classList.add('hidden'); }
function showApp() { document.getElementById('loading').classList.add('hidden'); document.getElementById('app').classList.remove('hidden'); }

function gateHtml(title, sub, btn) {
  return '<div class="gate"><div class="gt">' + esc(title) + '</div><div class="gs">' + sub + '</div>' + (btn || '') + '</div>';
}

function boot() {
  if (!julioelOk()) {
    var sub = !JB.isSignedIn()
      ? 'Entre com Google e volte ao Hub.'
      : (!julioelAllowed()
        ? 'Este cantinho não é para você. 😄'
        : 'Volte ao Hub e clique no logo <b>Joelboard</b> para desbloquear.');
    loadingHtml(gateHtml('Julioelboard Movies', sub, !JB.isSignedIn() ? '<button class="btn-primary" onclick="moviesSignIn()">Entrar</button>' : '<a class="btn ghost" href="/" style="display:inline-block;text-decoration:none">← Hub</a>'));
    return;
  }
  document.getElementById('acctEmail').textContent = userLabel(JB.email());
  if (MOVIES_SHARED_SHEET) JB.setSheetId('movies', MOVIES_SHARED_SHEET);
  loadingHtml(JB.skeletonHtml('movies'));
  resolveMoviesSheet()
    .then(loadAll)
    .then(function () { showApp(); renderMain(); JB.watchSheet('movies', reloadAll); })
    .catch(handleBootErr);
}

function handleBootErr(e) {
  var m = String((e && e.message) || '');
  if (m.indexOf('silent_timeout') > -1 || m.indexOf('auth_failed') > -1 || m.indexOf('401') > -1 || m.indexOf('cancelled') > -1) {
    loadingHtml(gateHtml('Julioelboard Movies', 'Sessão expirada.', '<button class="btn-primary" onclick="moviesSignIn()">Entrar</button>'));
    return;
  }
  if (m === 'JB_NEED_SHEET') {
    loadingHtml(gateHtml('Julioelboard Movies', 'Crie ou vincule a planilha compartilhada (⚙ Ajustes).', '<button class="btn-primary" onclick="openMoviesSet()">Configurar planilha</button>'));
    return;
  }
  loadingHtml(gateHtml('Erro', esc(m), '<button class="btn ghost" onclick="boot()">Tentar de novo</button>'));
}

function resolveMoviesSheet() {
  if (MOVIES_SHARED_SHEET) JB.setSheetId('movies', MOVIES_SHARED_SHEET);
  return JB.resolveSheet({ app: 'movies', namePart: 'Julioelboard Movies', requiredTabs: ['Filmes', 'Avaliacoes'] })
    .catch(function (e) {
      if (String((e && e.message) || '') !== 'JB_NEED_SHEET' || !JB.getSheetId('movies')) throw e;
      return JB.sheetTabs(JB.getSheetId('movies')).then(function (grid) { return ensureMoviesTabs(grid).then(function (g) { return { id: JB.getSheetId('movies'), grid: g }; }); });
    })
    .then(function (ctx) { moviesGrid = ctx.grid; return ensureMoviesTabs(moviesGrid).then(function (g) { moviesGrid = g; return ensureHeaders(); }); });
}

function ensureMoviesTabs(grid) {
  grid = grid || {};
  var missing = ['Filmes', 'Avaliacoes'].filter(function (t) { return grid[t] == null; });
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
      { range: 'Filmes!A1:E1', values: [['ID', 'Título', 'Ano', 'Poster', 'Adicionado']] },
      { range: 'Avaliacoes!A1:E1', values: [['FilmeID', 'Email', 'Estrelas', 'Resenha', 'Atualizado']] }
    ]
  }).catch(function () {});
}

function loadAll() {
  return Promise.all([
    JB.api('GET', ssUrl('/values/' + encodeURIComponent('Filmes') + '?valueRenderOption=FORMATTED_VALUE')),
    JB.api('GET', ssUrl('/values/' + encodeURIComponent('Avaliacoes') + '?valueRenderOption=FORMATTED_VALUE'))
  ]).then(function (res) {
    movies = parseMovies(res[0].values || []);
    ratings = parseRatings(res[1].values || []);
  });
}

function reloadAll() { return loadAll().then(function () { renderMain(); if (detailId) openDetail(detailId); }); }

function parseMovies(rows) {
  var out = [];
  for (var i = 1; i < rows.length; i++) {
    var r = rows[i] || [];
    if (!r[0]) continue;
    out.push({ id: String(r[0]), title: String(r[1] || ''), year: String(r[2] || ''), poster: String(r[3] || ''), added: String(r[4] || '') });
  }
  return out;
}

function parseRatings(rows) {
  var out = [];
  for (var i = 1; i < rows.length; i++) {
    var r = rows[i] || [];
    if (!r[0]) continue;
    out.push({ movieId: String(r[0]), email: String(r[1] || '').toLowerCase(), stars: parseInt(r[2], 10) || 0, review: String(r[3] || ''), updated: String(r[4] || ''), sheetRow: i + 1 });
  }
  return out;
}

function ratingsFor(movieId) {
  var map = {};
  ratings.forEach(function (rt) {
    if (rt.movieId === String(movieId)) map[rt.email] = rt;
  });
  return map;
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
    el.innerHTML = '<div class="searchbar"><input type="search" id="mvSearch" placeholder="Buscar filme…" autocomplete="off"></div><div id="searchOut"><div class="empty">Digite para buscar no catálogo.</div></div>';
    var inp = document.getElementById('mvSearch');
    inp.oninput = function () {
      clearTimeout(searchTimer);
      searchTimer = setTimeout(function () { runSearch(inp.value); }, 350);
    };
    if (JB.searchFocus) JB.searchFocus(inp);
    return;
  }
  if (!movies.length) {
    el.innerHTML = JB.emptyState({ icon: '🎬', title: 'Nenhum filme ainda', body: 'Busque e adicione o primeiro.', btn: 'Buscar filme', onclick: 'moviesTab(\'search\')' });
    return;
  }
  var html = '<div class="mgrid">';
  movies.forEach(function (m, idx) {
    var rs = ratingsFor(m.id);
    var blocks = JULIOEL_EMAILS.map(function (em) {
      var rt = rs[em];
      if (!rt || !rt.stars) return '';
      return '<div class="who">' + esc(userLabel(em)) + '</div><div class="row">' + starsHtml(rt.stars) + '</div>';
    }).join('');
    var purl = m.poster ? (m.poster.indexOf('http') === 0 ? m.poster : TMDB_IMG + m.poster) : '';
    html += '<div class="mcard" style="animation-delay:' + (idx * 0.04) + 's" onclick="openDetail(\'' + esc(m.id) + '\')">'
      + '<div class="mposter">' + (purl ? '<img src="' + esc(purl) + '" alt="">' : '<span class="ph">🎬</span>') + '</div>'
      + '<div class="mbody"><div class="mtitle">' + esc(m.title) + '</div><div class="myear">' + esc(m.year) + '</div>'
      + (blocks ? '<div class="mstars">' + blocks + '</div>' : '') + '</div></div>';
  });
  html += '</div>';
  el.innerHTML = html;
  if (JB.staggerChildren) JB.staggerChildren(el.querySelector('.mgrid'), 'mv-lib');
}

function moviesTab(tab) {
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
  fetch('https://api.themoviedb.org/3/search/movie?api_key=' + encodeURIComponent(tmdbKey()) + '&language=pt-BR&query=' + encodeURIComponent(q))
    .then(function (r) { return r.json(); })
    .then(function (data) {
      var list = data.results || [];
      if (!list.length) { out.innerHTML = '<div class="empty">Nada encontrado.</div>'; return; }
      out.innerHTML = '<div class="sresults">' + list.slice(0, 12).map(function (m) {
        var inLib = movies.some(function (x) { return x.id === String(m.id); });
        return '<div class="srow" onclick="addFromTmdb(' + m.id + ')">'
          + (m.poster_path ? '<img src="' + esc(TMDB_IMG + m.poster_path) + '" alt="">' : '<div class="ph">🎬</div>')
          + '<div class="info"><div class="t">' + esc(m.title || '') + '</div><div class="y">' + esc(String(m.release_date || '').slice(0, 4) || '—') + (inLib ? ' · na biblioteca' : '') + '</div></div></div>';
      }).join('') + '</div>';
    })
    .catch(function () { out.innerHTML = '<div class="empty">Erro na busca.</div>'; });
}

function addFromTmdb(tmdbId) {
  if (movies.some(function (m) { return m.id === String(tmdbId); })) {
    moviesTab('lib');
    openDetail(String(tmdbId));
    return;
  }
  if (!tmdbKey()) return;
  fetch('https://api.themoviedb.org/3/movie/' + tmdbId + '?api_key=' + encodeURIComponent(tmdbKey()) + '&language=pt-BR')
    .then(function (r) { return r.json(); })
    .then(function (m) {
      var row = [String(m.id), m.title || '', String((m.release_date || '').slice(0, 4)), m.poster_path || '', JB.fmtDate(new Date())];
      return JB.api('POST', ssUrl('/values/' + encodeURIComponent('Filmes') + ':append?valueInputOption=RAW&insertDataOption=INSERT_ROWS'), { values: [row] })
        .then(function () { return loadAll(); })
        .then(function () { JB.toast('✓ Adicionado'); moviesTab('lib'); openDetail(String(m.id)); });
    })
    .catch(function (e) { JB.toast('Erro: ' + (e.message || '')); });
}

function openDetail(id) {
  detailId = id;
  var m = movies.find(function (x) { return x.id === String(id); });
  if (!m) return;
  document.getElementById('detailTitle').textContent = m.title;
  var poster = m.poster ? (m.poster.indexOf('http') === 0 ? m.poster : TMDB_IMG + m.poster) : '';
  var rs = ratingsFor(m.id);
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
    + (poster ? '<img src="' + esc(poster) + '" alt="">' : '<div class="ph">🎬</div>')
    + '<div class="dmeta"><h2>' + esc(m.title) + '</h2><p>' + esc(m.year) + '</p></div></div>' + blocks
    + (JULIOEL_EMAILS.indexOf(myEm) > -1 ? '<button class="btn-primary" style="width:100%;margin-top:4px" onclick="saveDetail()">Salvar minha avaliação</button>' : '');
  document.getElementById('detailOv').classList.add('open');
}

function closeDetail() { document.getElementById('detailOv').classList.remove('open'); detailId = null; }

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

function saveDetail() {
  if (!detailId) return;
  var em = (JB.email() || '').toLowerCase();
  if (JULIOEL_EMAILS.indexOf(em) < 0) return;
  var wrap = document.getElementById('starPick');
  var stars = parseInt(wrap && wrap.getAttribute('data-val'), 10) || 0;
  var reviewEl = wrap && wrap.parentNode.querySelector('.review-in');
  var review = reviewEl ? (reviewEl.value || '').trim().slice(0, REVIEW_MAX) : '';
  if (!stars) { JB.toast('Escolha as estrelas'); return; }
  var existing = ratings.find(function (r) { return r.movieId === String(detailId) && r.email === em; });
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
    properties: { title: 'Julioelboard Movies' },
    sheets: [{ properties: { title: 'Filmes' } }, { properties: { title: 'Avaliacoes' } }]
  }).then(function (ss) {
    JB.setSheetId('movies', ss.spreadsheetId);
    moviesGrid = { Filmes: ss.sheets[0].properties.sheetId, Avaliacoes: ss.sheets[1].properties.sheetId };
    return ensureHeaders().then(function () {
      document.getElementById('sheetInfo').textContent = 'ID: ' + ss.spreadsheetId;
      document.getElementById('sheetIdIn').value = ss.spreadsheetId;
      JB.toast('Planilha criada — compartilhe com Julia');
      closeMoviesSet();
      return boot();
    });
  }).catch(function (e) { JB.toast('Erro: ' + (e.message || '')); });
}

function saveSheetId() {
  var id = (document.getElementById('sheetIdIn').value || '').trim();
  if (!id) return;
  JB.setSheetId('movies', id);
  JB.toast('ID salvo');
  closeMoviesSet();
  boot();
}

function openMoviesSet() {
  document.getElementById('sheetInfo').textContent = JB.getSheetId('movies') ? ('ID: ' + JB.getSheetId('movies')) : 'Nenhuma planilha vinculada.';
  document.getElementById('sheetIdIn').value = JB.getSheetId('movies') || '';
  document.getElementById('setOverlay').classList.add('open');
}
function closeMoviesSet() { document.getElementById('setOverlay').classList.remove('open'); }

function moviesSignIn() { JB.signIn({ onSuccess: boot }); }
function moviesSignOut() { try { localStorage.removeItem('jb_julioel'); } catch (_) {} JB.signOut(); location.href = '/'; }

JB.applySkin('hub');
if (JB.hasSession()) JB.ensureToken(false).then(boot).catch(boot);
else boot();
