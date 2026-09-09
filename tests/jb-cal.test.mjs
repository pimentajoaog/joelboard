/* Tests for the shared Joelboard calendar kit. © 2026 Joel Soluções LTDA. */
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';

const src = readFileSync(new URL('../public/jb-cal.js', import.meta.url), 'utf8');
const linkSrc = readFileSync(new URL('../public/jb-link.js', import.meta.url), 'utf8');
const ctx = { console, Date, Math, Number, String, Object, Array, Promise, Boolean };
ctx.document = { addEventListener: function () {}, removeEventListener: function () {} };
ctx.window = ctx;
vm.createContext(ctx);
vm.runInContext(linkSrc, ctx);
ctx.JB = { link: ctx.JB_LINK };
vm.runInContext(src, ctx);
const cal = ctx.JB_CAL;
assert.ok(cal, 'JB_CAL is attached');

test('expandFinanceDue emits monthly dues and marks paid', function () {
  var bills = [{ id: 'luz', name: 'Luz', dueDay: 10, category: 'Casa', installments: 0, startMonth: '2026-01' }];
  var payments = [{ month: '2026-03', type: 'bill', itemId: 'luz', paid: true }];
  var evs = cal.expandFinanceDue(bills, payments, '2026-03-01', '2026-03-31');
  assert.equal(evs.length, 1);
  assert.equal(evs[0].date, '2026-03-10');
  assert.equal(evs[0].app, 'finance');
  assert.equal(evs[0].done, true);
  assert.equal(evs[0].kind, 'conta');
});

test('expandFinanceDue skips skipped months and future startMonth', function () {
  var bills = [
    { id: 'net', name: 'Net', dueDay: 5, installments: 0, startMonth: '2026-06' },
    { id: 'aluguel', name: 'Aluguel', dueDay: 1, installments: 0, startMonth: '2026-01' }
  ];
  var payments = [{ month: '2026-03', type: 'skip', itemId: 'aluguel', paid: true }];
  var evs = cal.expandFinanceDue(bills, payments, '2026-03-01', '2026-03-31');
  assert.equal(evs.length, 0);
});

test('expandFinanceDue respects installments and clamps dueDay', function () {
  var bills = [{ id: 'curso', name: 'Curso', dueDay: 31, installments: 3, startMonth: '2026-01' }];
  var evs = cal.expandFinanceDue(bills, [], '2026-02-01', '2026-04-30');
  assert.equal(evs.map(function (e) { return e.date; }).join(','), '2026-02-28,2026-03-31');
  var jan = cal.expandFinanceDue(bills, [], '2026-01-01', '2026-01-31');
  assert.equal(jan[0].date, '2026-01-31');
});

test('eventsInRange and sortEvents order by date then time', function () {
  var list = [
    { date: '2026-03-03', timeMin: '', title: 'C' },
    { date: '2026-03-02', timeMin: 600, title: 'B' },
    { date: '2026-03-02', timeMin: 480, title: 'A' },
    { date: '2026-03-10', timeMin: 0, title: 'D' }
  ];
  var inr = cal.eventsInRange(list, '2026-03-02', '2026-03-03');
  assert.equal(inr.map(function (e) { return e.title; }).join(','), 'A,B,C');
  var sorted = cal.sortEvents(list);
  assert.equal(sorted.map(function (e) { return e.title; }).join(','), 'A,B,C,D');
});

test('collab Planner sheet is not treated as the personal workbook', function () {
  assert.equal(cal.isCollabPlannerGrid({ Meta: 1, Membros: 2, Dias: 3 }), true);
  assert.equal(cal.isCollabPlannerGrid({ Planos: 1, Dias: 2, Eventos: 3 }), false);
  assert.equal(cal.isCollabPlannerGrid({ Meta: 1, Membros: 2, Planos: 3 }), false);
  assert.equal(cal.isCollabNotasGrid({ Meta: 1, Membros: 2, Itens: 3 }), true);
  assert.equal(cal.isCollabNotasGrid({ Notas: 1, Itens: 2 }), false);
});

test('capByApp hides the 6th item per app until expanded', function () {
  var list = [];
  for (var i = 1; i <= 7; i++) list.push({ app: 'finance', id: 'f' + i, date: '2026-03-0' + (i < 10 ? i : 1), title: 'C' + i });
  list.push({ app: 'study', id: 's1', date: '2026-03-02', title: 'Prova' });
  var capped = cal.capByApp(list, 5, {});
  assert.equal(capped.events.length, 6);
  assert.equal(capped.extra.finance, 2);
  assert.equal(capped.extra.study, undefined);
  var open = cal.capByApp(list, 5, { finance: true });
  assert.equal(open.events.length, 8);
  assert.equal(Object.keys(open.extra).length, 0);
});

