/* Tests for Joelboard URL query helpers. © 2026 Joel Soluções LTDA. */
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';

const src = readFileSync(new URL('../public/joelboard.js', import.meta.url), 'utf8');
const start = src.indexOf('function qsGet(name)');
const end = src.indexOf('function qsPatch(patch, opts)');
assert.ok(start > 0 && end > start, 'qsGet in joelboard.js');

const ctx = { location: { search: '?b=ghost-cb1&r=ghost-r1' }, URLSearchParams };
vm.createContext(ctx);
vm.runInContext(src.slice(start, end) + '\nthis.qsGet=qsGet;', ctx);

test('qsGet(name) still returns a string', function () {
  assert.equal(ctx.qsGet('b'), 'ghost-cb1');
  assert.equal(ctx.qsGet('r'), 'ghost-r1');
  assert.equal(ctx.qsGet('missing'), '');
});

test('qsGet() with no name returns all params', function () {
  var q = ctx.qsGet();
  assert.equal(q.b, 'ghost-cb1');
  assert.equal(q.r, 'ghost-r1');
  assert.equal(q.i, undefined);
});
