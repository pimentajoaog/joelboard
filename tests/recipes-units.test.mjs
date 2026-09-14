/* Recipes kitchen units: parse, alias, scale, hint. © 2026 Joel Soluções LTDA. */
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';

const js = readFileSync(new URL('../public/recipes.js', import.meta.url), 'utf8');
const start = js.indexOf('var _scaleByRecipe');
const end = js.indexOf('/* ---- measure helpers end ---- */');
assert.ok(start >= 0 && end > start, 'measure helpers');
const ctx = {};
vm.createContext(ctx);
vm.runInContext(js.slice(start, end), ctx);

test('parseQty understands decimals, commas, and kitchen fractions', function () {
  assert.equal(ctx.parseQty('1'), 1);
  assert.equal(ctx.parseQty('1,5'), 1.5);
  assert.equal(ctx.parseQty('1.5'), 1.5);
  assert.equal(ctx.parseQty('1/2'), 0.5);
  assert.equal(ctx.parseQty('½'), 0.5);
  assert.equal(ctx.parseQty('1 1/2'), 1.5);
  assert.equal(ctx.parseQty('1 ½'), 1.5);
  assert.equal(ctx.parseQty(''), null);
  assert.equal(ctx.parseQty('a gosto'), null);
});

test('formatQty prefers kitchen fractions and otherwise Brazilian decimals', function () {
  assert.equal(ctx.formatQty(0.5), '½');
  assert.equal(ctx.formatQty(1 / 3), '⅓');
  assert.equal(ctx.formatQty(0.25), '¼');
  assert.equal(ctx.formatQty(0.75), '¾');
  assert.equal(ctx.formatQty(1.5), '1 ½');
  assert.equal(ctx.formatQty(1.2), '1,2');
  assert.equal(ctx.formatQty(2), '2');
});

test('matchUnit maps aliases onto templates, specific before generic', function () {
  assert.equal(ctx.matchUnit('colher de chá').id, 'cha');
  assert.equal(ctx.matchUnit('colher').id, 'sopa');
  assert.equal(ctx.matchUnit('colheres').id, 'sopa');
  assert.equal(ctx.matchUnit('cs').id, 'sopa');
  assert.equal(ctx.matchUnit('tbsp').id, 'sopa');
  assert.equal(ctx.matchUnit('xicara').id, 'xcha');
  assert.equal(ctx.matchUnit('xícara').id, 'xcha');
  assert.equal(ctx.matchUnit('xícara de café').id, 'xcafe');
  assert.equal(ctx.matchUnit('copo').id, 'copo');
  assert.equal(ctx.matchUnit('a gosto').id, 'gosto');
  assert.equal(ctx.matchUnit('fatias').id, 'fatia');
  assert.equal(ctx.matchUnit('ramo'), null);
});

test('scale is view-only and hints ml/g from the template', function () {
  var r = { id: 'r1', servings: '2' };
  var ing = { qty: '3', unit: 'colheres de sopa', text: 'açúcar' };
  assert.equal(ctx.formatIngLabel(ing, r), '3 colheres de sopa açúcar');
  assert.equal(ctx.unitHintText(ing, r), '≈ 45 ml');
  ctx._scaleByRecipe.r1 = 4;
  assert.equal(ctx.recipeScaleFactor(r), 2);
  assert.equal(ctx.formatIngLabel(ing, r), '6 colheres de sopa açúcar');
  assert.equal(ctx.unitHintText(ing, r), '≈ 90 ml');
  ctx._scaleByRecipe.r1 = 2;
  assert.equal(ctx.formatIngLabel(ing, r), '3 colheres de sopa açúcar');
});

test('unparseable qty and a gosto do not scale or hint', function () {
  var r = { id: 'r2', servings: '2' };
  ctx._scaleByRecipe.r2 = 6;
  var taste = { qty: '2', unit: 'a gosto', text: 'sal' };
  assert.equal(ctx.formatIngLabel(taste, r), '2 a gosto sal');
  assert.equal(ctx.unitHintText(taste, r), '');
  var loose = { qty: 'pitada', unit: 'colher de sopa', text: 'noz-moscada' };
  assert.equal(ctx.formatIngLabel(loose, r), 'pitada colher de sopa noz-moscada');
  assert.equal(ctx.unitHintText(loose, r), '');
  var count = { qty: '3', unit: 'dentes', text: 'alho' };
  assert.equal(ctx.formatIngLabel(count, r), '9 dentes alho');
  assert.equal(ctx.unitHintText(count, r), '');
});

test('grams and litres promote the hint when the total crosses 1000', function () {
  var r = { id: 'r3', servings: '1' };
  ctx._scaleByRecipe.r3 = 2;
  assert.equal(ctx.unitHintText({ qty: '600', unit: 'g', text: 'farinha' }, r), '≈ 1,2 kg');
  assert.equal(ctx.unitHintText({ qty: '½', unit: 'l', text: 'leite' }, r), '≈ 1 l');
});

test('no stepper base when servings are missing', function () {
  assert.equal(ctx.recipeBaseServings({ servings: '' }), null);
  assert.equal(ctx.recipeBaseServings({ servings: 'família' }), null);
  assert.equal(ctx.recipeBaseServings({ servings: '4' }), 4);
});

test('snapServings rounds to .0 or .5 when close', function () {
  assert.equal(ctx.snapServings(1.4), 1.5);
  assert.equal(ctx.snapServings(1.1), 1);
  assert.equal(ctx.snapServings(2), 2);
  assert.equal(ctx.snapServings(2.3), 2.5);
  assert.equal(ctx.snapServings(1.24), 1.2);
  assert.equal(ctx.snapServings(0.2), 0.5);
  assert.equal(ctx.setRecipeServings('rsnap', 3.4), 3.5);
});

test('editor and leaf wire unit picker, stepper, and hints', function () {
  assert.match(js, /function unitPickerHtml/);
  assert.match(js, /function pickIngUnit/);
  assert.match(js, /function pickPartUnit/);
  assert.match(js, /Outra…/);
  assert.match(js, /function servingsStepper/);
  assert.match(js, /function toggleServPanel/);
  assert.match(js, /function snapServings/);
  assert.match(js, /ing-hint/);
  assert.match(js, /shopIngLabel\(ing, r\)/);
});