test('capByApp scope keeps a 5-item limit per day per app', function () {
  var day1 = [];
  var day2 = [];
  for (var i = 1; i <= 6; i++) {
    day1.push({ app: 'finance', id: 'a' + i, date: '2026-03-01' });
    day2.push({ app: 'finance', id: 'b' + i, date: '2026-03-02' });
  }
  var a = cal.capByApp(day1, 5, {}, '2026-03-01');
  var b = cal.capByApp(day2, 5, {}, '2026-03-02');
  assert.equal(a.events.length, 5);
  assert.equal(a.extra.finance, 1);
  assert.equal(b.events.length, 5);
  var open = cal.capByApp(day1, 5, { 'finance|2026-03-01': true }, '2026-03-01');
  assert.equal(open.events.length, 6);
});

test('splitByWhen keeps today and later on top, older days at the bottom', function () {
  var evs = [
    { app: 'fit', date: '2026-09-01', title: 'Peito' },
    { app: 'fit', date: '2026-09-08', title: 'Pernas' },
    { app: 'study', date: '2026-09-20', title: 'Prova' },
    { app: 'study', date: '2026-09-02', title: 'Lista' }
  ];
  var s = cal.splitByWhen(evs, '2026-09-08');
  assert.equal(s.upcoming.map(function (e) { return e.title; }).join(','), 'Pernas,Prova');
  assert.equal(s.past.map(function (e) { return e.title; }).join(','), 'Lista,Peito');
  var fit = evs.filter(function (e) { return e.app === 'fit'; });
  assert.equal(cal.orderWithinApp(fit, '2026-09-08').map(function (e) { return e.title; }).join(','), 'Pernas,Peito');
});

test('appsInDay lists every app that has an event that day', function () {
  var groups = cal.appsInDay([
    { app: 'finance', title: 'Luz' },
    { app: 'study', title: 'Prova' },
    { app: 'finance', title: 'Net' }
  ]);
  assert.equal(groups.map(function (g) { return g.app; }).join(','), 'finance,study');
  assert.equal(groups[0].events.length, 2);
});

test('compact row puts the calendar day in meta and the relative time in the flag', function () {
  var html = cal.eventRowHtml(
    { date: '2026-10-10', title: 'Luz', app: 'finance', color: '#34d399' },
    { compact: true, showDate: true }
  );
  assert.equal((html.match(/10 out/g) || []).length, 1);
  assert.match(html, /jb-cal-flag/);
  assert.equal((html.match(/em \d+ dias/g) || []).length, 1);
});

test('eventsFromNotas skips presets even with a due date', function () {
  var evs = cal.eventsFromNotas([
    { id: 'pre', titulo: 'Viagem nacional', tipo: 'viagem', vence: '2026-10-01', preset: true },
    { id: 'due', titulo: 'Chile', tipo: 'viagem', vence: '2026-10-12', done: false }
  ]);
  assert.equal(evs.map(function (e) { return e.rawId; }).join(','), 'due');
});

test('eventsFromPlanner copies list ids and the row wears the dual-hue pill', function () {
  var evs = cal.eventsFromPlanner(
    [{ id: 'p1', titulo: 'Fim de semana', inicio: '2026-09-12', listaIds: ['n6'] }],
    [{ id: 'd1', planoId: 'p1', data: '2026-09-12', titulo: 'Chegada', listaIds: [] }],
    [{ id: 'e1', diaId: 'd1', hora: '16h', horaMin: 960, titulo: 'Check-in', icone: '🏨' }]
  );
  assert.equal(evs.length, 1);
  assert.equal(evs[0].id, 'planner-day:d1');
  assert.equal(evs[0].time, '');
  assert.equal(evs[0].listaIds.join(','), 'n6');
  assert.equal(evs[0].items.length, 1);
  assert.equal(evs[0].items[0].title, 'Check-in');
  assert.match(evs[0].href, /\/planner\/\?p=p1/);
  assert.match(evs[0].href, /[?&]d=d1/);
  var html = cal.eventRowHtml({
    date: '2026-09-12', title: 'Fim de semana', app: 'planner', color: '#2dd4bf',
    linkedNotes: true, linkPeek: '1/3'
  }, { compact: true, showDate: true });
  assert.match(html, /jb-cal-row linked/);
  assert.match(html, /jb-cal-linkpill/);
  assert.match(html, /1\/3/);
});

