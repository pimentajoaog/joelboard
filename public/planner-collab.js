/* Joelboard Planner — shared plans (collab). © 2026 Joel Soluções LTDA. */
var PL_COLLAB_TABS = [
  ['Meta', ['Titulo', 'Subtitulo', 'Inicio', 'Fim', 'Icone', 'Criado', 'Atualizado', 'ID', 'OwnerEmail']],
  ['Dias', ['PlanoID', 'Data', 'Titulo', 'Icone', 'Ordem', 'ID']],
  ['Eventos', ['DiaID', 'Hora', 'HoraMin', 'Titulo', 'Nota', 'Icone', 'Tag', 'TagCor', 'Ordem', 'ID']],
  ['Membros', ['Email', 'Nome', 'Icone', 'Papel', 'Status', 'Entrou']]
];
var PL_PROFILE_ICONS = ['🧑', '👩', '🧑‍💻', '🌸', '🐱', '🦊', '🐻', '🦁', '🐼', '🦉', '🐸', '🦄', '⭐', '🔥', '💜', '✈️', '🍷', '📝', '☕', '🌴'];
var collabGrids = {};
var _plPollTimer = null;
var _plPollKick = null;
var _plSyncChain = Promise.resolve();
var _plCollabSig = {};
var _plPollTick = 0;
var _plLastActivity = 0;
var _plWatchedSid = null;
var _plPollStale = false;
var _plWritePending = 0;
var PL_POLL_FAST = 7000;
var PL_POLL_SLOW = 40000;
var PL_POLL_IDLE_MS = 90000;

function plWithSync(fn) {
  _plSyncChain = _plSyncChain.then(fn, fn);
  return _plSyncChain;
}

function plPackSignature(days, events, metaRow, members) {
  var d = (days || []).slice().sort(function (a, b) { return String(a.id).localeCompare(String(b.id)); }).map(function (x) {
    return x.id + '\t' + x.data + '\t' + x.titulo + '\t' + x.icone + '\t' + x.ordem;
  }).join('\n');
  var e = (events || []).slice().sort(function (a, b) { return String(a.id).localeCompare(String(b.id)); }).map(function (x) {
    return x.id + '\t' + x.diaId + '\t' + x.hora + '\t' + x.titulo + '\t' + x.nota + '\t' + x.tag + '\t' + x.ordem;
  }).join('\n');
  var mem = (members || []).slice().sort(function (a, b) { return String(a.email || '').localeCompare(String(b.email || '')); }).map(function (m) {
    return (m.email || '') + '\t' + (m.nome || '') + '\t' + (m.icone || '') + '\t' + (m.status || '');
  }).join('\n');
  return String((metaRow && metaRow[6]) || '') + '\n' + d + '\n' + e + '\n' + mem;
}

function plWriteBegin() { _plWritePending++; }
function plWriteEnd() {
  _plWritePending = Math.max(0, _plWritePending - 1);
  plFlushPollStale();
}
function plCollabSyncBlocked() {
  if (_plWritePending > 0) return true;
  if (typeof JB !== 'undefined' && JB.outboxCount && JB.outboxCount() > 0) return true;
  return false;
}
function plPollDefer() { _plPollStale = true; }
function plFlushPollStale() {
  if (!_plPollStale || plCollabSyncBlocked()) return;
  _plPollStale = false;
  if (!openPlanId || !plan(openPlanId) || !plan(openPlanId).collabSheetId) return;
  plRefreshCollabOnly(true).then(plHandlePollResult).catch(function () {});
}
function plHandlePollResult(res) {
  if (!res || !res.changed) return;
  if (plCollabSyncBlocked()) { plPollDefer(); return; }
  if (res.remote) toast('Plano atualizado em outro dispositivo');
  render();
}

