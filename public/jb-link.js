/* Notes ↔ Planner list links. © 2026 Joel Soluções LTDA.
   Classic global; loads after /joelboard.js. Exposes JB.link / JB_LINK. */
(function () {
  var PEEK = 7;
  var NOTAS = '#f59e0b';
  var PLANNER = '#2dd4bf';

  function esc(s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  function uniq(arr) {
    var seen = {}, out = [];
    (arr || []).forEach(function (x) {
      var id = String(x || '');
      if (!id || seen[id]) return;
      seen[id] = 1;
      out.push(id);
    });
    return out;
  }
  function parseIds(s) {
    if (Array.isArray(s)) return uniq(s);
    return uniq(String(s || '').split(/[,;\s]+/));
  }
  function formatIds(arr) { return parseIds(arr).join(','); }
  function mergeIds() {
    var all = [];
    for (var i = 0; i < arguments.length; i++) all = all.concat(parseIds(arguments[i]));
    return uniq(all);
  }
  function isGroupTipo(t) { return /^g\d*$/.test(String(t || '')); }
  function packSnapshot(note, itens) {
    note = note || {};
    var rows = (itens || []).filter(function (it) { return String(it.notaId) === String(note.id); })
      .sort(function (a, b) { return (Number(a.ordem) || 0) - (Number(b.ordem) || 0); });
    var chk = rows.filter(function (it) { return it.marcavel && !isGroupTipo(it.tipo); });
    var done = chk.filter(function (it) { return !!it.feito; }).length;
    return {
      id: String(note.id || ''),
      titulo: String(note.titulo || 'Lista'),
      tipo: String(note.tipo || ''),
      icon: note.cor || (note.tipo === 'viagem' ? '🧳' : '✅'),
      preset: !!note.preset,
      sticker: !!note.sticker && !note.preset,
      items: rows,
      done: done,
      total: chk.length,
      open: Math.max(0, chk.length - done)
    };
  }
  function snapshotsFromLists(ids, notas, itens) {
    var want = {};
    parseIds(ids).forEach(function (id) { want[id] = 1; });
    return (notas || []).filter(function (n) { return want[n.id]; }).map(function (n) {
      return packSnapshot(n, itens);
    });
  }
  var ghostClones = [];
  function notesFromGhost() {
    if (!window.JB || !JB.ghostFixture) return { notas: [], itens: [] };
    var fx = JB.ghostFixture('notas');
    var data = fx && fx.data;
    var notas = ((data && data.notas) || []).slice();
    var itens = ((data && data.itens) || []).slice();
    ghostClones.forEach(function (c) {
      notas.push(c.note);
      itens = itens.concat(c.itens || []);
    });
    return { notas: notas, itens: itens };
  }
  function snapshotsFromGhost(ids) {
    var pack = notesFromGhost();
    if (!pack.notas.length) return [];
    return snapshotsFromLists(ids, pack.notas, pack.itens);
  }
  function catalogFromGhost() {
    var pack = notesFromGhost();
    return (pack.notas || []).map(function (n) { return packSnapshot(n, pack.itens); });
  }
  function sheetUrl(sid, p) {
    return 'https://sheets.googleapis.com/v4/spreadsheets/' + sid + p;
  }
  function parseNotesPack(by) {
    var notas = (by.Notas || []).slice(1).filter(function (r) { return r[6]; }).map(function (r) {
      return { id: String(r[6]), titulo: String(r[0] || ''), tipo: String(r[1] || ''), cor: String(r[2] || ''), preset: r[8] === true || r[8] === '1' || r[8] === 1, sticker: r[9] === true || r[9] === '1' || r[9] === 1 };
    });
    var itens = (by.Itens || []).slice(1).filter(function (r) { return r[5]; }).map(function (r) {
      return { id: String(r[5]), notaId: String(r[0] || ''), ordem: Number(r[1]) || 0, texto: String(r[2] || ''), marcavel: !!r[3], feito: !!r[4], tipo: String(r[6] || '') };
    });
    return { notas: notas, itens: itens };
  }
  function fetchNotesPack() {
    var sid = window.JB && JB.getSheetId && JB.getSheetId('notas');
    if (!sid || !JB.api) return Promise.resolve({ notas: [], itens: [] });
    var q = 'ranges=' + encodeURIComponent('Notas') + '&ranges=' + encodeURIComponent('Itens') + '&valueRenderOption=UNFORMATTED_VALUE';
    return JB.api('GET', sheetUrl(sid, '/values:batchGet?' + q)).then(function (res) {
      var by = {};
      (res.valueRanges || []).forEach(function (vr, i) { by[i === 0 ? 'Notas' : 'Itens'] = vr.values || []; });
      return parseNotesPack(by);
    }).catch(function () { return { notas: [], itens: [] }; });
  }
  function loadSnapshots(ids) {
    ids = parseIds(ids);
    if (!ids.length) return Promise.resolve([]);
    if (window.JB && JB.isGhost && JB.isGhost()) return Promise.resolve(snapshotsFromGhost(ids));
    return fetchNotesPack().then(function (pack) { return snapshotsFromLists(ids, pack.notas, pack.itens); });
  }
  function loadCatalog() {
    if (window.JB && JB.isGhost && JB.isGhost()) return Promise.resolve(catalogFromGhost());
    return fetchNotesPack().then(function (pack) {
      return (pack.notas || []).map(function (n) { return packSnapshot(n, pack.itens); });
    });
  }
  function uid() {
    return 'xxxxxxxxxxxx4xxychxxx'.replace(/[xy]/g, function (c) {
      var r = Math.random() * 16 | 0;
      return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
    });
  }
  function clonePreset(srcId, opts) {
    opts = opts || {};
    return loadCatalog().then(function (snaps) {
      var src = null;
      (snaps || []).forEach(function (s) { if (s.id === srcId) src = s; });
      if (!src) return null;
      var now = new Date().toISOString();
      var nid = uid();
      var note = { id: nid, titulo: src.titulo, tipo: src.tipo || 'viagem', cor: src.icon || '', preset: false, sticker: !!opts.sticker, criado: now, atualizado: now, vence: '' };
      var itens = (src.items || []).map(function (s, i) {
        return { id: uid(), notaId: nid, ordem: i + 1, texto: s.texto, marcavel: s.marcavel, feito: false, tipo: s.tipo || '' };
      });
      if (window.JB && JB.isGhost && JB.isGhost()) {
        ghostClones.push({ note: note, itens: itens });
        return packSnapshot(note, itens);
      }
      var sid = window.JB && JB.getSheetId && JB.getSheetId('notas');
      if (!sid || !JB.api) return Promise.reject(new Error('no-notas'));
      var nvals = [note.titulo, note.tipo, note.cor || '', '', note.criado, note.atualizado, note.id, '', '', note.sticker ? '1' : ''];
      return JB.api('POST', sheetUrl(sid, '/values/Notas:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS'), { values: [nvals] }).then(function () {
        if (!itens.length) return packSnapshot(note, itens);
        return JB.api('POST', sheetUrl(sid, '/values/Itens:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS'), {
          values: itens.map(function (it) { return [it.notaId, it.ordem, it.texto, it.marcavel ? '1' : '', '', it.id, it.tipo]; })
        }).then(function () { return packSnapshot(note, itens); });
      });
    });
  }
  function peekPending(snap) {
    return (snap.items || []).filter(function (it) {
      return it.marcavel && !isGroupTipo(it.tipo) && !it.feito && String(it.texto || '').trim();
    }).slice(0, PEEK);
  }
  function peekHtml(snap, opts) {
    opts = opts || {};
    if (!snap) return '';
    var open = !!opts.open;
    var key = opts.key || snap.id;
    var compact = !!opts.compact;
    var pending = peekPending(snap);
    var prog = snap.total ? (snap.done + '/' + snap.total) : '—';
    var head = '<button type="button" class="jb-link-sticker' + (open ? ' open' : '') + (compact ? ' compact' : '') + '" data-link-toggle="' + esc(key) + '">'
      + '<span class="jb-link-hue" aria-hidden="true"></span>'
      + '<span class="jb-link-ico">' + esc(snap.icon || '🧳') + '</span>'
      + '<span class="jb-link-title">' + esc(snap.titulo) + '</span>'
      + '<span class="jb-link-prog">' + esc(prog) + '</span>'
      + '<span class="jb-link-chev">' + (open ? '▴' : '▾') + '</span></button>';
    if (!open) return '<div class="jb-link-wrap' + (compact ? ' compact' : '') + '">' + head + '</div>';
    var rows = pending.map(function (it) {
      return '<div class="jb-link-item">' + esc(it.texto) + '</div>';
    }).join('');
    if (!rows) rows = '<div class="jb-link-item mute">Nada pendente</div>';
    var extra = snap.open > pending.length ? ('<div class="jb-link-more">+' + (snap.open - pending.length) + ' no Notes</div>') : '';
    var hint = opts.shareHint ? ('<div class="jb-link-hint">' + esc(opts.shareHint) + '</div>') : '';
    var notesHref = '/notas/?lista=' + encodeURIComponent(snap.id);
    if (window.JB && JB.isGhost && JB.isGhost()) notesHref = '/notas/?ghost=1&lista=' + encodeURIComponent(snap.id);
    var foot = '<a class="jb-link-open" href="' + notesHref + '">Abrir no Notes →</a>';
    if (opts.canUnlink) {
      foot += '<button type="button" class="jb-link-unlink" data-link-unlink="' + esc(opts.unlinkKey || key) + '">Descolar</button>';
    }
    return '<div class="jb-link-wrap open' + (compact ? ' compact' : '') + '">' + head + '<div class="jb-link-body">' + rows + extra + hint + foot + '</div></div>';
  }
  function mergeCalEvents(events) {
    var linked = {};
    (events || []).forEach(function (e) {
      parseIds(e.listaIds).forEach(function (id) { linked[id] = 1; });
    });
    return (events || []).filter(function (e) {
      return !(e.app === 'notas' && linked[e.rawId]);
    }).map(function (e) {
      var ids = parseIds(e.listaIds);
      if (!ids.length) return e;
      var copy = {};
      Object.keys(e).forEach(function (k) { copy[k] = e[k]; });
      copy.linkedNotes = true;
      return copy;
    });
  }
  function decorateCalEvents(events) {
    var ids = [];
    (events || []).forEach(function (e) { if (e.linkedNotes) ids = ids.concat(parseIds(e.listaIds)); });
    ids = uniq(ids);
    if (!ids.length) return Promise.resolve(events || []);
    return loadSnapshots(ids).then(function (snaps) {
      var by = {};
      snaps.forEach(function (s) { by[s.id] = s; });
      return (events || []).map(function (e) {
        if (!e.linkedNotes) return e;
        var first = parseIds(e.listaIds).map(function (id) { return by[id]; }).filter(Boolean)[0];
        if (!first) return e;
        var copy = {};
        Object.keys(e).forEach(function (k) { copy[k] = e[k]; });
        copy.linkPeek = first.total ? (first.done + '/' + first.total) : '';
        copy.linkTitle = first.titulo;
        if (first.total && first.done >= first.total) copy.done = true;
        return copy;
      });
    });
  }
  function defaultPresets() {
    return [
      {
        titulo: 'Viagem nacional', tipo: 'viagem',
        groups: [
          { g: 'Documentos', items: ['RG ou CNH', 'Reservas / e-tickets'] },
          { g: 'Mala', items: ['Roupas', 'Carregador', 'Higiene'] },
          { g: 'Casa', items: ['Lixo', 'Plantas', 'Tomadas'] }
        ]
      },
      {
        titulo: 'Viagem internacional', tipo: 'viagem',
        groups: [
          { g: 'Documentos', items: ['Passaporte', 'Visto (se precisar)', 'Seguro viagem'] },
          { g: 'Dinheiro e tech', items: ['Câmbio', 'Chip / eSIM', 'Adaptador de tomada'] },
          { g: 'Mala', items: ['Roupas', 'Carregador', 'Higiene', 'Remédios'] }
        ]
      }
    ];
  }
  function barCss(linked) {
    if (!linked) return '';
    return 'background:linear-gradient(180deg,' + PLANNER + ',' + NOTAS + ')';
  }
  function dotCss(linked, color) {
    if (linked) return 'background:linear-gradient(135deg,' + PLANNER + ',' + NOTAS + ')';
    return 'background:' + color;
  }

  var api = {
    PEEK: PEEK, NOTAS: NOTAS, PLANNER: PLANNER,
    parseIds: parseIds, formatIds: formatIds, mergeIds: mergeIds, uniq: uniq,
    packSnapshot: packSnapshot, snapshotsFromLists: snapshotsFromLists,
    snapshotsFromGhost: snapshotsFromGhost, loadSnapshots: loadSnapshots,
    loadCatalog: loadCatalog, clonePreset: clonePreset,
    peekPending: peekPending, peekHtml: peekHtml,
    mergeCalEvents: mergeCalEvents, decorateCalEvents: decorateCalEvents,
    defaultPresets: defaultPresets, barCss: barCss, dotCss: dotCss
  };
  window.JB_LINK = api;
  if (window.JB) window.JB.link = api;
})();
