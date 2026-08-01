/* Joelboard Notas — shared lists (collab). © 2026 Joel Soluções LTDA. */
var NC_COLLAB_TABS = [
  ['Meta', ['Titulo', 'Tipo', 'Cor', 'Fixado', 'Criado', 'Atualizado', 'ID', 'Vence', 'OwnerEmail']],
  ['Itens', ['NotaID', 'Ordem', 'Texto', 'Marcavel', 'Feito', 'ID', 'Tipo']],
  ['Membros', ['Email', 'Nome', 'Icone', 'Papel', 'Status', 'Entrou']]
];
var NC_PROFILE_ICONS = ['🧑', '👩', '🧑‍💻', '🌸', '🐱', '🦊', '🐻', '🦁', '🐼', '🦉', '🐸', '🦄', '⭐', '🔥', '💜', '🛒', '✈️', '📝', '☕', '🌈'];
var collabGrids = {};
var _ncPollTimer = null;

function ncCollabUrl(sid, p) {
  return 'https://sheets.googleapis.com/v4/spreadsheets/' + sid + p;
}

function ncSsId() {
  if (!openNoteId) return JB.getSheetId('notas');
  var n = note(openNoteId);
  if (n && n.collabSheetId) return n.collabSheetId;
  return JB.getSheetId('notas');
}

function ncGrid() {
  if (!openNoteId) return notasGrid;
  var n = note(openNoteId);
  if (n && n.collabSheetId) return collabGrids[n.collabSheetId] || {};
  return notasGrid;
}

function ncEmail() { return (JB.email() || '').toLowerCase(); }

function ncProfileName() {
  return String((DATA && DATA.config && DATA.config.perfil_nome) || '').trim();
}

function ncProfileIcon() {
  return String((DATA && DATA.config && DATA.config.perfil_icone) || '').trim().slice(0, 8) || '👤';
}

function ncDisplayLabel(em) {
  em = (em || '').toLowerCase();
  if (em === ncEmail() && ncProfileName()) return ncProfileName();
  var n = note(openNoteId);
  if (n && n.collabMembers) {
    for (var i = 0; i < n.collabMembers.length; i++) {
      if ((n.collabMembers[i].email || '').toLowerCase() === em && n.collabMembers[i].nome) return n.collabMembers[i].nome;
    }
  }
  return (em || '').split('@')[0] || '?';
}

function ncMemberIcon(em, members) {
  em = (em || '').toLowerCase();
  if (em === ncEmail()) return ncProfileIcon();
  members = members || (note(openNoteId) && note(openNoteId).collabMembers) || [];
  for (var i = 0; i < members.length; i++) {
    if ((members[i].email || '').toLowerCase() === em && members[i].icone) return members[i].icone;
  }
  return '👤';
}

function ncAcctLabel() {
  var nm = ncProfileName();
  return (ncProfileIcon() + ' ' + (nm || JB.email() || '')).trim();
}

function ncMemberAvatarsHtml(n) {
  if (!n || !n.collabMembers || !n.collabMembers.length) return '';
  return n.collabMembers.filter(function (m) { return m.status === 'active' || m.status === 'pending'; }).slice(0, 4).map(function (m) {
    return '<span class="nc-av" title="' + esc(ncDisplayLabel(m.email)) + '">' + esc(ncMemberIcon(m.email, n.collabMembers)) + '</span>';
  }).join('');
}

function ncEditorMembersHtml(n) {
  if (!n || !n.collabSheetId) return '';
  var chips = (n.collabMembers || []).map(function (m) {
    var st = m.status === 'pending' ? ' (convite)' : '';
    return '<span class="nc-mchip">' + esc(ncMemberIcon(m.email, n.collabMembers)) + ' ' + esc(ncDisplayLabel(m.email)) + esc(st) + '</span>';
  }).join('');
  return '<div class="nc-ed-members"><span class="dl">👥 Membros</span><div class="nc-mchips">' + chips + '</div></div>';
}

