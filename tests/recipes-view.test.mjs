/* Recipes page/card mode swap should animate, not snap. © 2026 Joel Soluções LTDA. */
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import assert from 'node:assert/strict';

const js = readFileSync(new URL('../public/recipes.js', import.meta.url), 'utf8');
const css = readFileSync(new URL('../src/recipes.css', import.meta.url), 'utf8');

test('expanding a parte scrolls the leaf to the open card', function () {
  assert.match(js, /function revealRecipePart/);
  assert.match(js, /if \(opening\) revealRecipePart/);
  assert.match(js, /el\.closest\('\.leaf-body'\)/);
  assert.match(js, /jumpRecipePart[\s\S]*revealRecipePart/);
});

test('mode toggle uses a view transition or fade', function () {
  assert.match(js, /function playBookModeSwap/);
  assert.match(js, /document\.startViewTransition/);
  assert.match(js, /toggleFlipPref[\s\S]*setBookView/);
  assert.match(css, /view-transition-name:rc-cover/);
  assert.match(css, /view-transition-name:rc-sheet/);
  assert.match(css, /html\.rc-mode-swap/);
});
