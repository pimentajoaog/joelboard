/* Joelboard shared calendar kit. © 2026 Joel Soluções LTDA.
   Classic global; loads after /joelboard.js. Exposes JB.cal / JB_CAL. */
(function () {
  var WD = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
  var MO = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
  var MOFULL = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
  var APP_META = {
    finance: { label: 'Finance', color: 'var(--income, #34d399)', kind: 'conta' },
    fit: { label: 'Fit', color: 'var(--fit, #fb7185)', kind: 'treino' },
    study: { label: 'Study', color: 'var(--study, #a78bfa)', kind: 'prova' },
    notas: { label: 'Notas', color: 'var(--notas, #f59e0b)', kind: 'prazo' },
    planner: { label: 'Planner', color: 'var(--planner, #2dd4bf)', kind: 'plano' }
  };
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
      kind: o.kind || meta.kind
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
    return (lists || []).filter(function (n) { return n.vence && !n.done; }).map(function (n) {
      var date = sheetsDate(n.vence);
      return ev({
        app: 'notas', id: 'notas:' + n.id, rawId: String(n.id || ''),
        date: date, title: String(n.titulo || 'Lista'), subtitle: n.tipo ? String(n.tipo) : '',
        done: false, href: '/notas/?lista=' + encodeURIComponent(n.id), kind: 'prazo'
      });
    });
  }
  function eventsFromPlanner(planos, dias, eventos) {
    var planBy = {}, dayBy = {};
    (planos || []).forEach(function (p) { planBy[p.id] = p; });
    (dias || []).forEach(function (d) { dayBy[d.id] = d; });
    var out = [];
    (dias || []).forEach(function (d) {
      var date = sheetsDate(d.data || d.date);
      if (!date) return;
      var p = planBy[d.planoId] || {};
      out.push(ev({
        app: 'planner', id: 'planner-day:' + d.id, rawId: String(p.id || d.planoId || ''),
        date: date, title: String(d.titulo || p.titulo || 'Dia do plano'),
        subtitle: p.titulo && d.titulo ? String(p.titulo) : '',
        href: '/planner/?p=' + encodeURIComponent(p.id || d.planoId || ''), kind: 'plano'
      }));
    });
    (eventos || []).forEach(function (e) {
      var day = dayBy[e.diaId];
      var date = day ? sheetsDate(day.data || day.date) : '';
      if (!date) return;
      var p = planBy[day.planoId] || {};
      out.push(ev({
        app: 'planner', id: 'planner-evt:' + e.id, rawId: String(p.id || day.planoId || ''),
        date: date, time: e.hora || '', timeMin: e.horaMin, title: String(e.titulo || 'Evento'),
        subtitle: e.nota ? String(e.nota) : (p.titulo || ''),
        href: '/planner/?p=' + encodeURIComponent(p.id || day.planoId || ''), kind: 'plano'
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
  function loadAppEvents(app, start, end) {
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
          return { id: String(r[6]), titulo: String(r[0] || ''), tipo: String(r[1] || ''), vence: r[7] || '', done: notaItemsDone(by.Itens, r[6]) };
        });
        var evs = eventsFromNotas(lists);
        var regs = body(by.Compartilhadas || []).filter(function (r) { return r[1]; });
        if (!regs.length) return evs;
        return mapSeq(regs, function (reg) {
          return batchGet(String(reg[1]), ['Meta']).then(function (pack) {
            var meta = body(pack.Meta)[0];
            if (!meta || !meta[7]) return [];
            return eventsFromNotas([{ id: String(meta[6] || reg[4] || ''), titulo: String(meta[0] || reg[0] || ''), tipo: String(meta[1] || ''), vence: meta[7], done: false }]);
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
        var planos = body(by.Planos).filter(function (r) { return r[7]; }).map(function (r) {
          return { id: String(r[7]), titulo: String(r[0] || '') };
        });
        var dias = body(by.Dias).filter(function (r) { return r[5]; }).map(function (r) {
          return { id: String(r[5]), planoId: String(r[0] || ''), data: r[1], titulo: String(r[2] || '') };
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
            var p = meta && meta[7] ? [{ id: String(meta[7]), titulo: String(meta[0] || '') }] : [];
            var ds = body(pack.Dias).filter(function (r) { return r[5]; }).map(function (r) {
              return { id: String(r[5]), planoId: String(r[0] || (p[0] && p[0].id) || ''), data: r[1], titulo: String(r[2] || '') };
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
    var chain = Promise.resolve([]);
    apps.forEach(function (app) {
      chain = chain.then(function (all) {
        return loadAppEvents(app, win.start, win.end)
          .catch(function () { missed.push(app); return []; })
          .then(function (part) { return all.concat(part); });
      });
    });
    return chain.then(function (all) {
      var pack = { events: sortEvents(all), missed: missed, range: focus, window: win };
      _hubCache = { at: Date.now(), start: win.start, end: win.end, events: pack.events, missed: missed };
      return pack;
    });
  }
  function clearHubCache() { _hubCache = null; _tabCache = {}; }

  function eventRowHtml(e, opts) {
    opts = opts || {};
    var nc = nearClass(e.date, e.done);
    var flag = opts.showDate ? ('<span class="jb-cal-flag ' + nc + '">' + esc(relLabel(e.date)) + '</span>') : '';
    var time = e.time ? esc(e.time) : '';
    var meta = opts.compact
      ? ((e.time ? esc(e.time) : '') + (opts.showDate ? ((e.time ? ' · ' : '') + esc(relLabel(e.date))) : ''))
      : ((e.kind ? '<span class="jb-cal-kind">' + esc(e.kind) + '</span>' : '') + (time ? (' · ' + time) : '') + (opts.showDate ? (' · ' + esc(fmtBR(e.date))) : ''));
    if (!opts.compact && e.subtitle) meta += (meta ? ' · ' : '') + esc(e.subtitle);
    var href = e.href ? ' data-href="' + esc(e.href) + '"' : '';
    var raw = e.rawId ? ' data-raw="' + esc(e.rawId) + '"' : '';
    var chk = opts.toggle
      ? ('<button type="button" class="jb-cal-chk' + (e.done ? ' on' : '') + '" data-toggle="' + esc(e.id) + '" title="Concluir">' + (e.done ? '✓' : '') + '</button>')
      : '';
    return '<div class="jb-cal-row' + (e.done ? ' done' : '') + '" data-id="' + esc(e.id) + '" data-app="' + esc(e.app) + '"' + href + raw + '>'
      + '<span class="jb-cal-bar" style="background:' + esc(e.color) + '"></span>'
      + '<div class="jb-cal-info"><div class="jb-cal-title">' + esc(e.title || '(sem título)') + '</div>'
      + (meta ? '<div class="jb-cal-meta">' + meta + '</div>' : '') + '</div>' + flag + chk + '</div>';
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
        return '<span class="jb-cal-dot" style="background:' + esc(e.color) + (e.done ? ';opacity:.4' : '') + '"></span>';
      }).join('');
      cells += '<div class="jb-cal-cd' + (iso === today ? ' today' : '') + (iso === sel ? ' sel' : '') + (evs.length ? ' has' : '') + '" data-date="' + iso + '">'
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

  function listHtml(events, range, emptyHint, compact) {
    if (!events.length) {
      return (window.JB && JB.emptyState)
        ? JB.emptyState({ icon: '📅', title: 'Nada neste período', hint: emptyHint || 'Abra um app e agende algo — a agenda junta tudo aqui.' })
        : '<div class="rg">Nada neste período.</div>';
    }
    var groups = {};
    events.forEach(function (e) {
      if (!groups[e.date]) groups[e.date] = [];
      groups[e.date].push(e);
    });
    var days = Object.keys(groups).sort();
    return days.map(function (d) {
      return '<div class="jb-cal-sec"><div class="jb-cal-sect">' + esc(fmtBR(d)) + '</div>'
        + groups[d].map(function (e) { return eventRowHtml(e, { showDate: false, compact: !!compact }); }).join('') + '</div>';
    }).join('');
  }

  function filterBarHtml(filters, counts) {
    var apps = ['finance', 'fit', 'study', 'notas', 'planner'];
    return '<div class="jb-cal-filters">' + apps.map(function (a) {
      var on = !filters || !filters.length || filters.indexOf(a) > -1;
      var n = counts[a] || 0;
      return '<button type="button" class="jb-cal-chip' + (on ? ' on' : '') + '" data-app="' + a + '" style="--chip:' + APP_META[a].color + '">' + APP_META[a].label + (n ? ' ' + n : '') + '</button>';
    }).join('') + '</div>';
  }

  function viewBarHtml(view, views) {
    views = views || ['day', '3day', 'week', 'month'];
    var labels = { day: 'Hoje', '3day': '3 dias', week: 'Semana', month: 'Mês' };
    return '<div class="jb-cal-views">' + views.map(function (v) {
      return '<button type="button" class="jb-cal-vbtn' + (v === view ? ' on' : '') + '" data-view="' + v + '">' + labels[v] + '</button>';
    }).join('') + '</div>';
  }

  function upcomingHtml(events, toggle) {
    var today = todayYmd();
    var up = sortEvents((events || []).filter(function (e) { return !e.done && e.date >= today; })).slice(0, 12);
    if (!up.length) return '';
    return '<div class="jb-cal-sec"><div class="jb-cal-sect">Próximos</div>'
      + up.map(function (e) { return eventRowHtml(e, { showDate: true, toggle: !!toggle }); }).join('') + '</div>';
  }

  function applyFilters(events, filters) {
    if (!filters || !filters.length) return events;
    var set = {};
    filters.forEach(function (a) { set[a] = 1; });
    return events.filter(function (e) { return set[e.app]; });
  }
  function capByApp(events, limit, expanded) {
    expanded = expanded || {};
    if (!limit || limit < 1) return { events: events || [], extra: {} };
    var seen = {}, extra = {}, out = [];
    (events || []).forEach(function (e) {
      var a = e.app || '';
      seen[a] = (seen[a] || 0) + 1;
      if (expanded[a] || seen[a] <= limit) out.push(e);
      else extra[a] = (extra[a] || 0) + 1;
    });
    return { events: out, extra: extra };
  }
  function moreBarHtml(extra) {
    var apps = Object.keys(extra || {});
    if (!apps.length) return '';
    return '<div class="jb-cal-morebar">' + apps.map(function (a) {
      var n = extra[a];
      var label = (APP_META[a] && APP_META[a].label) || a;
      return '<button type="button" class="jb-cal-more" data-more="' + esc(a) + '">Ver mais ' + esc(label) + ' · ' + n + '</button>';
    }).join('') + '</div>';
  }

  function mount(el, opts) {
    if (!el) return null;
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
      compact: !!opts.compact,
      appLimit: opts.appLimit == null ? 0 : Number(opts.appLimit) || 0,
      expandedApps: opts.expandedApps ? Object.assign({}, opts.expandedApps) : {}
    };

    function filtered() { return applyFilters(state.events, state.filters); }
    function counts() {
      var c = {};
      (state.events || []).forEach(function (e) { c[e.app] = (c[e.app] || 0) + 1; });
      return c;
    }
    function paint() {
      var range = rangeForView(state.view, state.date);
      var vis = eventsInRange(filtered(), range.start, range.end);
      var html = '<div class="jb-cal' + (state.compact ? ' compact' : '') + '">';
      if (state.views && state.views.length > 1) html += '<div class="jb-cal-toolbar">' + viewBarHtml(state.view, state.views) + '</div>';
      if (state.showFilters) html += filterBarHtml(state.filters, counts());
      if (state.view === 'month') {
        html += monthCellsHtml(filtered(), state.date, state.date);
        var dayCap = capByApp(eventsInRange(filtered(), state.date, state.date), state.appLimit, state.expandedApps);
        html += '<div class="jb-cal-sec"><div class="jb-cal-sect">' + esc(fmtBR(state.date)) + (state.dayActionsHtml || '') + '</div>'
          + (dayCap.events.map(function (e) { return eventRowHtml(e, { toggle: !!state.onToggle, compact: state.compact }); }).join('')
            || '<div class="rg">Nada nesse dia.</div>') + moreBarHtml(dayCap.extra) + '</div>';
        if (state.showUpcoming) html += upcomingHtml(filtered(), state.onToggle);
      } else {
        html += '<div class="jb-cal-rangebar"><button type="button" class="jb-cal-nav" data-shift="-1">‹</button>'
          + '<div class="jb-cal-rangelbl">' + esc(fmtBR(range.start) + (range.start !== range.end ? ' – ' + fmtBR(range.end) : '')) + '</div>'
          + '<button type="button" class="jb-cal-nav" data-shift="1">›</button></div>';
        var capped = capByApp(vis, state.appLimit, state.expandedApps);
        html += listHtml(capped.events, range, state.emptyHint, state.compact);
        html += moreBarHtml(capped.extra);
      }
      if (state.footerHtml) html += '<div class="jb-cal-foot">' + state.footerHtml + '</div>';
      html += '</div>';
      el.innerHTML = html;
      bind();
    }
    function bind() {
      el.querySelectorAll('[data-view]').forEach(function (b) {
        b.onclick = function () {
          state.view = b.getAttribute('data-view');
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
          state.date = c.getAttribute('data-date');
          paint();
          if (state.onSelect) state.onSelect(state.date);
        };
      });
      el.querySelectorAll('.jb-cal-chip').forEach(function (b) {
        b.onclick = function () {
          var app = b.getAttribute('data-app');
          var all = Object.keys(APP_META);
          var cur = state.filters && state.filters.length ? state.filters.slice() : all.slice();
          var i = cur.indexOf(app);
          if (i > -1) cur.splice(i, 1); else cur.push(app);
          if (!cur.length || cur.length === all.length) state.filters = null;
          else state.filters = cur;
          paint();
        };
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
        row.onclick = function () {
          var id = row.getAttribute('data-id');
          var evn = (state.events || []).find(function (e) { return e.id === id; });
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
    }

    var api = {
      setEvents: function (list) { state.events = list || []; paint(); },
      setView: function (v) { state.view = v; paint(); },
      setDate: function (d) { state.date = d; paint(); },
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
    eventRowHtml: eventRowHtml, relLabel: relLabel, nearClass: nearClass, daysUntil: daysUntil, fmtBR: fmtBR,
    loadHubEvents: loadHubEvents, loadAppEvents: loadAppEvents, mount: mount, capByApp: capByApp, clearHubCache: clearHubCache
  };
  window.JB_CAL = api;
  if (window.JB) window.JB.cal = api;
})();
