/* Tests for Google 503/timeout handling. © 2026 Joel Soluções LTDA. */
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';

const src = readFileSync(new URL('../public/joelboard.js', import.meta.url), 'utf8');
const start = src.indexOf('function jbTransientHttp');
const end = src.indexOf('function jbTransientErrMessage');
assert.ok(start > 0 && end > start, 'transient HTTP helpers in joelboard.js');
const ctx = {};
vm.createContext(ctx);
vm.runInContext(
  src.slice(start, end)
    + '\nthis.jbTransientHttp=jbTransientHttp;this.jbRetryDelayMs=jbRetryDelayMs;this.jbIsAbortErr=jbIsAbortErr;',
  ctx
);

test('jbTransientHttp flags Google blips, not 403/404', function () {
  assert.equal(ctx.jbTransientHttp(503), true);
  assert.equal(ctx.jbTransientHttp(429), true);
  assert.equal(ctx.jbTransientHttp(502), true);
  assert.equal(ctx.jbTransientHttp(403), false);
  assert.equal(ctx.jbTransientHttp(404), false);
});

test('jbRetryDelayMs backs off a little', function () {
  assert.equal(ctx.jbRetryDelayMs(0), 500);
  assert.equal(ctx.jbRetryDelayMs(1), 1500);
});

test('jbIsAbortErr catches fetch timeouts', function () {
  assert.equal(ctx.jbIsAbortErr({ name: 'AbortError' }), true);
  assert.equal(ctx.jbIsAbortErr(new Error('The user aborted a request.')), true);
  assert.equal(ctx.jbIsAbortErr(new Error('HTTP 403')), false);
});

test('API retries 503 and times out hung fetches', function () {
  assert.match(src, /API_TIMEOUT_MS = 12000/);
  assert.match(src, /API_RETRY_MAX = 3/);
  assert.match(src, /function fetchWithTimeout/);
  assert.match(src, /code = 'JB_TRANSIENT'/);
  assert.match(src, /bootRetryHtml/);
  const fin = readFileSync(new URL('../public/finance-sheets.js', import.meta.url), 'utf8');
  assert.match(fin, /JB\.isTransientErr/);
  assert.match(fin, /Tentar de novo/);
});
