/* Joelboard Recipes — shared cookbooks (collab). © 2026 Joel Soluções LTDA. */
var RC_COLLAB_TABS = [
  ['Meta', ['Nome', 'Icone', 'Cor', 'Ordem', 'Criado', 'Atualizado', 'ID', 'OwnerEmail']],
  ['Recipes', ['ID', 'CookbookID', 'Titulo', 'Icone', 'ImageUrl', 'Porcoes', 'Minutos', 'Notas', 'Ordem', 'Source', 'SourceID', 'Criado']],
  ['Ingredients', ['ID', 'RecipeID', 'Texto', 'Qtd', 'Unidade', 'Ordem', 'PartID', 'Qtd2', 'Unidade2']],
  ['Steps', ['ID', 'RecipeID', 'Texto', 'Ordem', 'PartID']],
  ['Parts', ['ID', 'RecipeID', 'Nome', 'Ordem', 'SourceIngID']],
  ['Membros', ['Email', 'Nome', 'Icone', 'Papel', 'Status', 'Entrou']]
];
var collabGrids = {};
var _rcPollTimer = null;
var _rcPollKick = null;
var _rcSyncChain = Promise.resolve();
var _rcCollabSig = {};
var _rcPollTick = 0;
var _rcLastActivity = 0;
var _rcWatchedSid = null;
var _rcPollStale = false;
var _rcWritePending = 0;
var RC_POLL_FAST = 7000;
var RC_POLL_SLOW = 40000;
var RC_POLL_IDLE_MS = 90000;

function rcWithSync(fn) {
  _rcSyncChain = _rcSyncChain.then(fn, fn);
  return _rcSyncChain;
}

function rcBody(rows) { return (rows || []).slice(1); }

function rcPackSignature(recipes, ings, steps, parts, metaRow, members) {
  var rec = (recipes || []).slice().sort(function (a, b) { return String(a.id).localeCompare(String(b.id)); }).map(function (x) {
    return x.id + '\t' + x.title + '\t' + x.icon + '\t' + x.order + '\t' + (x.notes || '');
  }).join('\n');
  var ing = (ings || []).slice().sort(function (a, b) { return String(a.id).localeCompare(String(b.id)); }).map(function (x) {
    return x.id + '\t' + x.recipeId + '\t' + x.text + '\t' + x.qty + '\t' + (x.partId || '');
  }).join('\n');
  var st = (steps || []).slice().sort(function (a, b) { return String(a.id).localeCompare(String(b.id)); }).map(function (x) {
    return x.id + '\t' + x.recipeId + '\t' + x.text + '\t' + (x.partId || '');
  }).join('\n');
  var pt = (parts || []).slice().sort(function (a, b) { return String(a.id).localeCompare(String(b.id)); }).map(function (x) {
    return x.id + '\t' + x.recipeId + '\t' + x.name + '\t' + x.order;
  }).join('\n');
  var mem = (members || []).slice().sort(function (a, b) { return String(a.email || '').localeCompare(String(b.email || '')); }).map(function (m) {
    return (m.email || '') + '\t' + (m.nome || '') + '\t' + (m.icone || '') + '\t' + (m.status || '');
  }).join('\n');
  return String((metaRow && metaRow[5]) || '') + '\n' + rec + '\n' + ing + '\n' + st + '\n' + pt + '\n' + mem;
}

function rcWriteBegin() { _rcWritePending++; }
function rcWriteEnd() {
  _rcWritePending = Math.max(0, _rcWritePending - 1);
  rcFlushPollStale();
}
function rcGuardWrite(p) {
  rcWriteBegin();
  return Promise.resolve(p).then(function (v) {
    rcWriteEnd();
    return v;
  }, function (e) {
    rcWriteEnd();
    throw e;
  });
}
function rcCollabSyncBlocked() {
  if (_rcWritePending > 0) return true;
  if (typeof JB !== 'undefined' && JB.outboxCount && JB.outboxCount() > 0) return true;
  return false;
}
function rcPollDefer() { _rcPollStale = true; }
function rcFlushPollStale() {
  if (!_rcPollStale || rcCollabSyncBlocked()) return;
  _rcPollStale = false;
  var b = typeof bookById === 'function' ? bookById(openBookId) : null;
  if (!b || !b.collabSheetId) return;
  rcRefreshCollabOnly(true).then(rcHandlePollResult).catch(function () {});
}
function rcHandlePollResult(res) {
  if (!res || !res.changed) return;
  if (rcCollabSyncBlocked()) { rcPollDefer(); return; }
  if (res.remote) toast('Livro atualizado em outro dispositivo');
  if (typeof render === 'function') render();
}

function rcParseJoinSheetId(raw) {
  raw = String(raw || '').trim();
  if (!raw) return '';
  try { raw = decodeURIComponent(raw.replace(/\+/g, '%20')); } catch (_) {}
  var sheets = raw.match(/\/spreadsheets\/d\/([a-zA-Z0-9_-]{20,})/i);
  if (sheets) return sheets[1];
  var join = raw.match(/[?&]join=([^&]+)/i);
  if (join) {
    try { raw = decodeURIComponent(join[1]); } catch (_) { raw = join[1]; }
  }
  if (/^[a-zA-Z0-9_-]{20,}$/.test(raw)) return raw;
  return '';
}

function rcIsCollabSpreadsheetGrid(grid) {
  return !!(grid && grid.Meta != null && grid.Membros != null && grid.Cookbooks == null);
}

function rcCollabUrl(sid, p) {
  return 'https://sheets.googleapis.com/v4/spreadsheets/' + sid + p;
}

function rcEmail() { return (JB.email() || '').toLowerCase(); }

function rcProfileName() {
  if (JB.profileName) {
    var n = JB.profileName();
    if (n) return n;
  }
  return '';
}

function rcProfileIcon() {
  if (JB.profileIcon && rcProfileName()) return JB.profileIcon();
  return JB.profileIcon ? JB.profileIcon() : '👤';
}

function rcOpenBook() {
  return (typeof bookById === 'function') ? bookById(openBookId) : null;
}