function plParseJoinSheetId(raw) {
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

function plIsCollabSpreadsheetGrid(grid) {
  return !!(grid && grid['Meta'] != null && grid['Membros'] != null && grid['Planos'] == null);
}

function plCollabUrl(sid, p) {
  return 'https://sheets.googleapis.com/v4/spreadsheets/' + sid + p;
}

function plEmail() { return (JB.email() || '').toLowerCase(); }

function plProfileName() {
  if (JB.profileName) {
    var n = JB.profileName();
    if (n) return n;
  }
  return String((DATA && DATA.config && DATA.config.perfil_nome) || '').trim();
}

function plProfileIcon() {
  if (JB.profileIcon && plProfileName()) return JB.profileIcon();
  var legacy = String((DATA && DATA.config && DATA.config.perfil_icone) || '').trim();
  return legacy || (JB.profileIcon ? JB.profileIcon() : '👤');
}

function plDisplayLabel(em) {
  em = (em || '').toLowerCase();
  if (em === plEmail() && plProfileName()) return plProfileName();
  var p = plan(openPlanId);
  if (p && p.collabMembers) {
    for (var i = 0; i < p.collabMembers.length; i++) {
      if ((p.collabMembers[i].email || '').toLowerCase() === em && p.collabMembers[i].nome) return p.collabMembers[i].nome;
    }
  }
  return (em || '').split('@')[0] || '?';
}

function plMemberIcon(em, members) {
  em = (em || '').toLowerCase();
  if (em === plEmail()) return plProfileIcon();
  members = members || (plan(openPlanId) && plan(openPlanId).collabMembers) || [];
  for (var i = 0; i < members.length; i++) {
    if ((members[i].email || '').toLowerCase() === em && members[i].icone) return members[i].icone;
  }
  return '👤';
}

function plAcctLabel() {
  var nm = plProfileName();
  return (plProfileIcon() + ' ' + (nm || JB.email() || '')).trim();
}

function plPaintAcct() {
  if (JB.paintAcct) { JB.paintAcct(); return; }
  var el = $('acctEmail');
  if (el) el.textContent = plAcctLabel();
}

function plMemberAvatarsHtml(p) {
  if (!p || !p.collabMembers || !p.collabMembers.length) return '';
  return p.collabMembers.filter(function (m) { return m.status === 'active' || m.status === 'pending'; }).slice(0, 4).map(function (m) {
    return '<span class="nc-av" title="' + esc(plDisplayLabel(m.email)) + '">' + esc(plMemberIcon(m.email, p.collabMembers)) + '</span>';
  }).join('');
}

function plParseMembers(rows) {
  return body(rows).map(function (r) {
    return { email: String(r[0] || '').toLowerCase(), nome: String(r[1] || ''), icone: String(r[2] || ''), papel: String(r[3] || 'editor'), status: String(r[4] || 'active'), entrou: String(r[5] || '') };
  }).filter(function (m) { return m.email; });
}

function plMemberNeedsProfileWrite(m, em, nome, icone) {
  if (!m || (m.email || '').toLowerCase() !== (em || '').toLowerCase()) return false;
  nome = String(nome || '').trim();
  icone = String(icone || '').trim();
  return (nome && m.nome !== nome) || (icone && m.icone !== icone);
}

function plWriteMemberProfile(sid, m) {
  if (!sid || !m || !m.email) return Promise.resolve();
  var em = String(m.email).toLowerCase();
  var nome = plProfileName();
  var icone = plProfileIcon();
  return JB.api('GET', plCollabUrl(sid, '/values/Membros?valueRenderOption=UNFORMATTED_VALUE')).then(function (res) {
    var v = res.values || [];
    for (var i = 1; i < v.length; i++) {
      if (String((v[i] || [])[0]).toLowerCase() !== em) continue;
      var r = v[i] || [];
      var cur = { email: em, nome: String(r[1] || ''), icone: String(r[2] || ''), papel: String(r[3] || m.papel || 'editor'), status: String(r[4] || m.status || 'active'), entrou: String(r[5] || m.entrou || '') };
      if (!plMemberNeedsProfileWrite(cur, em, nome, icone)) return;
      var status = cur.status === 'pending' ? 'active' : (cur.status || 'active');
      var entrou = cur.entrou || new Date().toISOString();
      return JB.api('PUT', plCollabUrl(sid, '/values/' + encodeURIComponent('Membros!B' + (i + 1) + ':F' + (i + 1)) + '?valueInputOption=RAW'), {
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

function plSyncMyMemberProfile(p, membersRows) {
  if (!p || !p.collabSheetId) return Promise.resolve();
  var em = plEmail();
  var members = p.collabMembers || (membersRows ? plParseMembers(membersRows) : []);
  var mine = null;
  for (var i = 0; i < members.length; i++) { if (members[i].email === em) { mine = members[i]; break; } }
  if (!mine || !plMemberNeedsProfileWrite(mine, em, plProfileName(), plProfileIcon())) return Promise.resolve();
  return plWriteMemberProfile(p.collabSheetId, mine).then(function () {
    p.collabMembers = members;
    if (openPlanId === p.id && typeof render === 'function') render();
  }).catch(function () {});
}

function plSyncMyMemberOnAllPlans() {
  (DATA && DATA.planos || []).forEach(function (p) {
    if (p && p.collabSheetId) plSyncMyMemberProfile(p);
  });
}

function plStripCollabFromData() {
  var dropPlans = {}, dropDays = {};
  (DATA.planos || []).forEach(function (p) { if (p.collabSheetId) dropPlans[p.id] = 1; });
  (DATA.dias || []).forEach(function (d) { if (dropPlans[d.planoId]) dropDays[d.id] = 1; });
  DATA.planos = (DATA.planos || []).filter(function (p) { return !p.collabSheetId; });
  DATA.dias = (DATA.dias || []).filter(function (d) { return !dropPlans[d.planoId]; });
  DATA.eventos = (DATA.eventos || []).filter(function (e) { return !dropDays[e.diaId]; });
  Object.keys(dropPlans).forEach(function (id) { delete _plCollabSig[id]; });
}

function plApplyCollabPack(planoId, pack) {
  var days = parseDias(pack.dias);
  var evs = parseEventos(pack.eventos);
  var oldDayIds = {};
  (DATA.dias || []).forEach(function (d) { if (d.planoId === planoId) oldDayIds[d.id] = 1; });
  DATA.dias = (DATA.dias || []).filter(function (d) { return d.planoId !== planoId; }).concat(days);
  DATA.eventos = (DATA.eventos || []).filter(function (e) { return !oldDayIds[e.diaId]; }).concat(evs);
  if (pack.sid && typeof seedRowCacheForSid === 'function') {
    seedRowCacheForSid(pack.sid, 'Dias', pack.dias, 5);
    seedRowCacheForSid(pack.sid, 'Eventos', pack.eventos, 9);
  }
}

function plFetchCollabPack(sid, opts) {
  opts = opts || {};
  if (collabGrids[sid]) return plLoadCollabSheetData(sid, collabGrids[sid], opts);
  return JB.api('GET', plCollabUrl(sid, '?fields=sheets.properties(sheetId,title)')).then(function (meta) {
    var grid = {};
    (meta.sheets || []).forEach(function (sh) { grid[sh.properties.title] = sh.properties.sheetId; });
    collabGrids[sid] = grid;
    return plLoadCollabSheetData(sid, grid, opts);
  });
}

function plLoadCollabSheetData(sid, grid, opts) {
  opts = opts || {};
  var tabs = ['Meta', 'Dias', 'Eventos'];
  if (opts.members !== false) tabs.push('Membros');
  tabs = tabs.filter(function (t) { return grid[t] != null; });
  if (!tabs.length) return Promise.resolve(null);
  var q = tabs.map(function (t) { return 'ranges=' + encodeURIComponent(t); }).join('&');
  return JB.api('GET', plCollabUrl(sid, '/values:batchGet?' + q + '&valueRenderOption=UNFORMATTED_VALUE')).then(function (res) {
    var by = {};
    (res.valueRanges || []).forEach(function (vr, i) { by[tabs[i]] = vr.values || []; });
    return { sid: sid, grid: grid, meta: by.Meta || [], dias: by.Dias || [], eventos: by.Eventos || [], membros: by.Membros || [] };
  });
}

function plPeekMetaAtualizado(sid) {
  return JB.api('GET', plCollabUrl(sid, '/values/Meta!G2?valueRenderOption=UNFORMATTED_VALUE')).then(function (res) {
    var v = (res.values || [])[0];
    return v ? String(v[0] || '') : '';
  }).catch(function () { return ''; });
}

function plMergeRegistryRow(reg, pack) {
  var metaRow = body(pack.meta)[0];
  if (!metaRow || !metaRow[7]) return null;
  var members = plParseMembers(pack.membros);
  var my = null;
  for (var mi = 0; mi < members.length; mi++) { if (members[mi].email === plEmail()) { my = members[mi]; break; } }
  return {
    id: String(metaRow[7]),
    titulo: String(metaRow[0] || reg[0] || ''),
    subtitulo: String(metaRow[1] || ''),
    inicio: String(metaRow[2] || ''),
    fim: String(metaRow[3] || ''),
    icone: String(metaRow[4] || '📅'),
    criado: String(metaRow[5] || ''),
    atualizado: String(reg[5] || metaRow[6] || ''),
    collabSheetId: pack.sid,
    collabRole: String(reg[2] || (my && my.papel) || 'editor'),
    collabOwner: String(reg[3] || metaRow[8] || ''),
    collabMembers: members
  };
}

function plLoadCollabPlans() {
  if (!DATA || !plannerGrid['Compartilhadas']) return Promise.resolve();
  return plWithSync(function () {
    return JB.api('GET', personalSsUrl('/values/Compartilhadas?valueRenderOption=UNFORMATTED_VALUE')).then(function (res) {
      var regs = body(res.values || []);
      plStripCollabFromData();
      if (!regs.length) return;
      var failed = 0;
      return Promise.all(regs.map(function (reg) {
        var sid = String(reg[1] || '');
        if (!sid) return null;
        return plFetchCollabPack(sid).then(function (pack) {
          if (!pack) { failed++; return; }
          var p = plMergeRegistryRow(reg, pack);
          if (!p) { failed++; return; }
          DATA.planos.push(p);
          plApplyCollabPack(p.id, pack);
          _plCollabSig[p.id] = plPackSignature(daysOf(p.id), eventsOfPlan(p.id), body(pack.meta)[0], p.collabMembers);
          plSyncMyMemberProfile(p, pack.membros);
        }).catch(function () { failed++; });
      })).then(function () {
        if (failed && typeof toast === 'function') {
          toast(failed === 1
            ? 'Um plano compartilhado não abriu — confira o acesso Editor no Drive.'
            : failed + ' planos compartilhados não abriram — confira o acesso no Drive.');
        }
      });
    });
  }).catch(function () {});
}

function plRefreshCollabOnly(force) {
  var p = plan(openPlanId);
  if (!p || !p.collabSheetId) return Promise.resolve({ changed: false });
  if (!force && plCollabSyncBlocked()) {
    plPollDefer();
    return Promise.resolve({ changed: false });
  }
  var planId = p.id, sheetId = p.collabSheetId;
  return plWithSync(function () {
    function applyPack(pack) {
      if (!pack) return { changed: false };
      var cur = plan(planId);
      if (!cur || cur.collabSheetId !== sheetId) return { changed: false };
      var metaRow = body(pack.meta)[0];
      plApplyCollabPack(planId, pack);
      if (metaRow) {
        cur.titulo = String(metaRow[0] || cur.titulo);
        cur.subtitulo = String(metaRow[1] || '');
        cur.inicio = String(metaRow[2] || '');
        cur.fim = String(metaRow[3] || '');
        cur.icone = String(metaRow[4] || cur.icone);
        cur.atualizado = String(metaRow[6] || cur.atualizado);
      }
      if (pack.membros && pack.membros.length) cur.collabMembers = plParseMembers(pack.membros);
      var sig = plPackSignature(daysOf(planId), eventsOfPlan(planId), metaRow, cur.collabMembers);
      var changed = _plCollabSig[planId] !== sig;
      _plCollabSig[planId] = sig;
      return { changed: changed, remote: !!changed };
    }
    if (!force) {
      return plPeekMetaAtualizado(sheetId).then(function (remoteAt) {
        var cur = plan(planId);
        _plPollTick++;
        var metaSame = cur && remoteAt && remoteAt === cur.atualizado && _plCollabSig[planId];
        var wantMembers = !metaSame || (_plPollTick % 4 === 0);
        if (metaSame && !wantMembers) return { changed: false };
        return plFetchCollabPack(sheetId, { members: wantMembers }).then(applyPack);
      });
    }
    return plFetchCollabPack(sheetId).then(applyPack);
  });
}

function plBumpCollabActivity() { _plLastActivity = Date.now(); }

function plSetCollabWatch(sid) {
  sid = sid || null;
  if (_plWatchedSid === sid) return;
  if (_plWatchedSid && JB.unwatchSheetId) JB.unwatchSheetId(_plWatchedSid);
  _plWatchedSid = sid;
  if (sid && JB.watchSheetId) {
    JB.watchSheetId(sid, function () {
      if (openPlanId && plan(openPlanId) && plan(openPlanId).collabSheetId === sid) {
        plRefreshCollabOnly(true).then(plHandlePollResult).catch(function () {});
      }
    });
  }
}

function plPollDelay() {
  if (!_plLastActivity || (Date.now() - _plLastActivity) > PL_POLL_IDLE_MS) return PL_POLL_SLOW;
  return PL_POLL_FAST;
}

function plSchedulePoll() {
  if (_plPollTimer) clearTimeout(_plPollTimer);
  _plPollTimer = setTimeout(function () {
    _plPollTimer = null;
    if (!openPlanId || !plan(openPlanId) || !plan(openPlanId).collabSheetId) { plSchedulePoll(); return; }
    if (!document.hidden) {
      plRefreshCollabOnly().then(plHandlePollResult).catch(function () {});
    }
    plSchedulePoll();
  }, plPollDelay());
}

function plStartCollabPoll() {
  if (_plPollKick) return;
  _plPollKick = 1;
  if (!_plLastActivity) _plLastActivity = Date.now();
  document.addEventListener('pointerdown', plBumpCollabActivity, { passive: true });
  document.addEventListener('keydown', plBumpCollabActivity, { passive: true });
  plSchedulePoll();
}

function plRegistryRowVals(entry) {
  return [entry.titulo, entry.sheetId, entry.papel, entry.owner, entry.planoId, entry.atualizado || new Date().toISOString()];
}

function plAppendRegistry(entry) {
  return JB.api('POST', personalSsUrl('/values/Compartilhadas:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS'), { values: [plRegistryRowVals(entry)] });
}

function plFindRegistryRow(planoId, sheetId) {
  return JB.api('GET', personalSsUrl('/values/Compartilhadas?valueRenderOption=UNFORMATTED_VALUE')).then(function (res) {
    var v = res.values || [];
    for (var i = 1; i < v.length; i++) {
      var row = v[i] || [];
      if (planoId && String(row[4]) === String(planoId)) return i + 1;
      if (sheetId && String(row[1]) === String(sheetId)) return i + 1;
    }
    return -1;
  });
}

function plRemoveRegistry(planoId) {
  return plFindRegistryRow(planoId).then(function (row) {
    if (row < 0) return;
    return JB.api('POST', personalSsUrl(':batchUpdate'), {
      requests: [{ deleteDimension: { range: { sheetId: plannerGrid['Compartilhadas'], dimension: 'ROWS', startIndex: row - 1, endIndex: row } } }]
    });
  });
}

function plMemberRow(em, nome, icone, papel, status) {
  return [em, nome || '', icone || '👤', papel || 'editor', status || 'active', new Date().toISOString()];
}

function plCreateCollabSpreadsheet(p, days, events, inviteEmail) {
  var em = plEmail();
  var title = '📝 Joelboard Plano — ' + (p.titulo || 'Plano compartilhado');
  var metaVals = [p.titulo, p.subtitulo || '', p.inicio, p.fim, p.icone || '', p.criado, new Date().toISOString(), p.id, em];
  var dayVals = (days || []).map(dayRowVals);
  var evtVals = (events || []).map(evtRowVals);
  var members = [plMemberRow(em, plProfileName(), plProfileIcon(), 'owner', 'active')];
  if (inviteEmail && inviteEmail !== em) members.push(plMemberRow(inviteEmail, '', '👤', 'editor', 'pending'));

  return JB.api('POST', 'https://sheets.googleapis.com/v4/spreadsheets', {
    properties: { title: title },
    sheets: PL_COLLAB_TABS.map(function (t) { return { properties: { title: t[0] } }; })
  }).then(function (ss) {
    var sid = ss.spreadsheetId;
    var grid = {};
    (ss.sheets || []).forEach(function (sh) {
      if (sh.properties && sh.properties.title) grid[sh.properties.title] = sh.properties.sheetId;
    });
    if (grid['Meta'] != null) collabGrids[sid] = grid;
    var data = PL_COLLAB_TABS.map(function (t) { return { range: t[0] + '!A1', values: [t[1]] }; });
    data.push({ range: 'Meta!A2', values: [metaVals] });
    if (dayVals.length) data.push({ range: 'Dias!A2', values: dayVals });
    if (evtVals.length) data.push({ range: 'Eventos!A2', values: evtVals });
    data.push({ range: 'Membros!A2', values: members });
    return JB.api('POST', plCollabUrl(sid, '/values:batchUpdate'), { valueInputOption: 'RAW', data: data }).then(function () {
      return plAppendRegistry({ titulo: p.titulo, sheetId: sid, papel: 'owner', owner: em, planoId: p.id, atualizado: new Date().toISOString() }).then(function () {
        return sid;
      });
    });
  });
}

function plDeletePrivatePlan(p) {
  var days = daysOf(p.id);
  var personalRef = { id: p.id };
  return deleteDayRows(personalRef, days).then(function () {
    return findRowInSid(JB.getSheetId('planner'), 'Planos', 7, p.id).then(function (row) {
      if (row < 0) return;
      return JB.api('POST', personalSsUrl(':batchUpdate'), {
        requests: [{ deleteDimension: { range: { sheetId: plannerGrid['Planos'], dimension: 'ROWS', startIndex: row - 1, endIndex: row } } }]
      });
    });
  });
}

function plShareFromPrivate() {
  var p = plan(openPlanId);
  if (!p || p.collabSheetId) return;
  plEnsureProfile(function () {
    JB.confirm('Tornar compartilhado?', 'O plano será copiado para uma planilha compartilhada no Drive. A versão privada será removida daqui.', function () {
      loadingHtml('<div class="gate"><div class="gs" style="margin-top:60px">Criando plano compartilhado…</div></div>');
      var days = daysOf(p.id);
      var events = eventsOfPlan(p.id);
      plCreateCollabSpreadsheet(p, days, events, '').then(function (sid) {
        p.collabSheetId = sid;
        p.collabRole = 'owner';
        p.collabOwner = plEmail();
        p.collabMembers = [{ email: plEmail(), nome: plProfileName(), icone: plProfileIcon(), papel: 'owner', status: 'active' }];
        return plDeletePrivatePlan(p);
      }).then(function () {
        DATA.planos = (DATA.planos || []).filter(function (x) { return x.id !== p.id; });
        DATA.planos.push(p);
        return plLoadCollabPlans().catch(function () {});
      }).then(function () {
        if (!plan(p.id)) {
          DATA.planos.push(p);
          DATA.dias = (DATA.dias || []).filter(function (d) { return d.planoId !== p.id; }).concat(days);
          DATA.eventos = (DATA.eventos || []).filter(function (e) {
            return days.every(function (d) { return d.id !== e.diaId; });
          }).concat(events);
        }
        show();
        openPlan(p.id);
        toast('✓ Plano compartilhado — convide alguém em Compartilhar');
        plOpenShare();
      }).catch(function (e) {
        show();
        toast('Erro: ' + ((e && e.message) || 'falha'));
      });
    }, { yes: 'Compartilhar', no: 'Cancelar' });
  });
}

function plShareJoinUrl(p) {
  return location.origin + '/planner/?join=' + encodeURIComponent(p.collabSheetId);
}

function plGrantEditorAccess(sid, email) {
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

function plShareSheetUrl(p) {
  return 'https://docs.google.com/spreadsheets/d/' + p.collabSheetId + '/edit';
}

function plOpenShare() {
  var p = plan(openPlanId);
  if (!p || !p.collabSheetId) return;
  $('shareListTitle').textContent = p.titulo || 'Plano';
  $('shareInviteEmail').value = '';
  plRenderShareMembers(p);
  $('shareJoinLink').value = plShareJoinUrl(p);
  $('shareSheetLink').value = plShareSheetUrl(p);
  $('shareOverlay').classList.add('open');
}

function plOpenDriveShare() {
  var p = plan(openPlanId);
  if (!p || !p.collabSheetId) return;
  window.open(plShareSheetUrl(p), '_blank', 'noopener,noreferrer');
}

function plMailInvite(email, p) {
  var joinUrl = plShareJoinUrl(p);
  var sheetUrl = plShareSheetUrl(p);
  var sub = encodeURIComponent('Plano compartilhado no Joelboard: ' + (p.titulo || 'Plano'));
  var bodyTxt = encodeURIComponent(
    'Oi!\n\nCompartilhei um plano com você no Joelboard Planner.\n\n'
    + '1) Abra este link e entre com Google:\n' + joinUrl + '\n\n'
    + '2) No Google Drive, aceite acesso Editor à planilha (se ainda não tiver):\n' + sheetUrl + '\n'
  );
  window.location.href = 'mailto:' + encodeURIComponent(email) + '?subject=' + sub + '&body=' + bodyTxt;
}

function plCloseShare() { $('shareOverlay').classList.remove('open'); }

function plRenderShareMembers(p) {
  var el = $('shareMembers');
  if (!el) return;
  el.innerHTML = (p.collabMembers || []).map(function (m) {
    return '<div class="share-mrow"><span class="share-mav">' + esc(plMemberIcon(m.email, p.collabMembers)) + '</span><span class="share-mname">' + esc(plDisplayLabel(m.email)) + '</span><span class="share-mem">' + esc(m.email) + '</span><span class="share-mst">' + esc(m.status === 'pending' ? 'convite' : m.papel) + '</span></div>';
  }).join('') || '<div class="rg">Nenhum membro ainda.</div>';
}

function plCopyShareField(id) {
  var el = $(id);
  if (!el || !el.value) { toast('Nada para copiar'); return; }
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(el.value).then(function () { toast('✓ Copiado'); }).catch(function () { plCopyShareFallback(el); });
    return;
  }
  plCopyShareFallback(el);
}

function plCopyShareFallback(el) {
  el.focus();
  el.select();
  try { document.execCommand('copy'); toast('✓ Copiado'); } catch (_) { toast('Copie manualmente'); }
}

function plInviteMember() {
  var p = plan(openPlanId);
  if (!p || !p.collabSheetId) return;
  var raw = ($('shareInviteEmail').value || '').trim().toLowerCase();
  if (!raw || raw.indexOf('@') < 1) { toast('E-mail inválido'); return; }
  var dup = false;
  (p.collabMembers || []).forEach(function (m) { if (m.email === raw) dup = true; });
  if (dup) { toast('Já está no plano'); return; }

  function afterAdded() {
    p.collabMembers = p.collabMembers || [];
    p.collabMembers.push({ email: raw, nome: '', icone: '👤', papel: 'editor', status: 'pending', entrou: '' });
    plRenderShareMembers(p);
    $('shareInviteEmail').value = '';
    toast('✓ Convite salvo — abrindo e-mail…');
    setTimeout(function () { plMailInvite(raw, p); }, 400);
  }

  JB.persist({
    run: function () {
      return JB.api('POST', plCollabUrl(p.collabSheetId, '/values/Membros:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS'), {
        values: [plMemberRow(raw, '', '👤', 'editor', 'pending')]
      }).then(function () {
        return plGrantEditorAccess(p.collabSheetId, raw);
      });
    },
    onSuccess: afterAdded,
    onError: function (e) {
      toast('Erro ao convidar: ' + ((e && e.message) || 'falha ao salvar'));
    }
  });
}

function plJoinCollab(sheetId) {
  sheetId = plParseJoinSheetId(sheetId);
  if (!sheetId) return Promise.reject(new Error('link_invalido'));
  loadingHtml('<div class="gate"><div class="gs" style="margin-top:60px">Entrando no plano…</div></div>');
  var bootPersonal = (typeof ensurePersonalPlannerSheet === 'function') ? ensurePersonalPlannerSheet() : Promise.resolve();
  return bootPersonal.then(function () {
    if (JB.getSheetId('planner') === sheetId) {
      throw new Error('planilha_compartilhada_como_pessoal');
    }
    return plFetchCollabPack(sheetId);
  }).then(function (pack) {
    if (!pack) throw new Error('planilha_invalida');
    var metaRow = body(pack.meta)[0];
    if (!metaRow || !metaRow[7]) throw new Error('lista_nao_encontrada');
    var em = plEmail();
    var members = plParseMembers(pack.membros);
    var me = null;
    for (var j = 0; j < members.length; j++) { if (members[j].email === em) { me = members[j]; break; } }
    if (!me) {
      members.push({ email: em, nome: plProfileName(), icone: plProfileIcon(), papel: 'editor', status: 'active', entrou: new Date().toISOString() });
      return JB.api('POST', plCollabUrl(sheetId, '/values/Membros:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS'), {
        values: [plMemberRow(em, plProfileName(), plProfileIcon(), 'editor', 'active')]
      }).then(function () { return { pack: pack, metaRow: metaRow, members: members }; });
    }
    if (me.status === 'pending') {
      return plActivateMember(sheetId, em).then(function () {
        me.status = 'active';
        me.nome = plProfileName();
        me.icone = plProfileIcon();
        return { pack: pack, metaRow: metaRow, members: members };
      });
    }
    return plWriteMemberProfile(sheetId, me).catch(function () {}).then(function () {
      return { pack: pack, metaRow: metaRow, members: members };
    });
  }).then(function (ctx) {
    return plFindRegistryRow(ctx.metaRow[7], sheetId).then(function (row) {
      if (row > 0) return;
      return plAppendRegistry({
        titulo: String(ctx.metaRow[0] || ''),
        sheetId: sheetId,
        papel: 'editor',
        owner: String(ctx.metaRow[8] || ''),
        planoId: String(ctx.metaRow[7]),
        atualizado: new Date().toISOString()
      });
    }).then(function () { return ctx; });
  }).then(function (ctx) {
    history.replaceState(null, '', location.pathname);
    return plLoadCollabPlans().then(function () {
      show();
      openPlan(String(ctx.metaRow[7]));
      toast('✓ Plano compartilhado aberto');
    });
  });
}

function plActivateMember(sid, em) {
  return JB.api('GET', plCollabUrl(sid, '/values/Membros?valueRenderOption=UNFORMATTED_VALUE')).then(function (res) {
    var v = res.values || [];
    for (var i = 1; i < v.length; i++) {
      if (String((v[i] || [])[0]).toLowerCase() === em) {
        var r = v[i] || [];
        var papel = String(r[3] || 'editor');
        var entrou = String(r[5] || '') || new Date().toISOString();
        return JB.api('PUT', plCollabUrl(sid, '/values/' + encodeURIComponent('Membros!B' + (i + 1) + ':F' + (i + 1)) + '?valueInputOption=RAW'), {
          values: [[plProfileName(), plProfileIcon(), papel, 'active', entrou]]
        });
      }
    }
  });
}

function plJoinErrMessage(e) {
  var m = String((e && e.message) || '');
  if (m === 'link_invalido') return 'Link de convite inválido.';
  if (m === 'planilha_invalida' || m === 'lista_nao_encontrada') return 'Essa planilha não é um plano compartilhado do Joelboard.';
  if (m === 'planilha_compartilhada_como_pessoal') return 'Sua planilha pessoal estava apontando para o plano compartilhado — crie uma planilha pessoal separada.';
  if (m.indexOf('403') > -1 || m.indexOf('PERMISSION') > -1) return 'Sem acesso à planilha. Peça Editor no Drive e abra o link de novo.';
  if (m.indexOf('404') > -1) return 'Planilha não encontrada. Confira o link.';
  return m || 'não foi possível entrar';
}

function plCheckJoinParam() {
  var m = location.search.match(/[?&]join=([^&]+)/);
  if (!m) return;
  var sid = plParseJoinSheetId(m[1]);
  if (!sid) { toast('Link de convite inválido'); return; }
  plJoinCollab(sid).then(function () {
    if (!plProfileName() && JB.ensureProfile) JB.ensureProfile();
  }).catch(function (e) {
    show();
    var msg = plJoinErrMessage(e);
    if (String((e && e.message) || '') === 'planilha_compartilhada_como_pessoal') {
      if (typeof plPersonalGate === 'function') plPersonalGate('Seus planos privados precisam de uma planilha só sua, separada das compartilhadas.');
    }
    toast('Erro: ' + msg);
  });
}

function plLeaveOrDelete() {
  var p = plan(openPlanId);
  if (!p || !p.collabSheetId) return;
  var isOwner = p.collabRole === 'owner' || p.collabOwner === plEmail();
  var msg = isOwner ? 'Excluir plano compartilhado para todos neste app?' : 'Sair deste plano compartilhado?';
  JB.confirm(isOwner ? 'Excluir plano?' : 'Sair do plano?', msg, function () {
    JB.persist({
      run: function () { return plRemoveRegistry(p.id); },
      onSuccess: function () {
        var days = daysOf(p.id);
        DATA.planos = (DATA.planos || []).filter(function (x) { return x.id !== p.id; });
        DATA.dias = (DATA.dias || []).filter(function (d) { return d.planoId !== p.id; });
        DATA.eventos = (DATA.eventos || []).filter(function (e) { return days.every(function (d) { return d.id !== e.diaId; }); });
        openPlanId = null;
        render();
        toast(isOwner ? '✓ Plano removido' : '✓ Você saiu do plano');
      },
      onError: plWriteErr
    });
  }, { yes: isOwner ? 'Excluir' : 'Sair', no: 'Cancelar', danger: isOwner });
}

function plEnsureProfile(cb) {
  if (JB.ensureProfile) { JB.ensureProfile(cb); return; }
  if (cb) cb();
}

function plOpenProfile(cb) {
  if (JB.openProfile) JB.openProfile(cb);
}

function plCloseProfile() {
  if (JB.closeProfile) JB.closeProfile();
}

function plInitProfileSettings() {
  var prev = $('setProfilePreview');
  if (prev) prev.textContent = plProfileIcon();
  var nm = $('setProfileName');
  if (nm) nm.textContent = plProfileName() || JB.email() || '';
}

function plOpenProfileFromSettings() { plOpenProfile(); }

if (JB.onProfileChange) {
  JB.onProfileChange(function () {
    plPaintAcct();
    plInitProfileSettings();
    plSyncMyMemberOnAllPlans();
  });
}