function ncParseMembers(rows) {
  return body(rows).map(function (r) {
    return { email: String(r[0] || '').toLowerCase(), nome: String(r[1] || ''), icone: String(r[2] || ''), papel: String(r[3] || 'editor'), status: String(r[4] || 'active'), entrou: String(r[5] || '') };
  }).filter(function (m) { return m.email; });
}

function ncStripCollabFromData() {
  var drop = {};
  (DATA.notas || []).forEach(function (n) { if (n.collabSheetId) drop[n.id] = 1; });
  DATA.notas = (DATA.notas || []).filter(function (n) { return !n.collabSheetId; });
  DATA.itens = (DATA.itens || []).filter(function (it) { return !drop[it.notaId]; });
}

function ncFetchCollabPack(sid) {
  if (collabGrids[sid]) {
    return ncLoadCollabSheetData(sid, collabGrids[sid]);
  }
  return JB.api('GET', ncCollabUrl(sid, '?fields=sheets.properties(sheetId,title)')).then(function (meta) {
    var grid = {};
    (meta.sheets || []).forEach(function (sh) { grid[sh.properties.title] = sh.properties.sheetId; });
    collabGrids[sid] = grid;
    return ncLoadCollabSheetData(sid, grid);
  });
}

function ncLoadCollabSheetData(sid, grid) {
  var tabs = ['Meta', 'Itens', 'Membros'].filter(function (t) { return grid[t] != null; });
  if (!tabs.length) return Promise.resolve(null);
  var q = tabs.map(function (t) { return 'ranges=' + encodeURIComponent(t); }).join('&');
  return JB.api('GET', ncCollabUrl(sid, '/values:batchGet?' + q + '&valueRenderOption=UNFORMATTED_VALUE')).then(function (res) {
    var by = {};
    (res.valueRanges || []).forEach(function (vr, i) { by[tabs[i]] = vr.values || []; });
    return { sid: sid, grid: grid, meta: by.Meta || [], itens: by.Itens || [], membros: by.Membros || [] };
  });
}

function ncMergeRegistryRow(reg, pack) {
  var metaRow = body(pack.meta)[0];
  if (!metaRow || !metaRow[6]) return null;
  var members = ncParseMembers(pack.membros);
  var my = null;
  for (var mi = 0; mi < members.length; mi++) { if (members[mi].email === ncEmail()) { my = members[mi]; break; } }
  return {
    id: String(metaRow[6]),
    titulo: String(metaRow[0] || reg[0] || ''),
    tipo: String(metaRow[1] || 'tarefas'),
    cor: String(metaRow[2] || ''),
    fixado: false,
    criado: String(metaRow[4] || ''),
    atualizado: String(reg[5] || metaRow[5] || ''),
    vence: String(metaRow[7] || ''),
    collabSheetId: pack.sid,
    collabRole: String(reg[2] || my && my.papel || 'editor'),
    collabOwner: String(reg[3] || metaRow[8] || ''),
    collabMembers: members
  };
}

function ncLoadCollabLists() {
  if (!DATA || !notasGrid['Compartilhadas']) return Promise.resolve();
  return JB.api('GET', personalSsUrl('/values/Compartilhadas?valueRenderOption=UNFORMATTED_VALUE')).then(function (res) {
    var regs = body(res.values || []);
    ncStripCollabFromData();
    if (!regs.length) return;
    return Promise.all(regs.map(function (reg) {
      var sid = String(reg[1] || '');
      if (!sid) return null;
      return ncFetchCollabPack(sid).then(function (pack) {
        if (!pack) return;
        var n = ncMergeRegistryRow(reg, pack);
        if (!n) return;
        DATA.notas.push(n);
        body(pack.itens).filter(function (r) { return r[5]; }).forEach(function (r) {
          DATA.itens.push({ id: r[5], notaId: String(r[0] || n.id), ordem: Number(r[1]) || 0, texto: String(r[2] || ''), marcavel: !!r[3], feito: !!r[4], tipo: String(r[6] || '') });
        });
      }).catch(function () {});
    }));
  }).catch(function () {});
}

