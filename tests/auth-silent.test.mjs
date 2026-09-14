/* Silent GIS must not steal focus from a background tab. © 2026 Joel Soluções LTDA. */
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import assert from 'node:assert/strict';

const src = readFileSync(new URL('../public/joelboard.js', import.meta.url), 'utf8');

test('silent GIS is gated on a focused visible tab', function () {
  assert.match(src, /function tabIsVisible/);
  assert.match(src, /function tabAllowsSilentGis/);
  assert.match(src, /document\.visibilityState !== 'visible'/);
  assert.match(src, /document\.hasFocus/);
  assert.match(src, /silent_hidden/);
  assert.match(src, /function whenForeground/);
  assert.match(src, /function claimSilentGisLock/);
});

test('background refresh does not call requestAccessToken', function () {
  assert.match(src, /if \(!tabAllowsSilentGis\(\)\) \{\s*scheduleTokenRefresh\(\);/s);
  assert.match(src, /tokenClient\.requestAccessToken\(\{/);
  assert.match(src, /prompt: pmt/);
  assert.match(src, /lastSilentGisAt && Date\.now\(\) - lastSilentGisAt < FOCUS_BOUNCE_MS/);
});