function rcDisplayLabel(em) {
  em = (em || '').toLowerCase();
  if (em === rcEmail() && rcProfileName()) return rcProfileName();
  var b = rcOpenBook();
  if (b && b.collabMembers) {
    for (var i = 0; i < b.collabMembers.length; i++) {
      if ((b.collabMembers[i].email || '').toLowerCase() === em && b.collabMembers[i].nome) return b.collabMembers[i].nome;
    }
  }
  return (em || '').split('@')[0] || '?';
}

function rcMemberIcon(em, members) {
  em = (em || '').toLowerCase();
  if (em === rcEmail()) return rcProfileIcon();
  members = members || (rcOpenBook() && rcOpenBook().collabMembers) || [];
  for (var i = 0; i < members.length; i++) {
    if ((members[i].email || '').toLowerCase() === em && members[i].icone) return members[i].icone;
  }
  return '👤';
}

function rcMemberAvatarsHtml(b) {
  if (!b || !b.collabMembers || !b.collabMembers.length) return '';
  return b.collabMembers.filter(function (m) { return m.status === 'active' || m.status === 'pending'; }).slice(0, 4).map(function (m) {
    return '<span class="nc-av" title="' + esc(rcDisplayLabel(m.email)) + '">' + esc(rcMemberIcon(m.email, b.collabMembers)) + '</span>';
  }).join('');
}

function rcParseMembers(rows) {
  return rcBody(rows).map(function (r) {
    return { email: String(r[0] || '').toLowerCase(), nome: String(r[1] || ''), icone: String(r[2] || ''), papel: String(r[3] || 'editor'), status: String(r[4] || 'active'), entrou: String(r[5] || '') };
  }).filter(function (m) { return m.email; });
}

function rcMemberNeedsProfileWrite(m, em, nome, icone) {
  if (!m || (m.email || '').toLowerCase() !== (em || '').toLowerCase()) return false;
  nome = String(nome || '').trim();
  icone = String(icone || '').trim();
  return (nome && m.nome !== nome) || (icone && m.icone !== icone);
}

function rcWriteMemberProfile(sid, m) {
  if (!sid || !m || !m.email) return Promise.resolve();
  var em = String(m.email).toLowerCase();
  var nome = rcProfileName();
  var icone = rcProfileIcon();
  return JB.api('GET', rcCollabUrl(sid, '/values/Membros?valueRenderOption=UNFORMATTED_VALUE')).then(function (res) {
    var v = res.values || [];
    for (var i = 1; i < v.length; i++) {
      if (String((v[i] || [])[0]).toLowerCase() !== em) continue;
      var r = v[i] || [];
      var cur = { email: em, nome: String(r[1] || ''), icone: String(r[2] || ''), papel: String(r[3] || m.papel || 'editor'), status: String(r[4] || m.status || 'active'), entrou: String(r[5] || m.entrou || '') };
      if (!rcMemberNeedsProfileWrite(cur, em, nome, icone)) return;
      var status = cur.status === 'pending' ? 'active' : (cur.status || 'active');
      var entrou = cur.entrou || new Date().toISOString();
      return JB.api('PUT', rcCollabUrl(sid, '/values/' + encodeURIComponent('Membros!B' + (i + 1) + ':F' + (i + 1)) + '?valueInputOption=RAW'), {
        values: [[nome, icone, cur.papel || 'editor', status, entrou]]
      }).then(function () {
        m.nome = nome;
        m.icone = icone;
        m.status = status;
        m.entrou = entrou;
      });
    }
  });
}

function rcSyncMyMemberProfile(b, membersRows) {
  if (!b || !b.collabSheetId) return Promise.resolve();
  var em = rcEmail();
  var members = b.collabMembers || (membersRows ? rcParseMembers(membersRows) : []);
  var mine = null;
  for (var i = 0; i < members.length; i++) { if (members[i].email === em) { mine = members[i]; break; } }
  if (!mine || !rcMemberNeedsProfileWrite(mine, em, rcProfileName(), rcProfileIcon())) return Promise.resolve();
  return rcWriteMemberProfile(b.collabSheetId, mine).then(function () {
    b.collabMembers = members;
    if (openBookId === b.id && typeof render === 'function') render();
  }).catch(function () {});
}

function rcSyncMyMemberOnAllBooks() {
  (DATA && DATA.cookbooks || []).forEach(function (b) {
    if (b && b.collabSheetId) rcSyncMyMemberProfile(b);
  });
}

function rcStripCollabFromData() {
  var dropBooks = {}, dropRecs = {};
  (DATA.cookbooks || []).forEach(function (b) { if (b.collabSheetId) dropBooks[b.id] = 1; });
  (DATA.recipes || []).forEach(function (r) {
    if (dropBooks[r.cookbookId] || r.collabSheetId) dropRecs[r.id] = 1;
  });
  DATA.cookbooks = (DATA.cookbooks || []).filter(function (b) { return !b.collabSheetId; });
  DATA.recipes = (DATA.recipes || []).filter(function (r) { return !dropRecs[r.id]; });
  DATA.ingredients = (DATA.ingredients || []).filter(function (x) { return !dropRecs[x.recipeId]; });
  DATA.steps = (DATA.steps || []).filter(function (x) { return !dropRecs[x.recipeId]; });
  DATA.parts = (DATA.parts || []).filter(function (p) { return !dropRecs[p.recipeId]; });
  Object.keys(dropBooks).forEach(function (id) { delete _rcCollabSig[id]; });
}

function rcStampRecipe(r, sid) {
  r.collabSheetId = sid;
  return r;
}

