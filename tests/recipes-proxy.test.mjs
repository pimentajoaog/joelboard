/* Tests for TheMealDB recipes proxy helpers. © 2026 Joel Soluções LTDA. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { recipesApiKey, proxyRecipesRequest } from '../lib/recipes-proxy.mjs';

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

test('proxyRecipesRequest search returns normalized results', async function () {
  var res = await proxyRecipesRequest('/api/recipes?q=Arrabiata', {});
  assert.equal(res.status, 200);
  var body = JSON.parse(res.body);
  assert.ok(Array.isArray(body.results));
  if (body.results.length) {
    assert.ok(body.results[0].title);
    assert.ok(body.results[0].sourceId);
    assert.ok(Array.isArray(body.results[0].ingredients));
    assert.ok(Array.isArray(body.results[0].steps));
  }
});