function ncRefreshCollabOnly() {
  var n = note(openNoteId);
  if (!n || !n.collabSheetId) return Promise.resolve();
  return ncFetchCollabPack(n.collabSheetId).then(function (pack) {
    if (!pack) return;
    DATA.itens = (DATA.itens || []).filter(function (it) { return it.notaId !== n.id; });
    body(pack.itens).filter(function (r) { return r[5]; }).forEach(function (r) {
      DATA.itens.push({ id: r[5], notaId: String(r[0] || n.id), ordem: Number(r[1]) || 0, texto: String(r[2] || ''), marcavel: !!r[3], feito: !!r[4], tipo: String(r[6] || '') });
    });
    var metaRow = body(pack.meta)[0];
    if (metaRow) {
      n.titulo = String(metaRow[0] || n.titulo);
      n.atualizado = String(metaRow[5] || n.atualizado);
      n.vence = String(metaRow[7] || '');
    }
    n.collabMembers = ncParseMembers(pack.membros);
  });
}

function ncStartCollabPoll() {
  if (_ncPollTimer) return;
  _ncPollTimer = setInterval(function () {
    if (!openNoteId || !note(openNoteId) || !note(openNoteId).collabSheetId) return;
    if (document.hidden) return;
    ncRefreshCollabOnly().then(function () { render(); }).catch(function () {});
  }, 20000);
}

function ncRegistryRowVals(entry) {
  return [entry.titulo, entry.sheetId, entry.papel, entry.owner, entry.listaId, entry.atualizado || new Date().toISOString()];
}

function ncAppendRegistry(entry) {
  return JB.api('POST', personalSsUrl('/values/Compartilhadas:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS'), { values: [ncRegistryRowVals(entry)] });
}

function ncFindRegistryRow(listaId) {
  return JB.api('GET', personalSsUrl('/values/Compartilhadas?valueRenderOption=UNFORMATTED_VALUE')).then(function (res) {
    var v = res.values || [];
    for (var i = 1; i < v.length; i++) {
      if (String((v[i] || [])[4]) === String(listaId)) return i + 1;
    }
    return -1;
  });
}

function ncRemoveRegistry(listaId) {
  return ncFindRegistryRow(listaId).then(function (row) {
    if (row < 0) return;
    return JB.api('POST', personalSsUrl(':batchUpdate'), {
      requests: [{ deleteDimension: { range: { sheetId: notasGrid['Compartilhadas'], dimension: 'ROWS', startIndex: row - 1, endIndex: row } } }]
    });
  });
}

function ncMemberRow(em, nome, icone, papel, status) {
  return [em, nome || '', icone || '👤', papel || 'editor', status || 'active', new Date().toISOString()];
}

function ncCreateCollabSpreadsheet(n, items, inviteEmail) {
  var em = ncEmail();
  var title = '📝 Joelboard — ' + (n.titulo || 'Lista compartilhada');
  var metaVals = [n.titulo, n.tipo, n.cor || '', n.fixado ? '1' : '', n.criado, new Date().toISOString(), n.id, n.vence || '', em];
  var itemVals = (items || []).map(itemRowVals);
  var members = [ncMemberRow(em, ncProfileName(), ncProfileIcon(), 'owner', 'active')];
  if (inviteEmail && inviteEmail !== em) members.push(ncMemberRow(inviteEmail, '', '👤', 'editor', 'pending'));

  return JB.api('POST', 'https://sheets.googleapis.com/v4/spreadsheets', {
    properties: { title: title },
    sheets: NC_COLLAB_TABS.map(function (t) { return { properties: { title: t[0] } }; })
  }).then(function (ss) {
    var sid = ss.spreadsheetId;
    var data = NC_COLLAB_TABS.map(function (t) { return { range: t[0] + '!A1', values: [t[1]] }; });
    data.push({ range: 'Meta!A2', values: [metaVals] });
    if (itemVals.length) data.push({ range: 'Itens!A2', values: itemVals });
    data.push({ range: 'Membros!A2', values: members });
    return JB.api('POST', ncCollabUrl(sid, '/values:batchUpdate'), { valueInputOption: 'RAW', data: data }).then(function () {
      return ncAppendRegistry({ titulo: n.titulo, sheetId: sid, papel: 'owner', owner: em, listaId: n.id, atualizado: new Date().toISOString() }).then(function () {
        return sid;
      });
    });
  });
}