function rcApplyCollabPack(bookId, pack) {
  var oldRecIds = {};
  (DATA.recipes || []).forEach(function (r) { if (r.cookbookId === bookId) oldRecIds[r.id] = 1; });
  var recs = parseRecipes(pack.recipes).map(function (r) {
    r.cookbookId = bookId;
    return rcStampRecipe(r, pack.sid);
  });
  DATA.recipes = (DATA.recipes || []).filter(function (r) { return r.cookbookId !== bookId; }).concat(recs);
  DATA.ingredients = (DATA.ingredients || []).filter(function (x) { return !oldRecIds[x.recipeId]; }).concat(parseIngredients(pack.ingredients));
  DATA.steps = (DATA.steps || []).filter(function (x) { return !oldRecIds[x.recipeId]; }).concat(parseSteps(pack.steps));
  DATA.parts = (DATA.parts || []).filter(function (p) { return !oldRecIds[p.recipeId]; }).concat(parseParts(pack.parts));
  if (pack.sid && typeof seedRowCacheForSid === 'function') {
    seedRowCacheForSid(pack.sid, 'Recipes', pack.recipes, 0);
    seedRowCacheForSid(pack.sid, 'Ingredients', pack.ingredients, 0);
    seedRowCacheForSid(pack.sid, 'Steps', pack.steps, 0);
    seedRowCacheForSid(pack.sid, 'Parts', pack.parts, 0);
  }
}

function rcFetchCollabPack(sid, opts) {
  opts = opts || {};
  if (collabGrids[sid]) return rcLoadCollabSheetData(sid, collabGrids[sid], opts);
  return JB.api('GET', rcCollabUrl(sid, '?fields=sheets.properties(sheetId,title)')).then(function (meta) {
    var grid = {};
    (meta.sheets || []).forEach(function (sh) { grid[sh.properties.title] = sh.properties.sheetId; });
    collabGrids[sid] = grid;
    return rcLoadCollabSheetData(sid, grid, opts);
  });
}

function rcLoadCollabSheetData(sid, grid, opts) {
  opts = opts || {};
  var tabs = ['Meta', 'Recipes', 'Ingredients', 'Steps', 'Parts'];
  if (opts.members !== false) tabs.push('Membros');
  tabs = tabs.filter(function (t) { return grid[t] != null; });
  if (!tabs.length) return Promise.resolve(null);
  var q = tabs.map(function (t) { return 'ranges=' + encodeURIComponent(t); }).join('&');
  return JB.api('GET', rcCollabUrl(sid, '/values:batchGet?' + q + '&valueRenderOption=UNFORMATTED_VALUE')).then(function (res) {
    var by = {};
    (res.valueRanges || []).forEach(function (vr, i) { by[tabs[i]] = vr.values || []; });
    return {
      sid: sid, grid: grid,
      meta: by.Meta || [], recipes: by.Recipes || [], ingredients: by.Ingredients || [],
      steps: by.Steps || [], parts: by.Parts || [], membros: by.Membros || []
    };
  });
}

function rcPeekMetaAtualizado(sid) {
  return JB.api('GET', rcCollabUrl(sid, '/values/Meta!F2?valueRenderOption=UNFORMATTED_VALUE')).then(function (res) {
    var v = (res.values || [])[0];
    return v ? String(v[0] || '') : '';
  }).catch(function () { return ''; });
}

function rcMergeRegistryRow(reg, pack) {
  var metaRow = rcBody(pack.meta)[0];
  if (!metaRow || !metaRow[6]) return null;
  var members = rcParseMembers(pack.membros);
  var my = null;
  for (var mi = 0; mi < members.length; mi++) { if (members[mi].email === rcEmail()) { my = members[mi]; break; } }
  return {
    id: String(metaRow[6]),
    name: String(metaRow[0] || reg[0] || ''),
    icon: String(metaRow[1] || '📖'),
    color: String(metaRow[2] || '#e07a5f'),
    order: Number(metaRow[3]) || 0,
    created: String(metaRow[4] || ''),
    atualizado: String(reg[5] || metaRow[5] || ''),
    collabSheetId: pack.sid,
    collabRole: String(reg[2] || (my && my.papel) || 'editor'),
    collabOwner: String(reg[3] || metaRow[7] || ''),
    collabMembers: members
  };
}

function rcLoadCollabBooks() {
  if (!DATA || !recipesGrid['Compartilhadas']) return Promise.resolve();
  if (JB.isGhost && JB.isGhost()) return Promise.resolve();
  return rcWithSync(function () {
    return JB.api('GET', personalSsUrl('/values/Compartilhadas?valueRenderOption=UNFORMATTED_VALUE')).then(function (res) {
      var regs = rcBody(res.values || []);
      rcStripCollabFromData();
      if (!regs.length) return;
      var failed = 0;
      return Promise.all(regs.map(function (reg) {
        var sid = String(reg[1] || '');
        if (!sid) return null;
        return rcFetchCollabPack(sid).then(function (pack) {
          if (!pack) { failed++; return; }
          var b = rcMergeRegistryRow(reg, pack);
          if (!b) { failed++; return; }
          DATA.cookbooks.push(b);
          rcApplyCollabPack(b.id, pack);
          _rcCollabSig[b.id] = rcBookContentSig(b.id, rcBody(pack.meta)[0], b.collabMembers);
          rcSyncMyMemberProfile(b, pack.membros);
        }).catch(function () { failed++; });
      })).then(function () {
        DATA.cookbooks.sort(function (a, b) { return a.order - b.order || a.name.localeCompare(b.name); });
        if (failed && typeof toast === 'function') {
          toast(failed === 1
            ? 'Um livro compartilhado não abriu — confira o acesso Editor no Drive.'
            : failed + ' livros compartilhados não abriram — confira o acesso no Drive.');
        }
        rcMigrateCollabDriveFolders();
      });
    });
  }).catch(function () {});
}

function rcMigrateCollabDriveFolders() {
  if (JB.isGhost && JB.isGhost()) return;
  if (!JB.placeFileInFolder && !JB.ensureDriveShortcut) return;
  if (!JB.ensureRecipesSharedFolder) return;
  var me = String(rcEmail() || '').toLowerCase();
  var chain = Promise.resolve();
  (DATA.cookbooks || []).forEach(function (b) {
    if (!b || !b.collabSheetId) return;
    var role = String(b.collabRole || '').toLowerCase();
    var owner = String(b.collabOwner || '').toLowerCase();
    var isOwner = role === 'owner' || (!!me && owner === me);
    chain = chain.then(function () {
      return JB.ensureRecipesSharedFolder().then(function (folderId) {
        if (!folderId) return;
        if (isOwner) {
          return JB.placeFileInFolder ? JB.placeFileInFolder(b.collabSheetId, folderId) : null;
        }
        if (!JB.ensureDriveShortcut) return null;
        return JB.ensureDriveShortcut(b.collabSheetId, folderId, b.name || 'Livro compartilhado');
      });
    });
  });
  chain.catch(function () {});
}

