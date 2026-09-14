/* Tests for Hub → Google Calendar publish mapping. © 2026 Joel Soluções LTDA. */
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';

const src = readFileSync(new URL('../public/jb-gcal.js', import.meta.url), 'utf8');
const ctx = {
  console, Date, Math, Number, String, Object, Array, Promise, Boolean, Intl,
  document: { getElementById: function () { return null; } },
  location: { origin: 'https://joelboard.vercel.app' }
};
ctx.window = ctx;
vm.createContext(ctx);
vm.runInContext(src, ctx);
const gcal = ctx.JB_GCAL;
assert.ok(gcal, 'JB_GCAL is attached');

const OPTS = { origin: 'https://joelboard.vercel.app', timeZone: 'America/Sao_Paulo' };

test('all-day Hub events use exclusive end dates and no reminders', function () {
  var body = gcal.eventBody({
    id: 'finance:bill:luz:2026-03',
    app: 'finance',
    date: '2026-03-10',
    title: 'Luz',
    subtitle: 'Casa',
    href: '/finance/'
  }, OPTS);
  assert.equal(body.start.date, '2026-03-10');
  assert.equal(body.end.date, '2026-03-11');
  assert.equal(body.start.dateTime, undefined);
  assert.equal(body.reminders.useDefault, false);
  assert.equal((body.reminders.overrides || []).length, 0);
  assert.equal(body.extendedProperties.private.jb, 'finance:bill:luz:2026-03');
  assert.match(body.description, /Finance/);
  assert.match(body.description, /https:\/\/joelboard\.vercel\.app\/finance\//);
  assert.equal(body.transparency, 'opaque');
});

test('timed Hub events stay on the same local day', function () {
  var body = gcal.eventBody({
    id: 'planner:p1:2026-09-14',
    app: 'planner',
    date: '2026-09-14',
    timeMin: 22 * 60 + 30,
    title: 'Jantar',
    href: '/planner/?p=p1'
  }, OPTS);
  assert.equal(body.start.dateTime, '2026-09-14T22:30:00');
  assert.equal(body.end.dateTime, '2026-09-14T23:30:00');
  assert.equal(body.start.timeZone, 'America/Sao_Paulo');
  assert.equal(body.reminders.useDefault, false);
});

test('done events are marked transparent with a check in the title', function () {
  var body = gcal.eventBody({
    id: 'notas:n1',
    app: 'notas',
    date: '2026-12-31',
    title: 'Mercado',
    done: true,
    href: '/notas/?n=n1'
  }, OPTS);
  assert.equal(body.summary, '✓ Mercado');
  assert.equal(body.transparency, 'transparent');
  assert.equal(body.end.date, '2027-01-01');
});

test('syncPlan upserts new ids, patches changes, and drops orphans', function () {
  var hub = [
    { id: 'a', app: 'study', date: '2026-09-14', title: 'Prova', href: '/study/' },
    { id: 'b', app: 'fit', date: '2026-09-15', title: 'Treino', timeMin: 420, href: '/fit/' }
  ];
  var remote = [
    {
      id: 'g1',
      summary: 'Prova',
      description: 'Study\nhttps://joelboard.vercel.app/study/',
      start: { date: '2026-09-14' },
      end: { date: '2026-09-15' },
      transparency: 'opaque',
      reminders: { useDefault: false },
      extendedProperties: { private: { jb: 'a' } }
    },
    {
      id: 'g-old',
      summary: 'Sumiu',
      start: { date: '2026-09-16' },
      end: { date: '2026-09-17' },
      extendedProperties: { private: { jb: 'gone' } }
    }
  ];
  var plan = gcal.syncPlan(hub, remote, OPTS);
  assert.equal(plan.remove.join(','), 'g-old');
  assert.equal(plan.upsert.length, 1);
  assert.equal(plan.upsert[0].method, 'POST');
  assert.equal(plan.upsert[0].body.extendedProperties.private.jb, 'b');
  assert.equal(plan.upsert[0].body.start.dateTime, '2026-09-15T07:00:00');
});

test('syncPlan patches when the Hub title changes', function () {
  var hub = [{ id: 'a', app: 'study', date: '2026-09-14', title: 'Prova 2', href: '/study/' }];
  var remote = [{
    id: 'g1',
    summary: 'Prova',
    description: 'Study\nhttps://joelboard.vercel.app/study/',
    start: { date: '2026-09-14' },
    end: { date: '2026-09-15' },
    transparency: 'opaque',
    reminders: { useDefault: false },
    extendedProperties: { private: { jb: 'a' } }
  }];
  var plan = gcal.syncPlan(hub, remote, OPTS);
  assert.equal(plan.remove.length, 0);
  assert.equal(plan.upsert.length, 1);
  assert.equal(plan.upsert[0].method, 'PATCH');
  assert.equal(plan.upsert[0].id, 'g1');
  assert.equal(plan.upsert[0].body.summary, 'Prova 2');
});

test('default login scopes still omit Calendar', function () {
  const jb = readFileSync(new URL('../public/joelboard.js', import.meta.url), 'utf8');
  assert.match(jb, /var SCOPES = 'openid email profile https:\/\/www\.googleapis\.com\/auth\/spreadsheets https:\/\/www\.googleapis\.com\/auth\/drive\.file'/);
  assert.match(jb, /var CAL_SCOPE = 'https:\/\/www\.googleapis\.com\/auth\/calendar\.app\.created'/);
  assert.match(src, /reminders: \{ useDefault: false/);
});
