/* Tests for TheMealDB recipes proxy helpers. © 2026 Joel Soluções LTDA. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { recipesApiKey, proxyRecipesRequest, ingredientQueryVariants } from '../lib/recipes-proxy.mjs';

test('recipesApiKey falls back to free test key 1', function () {
  var auth = recipesApiKey({});
  assert.equal(auth.key, '1');
  assert.equal(auth.source, 'default');
});

test('recipesApiKey prefers THEMEALDB_KEY', function () {
  var auth = recipesApiKey({ THEMEALDB_KEY: 'abc' });
  assert.equal(auth.key, 'abc');
  assert.equal(auth.source, 'THEMEALDB_KEY');
});

test('proxyRecipesRequest ping', async function () {
  var res = await proxyRecipesRequest('/api/recipes?ping=1', {});
  assert.equal(res.status, 200);
  var body = JSON.parse(res.body);
  assert.equal(body.ok, true);
});

test('proxyRecipesRequest requires q or id', async function () {
  var res = await proxyRecipesRequest('/api/recipes', {});
  assert.equal(res.status, 400);
});

test('ingredientQueryVariants adds a simple English singular', function () {
  assert.deepEqual(ingredientQueryVariants('eggs'), ['eggs', 'egg']);
  assert.deepEqual(ingredientQueryVariants('chicken'), ['chicken']);
  assert.deepEqual(ingredientQueryVariants('berries'), ['berries', 'berry']);
});

test('proxyRecipesRequest search returns normalized results', async function () {
  var res = await proxyRecipesRequest('/api/recipes?q=Arrabiata&by=name', {});
  assert.equal(res.status, 200);
  var body = JSON.parse(res.body);
  assert.ok(Array.isArray(body.results));
  assert.equal(body.by, 'name');
  if (body.results.length) {
    assert.ok(body.results[0].title);
    assert.ok(body.results[0].sourceId);
    assert.ok(Array.isArray(body.results[0].ingredients));
    assert.ok(Array.isArray(body.results[0].steps));
  }
});

test('proxyRecipesRequest name mode keeps eggs to title hits', async function () {
  var res = await proxyRecipesRequest('/api/recipes?q=eggs&by=name', {});
  assert.equal(res.status, 200);
  var body = JSON.parse(res.body);
  assert.equal(body.by, 'name');
  assert.ok(body.results.length <= 5);
  assert.ok(body.results.every(function (m) {
    return /egg/i.test(m.title);
  }));
});

test('proxyRecipesRequest ingredient mode expands eggs beyond titles', async function () {
  var res = await proxyRecipesRequest('/api/recipes?q=eggs&by=ingredient', {});
  assert.equal(res.status, 200);
  var body = JSON.parse(res.body);
  assert.equal(body.by, 'ingredient');
  assert.ok(body.results.length > 5, 'ingredient filter should return many meals');
  var ids = body.results.map(function (m) { return m.sourceId; });
  assert.equal(ids.length, new Set(ids).size);
});