function rcBookContentSig(bookId, metaRow, members) {
  var recs = recipesInBook(bookId);
  var recIds = {};
  recs.forEach(function (r) { recIds[r.id] = 1; });
  return rcPackSignature(
    recs,
    (DATA.ingredients || []).filter(function (x) { return recIds[x.recipeId]; }),
    (DATA.steps || []).filter(function (x) { return recIds[x.recipeId]; }),
    (DATA.parts || []).filter(function (p) { return recIds[p.recipeId]; }),
    metaRow,
    members
  );
}

function rcRefreshCollabOnly(force) {
  var b = rcOpenBook();
  if (!b || !b.collabSheetId) return Promise.resolve({ changed: false });
  if (!force && rcCollabSyncBlocked()) {
    rcPollDefer();
    return Promise.resolve({ changed: false });
  }
  var bookId = b.id, sheetId = b.collabSheetId;
  return rcWithSync(function () {
    function applyPack(pack) {
      if (!pack) return { changed: false };
      var cur = bookById(bookId);
      if (!cur || cur.collabSheetId !== sheetId) return { changed: false };
      var metaRow = rcBody(pack.meta)[0];
      rcApplyCollabPack(bookId, pack);
      if (metaRow) {
        cur.name = String(metaRow[0] || cur.name);
        cur.icon = String(metaRow[1] || cur.icon);
        cur.color = String(metaRow[2] || cur.color);
        cur.order = Number(metaRow[3]) || cur.order;
        cur.atualizado = String(metaRow[5] || cur.atualizado);
      }
      if (pack.membros && pack.membros.length) cur.collabMembers = rcParseMembers(pack.membros);
      var sig = rcBookContentSig(bookId, metaRow, cur.collabMembers);
      var changed = _rcCollabSig[bookId] !== sig;
      _rcCollabSig[bookId] = sig;
      return { changed: changed, remote: !!changed };
    }
    if (!force) {
      return rcPeekMetaAtualizado(sheetId).then(function (remoteAt) {
        var cur = bookById(bookId);
        _rcPollTick++;
        var metaSame = cur && remoteAt && remoteAt === cur.atualizado && _rcCollabSig[bookId];
        var wantMembers = !metaSame || (_rcPollTick % 4 === 0);
        if (metaSame && !wantMembers) return { changed: false };
        return rcFetchCollabPack(sheetId, { members: wantMembers }).then(applyPack);
      });
    }
    return rcFetchCollabPack(sheetId).then(applyPack);
  });
}

function rcBumpCollabActivity() { _rcLastActivity = Date.now(); }

function rcSetCollabWatch(sid) {
  sid = sid || null;
  if (_rcWatchedSid === sid) return;
  if (_rcWatchedSid && JB.unwatchSheetId) JB.unwatchSheetId(_rcWatchedSid);
  _rcWatchedSid = sid;
  if (sid && JB.watchSheetId) {
    JB.watchSheetId(sid, function () {
      var cur = rcOpenBook();
      if (cur && cur.collabSheetId === sid) {
        rcRefreshCollabOnly(true).then(rcHandlePollResult).catch(function () {});
      }
    });
  }
}

function rcSyncWatch() {
  var b = rcOpenBook();
  rcSetCollabWatch(b && b.collabSheetId ? b.collabSheetId : null);
}

function rcPollDelay() {
  if (!_rcLastActivity || (Date.now() - _rcLastActivity) > RC_POLL_IDLE_MS) return RC_POLL_SLOW;
  return RC_POLL_FAST;
}

function rcSchedulePoll() {
  if (_rcPollTimer) clearTimeout(_rcPollTimer);
  _rcPollTimer = setTimeout(function () {
    _rcPollTimer = null;
    var b = rcOpenBook();
    if (!b || !b.collabSheetId) { rcSchedulePoll(); return; }
    if (!document.hidden) {
      rcRefreshCollabOnly().then(rcHandlePollResult).catch(function () {});
    }
    rcSchedulePoll();
  }, rcPollDelay());
}

function rcStartCollabPoll() {
  if (_rcPollKick) return;
  _rcPollKick = 1;
  if (!_rcLastActivity) _rcLastActivity = Date.now();
  document.addEventListener('pointerdown', rcBumpCollabActivity, { passive: true });
  document.addEventListener('keydown', rcBumpCollabActivity, { passive: true });
  rcSchedulePoll();
}

function rcRegistryRowVals(entry) {
  return [entry.titulo, entry.sheetId, entry.papel, entry.owner, entry.cookbookId, entry.atualizado || new Date().toISOString()];
}

function rcAppendRegistry(entry) {
  return JB.api('POST', personalSsUrl('/values/Compartilhadas:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS'), { values: [rcRegistryRowVals(entry)] });
}

function rcFindRegistryRow(cookbookId, sheetId) {
  return JB.api('GET', personalSsUrl('/values/Compartilhadas?valueRenderOption=UNFORMATTED_VALUE')).then(function (res) {
    var v = res.values || [];
    for (var i = 1; i < v.length; i++) {
      var row = v[i] || [];
      if (cookbookId && String(row[4]) === String(cookbookId)) return i + 1;
      if (sheetId && String(row[1]) === String(sheetId)) return i + 1;
    }
    return -1;
  });
}

function rcRemoveRegistry(cookbookId) {
  return rcFindRegistryRow(cookbookId).then(function (row) {
    if (row < 0) return;
    return JB.api('POST', personalSsUrl(':batchUpdate'), {
      requests: [{ deleteDimension: { range: { sheetId: recipesGrid['Compartilhadas'], dimension: 'ROWS', startIndex: row - 1, endIndex: row } } }]
    });
  });
}