function ncDeletePrivateList(n) {
  return findRow('Notas', 6, n.id).then(function (noteRow) {
    return JB.api('GET', personalSsUrl('/values/Itens?valueRenderOption=UNFORMATTED_VALUE')).then(function (res) {
      var v = res.values || [], rows = [], reqs = [];
      for (var i = 1; i < v.length; i++) {
        if (String((v[i] || [])[0]) === String(n.id)) rows.push(i + 1);
      }
      rows.sort(function (a, b) { return b - a; });
      rows.forEach(function (r) {
        reqs.push({ deleteDimension: { range: { sheetId: notasGrid['Itens'], dimension: 'ROWS', startIndex: r - 1, endIndex: r } } });
      });
      if (noteRow > 0) reqs.push({ deleteDimension: { range: { sheetId: notasGrid['Notas'], dimension: 'ROWS', startIndex: noteRow - 1, endIndex: noteRow } } });
      if (!reqs.length) return;
      return JB.api('POST', personalSsUrl(':batchUpdate'), { requests: reqs });
    });
  });
}

function ncShareFromPrivate() {
  var n = note(openNoteId);
  if (!n || n.collabSheetId) return;
  ncEnsureProfile(function () {
    JB.confirm('Tornar compartilhada?', 'A lista será copiada para uma planilha compartilhada no Drive. A versão privada será removida daqui.', function () {
      loadingHtml('<div class="gate"><div class="gs" style="margin-top:60px">Criando lista compartilhada…</div></div>');
      var items = itemsOf(n.id);
      ncCreateCollabSpreadsheet(n, items, '').then(function () {
        return ncDeletePrivateList(n);
      }).then(function () {
        DATA.notas = (DATA.notas || []).filter(function (x) { return x.id !== n.id; });
        return ncLoadCollabLists();
      }).then(function () {
        show();
        openNote(n.id);
        toast('✓ Lista compartilhada — convide alguém em Compartilhar');
        ncOpenShare();
      }).catch(function (e) {
        show();
        toast('Erro: ' + ((e && e.message) || 'falha'));
      });
    }, { yes: 'Compartilhar', no: 'Cancelar' });
  });
}

function ncOpenShare() {
  var n = note(openNoteId);
  if (!n || !n.collabSheetId) return;
  $('shareListTitle').textContent = n.titulo || 'Lista';
  $('shareInviteEmail').value = '';
  ncRenderShareMembers(n);
  var joinUrl = location.origin + '/notas/?join=' + encodeURIComponent(n.collabSheetId);
  var sheetUrl = 'https://docs.google.com/spreadsheets/d/' + n.collabSheetId;
  $('shareJoinLink').value = joinUrl;
  $('shareSheetLink').value = sheetUrl;
  $('shareOverlay').classList.add('open');
}

function ncCloseShare() { $('shareOverlay').classList.remove('open'); }

