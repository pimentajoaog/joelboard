/* Tests for the shared Joelboard calendar kit. © 2026 Joel Soluções LTDA. */
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';

const src = readFileSync(new URL('../public/jb-cal.js', import.meta.url), 'utf8');
const ctx = { console, Date, Math, Number, String, Object, Array, Promise, Boolean };
ctx.window = ctx;
vm.createContext(ctx);
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