function rcMemberRow(em, nome, icone, papel, status) {
  return [em, nome || '', icone || '👤', papel || 'editor', status || 'active', new Date().toISOString()];
}

function rcMetaRowVals(b) {
  return [
    b.name, b.icon || '📖', b.color || '#e07a5f', String(b.order || 0),
    b.created || '', b.atualizado || new Date().toISOString(), b.id, b.collabOwner || rcEmail()
  ];
}

function rcBumpMeta(sid) {
  if (!sid) return Promise.resolve();
  var iso = new Date().toISOString();
  var b = (DATA.cookbooks || []).filter(function (x) { return x.collabSheetId === sid; })[0];
  if (b) b.atualizado = iso;
  return JB.api('PUT', rcCollabUrl(sid, '/values/Meta!F2?valueInputOption=RAW'), { values: [[iso]] }).catch(function () {});
}

function rcTouchBook(book) {
  if (!book || !book.collabSheetId) return Promise.resolve();
  return rcBumpMeta(book.collabSheetId);
}

function rcCreateCollabSpreadsheet(book, recipes, ings, steps, parts) {
  var em = rcEmail();
  var title = '🍳 Joelboard Livro — ' + (book.name || 'Livro compartilhado');
  var metaVals = rcMetaRowVals({
    name: book.name, icon: book.icon, color: book.color, order: book.order,
    created: book.created, atualizado: new Date().toISOString(), id: book.id, collabOwner: em
  });
  var recVals = (recipes || []).map(recipeRowVals);
  var ingVals = (ings || []).map(ingRowVals);
  var stepVals = (steps || []).map(stepRowVals);
  var partVals = (parts || []).map(partRowVals);
  var members = [rcMemberRow(em, rcProfileName(), rcProfileIcon(), 'owner', 'active')];

  return JB.api('POST', 'https://sheets.googleapis.com/v4/spreadsheets', {
    properties: { title: title },
    sheets: RC_COLLAB_TABS.map(function (t) { return { properties: { title: t[0] } }; })
  }).then(function (ss) {
    var sid = ss.spreadsheetId;
    var grid = {};
    (ss.sheets || []).forEach(function (sh) {
      if (sh.properties && sh.properties.title) grid[sh.properties.title] = sh.properties.sheetId;
    });
    if (grid.Meta != null) collabGrids[sid] = grid;
    var place = (JB.ensureRecipesSharedFolder
      ? JB.ensureRecipesSharedFolder().then(function (folderId) {
          return JB.placeFileInFolder ? JB.placeFileInFolder(sid, folderId) : null;
        })
      : Promise.resolve());
    var data = RC_COLLAB_TABS.map(function (t) { return { range: t[0] + '!A1', values: [t[1]] }; });
    data.push({ range: 'Meta!A2', values: [metaVals] });
    if (recVals.length) data.push({ range: 'Recipes!A2', values: recVals });
    if (ingVals.length) data.push({ range: 'Ingredients!A2', values: ingVals });
    if (stepVals.length) data.push({ range: 'Steps!A2', values: stepVals });
    if (partVals.length) data.push({ range: 'Parts!A2', values: partVals });
    data.push({ range: 'Membros!A2', values: members });
    return place.then(function () {
      return JB.api('POST', rcCollabUrl(sid, '/values:batchUpdate'), { valueInputOption: 'RAW', data: data }).then(function () {
        return rcAppendRegistry({
          titulo: book.name, sheetId: sid, papel: 'owner', owner: em, cookbookId: book.id, atualizado: new Date().toISOString()
        }).then(function () { return sid; });
      });
    });
  });
}

function rcOtherPersonalBooks(exceptId) {
  return (DATA.cookbooks || []).filter(function (x) {
    return x && x.id && x.id !== exceptId && !x.collabSheetId;
  }).map(function (x) {
    return {
      id: x.id, name: x.name, icon: x.icon, color: x.color,
      order: x.order, created: x.created
    };
  });
}

function rcReattachPersonalBooks(saved) {
  (saved || []).forEach(function (o) {
    if (o && o.id && !bookById(o.id)) DATA.cookbooks.push(o);
  });
  if (!saved || !saved.length) return Promise.resolve();
  if (JB.isGhost && JB.isGhost()) return Promise.resolve();
  return JB.api('GET', personalSsUrl('/values/Cookbooks?valueRenderOption=UNFORMATTED_VALUE')).then(function (res) {
    var have = {};
    ((res.values || []).slice(1)).forEach(function (r) {
      if (r && r[0]) have[String(r[0])] = 1;
    });
    var missing = (saved || []).filter(function (o) { return o && o.id && !have[o.id]; });
    if (!missing.length) return null;
    return JB.api('POST', personalSsUrl('/values/Cookbooks!A:F:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS'), {
      values: missing.map(bookRowVals)
    });
  }).catch(function () {});
}

