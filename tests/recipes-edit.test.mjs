/* Recipes editor drag-reorder. © 2026 Joel Soluções LTDA. */
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';

const js = readFileSync(new URL('../public/recipes.js', import.meta.url), 'utf8');
const start = js.indexOf('function reorderDraft');
const end = js.indexOf('function blankIng');
assert.ok(start >= 0 && end > start, 'reorder helpers');
const ctx = {};
vm.createContext(ctx);
vm.runInContext(js.slice(start, end), ctx);

test('reorderDraft permutes in place and rejects bad index lists', function () {
  var arr = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];
  assert.equal(ctx.reorderDraft(arr, [2, 0, 1]), true);
  assert.deepEqual(arr.map(function (x) { return x.id; }), ['c', 'a', 'b']);
  assert.equal(ctx.reorderDraft(arr, [0, 1]), false);
  assert.equal(ctx.reorderDraft(arr, [0, 0, 1]), false);
  assert.equal(ctx.reorderDraft(arr, [0, 1, 3]), false);
});

test('parte toggle deletes an existing parte instead of no-op', function () {
  assert.match(js, /function makePartFromDraftIng/);
  assert.match(js, /var existing = draftPartFromIng/);
  assert.match(js, /_partDraft\.splice\(pi, 1\)/);
  assert.match(js, /function lineMoreHtml/);
  assert.match(js, /toggleIngOptional/);
  assert.match(js, /Opcional/);
});

test('editor paints drag handles on ingredients and steps, not partes', function () {
  assert.match(js, /function rcDragBegin/);
  assert.match(js, /editHandle\('ing'\)/);
  assert.match(js, /editHandle\('step'\)/);
  assert.match(js, /editHandle\('ping-' \+ i\)/);
  assert.match(js, /editHandle\('pstep-' \+ i\)/);
  assert.doesNotMatch(js, /editHandle\('part/);
});
