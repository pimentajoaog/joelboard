/* Shared pencil-strike used whenever something is ticked. © 2026 Joel Soluções LTDA. */
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import assert from 'node:assert/strict';

const css = readFileSync(new URL('../public/joelboard.css', import.meta.url), 'utf8');
const jb = readFileSync(new URL('../public/joelboard.js', import.meta.url), 'utf8');
const recipes = readFileSync(new URL('../public/recipes.js', import.meta.url), 'utf8');
const notas = readFileSync(new URL('../public/notas.js', import.meta.url), 'utf8');
const recipesCss = readFileSync(new URL('../src/recipes.css', import.meta.url), 'utf8');

test('core owns the pencil strike so apps share one tick', function () {
  assert.match(css, /@keyframes jbPen/);
  assert.match(css, /\.just-on::after/);
  assert.match(css, /content:\s*'✏️'/);
  assert.match(css, /\.ck-t\s*\{/);
  assert.match(jb, /function justOn/);
  assert.match(jb, /function replayStrike/);
  assert.match(jb, /justOn: justOn, replayStrike: replayStrike/);
});

test('Recipes ticks go through the shared helper', function () {
  assert.match(recipes, /JB\.justOn\(li\)/);
  assert.doesNotMatch(recipesCss, /@keyframes rcPen/);
});

test('Notes wraps ticked text in ck-t', function () {
  assert.match(notas, /span class="ck-t"/);
  assert.match(notas, /JB\.replayStrike\(row\)/);
});