function rcDeletePrivateCookbook(book) {
  var recs = recipesInBook(book.id);
  var recIds = {};
  recs.forEach(function (r) { recIds[r.id] = true; });
  var sid = personalSid();
  var cookGid = recipesGrid.Cookbooks;
  var recGid = recipesGrid.Recipes;
  return Promise.all([
    JB.api('GET', personalSsUrl('/values/Ingredients?valueRenderOption=UNFORMATTED_VALUE')),
    JB.api('GET', personalSsUrl('/values/Steps?valueRenderOption=UNFORMATTED_VALUE')),
    JB.api('GET', personalSsUrl('/values/Recipes?valueRenderOption=UNFORMATTED_VALUE')),
    JB.api('GET', personalSsUrl('/values/Cookbooks?valueRenderOption=UNFORMATTED_VALUE')),
    recipesGrid.Parts != null
      ? JB.api('GET', personalSsUrl('/values/Parts?valueRenderOption=UNFORMATTED_VALUE'))
      : Promise.resolve({ values: [] })
  ]).then(function (pack) {
    var ingRows = collectRowNumsAny(pack[0].values, 1, recIds);
    var stepRows = collectRowNumsAny(pack[1].values, 1, recIds);
    var partRows = collectRowNumsAny(pack[4].values, 1, recIds);
    var recipeRows = [];
    var recipeVals = pack[2].values || [];
    for (var i = 1; i < recipeVals.length; i++) {
      var rr = recipeVals[i] || [];
      if (recIds[String(rr[0] || '')] || String(rr[1] || '') === String(book.id)) recipeRows.push(i + 1);
    }
    var bookRow = -1;
    var bookVals = pack[3].values || [];
    for (var j = 1; j < bookVals.length; j++) {
      if (String((bookVals[j] || [])[0] || '') === String(book.id)) { bookRow = j + 1; break; }
    }
    var reqs = [];
    function pushDeletes(sheetId, rows) {
      if (sheetId == null || sheetId === '') return;
      rows.sort(function (a, b) { return b - a; }).forEach(function (rn) {
        if (rn < 2) return;
        reqs.push({ deleteDimension: { range: { sheetId: sheetId, dimension: 'ROWS', startIndex: rn - 1, endIndex: rn } } });
      });
    }
    if (cookGid == null || recGid == null || cookGid !== recGid) {
      pushDeletes(recipesGrid.Ingredients, ingRows);
      pushDeletes(recipesGrid.Steps, stepRows);
      pushDeletes(recipesGrid.Parts, partRows);
      pushDeletes(recGid, recipeRows);
    }
    if (bookRow > 1) pushDeletes(cookGid, [bookRow]);
    if (!reqs.length) return null;
    ['Ingredients', 'Steps', 'Parts', 'Recipes', 'Cookbooks'].forEach(function (tab) {
      if (typeof invalidateRowCacheForSid === 'function') invalidateRowCacheForSid(sid, tab);
    });
    return JB.api('POST', personalSsUrl(':batchUpdate'), { requests: reqs });
  });
}

function rcShareBookClick() {
  var b = rcOpenBook();
  if (!b) return;
  if (b.collabSheetId) rcOpenShare();
  else rcShareFromPrivate();
}

function rcPromoteGhost(book) {
  book.collabSheetId = book.collabSheetId || ('ghost-rc-' + book.id);
  book.collabRole = 'owner';
  book.collabOwner = rcEmail() || 'cursor-ghost@localhost';
  book.collabMembers = [{
    email: book.collabOwner, nome: rcProfileName() || 'Cursor', icone: rcProfileIcon() || '👻',
    papel: 'owner', status: 'active'
  }];
  recipesInBook(book.id).forEach(function (r) { r.collabSheetId = book.collabSheetId; });
  if (typeof render === 'function') render();
  toast('✓ Livro compartilhado — convide alguém em Compartilhar');
  rcOpenShare();
}

function rcShareFromPrivate() {
  var b = rcOpenBook();
  if (!b || b.collabSheetId) return;
  if (JB.isGhost && JB.isGhost()) {
    rcEnsureProfile(function () { rcPromoteGhost(b); });
    return;
  }
  rcEnsureProfile(function () {
    JB.confirm('Tornar compartilhado?', 'O livro será copiado para uma planilha compartilhada no Drive. A versão privada será removida daqui. Seus prazos no Calendar continuam só seus.', function () {
      loadingHtml('<div class="gate"><div class="gs" style="margin-top:60px">Criando livro compartilhado…</div></div>');
      var recs = recipesInBook(b.id);
      var recIds = {};
      recs.forEach(function (r) { recIds[r.id] = true; });
      var ings = (DATA.ingredients || []).filter(function (x) { return recIds[x.recipeId]; });
      var steps = (DATA.steps || []).filter(function (x) { return recIds[x.recipeId]; });
      var parts = (DATA.parts || []).filter(function (p) { return recIds[p.recipeId]; });
      var others = rcOtherPersonalBooks(b.id);
      rcWriteBegin();
      rcCreateCollabSpreadsheet(b, recs, ings, steps, parts).then(function (sid) {
        b.collabSheetId = sid;
        b.collabRole = 'owner';
        b.collabOwner = rcEmail();
        b.collabMembers = [{ email: rcEmail(), nome: rcProfileName(), icone: rcProfileIcon(), papel: 'owner', status: 'active' }];
        recs.forEach(function (r) { r.collabSheetId = sid; });
        return rcDeletePrivateCookbook(b);
      }).then(function () {
        DATA.cookbooks = (DATA.cookbooks || []).filter(function (x) { return x.id !== b.id; });
        DATA.cookbooks.push(b);
        others.forEach(function (o) { if (!bookById(o.id)) DATA.cookbooks.push(o); });
        return rcLoadCollabBooks().catch(function () {});
      }).then(function () {
        return rcReattachPersonalBooks(others);
      }).then(function () {
        if (!bookById(b.id)) {
          DATA.cookbooks.push(b);
          recs.forEach(function (r) { r.collabSheetId = b.collabSheetId; });
        }
        showApp();
        openBook(b.id);
        toast('✓ Livro compartilhado — convide alguém em Compartilhar');
        rcOpenShare();
      }).catch(function (e) {
        showApp();
        if (typeof render === 'function') render();
        toast('Erro: ' + ((e && e.message) || 'falha'));
      }).then(function () { rcWriteEnd(); }, function () { rcWriteEnd(); });
    }, { yes: 'Compartilhar', no: 'Cancelar' });
  });
}

function rcShareJoinUrl(b) {
  return location.origin + '/recipes/?join=' + encodeURIComponent(b.collabSheetId);
}

function rcGrantEditorAccess(sid, email) {
  return JB.api('POST', 'https://www.googleapis.com/drive/v3/files/' + encodeURIComponent(sid) + '/permissions?sendNotificationEmail=false&supportsAllDrives=true', {
    role: 'writer',
    type: 'user',
    emailAddress: email
  }).catch(function (e) {
    var m = String((e && e.message) || '');
    if (m.indexOf('403') > -1 || m.indexOf('400') > -1 || m.indexOf('409') > -1 || m.indexOf('already') > -1) return;
    throw e;
  });
}

function rcShareSheetUrl(b) {
  return 'https://docs.google.com/spreadsheets/d/' + b.collabSheetId + '/edit';
}