function ncRenderShareMembers(n) {
  var el = $('shareMembers');
  if (!el) return;
  el.innerHTML = (n.collabMembers || []).map(function (m) {
    return '<div class="share-mrow"><span class="share-mav">' + esc(ncMemberIcon(m.email, n.collabMembers)) + '</span><span class="share-mname">' + esc(ncDisplayLabel(m.email)) + '</span><span class="share-mem">' + esc(m.email) + '</span><span class="share-mst">' + esc(m.status === 'pending' ? 'convite' : m.papel) + '</span></div>';
  }).join('') || '<div class="rg">Nenhum membro ainda.</div>';
}

function ncCopyShareField(id) {
  var el = $(id);
  if (!el) return;
  el.select();
  try { document.execCommand('copy'); toast('✓ Copiado'); } catch (_) { navigator.clipboard.writeText(el.value).then(function () { toast('✓ Copiado'); }); }
}

function ncInviteMember() {
  var n = note(openNoteId);
  if (!n || !n.collabSheetId) return;
  var raw = ($('shareInviteEmail').value || '').trim().toLowerCase();
  if (!raw || raw.indexOf('@') < 1) { toast('E-mail inválido'); return; }
  if ((n.collabMembers || []).some(function (m) { return m.email === raw; })) { toast('Já está na lista'); return; }
  JB.persist({
    run: function () {
      return JB.api('POST', ncCollabUrl(n.collabSheetId, '/values/Membros:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS'), {
        values: [ncMemberRow(raw, '', '👤', 'editor', 'pending')]
      });
    },
    onSuccess: function () {
      n.collabMembers = n.collabMembers || [];
      n.collabMembers.push({ email: raw, nome: '', icone: '👤', papel: 'editor', status: 'pending', entrou: '' });
      ncRenderShareMembers(n);
      $('shareInviteEmail').value = '';
      toast('✓ Convite adicionado — compartilhe o link ou a planilha no Drive');
    },
    onError: notasWriteErr
  });
}

function ncJoinCollab(sheetId) {
  sheetId = String(sheetId || '').trim();
  if (!sheetId) return Promise.reject(new Error('link_invalido'));
  loadingHtml('<div class="gate"><div class="gs" style="margin-top:60px">Entrando na lista…</div></div>');
  return ncFetchCollabPack(sheetId).then(function (pack) {
    if (!pack) throw new Error('planilha_invalida');
    var metaRow = body(pack.meta)[0];
    if (!metaRow || !metaRow[6]) throw new Error('lista_nao_encontrada');
    var em = ncEmail();
    var members = ncParseMembers(pack.membros);
    var me = null;
    for (var j = 0; j < members.length; j++) { if (members[j].email === em) { me = members[j]; break; } }
    if (!me) {
      members.push({ email: em, nome: ncProfileName(), icone: ncProfileIcon(), papel: 'editor', status: 'active', entrou: new Date().toISOString() });
      return JB.api('POST', ncCollabUrl(sheetId, '/values/Membros:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS'), {
        values: [ncMemberRow(em, ncProfileName(), ncProfileIcon(), 'editor', 'active')]
      }).then(function () { return { pack: pack, metaRow: metaRow, members: members }; });
    }
    if (me.status === 'pending') {
      return ncActivateMember(sheetId, em).then(function () {
        me.status = 'active';
        return { pack: pack, metaRow: metaRow, members: members };
      });
    }
    return { pack: pack, metaRow: metaRow, members: members };
  }).then(function (ctx) {
    return ncFindRegistryRow(ctx.metaRow[6]).then(function (row) {
      if (row > 0) return;
      return ncAppendRegistry({
        titulo: String(ctx.metaRow[0] || ''),
        sheetId: sheetId,
        papel: 'editor',
        owner: String(ctx.metaRow[8] || ''),
        listaId: String(ctx.metaRow[6]),
        atualizado: new Date().toISOString()
      });
    }).then(function () { return ctx; });
  }).then(function (ctx) {
    history.replaceState(null, '', location.pathname);
    return ncLoadCollabLists().then(function () {
      show();
      openNote(String(ctx.metaRow[6]));
      toast('✓ Lista compartilhada aberta');
    });
  });
}

