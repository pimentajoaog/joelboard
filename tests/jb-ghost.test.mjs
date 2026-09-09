/* Tests for the localhost-only ghost session. © 2026 Joel Soluções LTDA. */
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';

const src = readFileSync(new URL('../public/joelboard.js', import.meta.url), 'utf8');
const start = src.indexOf('function jbGhostHostOk');
const end = src.indexOf('function ghostAllowed');
assert.ok(start > 0 && end > start, 'ghost host helper in joelboard.js');
const ctx = { console };
vm.createContext(ctx);
vm.runInContext(src.slice(start, end) + '\nthis.jbGhostHostOk=jbGhostHostOk;this.jbGhostYmdFrom=jbGhostYmdFrom;this.jbGhostFixture=jbGhostFixture;', ctx);

test('jbGhostHostOk allows only loopback hosts', function () {
  assert.equal(ctx.jbGhostHostOk('localhost'), true);
  assert.equal(ctx.jbGhostHostOk('127.0.0.1'), true);
  assert.equal(ctx.jbGhostHostOk('joelboard.vercel.app'), false);
  assert.equal(ctx.jbGhostHostOk(''), false);
});

test('jbGhostFixture gives Notes and Planner enough rows to click', function () {
  var notas = ctx.jbGhostFixture('notas', '2026-09-08');
  assert.equal(notas.data.notas.length, 2);
  assert.equal(notas.data.itens.length, 3);
  assert.equal(notas.data.notas[1].vence, '2026-10-12');
  var planner = ctx.jbGhostFixture('planner', '2026-09-08');
  assert.equal(planner.data.planos[0].inicio, '2026-09-12');
  assert.equal(planner.data.dias.length, 3);
  assert.equal(planner.data.eventos.length, 3);
  assert.equal(planner.data.eventos[1].horaMin, 570);
});

test('ghost session is wired for agents and stays off production', function () {
  assert.match(src, /cursor-ghost@localhost/);
  assert.match(src, /function isGhost/);
  assert.match(src, /function seedGhostProfile/);
  assert.match(src, /function clearGhostProfileStore/);
  assert.match(src, /ghostQueryFlag\('fresh'\)/);
  assert.match(src, /if \(isGhost\(\)\) return Promise\.reject\(new Error\('ghost'\)\)/);
  const hub = readFileSync(new URL('../public/hub.js', import.meta.url), 'utf8');
  assert.match(hub, /hubGhostTag/);
  const notas = readFileSync(new URL('../public/notas.js', import.meta.url), 'utf8');
  const planner = readFileSync(new URL('../public/planner.js', import.meta.url), 'utf8');
  assert.match(notas, /JB\.ghostFixture\('notas'\)/);
  assert.match(planner, /JB\.ghostFixture\('planner'\)/);
});
