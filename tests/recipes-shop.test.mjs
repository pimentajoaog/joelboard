/* Recipes shopping list from Mise → personal Notes. © 2026 Joel Soluções LTDA. */
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';

const js = readFileSync(new URL('../public/recipes.js', import.meta.url), 'utf8');
const html = readFileSync(new URL('../recipes/index.html', import.meta.url), 'utf8');
const start = js.indexOf('function shopIngLabel');
const end = js.indexOf('function shopBarHtml');
assert.ok(start > 0 && end > start, 'shop helpers');
const ctx = {};
vm.createContext(ctx);
vm.runInContext(js.slice(start, end), ctx);

test('shopping list groups selected mise items by recipe', function () {
  var book = { id: 'cb1', name: 'Doces', icon: '🧁' };
  var recipes = [
    { id: 'r2', cookbookId: 'cb1', title: 'Pudim', order: 1 },
    { id: 'r1', cookbookId: 'cb1', title: 'Brigadeiro', order: 0 },
    { id: 'r3', cookbookId: 'cb2', title: 'Outro livro', order: 0 }
  ];
  var ings = [
    { id: 'i1', recipeId: 'r1', qty: '1', unit: 'lata', text: 'leite condensado', order: 0 },
    { id: 'i2', recipeId: 'r1', qty: '2', unit: 'colheres', text: 'chocolate', order: 1 },
    { id: 'i3', recipeId: 'r2', qty: '', unit: '', text: 'ovos', order: 0 },
    { id: 'i4', recipeId: 'r3', qty: '1', unit: '', text: 'farinha', order: 0 }
  ];
  var pack = ctx.buildShopList(book, recipes, ings, { i1: {}, i3: {}, i4: {} });
  assert.equal(pack.titulo, 'Doces');
  assert.equal(pack.tipo, 'compras');
  assert.equal(pack.cor, '🧁');
  assert.equal(pack.itens.map(function (x) { return x.texto; }).join('|'), 'Brigadeiro|1 lata leite condensado|Pudim|ovos');
  assert.equal(pack.itens[0].tipo, 'g');
  assert.equal(pack.itens[0].marcavel, false);
  assert.equal(pack.itens[1].marcavel, true);
});

test('plaque Notes icon and jb-link are wired', function () {
  assert.match(js, /function toggleShopMode/);
  assert.match(js, /book-shop-btn/);
  assert.match(js, /plaqueSvg\('notes'\)/);
  assert.match(js, /JB\.link\.createList/);
  assert.match(html, /jb-link\.js/);
});