function ncActivateMember(sid, em) {
  return JB.api('GET', ncCollabUrl(sid, '/values/Membros?valueRenderOption=UNFORMATTED_VALUE')).then(function (res) {
    var v = res.values || [];
    for (var i = 1; i < v.length; i++) {
      if (String((v[i] || [])[0]).toLowerCase() === em) {
        var row = i + 1;
        return JB.api('PUT', ncCollabUrl(sid, '/values/Membros!E' + row + '?valueInputOption=RAW'), { values: [['active']] });
      }
    }
  });
}

function ncCheckJoinParam() {
  var m = location.search.match(/[?&]join=([^&]+)/);
  if (!m) return;
  var sid = decodeURIComponent(m[1]);
  ncEnsureProfile(function () {
    ncJoinCollab(sid).catch(function (e) {
      show();
      toast('Erro: ' + ((e && e.message) || 'não foi possível entrar'));
    });
  });
}

function ncLeaveOrDelete() {
  var n = note(openNoteId);
  if (!n || !n.collabSheetId) return;
  var isOwner = n.collabRole === 'owner' || n.collabOwner === ncEmail();
  var msg = isOwner ? 'Excluir lista compartilhada para todos neste app?' : 'Sair desta lista compartilhada?';
  JB.confirm(isOwner ? 'Excluir lista?' : 'Sair da lista?', msg, function () {
    JB.persist({
      run: function () { return ncRemoveRegistry(n.id); },
      onSuccess: function () {
        DATA.notas = (DATA.notas || []).filter(function (x) { return x.id !== n.id; });
        DATA.itens = (DATA.itens || []).filter(function (x) { return x.notaId !== n.id; });
        openNoteId = null;
        render();
        toast(isOwner ? '✓ Lista removida' : '✓ Você saiu da lista');
      },
      onError: notasWriteErr
    });
  }, { yes: isOwner ? 'Excluir' : 'Sair', no: 'Cancelar', danger: isOwner });
}

function ncEnsureProfile(cb) {
  if (ncProfileName()) { if (cb) cb(); return; }
  ncOpenProfile(cb);
}

function ncOpenProfile(cb) {
  window._ncProfileCb = cb || null;
  $('profileName').value = ncProfileName();
  ncRenderProfileIcons();
  $('profileOverlay').classList.add('open');
}

function ncCloseProfile() {
  $('profileOverlay').classList.remove('open');
  window._ncProfileCb = null;
}

function ncRenderProfileIcons() {
  var el = $('profileIcons');
  if (!el) return;
  var cur = ncProfileIcon();
  el.innerHTML = NC_PROFILE_ICONS.map(function (ic) {
    return '<button type="button" class="nc-pick-ico' + (ic === cur ? ' on' : '') + '" onclick="ncPickProfileIcon(\'' + escAttr(ic) + '\')">' + ic + '</button>';
  }).join('');
}

function ncPickProfileIcon(ic) {
  saveConfig('perfil_icone', ic);
  ncRenderProfileIcons();
  var prev = $('profileIconPreview');
  if (prev) prev.textContent = ic;
}

function ncSaveProfile() {
  var nm = ($('profileName').value || '').trim();
  if (!nm) { toast('Escolha um nome'); return; }
  saveConfig('perfil_nome', nm);
  ncCloseProfile();
  toast('✓ Perfil salvo');
  if ($('acctEmail')) $('acctEmail').textContent = '👤 ' + ncAcctLabel();
  if (window._ncProfileCb) { var cb = window._ncProfileCb; window._ncProfileCb = null; cb(); }
}

function ncInitProfileSettings() {
  var prev = $('setProfilePreview');
  if (prev) prev.textContent = ncProfileIcon();
  var nm = $('setProfileName');
  if (nm) nm.textContent = ncProfileName() || JB.email() || '';
}

function ncOpenProfileFromSettings() { ncOpenProfile(); }
