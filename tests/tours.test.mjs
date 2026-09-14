/* Tours mention current app surfaces. © 2026 Joel Soluções LTDA. */
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import assert from 'node:assert/strict';

const notas = readFileSync(new URL('../public/notas.js', import.meta.url), 'utf8');
const planner = readFileSync(new URL('../public/planner.js', import.meta.url), 'utf8');
const hub = readFileSync(new URL('../public/hub.js', import.meta.url), 'utf8');
const recipes = readFileSync(new URL('../public/recipes.js', import.meta.url), 'utf8');
const recipesHtml = readFileSync(new URL('../recipes/index.html', import.meta.url), 'utf8');
const prateleira = readFileSync(new URL('../public/prateleira.js', import.meta.url), 'utf8');
const prateleiraHtml = readFileSync(new URL('../prateleira/index.html', import.meta.url), 'utf8');
const indexHtml = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const finance = readFileSync(new URL('../public/finance.js', import.meta.url), 'utf8');

test('Notes tour covers kits vs live lists', function () {
  assert.match(notas, /var NOTAS_TOUR=/);
  assert.match(notas, /sel:'\.nc-kits-wrap'/);
  assert.match(notas, /não vira um segundo kit/);
});

test('Planner tour covers home, timeline, and list paste', function () {
  assert.match(planner, /var PL_TOUR=/);
  assert.match(planner, /Seus planos/);
  assert.match(planner, /Colar lista do Notes/);
});

test('Hub tour names Recipes and Mini has its own tour', function () {
  assert.match(hub, /Recipes ou Mini/);
  assert.match(hub, /var MINI_TOUR=/);
  assert.match(indexHtml, /hubVerMiniTutorial/);
});

test('Recipes and Prateleira have tours plus replay in Ajustes', function () {
  assert.match(recipes, /var RECIPES_TOUR/);
  assert.match(recipesHtml, /recipesVerTutorial/);
  assert.match(prateleira, /var PRATELEIRA_TOUR/);
  assert.match(prateleiraHtml, /prateleiraVerTutorial/);
});

test('Finance bills tour mentions split', function () {
  assert.match(finance, /rachar conta/);
});
