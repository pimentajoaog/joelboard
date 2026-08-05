/* Tests for Joelboard Report template rendering. © 2026 Joel Soluções LTDA. */
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';

const src = readFileSync(new URL('../public/extensions/report/lib/shared.js', import.meta.url), 'utf8');
const ctx = { console };
vm.createContext(ctx);
vm.runInContext(src, ctx);

const JB = ctx.JB_REPORT;

test('renderReport builds default template', function () {
  var data = JB.defaultData();
  data.blocks.find(function (b) { return b.id === 'f1'; }).value = '5';
  data.blocks.find(function (b) { return b.id === 'f5'; }).value = 'Ana';
  var out = JB.renderReport(data);
  assert.match(out, /Relatório:/);
  assert.match(out, /5 itens concluídos/);
  assert.match(out, /Resp: Ana/);
});

test('blank field values are omitted from report', function () {
  var data = JB.defaultData();
  var out = JB.renderReport(data);
  assert.match(out, /Relatório:/);
  assert.doesNotMatch(out, /itens concluídos/);
  assert.doesNotMatch(out, /em andamento/);
});

test('explicit zero is included', function () {
  var data = JB.defaultData();
  data.blocks.find(function (b) { return b.id === 'f2'; }).value = '0';
  assert.match(JB.renderReport(data), /0 em andamento/);
});

test('normalizeData keeps field values', function () {
  var data = JB.normalizeData({ blocks: [{ kind: 'field', id: 'x', label: 'Test', value: '7' }] });
  assert.equal(data.blocks[0].value, '7');
});
