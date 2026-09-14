/* Tests for Joelboard Notes shared lists. © 2026 Joel Soluções LTDA. */
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';

const src = readFileSync(new URL('../public/notas-collab.js', import.meta.url), 'utf8');
const notas = readFileSync(new URL('../public/notas.js', import.meta.url), 'utf8');
const ctx = { console, JB: { onProfileChange: function () {} } };
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
  assert.match(notas, /function openNoteEditor/);
  assert.match(notas, /requiredTabs: \['Notas'\]/);
  assert.match(notas, /!grid\['Notas'\]/);
});

test('join explains missing Drive access', function () {
  assert.match(ctx.ncJoinErrMessage({ message: 'HTTP 403' }), /Editor no Drive/);
  assert.match(src, /function ncGrantEditorAccess/);
  assert.match(src, /ncFindRegistryRow\(ctx\.metaRow\[6\], sheetId\)/);
  assert.match(src, /n\.collabSheetId = sid/);
});

test('marcacao helpers and FeitoPor round-trip', function () {
  vm.runInContext(
    'this.ncNormMarcacao=ncNormMarcacao;this.ncParseFeitoPor=ncParseFeitoPor;this.ncSerializeFeitoPor=ncSerializeFeitoPor;',
    ctx
  );
  assert.equal(ctx.ncNormMarcacao(''), 'compartilhado');
  assert.equal(ctx.ncNormMarcacao('pessoal'), 'pessoal');
  assert.equal(ctx.ncNormMarcacao('COMPARTILHADO'), 'compartilhado');
  var map = ctx.ncParseFeitoPor('{"A@B.COM":true,"x@y.com":false}');
  assert.equal(map['a@b.com'], true);
  assert.equal(map['x@y.com'], undefined);
  assert.equal(ctx.ncSerializeFeitoPor({ 'A@B.com': true }), '{"a@b.com":true}');
  assert.equal(ctx.ncSerializeFeitoPor({}), '');
  assert.match(src, /Marcacao/);
  assert.match(src, /FeitoPor/);
  assert.match(src, /function ncSetShareMarcacao/);
  assert.match(src, /function ncDoShareFromPrivate/);
  assert.match(notas, /function itemIsDone/);
  assert.match(notas, /function setItemDone/);
  assert.match(notas, /noteSaveLastCol/);
});

test('shared Viagem nacional is a live list, not a second kit', function () {
  vm.runInContext(
    'this.ncLooksLikeKit=ncLooksLikeKit;this.ncIsDefaultKitTitle=ncIsDefaultKitTitle;this.ncHealCollabKitFlags=ncHealCollabKitFlags;',
    ctx
  );
  ctx.JB.link = {
    isDefaultKitTitle: function (t) {
      var s = String(t || '').trim().toLowerCase();
      return s === 'viagem nacional' || s === 'viagem internacional';
    }
  };
  ctx.DATA = {
    config: { preset_trip1: '1' },
    notas: [
      { id: 'kit', titulo: 'Viagem nacional', preset: true },
      { id: 'trip1', titulo: 'Viagem nacional', preset: true, sticker: true, collabSheetId: 'sid' }
    ]
  };
  var saved = {};
  ctx.saveConfig = function (k, v) { saved[k] = v; ctx.DATA.config[k] = v; };
  ctx.ncHealCollabKitFlags();
  var trip = ctx.DATA.notas[1];
  assert.equal(trip.preset, false);
  assert.equal(saved.preset_trip1, '');
  assert.equal(ctx.ncLooksLikeKit(trip), false);
  assert.equal(ctx.ncLooksLikeKit({ id: 'kit', titulo: 'Viagem nacional', preset: true }), true);
  assert.equal(ctx.ncLooksLikeKit({
    id: 'probe', titulo: 'Viagem nacional', preset: false, collabSheetId: 'sid2'
  }), false);
  assert.equal(ctx.ncIsDefaultKitTitle('Viagem Nacional'), true);
});