function rcOpenShare() {
  var b = rcOpenBook();
  if (!b || !b.collabSheetId) return;
  $('shareListTitle').textContent = b.name || 'Livro';
  $('shareInviteEmail').value = '';
  rcRenderShareMembers(b);
  $('shareJoinLink').value = rcShareJoinUrl(b);
  $('shareSheetLink').value = (JB.isGhost && JB.isGhost()) ? '' : rcShareSheetUrl(b);
  $('shareOverlay').classList.add('open');
}

function rcOpenDriveShare() {
  var b = rcOpenBook();
  if (!b || !b.collabSheetId) return;
  if (JB.isGhost && JB.isGhost()) { toast('No ghost não há planilha no Drive'); return; }
  window.open(rcShareSheetUrl(b), '_blank', 'noopener,noreferrer');
}

function rcMailInvite(email, b) {
  var joinUrl = rcShareJoinUrl(b);
  var sheetUrl = rcShareSheetUrl(b);
  var sub = encodeURIComponent('Livro compartilhado no Joelboard: ' + (b.name || 'Livro'));
  var bodyTxt = encodeURIComponent(
    'Oi!\n\nCompartilhei um livro de receitas com você no Joelboard Recipes.\n\n'
    + '1) Abra este link e entre com Google:\n' + joinUrl + '\n\n'
    + '2) No Google Drive, aceite acesso Editor à planilha (se ainda não tiver):\n' + sheetUrl + '\n'
  );
  window.location.href = 'mailto:' + encodeURIComponent(email) + '?subject=' + sub + '&body=' + bodyTxt;
}

function rcCloseShare() { $('shareOverlay').classList.remove('open'); }

function rcRenderShareMembers(b) {
  var el = $('shareMembers');
  if (!el) return;
  el.innerHTML = (b.collabMembers || []).map(function (m) {
    return '<div class="share-mrow"><span class="share-mav">' + esc(rcMemberIcon(m.email, b.collabMembers)) + '</span><span class="share-mname">' + esc(rcDisplayLabel(m.email)) + '</span><span class="share-mem">' + esc(m.email) + '</span><span class="share-mst">' + esc(m.status === 'pending' ? 'convite' : m.papel) + '</span></div>';
  }).join('') || '<div class="rg">Nenhum membro ainda.</div>';
}

function rcCopyShareField(id) {
  var el = $(id);
  if (!el || !el.value) { toast('Nada para copiar'); return; }
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(el.value).then(function () { toast('✓ Copiado'); }).catch(function () { rcCopyShareFallback(el); });
    return;
  }
  rcCopyShareFallback(el);
}

function rcCopyShareFallback(el) {
  el.focus();
  el.select();
  try { document.execCommand('copy'); toast('✓ Copiado'); } catch (_) { toast('Copie manualmente'); }
}

function rcInviteMember() {
  var b = rcOpenBook();
  if (!b || !b.collabSheetId) return;
  var raw = ($('shareInviteEmail').value || '').trim().toLowerCase();
  if (!raw || raw.indexOf('@') < 1) { toast('E-mail inválido'); return; }
  var dup = false;
  (b.collabMembers || []).forEach(function (m) { if (m.email === raw) dup = true; });
  if (dup) { toast('Já está no livro'); return; }

  function afterAdded() {
    b.collabMembers = b.collabMembers || [];
    b.collabMembers.push({ email: raw, nome: '', icone: '👤', papel: 'editor', status: 'pending', entrou: '' });
    rcRenderShareMembers(b);
    if (typeof render === 'function') render();
    $('shareInviteEmail').value = '';
    toast('✓ Convite salvo — abrindo e-mail…');
    setTimeout(function () { rcMailInvite(raw, b); }, 400);
  }

  if (JB.isGhost && JB.isGhost()) { afterAdded(); return; }

  JB.persist({
    run: function () {
      return JB.api('POST', rcCollabUrl(b.collabSheetId, '/values/Membros:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS'), {
        values: [rcMemberRow(raw, '', '👤', 'editor', 'pending')]
      }).then(function () {
        return rcGrantEditorAccess(b.collabSheetId, raw);
      }).then(function () { return rcBumpMeta(b.collabSheetId); });
    },
    onSuccess: afterAdded,
    onError: function (e) {
      toast('Erro ao convidar: ' + ((e && e.message) || 'falha ao salvar'));
    }
  });
}

function rcJoinCollab(sheetId) {
  sheetId = rcParseJoinSheetId(sheetId);
  if (!sheetId) return Promise.reject(new Error('link_invalido'));
  loadingHtml('<div class="gate"><div class="gs" style="margin-top:60px">Entrando no livro…</div></div>');
  return Promise.resolve().then(function () {
    if (JB.getSheetId('recipes') === sheetId) {
      throw new Error('planilha_compartilhada_como_pessoal');
    }
    return rcFetchCollabPack(sheetId);
  }).then(function (pack) {
    if (!pack) throw new Error('planilha_invalida');
    var metaRow = rcBody(pack.meta)[0];
    if (!metaRow || !metaRow[6]) throw new Error('lista_nao_encontrada');
    var em = rcEmail();
    var members = rcParseMembers(pack.membros);
    var me = null;
    for (var j = 0; j < members.length; j++) { if (members[j].email === em) { me = members[j]; break; } }
    if (!me) {
      members.push({ email: em, nome: rcProfileName(), icone: rcProfileIcon(), papel: 'editor', status: 'active', entrou: new Date().toISOString() });
      return JB.api('POST', rcCollabUrl(sheetId, '/values/Membros:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS'), {
        values: [rcMemberRow(em, rcProfileName(), rcProfileIcon(), 'editor', 'active')]
      }).then(function () { return { pack: pack, metaRow: metaRow, members: members }; });
    }
    if (me.status === 'pending') {
      return rcActivateMember(sheetId, em).then(function () {
        me.status = 'active';
        me.nome = rcProfileName();
        me.icone = rcProfileIcon();
        return { pack: pack, metaRow: metaRow, members: members };
      });
    }
    return rcWriteMemberProfile(sheetId, me).catch(function () {}).then(function () {
      return { pack: pack, metaRow: metaRow, members: members };
    });
  }).then(function (ctx) {
    return rcFindRegistryRow(ctx.metaRow[6], sheetId).then(function (row) {
      if (row > 0) return;
      return rcAppendRegistry({
        titulo: String(ctx.metaRow[0] || ''),
        sheetId: sheetId,
        papel: 'editor',
        owner: String(ctx.metaRow[7] || ''),
        cookbookId: String(ctx.metaRow[6]),
        atualizado: new Date().toISOString()
      });
    }).then(function () {
      if (!JB.ensureDriveShortcut || !JB.ensureRecipesSharedFolder) return;
      var titulo = String(ctx.metaRow[0] || '').trim();
      return JB.ensureRecipesSharedFolder().then(function (folderId) {
        if (!folderId) return;
        return JB.ensureDriveShortcut(sheetId, folderId, titulo || 'Livro compartilhado');
      }).catch(function () {});
    }).then(function () { return ctx; });
  }).then(function (ctx) {
    if (typeof JB !== 'undefined' && JB.qsClearJoin) JB.qsClearJoin();
    else try { history.replaceState(null, '', location.pathname); } catch (_) {}
    return rcLoadCollabBooks().then(function () {
      showApp();
      if (typeof applyRoute === 'function') applyRoute();
      if (!bookById(String(ctx.metaRow[6])) || (typeof JB.qsGet === 'function' && !JB.qsGet().r && !JB.qsGet().b)) {
        openBook(String(ctx.metaRow[6]));
      }
      toast('✓ Livro compartilhado aberto');
    });
  });
}