test('planner day rows expand a view-only peek instead of listing hours', function () {
  var evs = cal.eventsFromPlanner(
    [{ id: 'p1', titulo: 'Fim de semana', inicio: '2026-09-12', listaIds: [] }],
    [
      { id: 'd1', planoId: 'p1', data: '2026-09-12', titulo: 'Chegada', icone: '🌅', listaIds: [] },
      { id: 'd2', planoId: 'p1', data: '2026-09-13', titulo: 'Passeio', listaIds: [] }
    ],
    [
      { id: 'e1', diaId: 'd1', hora: '16h', horaMin: 960, titulo: 'Check-in' },
      { id: 'e2', diaId: 'd2', hora: '9h30', horaMin: 570, titulo: 'Café' },
      { id: 'e3', diaId: 'd2', hora: '21h', horaMin: 1260, titulo: 'Jantar', nota: 'Reserva' }
    ]
  );
  assert.equal(evs.map(function (e) { return e.id; }).join(','), 'planner-day:d1,planner-day:d2');
  assert.equal(evs[1].items.map(function (it) { return it.title; }).join(','), 'Café,Jantar');
  var closed = cal.eventRowHtml(evs[1], { compact: true, showDate: true });
  assert.match(closed, /data-peek="1"/);
  assert.doesNotMatch(closed, /jb-cal-peek/);
  assert.doesNotMatch(closed, /jb-cal-rowgo/);
  assert.doesNotMatch(closed, /Café/);
  var open = cal.eventRowHtml(evs[1], { compact: true, showDate: true, peekId: evs[1].id });
  assert.match(open, /jb-cal-peek/);
  assert.match(open, /role="dialog"/);
  assert.match(open, /Café/);
  assert.match(open, /Jantar/);
  assert.match(open, /Reserva/);
  assert.match(open, /Abrir no Planner/);
  assert.match(open, /jb-cal-peektitle/);
  assert.doesNotMatch(open, /jb-cal-rowgo/);
  const css = readFileSync(new URL('../public/joelboard.css', import.meta.url), 'utf8');
  assert.match(css, /\.jb-cal-peek \{[\s\S]*?position:\s*absolute/);
  assert.match(css, /\.jb-cal-peek\.fly \{[^}]*position:\s*fixed/);
  assert.match(css, /\.jb-cal-rowwrap \{[^}]*width:\s*min\(100%, 420px\)/);
  assert.match(css, /\.jb-cal-row\[data-peek="1"\] \{[\s\S]*?height:\s*52px/);
  assert.match(css, /\.jb-cal\.compact \.jb-cal-row\[data-peek="1"\] \{[\s\S]*?height:\s*44px/);
  assert.doesNotMatch(css, /\.jb-cal-rowwrap\.open \{[^}]*display:\s*flex/);
  const calSrc = readFileSync(new URL('../public/jb-cal.js', import.meta.url), 'utf8');
  assert.match(calSrc, /peek\.classList\.add\('fly'\)/);
  assert.doesNotMatch(calSrc, /if \(spaceRight >= w\) return/);
});

test('eventsFromNotas keeps completed due lists as done', function () {
  var evs = cal.eventsFromNotas([
    { id: 'open', titulo: 'Chile', tipo: 'viagem', vence: '2026-10-12', done: false },
    { id: 'done', titulo: 'Farmácia', tipo: 'compras', vence: '2026-09-08', done: true },
    { id: 'nodue', titulo: 'Compras', tipo: 'compras', vence: '', done: false }
  ]);
  assert.equal(evs.map(function (e) { return e.rawId + ':' + e.done; }).join(','), 'open:false,done:true');
  var row = cal.eventRowHtml(evs[1], { compact: true, showDate: true });
  assert.match(row, /jb-cal-row done/);
  assert.match(row, /Farmácia/);
});

test('eventsFromStudy keeps concluded events as done in the row', function () {
  var evs = cal.eventsFromStudy([
    { id: 'p1', titulo: 'Prova', tipo: 'Prova', data: '2026-09-20', concluido: true }
  ], []);
  assert.equal(evs[0].done, true);
  assert.match(cal.eventRowHtml(evs[0], { compact: true }), /jb-cal-row done/);
});

test('groupByDay skips empty dates and keeps day order', function () {
  var groups = cal.groupByDay([
    { date: '2026-09-10', title: 'B', timeMin: 600 },
    { date: '', title: 'skip' },
    { date: '2026-09-09', title: 'A' },
    { date: '2026-09-10', title: 'C', timeMin: 480 }
  ]);
  assert.equal(groups.map(function (g) { return g.date; }).join(','), '2026-09-09,2026-09-10');
  assert.equal(groups[1].events.map(function (e) { return e.title; }).join(','), 'C,B');
  var ag = cal.groupByDayAgenda([
    { date: '2026-09-07', title: 'Old' },
    { date: '2026-09-09', title: 'Today' },
    { date: '2026-09-10', title: 'Tom' }
  ], '2026-09-09');
  assert.equal(ag.map(function (g) { return g.date; }).join(','), '2026-09-09,2026-09-10,2026-09-07');
  var html = cal.dayBlocksHtml([
    { date: '2026-09-09', title: 'Luz', app: 'finance', color: '#34d399' }
  ], 'hint', { today: '2026-09-09' });
  assert.match(html, /jb-cal-dayblock/);
  assert.match(html, /Luz/);
  assert.doesNotMatch(html, /2026-09-08/);
  assert.match(cal.dayBlocksHtml([], 'hint'), /Nada neste per[ií]odo/);
});

test('agendaFirst paints day blocks and hides the month until opened', function () {
  var store = { html: '' };
  var el = {
    get innerHTML() { return store.html; },
    set innerHTML(v) { store.html = String(v || ''); },
    querySelectorAll: function () { return []; },
    querySelector: function () { return null; }
  };
  var evs = [
    { app: 'finance', id: 'f1', date: '2026-09-09', title: 'Luz', color: '#34d399' },
    { app: 'planner', id: 'p1', date: '2026-09-12', title: 'Chegada', color: '#2dd4bf' }
  ];
  var api = cal.mount(el, {
    events: evs, view: 'month', date: '2026-09-09',
    agendaFirst: true, monthOpen: false, showFilters: true, views: [], compact: false
  });
  assert.match(store.html, /jb-cal agenda/);
  assert.doesNotMatch(store.html, / compact/);
  assert.match(store.html, /jb-cal-dayblock/);
  assert.match(store.html, /Luz/);
  assert.match(store.html, />Mês</);
  assert.doesNotMatch(store.html, /id="calCells"/);
  api.setMonthOpen(true);
  assert.match(store.html, /month-open/);
  assert.match(store.html, /id="calCells"/);
  assert.match(store.html, /Ocultar/);
});

test('compact mount keeps app icons and the filter cluster', function () {
  var store = { html: '' };
  var el = {
    get innerHTML() { return store.html; },
    set innerHTML(v) { store.html = String(v || ''); },
    querySelectorAll: function () { return []; },
    querySelector: function () { return null; }
  };
  cal.mount(el, {
    events: [{ app: 'finance', id: 'f1', date: '2026-09-09', title: 'Luz', color: '#34d399' }],
    view: 'month', date: '2026-09-09', compact: true, views: ['day', 'week', 'month']
  });
  assert.match(store.html, /jb-cal compact/);
  assert.match(store.html, /jb-cal-cluster/);
  assert.match(store.html, /jb-cal-appt-ico/);
  assert.match(store.html, /Luz/);
});

test('Hub desktop compact is not the phone agenda', function () {
  const hub = readFileSync(new URL('../public/hub.js', import.meta.url), 'utf8');
  assert.match(hub, /return hubAgendaWide\(\)\?'wide':'compact'/);
  assert.match(hub, /var compact=mode==='compact'/);
  assert.match(src, /Promise\.all\(apps\.map/);
});

test('rangeForView covers day, 3-day, week and month', function () {
  var day = cal.rangeForView('day', '2026-03-04');
  assert.equal(day.start, '2026-03-04');
  assert.equal(day.end, '2026-03-04');
  assert.equal(day.date, '2026-03-04');
  var three = cal.rangeForView('3day', '2026-03-04');
  assert.equal(three.end, '2026-03-06');
  var week = cal.rangeForView('week', '2026-03-04');
  assert.equal(week.start, '2026-03-01');
  assert.equal(week.end, '2026-03-07');
  var month = cal.rangeForView('month', '2026-03-04');
  assert.equal(month.start, '2026-03-01');
  assert.equal(month.end, '2026-03-31');
});
