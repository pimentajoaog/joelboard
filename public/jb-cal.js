/* Joelboard shared calendar kit. © 2026 Joel Soluções LTDA.
   Classic global; loads after /joelboard.js. Exposes JB.cal / JB_CAL. */
(function () {
  var WD = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
  var MO = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
  var MOFULL = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
  var APP_ORDER = ['finance', 'fit', 'study', 'notas', 'planner'];
  var APP_META = {
    finance: { label: 'Finance', color: 'var(--income, #34d399)', kind: 'conta', ink: '#34d399', bg: '#2a2f52' },
    fit: { label: 'Fit', color: 'var(--fit, #fb7185)', kind: 'treino', ink: '#fb7185', bg: '#3a2530' },
    study: { label: 'Study', color: 'var(--study, #a78bfa)', kind: 'prova', ink: '#a78bfa', bg: '#241f3a' },
    notas: { label: 'Notes', color: 'var(--notas, #f59e0b)', kind: 'prazo', ink: '#f59e0b', bg: '#33280f' },
    planner: { label: 'Planner', color: 'var(--planner, #2dd4bf)', kind: 'plano', ink: '#2dd4bf', bg: '#0f2a28' }
  };
  function appGlyph(app) {
    if (app === 'finance') return '<svg viewBox="0 0 16 16" aria-hidden="true"><rect x="2" y="9.4" width="2.8" height="4" rx=".7" fill="currentColor" opacity=".5"/><rect x="6.2" y="6.6" width="2.8" height="6.8" rx=".7" fill="currentColor" opacity=".78"/><rect x="10.4" y="3.6" width="2.8" height="9.8" rx=".7" fill="currentColor"/></svg>';
    if (app === 'fit') return '<svg viewBox="0 0 16 16" aria-hidden="true"><rect x="1.4" y="5.4" width="1.8" height="5.2" rx=".5" fill="currentColor"/><rect x="12.8" y="5.4" width="1.8" height="5.2" rx=".5" fill="currentColor"/><rect x="3" y="6.4" width="1.6" height="3.2" rx=".4" fill="currentColor"/><rect x="11.4" y="6.4" width="1.6" height="3.2" rx=".4" fill="currentColor"/><rect x="4.4" y="7.2" width="7.2" height="1.6" rx=".7" fill="currentColor"/></svg>';
    if (app === 'study') return '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M8 2.6 14.4 6 8 9.4 1.6 6Z" fill="currentColor"/><path d="M4 8.1v2.5c0 .8 1.8 1.7 4 1.7s4-.9 4-1.7V8.1" fill="none" stroke="currentColor" stroke-width="1.25" stroke-linecap="round"/><path d="M14.4 6v4.6" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/></svg>';
    if (app === 'notas') return '<svg viewBox="0 0 16 16" aria-hidden="true"><rect x="3.5" y="2.2" width="9" height="11.6" rx="1.5" fill="none" stroke="currentColor" stroke-width="1.3"/><path d="M5.8 5.6h3.4M5.8 8h4.6M5.8 10.4h2.6" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/><path d="M9.2 10.8l1.15 1.15 2.15-2.3" fill="none" stroke="currentColor" stroke-width="1.15" stroke-linecap="round" stroke-linejoin="round"/></svg>';
    return '<svg viewBox="0 0 16 16" aria-hidden="true"><rect x="2.8" y="3.2" width="10.4" height="10.4" rx="1.6" fill="none" stroke="currentColor" stroke-width="1.3"/><path d="M2.8 6.3h10.4M5.6 2.3v2.8M10.4 2.3v2.8" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/><circle cx="6.1" cy="9.3" r=".85" fill="currentColor"/><circle cx="8.4" cy="9.3" r=".85" fill="currentColor"/><circle cx="10.7" cy="9.3" r=".85" fill="currentColor"/></svg>';
  }
  var BILL_PAID = ['bill', 'recurring', 'installment'];

  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  function parseYmd(s) {
    var p = String(s || '').slice(0, 10).split('-');
    if (p.length < 3) return null;
    var d = new Date(Number(p[0]), Number(p[1]) - 1, Number(p[2]));
    if (isNaN(d.getTime())) return null;
    return d;
  }
  function ymd(d) {
    return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  }
  function todayYmd() { return (window.JB && JB.todayYmd) ? JB.todayYmd() : ymd(new Date()); }
  function addDays(iso, n) {
    var d = parseYmd(iso); if (!d) return '';
    d.setDate(d.getDate() + n);
    return ymd(d);
  }
  function daysInMonth(y, m) { return new Date(y, m + 1, 0).getDate(); }
  function clampDay(y, m, day) { return Math.min(Math.max(1, day || 1), daysInMonth(y, m)); }
  function ymStr(y, m) { return y + '-' + pad(m + 1); }
  function monthDiff(a, b) {
    var ap = String(a || '').slice(0, 7).split('-');
    var bp = String(b || '').slice(0, 7).split('-');
    if (ap.length < 2 || bp.length < 2) return 0;
    return (Number(bp[0]) - Number(ap[0])) * 12 + (Number(bp[1]) - Number(ap[1]));
  }
  function sheetsDate(v) {
    if (v == null || v === '') return '';
    if (typeof v === 'number') {
      var d = new Date(Date.UTC(1899, 11, 30));
      d.setUTCDate(d.getUTCDate() + Math.floor(v));
      return d.getUTCFullYear() + '-' + pad(d.getUTCMonth() + 1) + '-' + pad(d.getUTCDate());
    }
    var s = String(v).trim();
    if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
    if (/^\d{4}-\d{2}$/.test(s)) return s;
    return s;
  }
  function timeMinFromLabel(raw) {
    var s = String(raw || '').trim().toLowerCase().replace(/~/g, '');
    if (!s) return '';
    var m = s.match(/^(\d{1,2})h(\d{2})?$/);
    if (m) { var h = +m[1], mi = m[2] ? +m[2] : 0; if (h < 24 && mi < 60) return h * 60 + mi; }
    m = s.match(/^(\d{1,2}):(\d{2})$/);
    if (m) { var h2 = +m[1], mi2 = +m[2]; if (h2 < 24 && mi2 < 60) return h2 * 60 + mi2; }
    return '';
  }
  function sortEvents(list) {
    return (list || []).slice().sort(function (a, b) {
      var ad = String(a.date || ''), bd = String(b.date || '');
      if (ad !== bd) return ad.localeCompare(bd);
      var am = a.timeMin === '' || a.timeMin == null ? 1e9 : Number(a.timeMin);
      var bm = b.timeMin === '' || b.timeMin == null ? 1e9 : Number(b.timeMin);
      if (am !== bm) return am - bm;
      return String(a.title || '').localeCompare(String(b.title || ''));
    });
  }
  function eventsInRange(list, start, end) {
    return sortEvents((list || []).filter(function (e) {
      var d = String(e.date || '');
      return d && d >= start && d <= end;
    }));
  }
  function rangeForView(view, date) {
    var iso = date || todayYmd();
    var d = parseYmd(iso) || new Date();
    iso = ymd(d);
    if (view === 'day') return { start: iso, end: iso, date: iso };
    if (view === '3day') return { start: iso, end: addDays(iso, 2), date: iso };
    if (view === 'week') {
      var dow = d.getDay();
      var start = addDays(iso, -dow);
      return { start: start, end: addDays(start, 6), date: iso };
    }
    var startM = ymd(new Date(d.getFullYear(), d.getMonth(), 1));
    var endM = ymd(new Date(d.getFullYear(), d.getMonth() + 1, 0));
    return { start: startM, end: endM, date: iso };
  }
  function fetchWindow(view, date) {
    var r = rangeForView(view || 'month', date);
    return { start: addDays(r.start, -7), end: addDays(r.end, 14), focus: r };
  }
  function daysUntil(iso) {
    var t = new Date(); t.setHours(0, 0, 0, 0);
    var d = parseYmd(iso); if (!d) return null;
    return Math.round((d - t) / 86400000);
  }
  function relLabel(iso) {
    var n = daysUntil(iso);
    if (n == null) return '';
    if (n < 0) return 'atrasado';
    if (n === 0) return 'hoje';
    if (n === 1) return 'amanhã';
    return 'em ' + n + ' dias';
  }
  function nearClass(iso, done) {
    if (done) return '';
    var n = daysUntil(iso);
    if (n == null) return '';
    if (n < 0) return 'over';
    if (n <= 2) return 'soon';
    if (n <= 7) return 'warn';
    return '';
  }
  function fmtBR(iso) {
    var d = parseYmd(iso); if (!d) return iso || '';
    return WD[d.getDay()] + ', ' + d.getDate() + ' ' + MO[d.getMonth()];
  }
  function ev(o) {
    var meta = APP_META[o.app] || APP_META.study;
    return {
      app: o.app,
      id: o.id,
      rawId: o.rawId || '',
      date: o.date,
      time: o.time || '',
      timeMin: o.timeMin === '' || o.timeMin == null ? timeMinFromLabel(o.time) : o.timeMin,
      title: o.title || '',
      subtitle: o.subtitle || '',
      done: !!o.done,
      href: o.href || '',
      color: o.color || meta.color,
      kind: o.kind || meta.kind,
      listaIds: (window.JB && JB.link) ? JB.link.parseIds(o.listaIds) : (o.listaIds || []),
      items: o.items || null,
      icone: o.icone || ''
    };
  }

  function billActiveInMonth(b, ym) {
    if (!b || !b.id) return false;
    if (Number(b.installments) > 0) {
      var start = b.startMonth || ym;
      var diff = monthDiff(start, ym);
      return diff >= 0 && diff < Number(b.installments);
    }
    return !b.startMonth || monthDiff(b.startMonth, ym) >= 0;
  }
  function paymentPaid(payments, id, ym) {
    return (payments || []).some(function (p) {
      return p.month === ym && BILL_PAID.indexOf(String(p.type)) > -1 && String(p.itemId) === String(id) && (p.paid === true || p.paid === 'true' || p.paid === 1);
    });
  }
  function paymentSkip(payments, id, ym) {
    return (payments || []).some(function (p) {
      return p.month === ym && String(p.type) === 'skip' && String(p.itemId) === String(id);
    });
  }
  function expandFinanceDue(bills, payments, start, end) {
    var out = [];
    var a = parseYmd(start), b = parseYmd(end);
    if (!a || !b) return out;
    var cursor = new Date(a.getFullYear(), a.getMonth(), 1);
    var last = new Date(b.getFullYear(), b.getMonth(), 1);
    while (cursor <= last) {
      var y = cursor.getFullYear(), m = cursor.getMonth(), ym = ymStr(y, m);
      (bills || []).forEach(function (bill) {
        if (paymentSkip(payments, bill.id, ym)) return;
        if (!billActiveInMonth(bill, ym)) return;
        var day = clampDay(y, m, Number(bill.dueDay) || 1);
        var date = ymd(new Date(y, m, day));
        if (date < start || date > end) return;
        out.push(ev({
          app: 'finance',
          id: 'finance:' + bill.id + ':' + ym,
          rawId: String(bill.id),
          date: date,
          title: String(bill.name || 'Conta'),
          subtitle: bill.category ? String(bill.category) : '',
          done: paymentPaid(payments, bill.id, ym),
          href: '/finance/',
          kind: 'conta'
        }));
      });
      cursor.setMonth(cursor.getMonth() + 1);
    }
    return out;
  }
  function eventsFromFit(sessoes) {
    return (sessoes || []).filter(function (s) { return s.date; }).map(function (s) {
      var date = sheetsDate(s.date);
      return ev({
        app: 'fit', id: 'fit:' + (s.id || date + s.treino), rawId: String(s.id || ''),
        date: date, title: String(s.treino || 'Treino'), subtitle: s.notas ? String(s.notas) : '',
        done: true, href: '/fit/', kind: 'treino'
      });
    });
  }
  function eventsFromStudy(eventos, materias) {
    var byId = {};
    (materias || []).forEach(function (m) { byId[m.id] = m; });
    return (eventos || []).filter(function (e) { return e.data || e.date; }).map(function (e) {
      var date = sheetsDate(e.data || e.date);
      var ids = e.materiaIds || [];
      var names = ids.map(function (id) { return byId[id] && byId[id].nome; }).filter(Boolean);
      var col = (ids[0] && byId[ids[0]] && byId[ids[0]].cor) || APP_META.study.color;
      return ev({
        app: 'study', id: 'study:' + e.id, rawId: String(e.id || ''),
        date: date, time: e.hora || e.time || '', title: String(e.titulo || '(sem título)'),
        subtitle: (names.length ? names.join(', ') + ' · ' : '') + String(e.tipo || 'Prova'),
        done: !!e.concluido, href: '/study/?date=' + encodeURIComponent(date),
        color: col, kind: String(e.tipo || 'prova').toLowerCase()
      });
    });
  }
  function eventsFromNotas(lists) {
    return (lists || []).filter(function (n) { return n.vence && !n.preset; }).map(function (n) {
      var date = sheetsDate(n.vence);
      return ev({
        app: 'notas', id: 'notas:' + n.id, rawId: String(n.id || ''),
        date: date, title: String(n.titulo || 'Lista'), subtitle: n.tipo ? String(n.tipo) : '',
        done: !!n.done, href: '/notas/?lista=' + encodeURIComponent(n.id), kind: 'prazo'
      });
    });
  }
  function plannerHref(planId, dayId) {
    var q = 'p=' + encodeURIComponent(planId || '');
    if (dayId) q += '&d=' + encodeURIComponent(dayId);
    return '/planner/?' + q;
  }
  function eventsFromPlanner(planos, dias, eventos) {
    var planBy = {}, byDay = {};
    (planos || []).forEach(function (p) { planBy[p.id] = p; });
    var parseIds = function (ids) { return (window.JB && JB.link) ? JB.link.parseIds(ids) : (ids || []); };
    (eventos || []).forEach(function (e) {
      var id = e && e.diaId;
      if (!id) return;
      if (!byDay[id]) byDay[id] = [];
      byDay[id].push(e);
    });
    var out = [];
    (dias || []).forEach(function (d) {
      var date = sheetsDate(d.data || d.date);
      if (!date) return;
      var p = planBy[d.planoId] || {};
      var kids = (byDay[d.id] || []).slice().sort(function (a, b) {
        var am = a.horaMin === '' || a.horaMin == null ? 1e9 : Number(a.horaMin);
        var bm = b.horaMin === '' || b.horaMin == null ? 1e9 : Number(b.horaMin);
        if (am !== bm) return am - bm;
        return (Number(a.ordem) || 0) - (Number(b.ordem) || 0);
      });
      var items = kids.map(function (e) {
        return {
          time: e.hora || e.time || '',
          timeMin: e.horaMin,
          title: String(e.titulo || 'Evento'),
          icone: e.icone || '',
          nota: e.nota || '',
          tag: e.tag || '',
          tagCor: e.tagCor || ''
        };
      });
      var ids = parseIds(d.listaIds);
      parseIds(p.listaIds).forEach(function (id) { if (ids.indexOf(id) < 0) ids.push(id); });
      var dayTitle = String(d.titulo || p.titulo || 'Dia do plano');
      var subBits = [];
      if (d.titulo && p.titulo) subBits.push(String(p.titulo));
      out.push(ev({
        app: 'planner', id: 'planner-day:' + d.id, rawId: String(p.id || d.planoId || ''),
        date: date, title: (d.icone ? String(d.icone) + ' ' : '') + dayTitle,
        subtitle: subBits.join(' · '),
        href: plannerHref(p.id || d.planoId, d.id), kind: 'plano',
        listaIds: ids, items: items, icone: d.icone || ''
      }));
    });
    return out;
  }
  function isCollabPlannerGrid(grid) {
    return !!(grid && grid.Meta != null && grid.Membros != null && grid.Planos == null);
  }
  function isCollabNotasGrid(grid) {
    return !!(grid && grid.Meta != null && grid.Membros != null && grid.Notas == null);
  }
  function tabsPresent(grid, names) {
    return (names || []).filter(function (t) { return grid && grid[t] != null; });
  }

  function sheetUrl(sid, p) {
    return 'https://sheets.googleapis.com/v4/spreadsheets/' + sid + p;
  }
  function batchGet(sid, tabs) {
    var q = tabs.map(function (t) { return 'ranges=' + encodeURIComponent(t); }).join('&');
    return JB.api('GET', sheetUrl(sid, '/values:batchGet?' + q + '&valueRenderOption=UNFORMATTED_VALUE')).then(function (res) {
      var by = {};
      (res.valueRanges || []).forEach(function (vr, i) { by[tabs[i]] = vr.values || []; });
      return by;
    });
  }
  function body(rows) { return (rows || []).slice(1); }
  function parsePayments(rows) {
    return body(rows).filter(function (r) { return r[0] && r[2]; }).map(function (r) {
      return {
        month: String(r[0]).replace(/^m/, '').slice(0, 7),
        type: r[1],
        itemId: String(r[2]),
        paid: r[3] === true || r[3] === 'true' || r[3] === 1 || r[3] === '1'
      };
    });
  }
  function parseRecurring(rows) {
    return body(rows).filter(function (r) { return r[0]; }).map(function (r) {
      var start = sheetsDate(r[6]);
      if (start && start.length === 10) start = start.slice(0, 7);
      return {
        id: r[7], name: r[0], amount: Number(r[1]) || 0, dueDay: Number(r[2]) || 1,
        frequency: r[3] || 'Monthly', category: r[4] || '', installments: Number(r[5]) || 0,
        startMonth: start || ''
      };
    });
  }
  function mapSeq(items, fn) {
    var out = [];
    return (items || []).reduce(function (p, item) {
      return p.then(function () {
        return Promise.resolve(fn(item)).then(function (r) { out.push(r); return out; });
      });
    }, Promise.resolve([])).then(function () { return out; });
  }
  function notaItemsDone(itensRows, notaId) {
    var rows = body(itensRows).filter(function (r) { return String(r[0]) === String(notaId) && r[3]; });
    if (!rows.length) return false;
    return rows.every(function (r) { return r[4] === true || r[4] === '1' || r[4] === 1; });
  }
  var _tabCache = {};
  function cachedSheetTabs(sid) {
    if (_tabCache[sid]) return Promise.resolve(_tabCache[sid]);
    return JB.sheetTabs(sid).then(function (grid) { _tabCache[sid] = grid; return grid; });
  }
  function listsFromGhostNotas(data) {
    return (data.notas || []).map(function (n) {
      var items = (data.itens || []).filter(function (it) {
        return String(it.notaId) === String(n.id) && it.marcavel;
      });
      var done = items.length > 0 && items.every(function (it) { return !!it.feito; });
      return { id: n.id, titulo: n.titulo, tipo: n.tipo, vence: n.vence, done: done, preset: !!n.preset };
    });
  }
  function ghostAppEvents(app, start, end) {
    if (!window.JB || !JB.isGhost || !JB.isGhost() || typeof JB.ghostFixture !== 'function') return null;
    var fx = JB.ghostFixture(app);
    var data = fx && fx.data;
    if (!data) return [];
    var evs = [];
    if (app === 'notas') evs = eventsFromNotas(listsFromGhostNotas(data));
    else if (app === 'planner') evs = eventsFromPlanner(data.planos, data.dias, data.eventos);
    else return [];
    return evs.filter(function (e) { return e.date >= start && e.date <= end; });
  }
  function loadAppEvents(app, start, end) {
    var ghost = ghostAppEvents(app, start, end);
    if (ghost) return Promise.resolve(ghost);
    var sid = JB.getSheetId && JB.getSheetId(app);
    if (!sid) return Promise.resolve([]);
    return cachedSheetTabs(sid).then(function (grid) {
      if (app === 'planner' && isCollabPlannerGrid(grid)) return [];
      if (app === 'notas' && isCollabNotasGrid(grid)) return [];
      return loadAppEventsFromGrid(app, sid, grid, start, end);
    });
  }
  function loadAppEventsFromGrid(app, sid, grid, start, end) {
    if (app === 'finance') {
      var ft = tabsPresent(grid, ['Recurring', 'Payments']);
      if (ft.indexOf('Recurring') < 0) return [];
      return batchGet(sid, ft.length ? ft : ['Recurring']).then(function (by) {
        return expandFinanceDue(parseRecurring(by.Recurring), parsePayments(by.Payments), start, end);
      });
    }
    if (app === 'fit') {
      if (tabsPresent(grid, ['Sessoes']).length === 0) return [];
      return batchGet(sid, ['Sessoes']).then(function (by) {
        var sess = body(by.Sessoes).filter(function (r) { return r[0]; }).map(function (r) {
          return { date: r[0], treino: r[1] || '', notas: r[2] || '', id: r[3] };
        });
        return eventsFromFit(sess).filter(function (e) { return e.date >= start && e.date <= end; });
      });
    }
    if (app === 'study') {
      var st = tabsPresent(grid, ['Eventos', 'Materias']);
      if (st.indexOf('Eventos') < 0) return [];
      return batchGet(sid, st).then(function (by) {
        var mats = body(by.Materias).filter(function (r) { return r[4]; }).map(function (r) {
          return { id: r[4], nome: String(r[0] || ''), cor: r[1] || APP_META.study.color };
        });
        var evs = body(by.Eventos).filter(function (r) { return r[0] || r[2]; }).map(function (r) {
          return { id: r[7], titulo: r[0], tipo: r[1] || 'Outro', data: r[2], hora: r[3] || '', materiaIds: String(r[4] || '').split(',').filter(Boolean), concluido: !!r[5] };
        });
        return eventsFromStudy(evs, mats).filter(function (e) { return e.date >= start && e.date <= end; });
      });
    }
    if (app === 'notas') {
      var nt = tabsPresent(grid, ['Notas', 'Itens', 'Compartilhadas']);
      if (nt.indexOf('Notas') < 0) return [];
      return batchGet(sid, nt).then(function (by) {
        var lists = body(by.Notas).filter(function (r) { return r[6]; }).map(function (r) {
          return { id: String(r[6]), titulo: String(r[0] || ''), tipo: String(r[1] || ''), vence: r[7] || '', done: notaItemsDone(by.Itens, r[6]), preset: r[8] === true || r[8] === '1' || r[8] === 1 };
        });
        var evs = eventsFromNotas(lists);
        var regs = body(by.Compartilhadas || []).filter(function (r) { return r[1]; });
        if (!regs.length) return evs;
        return mapSeq(regs, function (reg) {
          return batchGet(String(reg[1]), ['Meta', 'Itens']).then(function (pack) {
            var meta = body(pack.Meta)[0];
            if (!meta || !meta[7]) return [];
            var id = String(meta[6] || reg[4] || '');
            return eventsFromNotas([{
              id: id, titulo: String(meta[0] || reg[0] || ''), tipo: String(meta[1] || ''),
              vence: meta[7], done: notaItemsDone(pack.Itens, id)
            }]);
          }).catch(function () { return []; });
        }).then(function (extra) {
          extra.forEach(function (arr) { evs = evs.concat(arr); });
          return evs.filter(function (e) { return e.date >= start && e.date <= end; });
        });
      });
    }
    if (app === 'planner') {
      var pt = tabsPresent(grid, ['Planos', 'Dias', 'Eventos', 'Compartilhadas']);
      if (pt.indexOf('Dias') < 0 && pt.indexOf('Eventos') < 0) return [];
      return batchGet(sid, pt).then(function (by) {
        var linkParse = (window.JB && JB.link) ? JB.link.parseIds : function (s) { return String(s || '') ? [String(s)] : []; };
        var planos = body(by.Planos).filter(function (r) { return r[7]; }).map(function (r) {
          return { id: String(r[7]), titulo: String(r[0] || ''), inicio: r[2], listaIds: linkParse(r[8]) };
        });
        var dias = body(by.Dias).filter(function (r) { return r[5]; }).map(function (r) {
          return { id: String(r[5]), planoId: String(r[0] || ''), data: r[1], titulo: String(r[2] || ''), listaIds: linkParse(r[6]) };
        });
        var evrows = body(by.Eventos).filter(function (r) { return r[9]; }).map(function (r) {
          return { id: String(r[9]), diaId: String(r[0] || ''), hora: String(r[1] || ''), horaMin: r[2], titulo: String(r[3] || ''), nota: String(r[4] || '') };
        });
        var evs = eventsFromPlanner(planos, dias, evrows);
        var regs = body(by.Compartilhadas || []).filter(function (r) { return r[1]; });
        if (!regs.length) return evs.filter(function (e) { return e.date >= start && e.date <= end; });
        return mapSeq(regs, function (reg) {
          return batchGet(String(reg[1]), ['Meta', 'Dias', 'Eventos']).then(function (pack) {
            var meta = body(pack.Meta)[0];
            var p = meta && meta[7] ? [{ id: String(meta[7]), titulo: String(meta[0] || ''), inicio: meta[2], listaIds: linkParse(meta[9]) }] : [];
            var ds = body(pack.Dias).filter(function (r) { return r[5]; }).map(function (r) {
              return { id: String(r[5]), planoId: String(r[0] || (p[0] && p[0].id) || ''), data: r[1], titulo: String(r[2] || ''), listaIds: linkParse(r[6]) };
            });
            var es = body(pack.Eventos).filter(function (r) { return r[9]; }).map(function (r) {
              return { id: String(r[9]), diaId: String(r[0] || ''), hora: String(r[1] || ''), horaMin: r[2], titulo: String(r[3] || ''), nota: String(r[4] || '') };
            });
            return eventsFromPlanner(p, ds, es);
          }).catch(function () { return []; });
        }).then(function (extra) {
          extra.forEach(function (arr) { evs = evs.concat(arr); });
          return evs.filter(function (e) { return e.date >= start && e.date <= end; });
        });
      });
    }
    return Promise.resolve([]);
  }
  var _hubCache = null;
  var HUB_CACHE_MS = 90000;
  function loadHubEvents(opts) {
    opts = opts || {};
    var view = opts.view || 'week';
    var focus = rangeForView(view, opts.date);
    var win = fetchWindow('month', opts.date);
    if (!opts.force && _hubCache && (Date.now() - _hubCache.at) < HUB_CACHE_MS
      && _hubCache.start <= focus.start && _hubCache.end >= focus.end) {
      return Promise.resolve({ events: _hubCache.events, missed: _hubCache.missed, range: focus, window: win, cached: true });
    }
    var apps = opts.apps || ['finance', 'fit', 'study', 'notas', 'planner'];
    var missed = [];
    return Promise.all(apps.map(function (app) {
      return loadAppEvents(app, win.start, win.end).then(function (part) {
        return { app: app, events: part || [] };
      }, function () {
        missed.push(app);
        return { app: app, events: [] };
      });
    })).then(function (parts) {
      var all = [];
      parts.forEach(function (p) { all = all.concat(p.events); });
      if (window.JB && JB.link && JB.link.mergeCalEvents) all = JB.link.mergeCalEvents(all);
      var finish = function (events) {
        var pack = { events: sortEvents(events), missed: missed, range: focus, window: win };
        _hubCache = { at: Date.now(), start: win.start, end: win.end, events: pack.events, missed: missed };
        return pack;
      };
      if (window.JB && JB.link && JB.link.decorateCalEvents) return JB.link.decorateCalEvents(all).then(finish);
      return finish(all);
    });
  }
  function clearHubCache() { _hubCache = null; _tabCache = {}; }

  function shortDay(iso) {
    var d = parseYmd(iso); if (!d) return iso || '';
    return d.getDate() + ' ' + MO[d.getMonth()];
  }
  function plannerPeekHtml(e) {
    var items = e.items || [];
    var href = e.href || '/planner/';
    var rows = items.length
      ? items.map(function (it) {
          var pill = it.tag ? ('<span class="jb-cal-peekpill ' + esc(it.tagCor || 'warn') + '">' + esc(it.tag) + '</span>') : '';
          return '<div class="jb-cal-peekrow">'
            + '<div class="jb-cal-peektime">' + esc(it.time || '—') + '</div>'
            + '<div><div class="jb-cal-peekt">' + (it.icone ? esc(it.icone) + ' ' : '') + esc(it.title || 'Evento') + '</div>'
            + (it.nota ? '<div class="jb-cal-peekn">' + esc(it.nota) + '</div>' : '') + pill + '</div></div>';
        }).join('')
      : '<div class="jb-cal-peekempty">Nada neste dia</div>';
    return '<div class="jb-cal-peek" role="region" aria-label="' + esc(e.title || 'Dia do plano') + '" tabindex="-1">'
      + '<span class="jb-cal-peeknub" aria-hidden="true"></span>'
      + '<div class="jb-cal-peekh">'
      + '<a class="jb-cal-peektitle" href="' + esc(href) + '">' + esc(e.title || 'Dia do plano') + '</a>'
      + '<a class="jb-cal-peekgo" href="' + esc(href) + '">Abrir no Planner</a>'
      + '</div>' + rows + '</div>';
  }
  function eventRowHtml(e, opts) {
    opts = opts || {};
    var past = !!opts.past || (daysUntil(e.date) != null && daysUntil(e.date) < 0);
    var nc = past ? '' : nearClass(e.date, e.done);
    var flagText = opts.showDate && !past ? relLabel(e.date) : '';
    var flag = flagText ? ('<span class="jb-cal-flag ' + nc + '">' + esc(flagText) + '</span>') : '';
    var time = e.time ? esc(e.time) : '';
    var meta = opts.compact
      ? ((e.time ? esc(e.time) : '') + (opts.showDate ? ((e.time ? ' · ' : '') + esc(shortDay(e.date))) : ''))
      : ((e.kind ? '<span class="jb-cal-kind">' + esc(e.kind) + '</span>' : '') + (time ? (' · ' + time) : '') + (opts.showDate ? (' · ' + esc(fmtBR(e.date))) : ''));
    if (!opts.compact && e.subtitle) meta += (meta ? ' · ' : '') + esc(e.subtitle);
    var href = e.href ? ' data-href="' + esc(e.href) + '"' : '';
    var raw = e.rawId ? ' data-raw="' + esc(e.rawId) + '"' : '';
    var chk = opts.toggle
      ? ('<button type="button" class="jb-cal-chk' + (e.done ? ' on' : '') + '" data-toggle="' + esc(e.id) + '" title="Concluir">' + (e.done ? '✓' : '') + '</button>')
      : '';
    var linkPill = '';
    if (e.app === 'planner' && e.items != null) {
      linkPill = (e.linkedNotes && e.linkPeek)
        ? ('<span class="jb-cal-flag jb-cal-linkpill">' + esc(e.linkPeek) + '</span>')
        : '<span class="jb-cal-linkslot" aria-hidden="true"></span>';
    } else if (e.linkedNotes && e.linkPeek) {
      linkPill = '<span class="jb-cal-flag jb-cal-linkpill">' + esc(e.linkPeek) + '</span>';
    }
    var barBg = (e.linkedNotes && window.JB && JB.link) ? JB.link.barCss(true) : ('background:' + esc(e.color));
    var peekable = e.app === 'planner' && e.items != null;
    var openPeek = peekable && opts.peekId && opts.peekId === e.id;
    var row = '<div class="jb-cal-row' + (e.done ? ' done' : '') + (e.linkedNotes ? ' linked' : '') + (openPeek ? ' open' : '') + '" data-id="' + esc(e.id) + '" data-app="' + esc(e.app) + '"' + href + raw
      + (peekable ? ' data-peek="1" aria-expanded="' + (openPeek ? 'true' : 'false') + '"' : '') + '>'
      + '<span class="jb-cal-bar" style="' + barBg + '"></span>'
      + '<div class="jb-cal-info"><div class="jb-cal-title">' + esc(e.title || '(sem título)') + '</div>'
      + (meta ? '<div class="jb-cal-meta">' + meta + '</div>' : '') + '</div>' + flag + linkPill + chk + '</div>';
    if (!peekable) return row;
    return '<div class="jb-cal-rowwrap">' + row + '</div>';
  }

  function monthCellsHtml(events, date, sel) {
    var d = parseYmd(date) || new Date();
    var y = d.getFullYear(), m = d.getMonth();
    var first = new Date(y, m, 1).getDay();
    var dim = daysInMonth(y, m);
    var today = todayYmd();
    var byDay = {};
    (events || []).forEach(function (e) {
      if (!byDay[e.date]) byDay[e.date] = [];
      byDay[e.date].push(e);
    });
    var cells = '';
    for (var i = 0; i < first; i++) cells += '<div class="jb-cal-cd empty"></div>';
    for (var day = 1; day <= dim; day++) {
      var iso = ymd(new Date(y, m, day));
      var evs = byDay[iso] || [];
      var dots = evs.slice(0, 4).map(function (e) {
        var bg = (e.linkedNotes && window.JB && JB.link) ? JB.link.dotCss(true) : ('background:' + esc(e.color));
        return '<span class="jb-cal-dot" style="' + bg + (e.done ? ';opacity:.4' : '') + '"></span>';
      }).join('');
      cells += '<div class="jb-cal-cd' + (iso === today ? ' today' : '') + (sel && iso === sel ? ' sel' : '') + (evs.length ? ' has' : '') + '" data-date="' + iso + '">'
        + '<span class="jb-cal-cdn">' + day + '</span><span class="jb-cal-dots">' + dots + '</span></div>';
    }
    var head = WD.map(function (w) { return '<div class="jb-cal-wd">' + w[0] + '</div>'; }).join('');
    return '<div class="jb-cal-head">'
      + '<button type="button" class="jb-cal-nav" data-nav="-1">‹</button>'
      + '<button type="button" class="jb-cal-month" data-nav="today">' + MOFULL[m] + ' ' + y + '</button>'
      + '<button type="button" class="jb-cal-nav" data-nav="1">›</button></div>'
      + '<div class="jb-cal-grid jb-cal-wdrow">' + head + '</div>'
      + '<div class="jb-cal-grid" id="calCells">' + cells + '</div>';
  }

  function filterBarHtml(filters, counts) {
    return '<div class="jb-cal-filters">' + APP_ORDER.map(function (a) {
      var on = !filters || !filters.length || filters.indexOf(a) > -1;
      var n = counts[a] || 0;
      return '<button type="button" class="jb-cal-chip' + (on ? ' on' : '') + '" data-app="' + a + '" style="--chip:' + APP_META[a].color + '">' + APP_META[a].label + (n ? ' ' + n : '') + '</button>';
    }).join('') + '</div>';
  }
  function appOn(filters, app) {
    return !filters || !filters.length || filters.indexOf(app) > -1;
  }
  function clusterHtml(filters, counts, open) {
    var orbs = APP_ORDER.map(function (a) {
      var on = appOn(filters, a);
      return '<span class="jb-cal-orb' + (on ? ' on' : '') + '" style="--ink:' + APP_META[a].ink + ';--bg:' + APP_META[a].bg + '" title="' + esc(APP_META[a].label) + '">' + appGlyph(a) + '</span>';
    }).join('');
    var picks = APP_ORDER.map(function (a) {
      var on = appOn(filters, a);
      var n = counts[a] || 0;
      return '<button type="button" class="jb-cal-orb-btn' + (on ? ' on' : '') + '" data-app="' + a + '" style="--ink:' + APP_META[a].ink + ';--bg:' + APP_META[a].bg + '" title="' + esc(APP_META[a].label) + (n ? ' · ' + n : '') + '">' + appGlyph(a) + '</button>';
    }).join('');
    return '<div class="jb-cal-cluster-wrap' + (open ? ' open' : '') + '">'
      + '<button type="button" class="jb-cal-cluster" data-cluster="toggle" aria-expanded="' + (open ? 'true' : 'false') + '" aria-label="Filtrar apps">' + orbs + '</button>'
      + '<div class="jb-cal-cluster-pop"' + (open ? '' : ' hidden') + '>' + picks + '</div>'
      + '</div>';
  }
  function dayHeadHtml(iso, extra) {
    var d = parseYmd(iso);
    var wd = d ? WD[d.getDay()] : '';
    var num = d ? String(d.getDate()) : '';
    var mo = d ? MO[d.getMonth()] : '';
    return '<div class="jb-cal-sect"><span class="jb-cal-wdchip">' + esc(wd) + '</span>'
      + '<span class="jb-cal-sectd">' + esc(num + (mo ? ' ' + mo : '')) + '</span>' + (extra || '') + '</div>';
  }

  function viewBarHtml(view, views) {
    views = views || ['day', '3day', 'week', 'month'];
    var labels = { day: 'Hoje', '3day': '3 dias', week: 'Semana', month: 'Mês' };
    return '<div class="jb-cal-views">' + views.map(function (v) {
      return '<button type="button" class="jb-cal-vbtn' + (v === view ? ' on' : '') + '" data-view="' + v + '">' + labels[v] + '</button>';
    }).join('') + '</div>';
  }

  function upcomingHtml(events, opts) {
    opts = opts || {};
    var today = todayYmd();
    var up = sortEvents((events || []).filter(function (e) { return !e.done && e.date >= today; })).slice(0, 12);
    if (!up.length) return '';
    return '<div class="jb-cal-sec"><div class="jb-cal-sect">Próximos</div>'
      + up.map(function (e) { return eventRowHtml(e, { showDate: true, toggle: !!opts.toggle, peekId: opts.peekId }); }).join('') + '</div>';
  }

  function applyFilters(events, filters) {
    if (!filters) return events;
    if (!filters.length) return [];
    var set = {};
    filters.forEach(function (a) { set[a] = 1; });
    return events.filter(function (e) { return set[e.app]; });
  }
  function capByApp(events, limit, expanded, scope) {
    expanded = expanded || {};
    if (!limit || limit < 1) return { events: events || [], extra: {} };
    var seen = {}, extra = {}, out = [];
    (events || []).forEach(function (e) {
      var a = e.app || '';
      var key = scope ? a + '|' + scope : a;
      seen[a] = (seen[a] || 0) + 1;
      if (expanded[key] || expanded[a] || seen[a] <= limit) out.push(e);
      else extra[a] = (extra[a] || 0) + 1;
    });
    return { events: out, extra: extra };
  }
  function moreBarHtml(extra, scope) {
    var apps = APP_ORDER.filter(function (a) { return extra && extra[a]; });
    if (!apps.length) return '';
    return '<div class="jb-cal-morebar">' + apps.map(function (a) {
      var key = scope ? a + '|' + scope : a;
      return '<button type="button" class="jb-cal-more" data-more="' + esc(key) + '">Ver mais · ' + extra[a] + '</button>';
    }).join('') + '</div>';
  }
  function appsInDay(events) {
    var by = {};
    (events || []).forEach(function (e) {
      if (!by[e.app]) by[e.app] = [];
      by[e.app].push(e);
    });
    return APP_ORDER.filter(function (a) { return by[a] && by[a].length; }).map(function (a) {
      return { app: a, events: by[a] };
    });
  }
  function splitByWhen(events, today) {
    today = today || todayYmd();
    var upcoming = [], past = [];
    (events || []).forEach(function (e) {
      if (String(e.date || '') >= today) upcoming.push(e);
      else past.push(e);
    });
    return { upcoming: sortEvents(upcoming), past: sortEvents(past).reverse() };
  }
  function orderWithinApp(events, today) {
    var split = splitByWhen(events, today);
    return split.upcoming.concat(split.past);
  }
  function appBlocksHtml(events, opts) {
    opts = opts || {};
    return appsInDay(events).map(function (g) {
      return appBlockHtml(g.app, orderWithinApp(g.events), opts);
    }).join('');
  }
  function appBlockHtml(app, events, opts) {
    opts = opts || {};
    var meta = APP_META[app] || APP_META.study;
    var cap = capByApp(events, opts.limit || 0, opts.expanded, opts.scope);
    var rows = cap.events.map(function (e) {
      return eventRowHtml(e, { showDate: !!opts.showDate, compact: !!opts.compact, toggle: !!opts.toggle, past: !!opts.past, peekId: opts.peekId });
    }).join('');
    return '<div class="jb-cal-app' + (opts.past ? ' past' : '') + '" style="--ink:' + meta.ink + ';--bg:' + meta.bg + '">'
      + '<div class="jb-cal-appt"><span class="jb-cal-appt-ico">' + appGlyph(app) + '</span>' + esc(meta.label)
      + '<span class="jb-cal-appt-n">' + events.length + '</span></div>'
      + rows + moreBarHtml(cap.extra, opts.scope) + '</div>';
  }
  function emptyPeriodHtml(emptyHint) {
    return (window.JB && JB.emptyState)
      ? JB.emptyState({ icon: '📅', title: 'Nada neste período', hint: emptyHint || 'Abra um app e agende algo — o Calendar junta tudo aqui.' })
      : '<div class="rg">Nada neste período.</div>';
  }
  function groupedListHtml(events, emptyHint, opts) {
    opts = opts || {};
    if (!events.length) return emptyPeriodHtml(emptyHint);
    return appBlocksHtml(events, {
      limit: opts.limit, expanded: opts.expanded, compact: opts.compact,
      toggle: opts.toggle, showDate: true, peekId: opts.peekId
    });
  }
  function groupByDay(events) {
    var by = {};
    (events || []).forEach(function (e) {
      var d = String(e.date || '');
      if (!d) return;
      if (!by[d]) by[d] = [];
      by[d].push(e);
    });
    return Object.keys(by).sort().map(function (date) {
      return { date: date, events: sortEvents(by[date]) };
    });
  }
  function groupByDayAgenda(events, today) {
    today = today || todayYmd();
    var upcoming = [], past = [];
    groupByDay(events).forEach(function (g) {
      if (g.date >= today) upcoming.push(g);
      else past.push(g);
    });
    return upcoming.concat(past.reverse());
  }
  function dayRelChip(iso) {
    var n = daysUntil(iso);
    if (n === 0) return '<span class="jb-cal-dayrel">hoje</span>';
    if (n === 1) return '<span class="jb-cal-dayrel">amanhã</span>';
    return '';
  }
  function dayBlockHtml(date, events, opts) {
    opts = opts || {};
    var cap = capByApp(events, opts.limit || 0, opts.expanded, date);
    var extra = dayRelChip(date) + (opts.extra || '');
    var rows = cap.events.map(function (e) {
      return eventRowHtml(e, { showDate: false, compact: false, toggle: !!opts.toggle, past: !!opts.past, peekId: opts.peekId });
    }).join('');
    if (!rows) rows = '<div class="rg">Nada nesse dia.</div>';
    return '<div class="jb-cal-dayblock">' + dayHeadHtml(date, extra) + rows + moreBarHtml(cap.extra, date) + '</div>';
  }
  function dayBlocksHtml(events, emptyHint, opts) {
    opts = opts || {};
    var groups = groupByDayAgenda(events, opts.today);
    if (!groups.length) return emptyPeriodHtml(emptyHint);
    return groups.map(function (g) {
      return dayBlockHtml(g.date, g.events, opts);
    }).join('');
  }
  function agendaToolbarHtml(date, open) {
    var d = parseYmd(date) || new Date();
    return '<div class="jb-cal-toolbar' + (open ? ' only-toggle' : '') + '">'
      + (open ? '' : ('<div class="jb-cal-rangelbl">' + esc(MOFULL[d.getMonth()] + ' ' + d.getFullYear()) + '</div>'))
      + '<button type="button" class="jb-cal-monthbtn' + (open ? ' on' : '') + '" data-month="toggle" aria-expanded="' + (open ? 'true' : 'false') + '">'
      + (open ? 'Ocultar' : 'Mês') + '</button></div>';
  }

  function mount(el, opts) {
    if (!el) return null;
    if (el._jbCalDocClose) {
      document.removeEventListener('mousedown', el._jbCalDocClose);
      el._jbCalDocClose = null;
    }
    if (el._jbCalPeekMove) {
      if (typeof window !== 'undefined' && window.removeEventListener) {
        window.removeEventListener('scroll', el._jbCalPeekMove, true);
        window.removeEventListener('resize', el._jbCalPeekMove);
      }
      el._jbCalPeekMove = null;
    }
    if (el._jbCalEsc) {
      document.removeEventListener('keydown', el._jbCalEsc);
      el._jbCalEsc = null;
    }
    opts = opts || {};
    var state = {
      events: opts.events || [],
      view: opts.view || 'week',
      date: opts.date || todayYmd(),
      filters: opts.filters ? opts.filters.slice() : null,
      views: opts.views || ['day', '3day', 'week', 'month'],
      showFilters: opts.showFilters !== false,
      showUpcoming: !!opts.showUpcoming,
      emptyHint: opts.emptyHint || '',
      footerHtml: opts.footerHtml || '',
      dayActionsHtml: opts.dayActionsHtml || '',
      onSelect: opts.onSelect,
      onOpen: opts.onOpen,
      onToggle: opts.onToggle,
      onChange: opts.onChange,
      compact: !!opts.compact && !opts.agendaFirst,
      agendaFirst: !!opts.agendaFirst,
      monthOpen: !!opts.monthOpen,
      appLimit: opts.appLimit == null ? 0 : Number(opts.appLimit) || 0,
      expandedApps: opts.expandedApps ? Object.assign({}, opts.expandedApps) : {},
      picked: opts.picked === undefined ? (opts.view === 'month' && (opts.compact || opts.agendaFirst) ? null : (opts.date || null)) : opts.picked,
      clusterOpen: false,
      peekId: opts.peekId || null
    };

    function toggleAppFilter(app) {
      var all = APP_ORDER.slice();
      var cur = state.filters == null ? all.slice() : state.filters.slice();
      var i = cur.indexOf(app);
      if (i > -1) cur.splice(i, 1); else cur.push(app);
      if (!cur.length) state.filters = [];
      else if (cur.length === all.length) state.filters = null;
      else state.filters = cur;
      paint();
    }
    function filtered() { return applyFilters(state.events, state.filters); }
    function counts() {
      var c = {};
      (state.events || []).forEach(function (e) { c[e.app] = (c[e.app] || 0) + 1; });
      return c;
    }
    function listOpts() {
      return { limit: state.appLimit, expanded: state.expandedApps, compact: state.compact, toggle: !!state.onToggle, peekId: state.peekId };
    }
    function peekRowById(id) {
      if (!id) return null;
      var nodes = el.querySelectorAll('.jb-cal-row[data-peek="1"]');
      for (var i = 0; i < nodes.length; i++) {
        if (nodes[i].getAttribute('data-id') === id) return nodes[i];
      }
      return null;
    }
    function setPeekOpenClass(on) {
      if (typeof document === 'undefined' || !document.documentElement || !document.documentElement.classList) return;
      document.documentElement.classList.toggle('jb-cal-peek-on', !!on);
    }
    function hidePeek() {
      var peek = el._jbCalPeekNode;
      setPeekOpenClass(false);
      if (!peek) return;
      peek.hidden = true;
      peek.style.visibility = 'hidden';
      peek.style.pointerEvents = 'none';
      peek.style.left = '0px';
      peek.style.top = '0px';
    }
    function withScrollLock(fn) {
      if (typeof window === 'undefined' || !window.addEventListener) { fn(); return; }
      var x = window.scrollX || window.pageXOffset || 0;
      var y = window.scrollY || window.pageYOffset || 0;
      var agenda = el.closest ? el.closest('.hub-agenda') : null;
      var agY = agenda ? agenda.scrollTop : 0;
      var lock = function () {
        if (window.scrollTo) window.scrollTo(x, y);
        if (agenda) agenda.scrollTop = agY;
      };
      window.addEventListener('scroll', lock, true);
      try { fn(); }
      finally {
        window.removeEventListener('scroll', lock, true);
        lock();
        if (typeof requestAnimationFrame === 'function') {
          requestAnimationFrame(lock);
          requestAnimationFrame(function () { requestAnimationFrame(lock); });
        }
      }
    }
    function peekPlaceForRow(row) {
      var r = row.getBoundingClientRect();
      var pad = 12;
      var w = Math.min(260, Math.max(160, window.innerWidth - pad * 2));
      var gap = 12;
      var left = r.right + gap;
      var side = 'right';
      if (left + w > window.innerWidth - pad) {
        left = r.left - gap - w;
        side = 'left';
      }
      if (left < pad) {
        left = pad;
        side = 'right';
      }
      if (left + w > window.innerWidth - pad) left = Math.max(pad, window.innerWidth - pad - w);
      return { left: left, top: r.top, width: w, side: side };
    }
    function applyPeekPlace(peek, place) {
      if (!peek || !place) return;
      peek.hidden = false;
      peek.classList.add('fly');
      peek.style.position = 'fixed';
      peek.style.width = place.width + 'px';
      peek.style.right = 'auto';
      peek.style.bottom = 'auto';
      peek.setAttribute('data-side', place.side);
      var pad = 12;
      var maxH = Math.max(80, window.innerHeight - pad * 2);
      peek.style.maxHeight = maxH + 'px';
      var h = Math.min(peek.offsetHeight || 120, maxH);
      var top = place.top;
      if (top + h > window.innerHeight - pad) top = Math.max(pad, window.innerHeight - pad - h);
      if (top < pad) top = pad;
      peek.style.top = top + 'px';
      peek.style.left = place.left + 'px';
      peek.style.visibility = 'visible';
      peek.style.pointerEvents = 'auto';
      setPeekOpenClass(true);
    }
    function ensurePeekNode() {
      if (el._jbCalPeekNode && el._jbCalPeekNode.isConnected) return el._jbCalPeekNode;
      if (typeof document === 'undefined' || !document.body || !document.createElement) return null;
      if (!el.id) el.id = 'jb-cal-' + Math.random().toString(36).slice(2, 9);
      var peek = document.createElement('div');
      peek.className = 'jb-cal-peek fly';
      peek.setAttribute('data-jb-cal-host', el.id);
      peek.setAttribute('tabindex', '-1');
      peek.hidden = true;
      peek.style.position = 'fixed';
      peek.style.left = '0px';
      peek.style.top = '0px';
      peek.style.visibility = 'hidden';
      peek.style.pointerEvents = 'none';
      document.body.appendChild(peek);
      el._jbCalPeekNode = peek;
      return peek;
    }
    function syncPeekDom() {
      withScrollLock(function () {
        var rows = el.querySelectorAll('.jb-cal-row[data-peek="1"]');
        for (var k = 0; k < rows.length; k++) {
          rows[k].classList.remove('open');
          rows[k].setAttribute('aria-expanded', 'false');
        }
        if (!state.peekId) {
          hidePeek();
          return;
        }
        var row = peekRowById(state.peekId);
        if (!row) { hidePeek(); return; }
        var evn = (state.events || []).find(function (e) { return e.id === state.peekId; });
        if (!evn) { hidePeek(); return; }
        row.classList.add('open');
        row.setAttribute('aria-expanded', 'true');
        var peek = ensurePeekNode();
        if (!peek) return;
        var tmp = document.createElement('div');
        tmp.innerHTML = plannerPeekHtml(evn);
        var src = tmp.firstChild;
        if (src) {
          peek.setAttribute('role', src.getAttribute('role') || 'region');
          peek.setAttribute('aria-label', src.getAttribute('aria-label') || '');
          peek.innerHTML = src.innerHTML;
        }
        applyPeekPlace(peek, peekPlaceForRow(row));
        if (document.activeElement && peek.contains(document.activeElement) && document.activeElement.blur) {
          document.activeElement.blur();
        }
      });
    }
    function placePeek() {
      var peek = el._jbCalPeekNode;
      var row = peekRowById(state.peekId);
      if (!peek || !row || peek.hidden) return;
      applyPeekPlace(peek, peekPlaceForRow(row));
    }
    function bindPeekMove() {
      if (el._jbCalPeekMove) return;
      if (typeof window === 'undefined' || !window.addEventListener) return;
      el._jbCalPeekMove = function () { if (state.peekId) placePeek(); };
      window.addEventListener('scroll', el._jbCalPeekMove, true);
      window.addEventListener('resize', el._jbCalPeekMove);
    }
    function paintAgenda() {
      var range = rangeForView('month', state.date);
      var vis = eventsInRange(filtered(), range.start, range.end);
      var html = '<div class="jb-cal agenda' + (state.monthOpen ? ' month-open' : '') + '">';
      html += agendaToolbarHtml(state.date, state.monthOpen);
      if (state.showFilters) html += filterBarHtml(state.filters, counts());
      if (state.monthOpen) html += monthCellsHtml(filtered(), state.date, state.picked);
      if (state.picked) {
        var dayEvs = eventsInRange(filtered(), state.picked, state.picked);
        html += dayBlockHtml(state.picked, dayEvs, Object.assign({}, listOpts(), {
          extra: '<button type="button" class="jb-cal-clearpick" data-pick="clear">Todo o mês</button>'
        }));
      } else {
        html += dayBlocksHtml(vis, state.emptyHint, listOpts());
      }
      if (state.footerHtml) html += '<div class="jb-cal-foot">' + state.footerHtml + '</div>';
      html += '</div>';
      el.innerHTML = html;
      bind();
      syncPeekDom();
      bindPeekMove();
    }
    function paint() {
      if (state.agendaFirst) { paintAgenda(); return; }
      var range = rangeForView(state.view, state.date);
      var vis = eventsInRange(filtered(), range.start, range.end);
      var html = '<div class="jb-cal' + (state.compact ? ' compact' : '') + (state.clusterOpen ? ' cluster-open' : '') + '">';
      if (state.views && state.views.length > 1) {
        html += '<div class="jb-cal-toolbar">' + viewBarHtml(state.view, state.views)
          + (state.compact ? clusterHtml(state.filters, counts(), state.clusterOpen) : '') + '</div>';
      }
      if (!state.compact && state.showFilters) html += filterBarHtml(state.filters, counts());
      var opts = listOpts();
      if (state.view === 'month') {
        html += monthCellsHtml(filtered(), state.date, state.picked);
        if (state.picked) {
          var dayEvs = eventsInRange(filtered(), state.picked, state.picked);
          html += '<div class="jb-cal-sec">' + dayHeadHtml(state.picked, state.dayActionsHtml)
            + (dayEvs.length
              ? appBlocksHtml(dayEvs, Object.assign({}, opts, { scope: state.picked }))
              : '<div class="rg">Nada nesse dia.</div>') + '</div>';
        } else {
          html += '<div class="jb-cal-monthhint">Por app · toque num dia para filtrar</div>';
          html += groupedListHtml(vis, state.emptyHint, opts);
        }
        if (state.showUpcoming) html += upcomingHtml(filtered(), listOpts());
      } else {
        html += '<div class="jb-cal-rangebar"><button type="button" class="jb-cal-nav" data-shift="-1">‹</button>'
          + '<div class="jb-cal-rangelbl">' + esc(fmtBR(range.start) + (range.start !== range.end ? ' – ' + fmtBR(range.end) : '')) + '</div>'
          + '<button type="button" class="jb-cal-nav" data-shift="1">›</button></div>';
        html += groupedListHtml(vis, state.emptyHint, opts);
      }
      if (state.footerHtml) html += '<div class="jb-cal-foot">' + state.footerHtml + '</div>';
      html += '</div>';
      el.innerHTML = html;
      bind();
      syncPeekDom();
      bindPeekMove();
    }
    function bind() {
      el.querySelectorAll('[data-view]').forEach(function (b) {
        b.onclick = function () {
          state.view = b.getAttribute('data-view');
          if (state.view === 'month' && state.compact) state.picked = null;
          paint();
          if (state.onChange) state.onChange(state);
        };
      });
      el.querySelectorAll('[data-nav]').forEach(function (b) {
        b.onclick = function () {
          var n = b.getAttribute('data-nav');
          var d = parseYmd(state.date) || new Date();
          if (n === 'today') d = new Date();
          else d.setMonth(d.getMonth() + Number(n));
          state.date = ymd(d);
          if (state.view === 'month') state.picked = n === 'today' ? state.date : null;
          paint();
          if (state.onSelect) state.onSelect(state.date);
          if (state.onChange) state.onChange(state);
        };
      });
      el.querySelectorAll('[data-shift]').forEach(function (b) {
        b.onclick = function () {
          var n = Number(b.getAttribute('data-shift'));
          var step = state.view === 'day' ? 1 : state.view === '3day' ? 3 : 7;
          state.date = addDays(state.date, n * step);
          paint();
          if (state.onSelect) state.onSelect(state.date);
          if (state.onChange) state.onChange(state);
        };
      });
      el.querySelectorAll('.jb-cal-cd[data-date]').forEach(function (c) {
        c.onclick = function () {
          var iso = c.getAttribute('data-date');
          state.picked = state.picked === iso ? null : iso;
          if (state.picked) state.date = iso;
          paint();
          if (state.onSelect) state.onSelect(state.picked || state.date);
          if (state.onChange) state.onChange(state);
        };
      });
      function syncClusterDom() {
        var wrap = el.querySelector('.jb-cal-cluster-wrap');
        var btn = el.querySelector('[data-cluster="toggle"]');
        var pop = el.querySelector('.jb-cal-cluster-pop');
        var root = el.querySelector('.jb-cal');
        if (wrap) wrap.classList.toggle('open', state.clusterOpen);
        if (btn) btn.setAttribute('aria-expanded', state.clusterOpen ? 'true' : 'false');
        if (pop) pop.hidden = !state.clusterOpen;
        if (root) root.classList.toggle('cluster-open', state.clusterOpen);
      }
      var clusterBtn = el.querySelector('[data-cluster="toggle"]');
      if (clusterBtn) {
        clusterBtn.onclick = function (ev) {
          ev.stopPropagation();
          state.clusterOpen = !state.clusterOpen;
          syncClusterDom();
        };
      }
      el.querySelectorAll('.jb-cal-orb-btn').forEach(function (b) {
        b.onclick = function (ev) {
          ev.stopPropagation();
          toggleAppFilter(b.getAttribute('data-app'));
        };
      });
      el.querySelectorAll('.jb-cal-chip').forEach(function (b) {
        b.onclick = function () { toggleAppFilter(b.getAttribute('data-app')); };
      });
      el.querySelectorAll('.jb-cal-chk').forEach(function (b) {
        b.onclick = function (ev) {
          ev.stopPropagation();
          var id = b.getAttribute('data-toggle');
          var evn = (state.events || []).find(function (e) { return e.id === id; });
          if (state.onToggle) state.onToggle(evn, b);
        };
      });
      el.querySelectorAll('.jb-cal-row').forEach(function (row) {
        row.onclick = function (ev) {
          if (ev.target && ev.target.closest && ev.target.closest('a')) return;
          var id = row.getAttribute('data-id');
          var evn = (state.events || []).find(function (e) { return e.id === id; });
          if (row.getAttribute('data-peek') === '1') {
            if (ev && ev.preventDefault) ev.preventDefault();
            state.peekId = state.peekId === id ? null : id;
            syncPeekDom();
            return;
          }
          if (state.onOpen) state.onOpen(evn, row);
          else if (evn && evn.href) location.href = evn.href;
        };
      });
      el.querySelectorAll('[data-more]').forEach(function (b) {
        b.onclick = function () {
          state.expandedApps[b.getAttribute('data-more')] = true;
          paint();
        };
      });
      var monthBtn = el.querySelector('[data-month="toggle"]');
      if (monthBtn) {
        monthBtn.onclick = function () {
          state.monthOpen = !state.monthOpen;
          paint();
          if (state.onChange) state.onChange(state);
        };
      }
      el.querySelectorAll('[data-pick="clear"]').forEach(function (b) {
        b.onclick = function (ev) {
          ev.stopPropagation();
          state.picked = null;
          paint();
          if (state.onSelect) state.onSelect(state.date);
          if (state.onChange) state.onChange(state);
        };
      });
      if (!el._jbCalDocClose) {
        el._jbCalDocClose = function (ev) {
          var t = ev.target;
          if (state.clusterOpen) {
            if (!(t && t.closest && t.closest('.jb-cal-cluster-wrap'))) {
              state.clusterOpen = false;
              syncClusterDom();
            }
          }
          if (state.peekId) {
            if (t && t.closest && (t.closest('.jb-cal-row.open') || t.closest('.jb-cal-peek'))) return;
            state.peekId = null;
            syncPeekDom();
          }
        };
        document.addEventListener('mousedown', el._jbCalDocClose);
      }
      if (!el._jbCalEsc) {
        el._jbCalEsc = function (ev) {
          if (ev.key !== 'Escape' || !state.peekId) return;
          state.peekId = null;
          syncPeekDom();
        };
        document.addEventListener('keydown', el._jbCalEsc);
      }
    }

    var api = {
      setEvents: function (list) { state.events = list || []; paint(); },
      setView: function (v) { state.view = v; paint(); },
      setDate: function (d) { state.date = d; paint(); },
      setAppLimit: function (n) {
        state.appLimit = Number(n) > 0 ? Number(n) : 0;
        state.expandedApps = {};
        paint();
      },
      setMonthOpen: function (on) { state.monthOpen = !!on; paint(); },
      getState: function () { return state; },
      render: paint
    };
    paint();
    return api;
  }

  var api = {
    APP_META: APP_META,
    parseYmd: parseYmd, ymd: ymd, addDays: addDays, todayYmd: todayYmd,
    rangeForView: rangeForView, eventsInRange: eventsInRange, sortEvents: sortEvents,
    timeMinFromLabel: timeMinFromLabel, expandFinanceDue: expandFinanceDue,
    eventsFromFit: eventsFromFit, eventsFromStudy: eventsFromStudy,
    eventsFromNotas: eventsFromNotas, eventsFromPlanner: eventsFromPlanner,
    isCollabPlannerGrid: isCollabPlannerGrid, isCollabNotasGrid: isCollabNotasGrid,
    eventRowHtml: eventRowHtml, plannerPeekHtml: plannerPeekHtml, relLabel: relLabel, nearClass: nearClass, daysUntil: daysUntil, fmtBR: fmtBR,
    loadHubEvents: loadHubEvents, loadAppEvents: loadAppEvents, mount: mount, capByApp: capByApp, clearHubCache: clearHubCache, appsInDay: appsInDay, splitByWhen: splitByWhen, orderWithinApp: orderWithinApp,
    groupByDay: groupByDay, groupByDayAgenda: groupByDayAgenda, dayBlocksHtml: dayBlocksHtml
  };
  window.JB_CAL = api;
  if (window.JB) window.JB.cal = api;
})();
