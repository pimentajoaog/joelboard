/* Sheet settings helpers. © 2026 Joel Soluções LTDA. */
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import assert from 'node:assert/strict';

const src = readFileSync(new URL('../public/joelboard.js', import.meta.url), 'utf8');

test('parseSheetIdInput accepts Drive URLs and raw ids', function () {
  assert.match(src, /function parseSheetIdInput\(raw\)/);
  assert.match(src, /spreadsheets\/d\//);
});

test('mountSheetSettings lists folder spreadsheets and accepts pasted links', function () {
  assert.match(src, /function mountSheetSettings\(host, opts\)/);
  assert.match(src, /function sheetSettingsBrowse\(app\)/);
  assert.match(src, /searchSheetsInFolder\(folderId\)/);
  assert.match(src, /data-jb-sheet-in/);
  assert.match(src, /sheetSettingsToggleId/);
  assert.match(src, /mountSheetSettings: mountSheetSettings/);
});

test('sheet settings CSS ships in joelboard.css', function () {
  const css = readFileSync(new URL('../public/joelboard.css', import.meta.url), 'utf8');
  assert.match(css, /\.jb-sheet-set/);
  assert.match(css, /\.jb-sheet-picker-body/);
});
