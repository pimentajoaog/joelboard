/* Tests for Joelboard Notes shared lists. © 2026 Joel Soluções LTDA. */
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';

const src = readFileSync(new URL('../public/notas-collab.js', import.meta.url), 'utf8');
const notas = readFileSync(new URL('../public/notas.js', import.meta.url), 'utf8');
const ctx = { console };
vm.createContext(ctx);
vm.runInContext(src.replace(/^function /, 'function ') + '\nthis.ncParseJoinSheetId = ncParseJoinSheetId;\nthis.ncIsCollabSpreadsheetGrid = ncIsCollabSpreadsheetGrid;\nthis.ncJoinErrMessage = ncJoinErrMessage;', ctx);

test('ncParseJoinSheetId accepts a raw id, join URL, or Drive URL', function () {
  var id = '1AbCdEfGhIjKlMnOpQrStUvWxYz0123456789';
  assert.equal(ctx.ncParseJoinSheetId(id), id);
  assert.equal(ctx.ncParseJoinSheetId('https://joelboard.vercel.app/notas/?join=' + id), id);
  assert.equal(ctx.ncParseJoinSheetId('https://docs.google.com/spreadsheets/d/' + id + '/edit#gid=0'), id);
  assert.equal(ctx.ncParseJoinSheetId(''), '');
  assert.equal(ctx.ncParseJoinSheetId('not-a-sheet'), '');
});

test('collab sheets are not treated as the personal Notes workbook', function () {
  assert.equal(ctx.ncIsCollabSpreadsheetGrid({ Meta: 1, Membros: 2, Itens: 3 }), true);
  assert.equal(ctx.ncIsCollabSpreadsheetGrid({ Notas: 1, Itens: 2 }), false);
  assert.match(notas, /namePart:'Joelboard Not'/);
  assert.match(notas, /requiredTabs: \['Notas'\]/);
  assert.match(notas, /!grid\['Notas'\]/);
});

test('join explains missing Drive access', function () {
  assert.match(ctx.ncJoinErrMessage({ message: 'HTTP 403' }), /Editor no Drive/);
  assert.match(src, /function ncGrantEditorAccess/);
  assert.match(src, /ncFindRegistryRow\(ctx\.metaRow\[6\], sheetId\)/);
  assert.match(src, /n\.collabSheetId = sid/);
});