function rcActivateMember(sid, em) {
  return JB.api('GET', rcCollabUrl(sid, '/values/Membros?valueRenderOption=UNFORMATTED_VALUE')).then(function (res) {
    var v = res.values || [];
    for (var i = 1; i < v.length; i++) {
      if (String((v[i] || [])[0]).toLowerCase() === em) {
        var r = v[i] || [];
        var papel = String(r[3] || 'editor');
        var entrou = String(r[5] || '') || new Date().toISOString();
        return JB.api('PUT', rcCollabUrl(sid, '/values/' + encodeURIComponent('Membros!B' + (i + 1) + ':F' + (i + 1)) + '?valueInputOption=RAW'), {
          values: [[rcProfileName(), rcProfileIcon(), papel, 'active', entrou]]
        });
      }
    }
  });
}

function rcJoinErrMessage(e) {
  var m = String((e && e.message) || '');
  if (m === 'link_invalido') return 'Link de convite inválido.';
  if (m === 'planilha_invalida' || m === 'lista_nao_encontrada') return 'Essa planilha não é um livro compartilhado do Joelboard.';
  if (m === 'planilha_compartilhada_como_pessoal') return 'Sua planilha pessoal estava apontando para o livro compartilhado — crie uma planilha pessoal separada.';
  if (m.indexOf('403') > -1 || m.indexOf('PERMISSION') > -1) return 'Sem acesso à planilha. Peça Editor no Drive e abra o link de novo.';
  if (m.indexOf('404') > -1) return 'Planilha não encontrada. Confira o link.';
  return m || 'não foi possível entrar';
}

function rcCheckJoinParam() {
  if (JB.isGhost && JB.isGhost()) return;
  var m = location.search.match(/[?&]join=([^&]+)/);
  if (!m) return;
  var sid = rcParseJoinSheetId(m[1]);
  if (!sid) { toast('Link de convite inválido'); return; }
  rcJoinCollab(sid).then(function () {
    if (!rcProfileName() && JB.ensureProfile) JB.ensureProfile();
  }).catch(function (e) {
    showApp();
    if (typeof render === 'function') render();
    toast('Erro: ' + rcJoinErrMessage(e));
  });
}

function rcDropBookFromApp(bookId) {
  var recIds = {};
  recipesInBook(bookId).forEach(function (r) { recIds[r.id] = true; });
  DATA.cookbooks = (DATA.cookbooks || []).filter(function (x) { return x.id !== bookId; });
  DATA.recipes = (DATA.recipes || []).filter(function (r) { return r.cookbookId !== bookId; });
  DATA.ingredients = (DATA.ingredients || []).filter(function (x) { return !recIds[x.recipeId]; });
  DATA.steps = (DATA.steps || []).filter(function (x) { return !recIds[x.recipeId]; });
  DATA.parts = (DATA.parts || []).filter(function (p) { return !recIds[p.recipeId]; });
  delete _rcCollabSig[bookId];
}

function rcLeaveOrDelete() {
  var b = rcOpenBook();
  if (!b || !b.collabSheetId) return;
  var isOwner = b.collabRole === 'owner' || String(b.collabOwner || '').toLowerCase() === rcEmail();
  var msg = isOwner
    ? 'Remover este livro compartilhado deste app? A planilha no Drive permanece — o outro continua com o livro.'
    : 'Sair deste livro compartilhado?';
  JB.confirm(isOwner ? 'Remover livro?' : 'Sair do livro?', msg, function () {
    function afterGone() {
      rcDropBookFromApp(b.id);
      openBookId = null;
      openRecipeId = null;
      view = 'shelf';
      rcSetCollabWatch(null);
      render();
      toast(isOwner ? '✓ Livro removido deste app' : '✓ Você saiu do livro');
    }
    if (JB.isGhost && JB.isGhost()) { afterGone(); return; }
    JB.persist({
      run: function () { return rcRemoveRegistry(b.id); },
      onSuccess: afterGone,
      onError: function (e) { toast((e && e.message) || 'Falha ao sair'); }
    });
  }, { yes: isOwner ? 'Remover' : 'Sair', no: 'Cancelar', danger: isOwner });
}

function rcEnsureProfile(cb) {
  if (JB.ensureProfile) { JB.ensureProfile(cb); return; }
  if (cb) cb();
}

if (JB.onProfileChange) {
  JB.onProfileChange(function () {
    if (JB.paintAcct) JB.paintAcct();
    rcSyncMyMemberOnAllBooks();
  });
}
