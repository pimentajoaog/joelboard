/* Tests for Joelboard Planner. © 2026 Joel Soluções LTDA. */
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';

const planner = readFileSync(new URL('../public/planner.js', import.meta.url), 'utf8');
const collab = readFileSync(new URL('../public/planner-collab.js', import.meta.url), 'utf8');

const start = planner.indexOf('var PL_WD=');
const end = planner.indexOf('function rowCacheKeySid');
assert.ok(start > 0 && end > start, 'helper block in planner.js');
const helpers = planner.slice(start, end);
const ctx = { console };
vm.createContext(ctx);
vm.runInContext(
  helpers
  + '\nthis.plParseYmd=plParseYmd;this.plDaysFromRange=plDaysFromRange;this.plNights=plNights;'
  + 'this.plHoraMinFromLabel=plHoraMinFromLabel;this.plParseHora=plParseHora;this.plEventMin=plEventMin;this.plSortEvents=plSortEvents;'
  + 'this.plWeekday=plWeekday;this.plFmtDay=plFmtDay;this.plRangeHint=plRangeHint;'
  + 'this.plAddDays=plAddDays;this.plNormIcon=plNormIcon;',
  ctx
);

const cctx = { console, JB: { onProfileChange: function () {} } };
vm.createContext(cctx);
vm.runInContext(
  collab
  + '\nthis.plParseJoinSheetId=plParseJoinSheetId;this.plIsCollabSpreadsheetGrid=plIsCollabSpreadsheetGrid;'
  + 'this.plGridLooksLikeNotes=plGridLooksLikeNotes;this.plPlanIdFromMeta=plPlanIdFromMeta;'
  + 'this.plJoinErrMessage=plJoinErrMessage;this.plMemberNeedsProfileWrite=plMemberNeedsProfileWrite;'
  + 'this.plLooksLikeYmd=plLooksLikeYmd;this.plLooksLikePlanIcon=plLooksLikePlanIcon;'
  + 'this.plSanitizeListaIds=plSanitizeListaIds;this.plCollabMetaNeedsHeal=plCollabMetaNeedsHeal;'
  + 'this.plCollabMetaRowTrustworthy=plCollabMetaRowTrustworthy;'
  + 'this.plFillPlanRangeFromDays=plFillPlanRangeFromDays;this.plSanitizeCollabPlanMeta=plSanitizeCollabPlanMeta;'
  + 'this.plIsNotesKind=plIsNotesKind;',
  cctx
);

test('plDaysFromRange is inclusive and nights is length-1', function () {
  var days = ctx.plDaysFromRange('2026-07-13', '2026-07-18');
  assert.equal(days.length, 6);
  assert.equal(days[0].date, '2026-07-13');
  assert.equal(days[5].date, '2026-07-18');
  assert.equal(ctx.plNights('2026-07-13', '2026-07-18'), 5);
  assert.equal(ctx.plDaysFromRange('2026-07-18', '2026-07-13').length, 0);
});

test('plHoraMinFromLabel accepts clock, tilde, and period words', function () {
  assert.equal(ctx.plHoraMinFromLabel('8h30'), 8 * 60 + 30);
  assert.equal(ctx.plHoraMinFromLabel('~16h'), 16 * 60);
  assert.equal(ctx.plHoraMinFromLabel('16:00'), 16 * 60);
  assert.equal(ctx.plHoraMinFromLabel('tarde'), 900);
  assert.equal(ctx.plHoraMinFromLabel('noite'), 1200);
  assert.equal(ctx.plHoraMinFromLabel(''), '');
  assert.equal(ctx.plHoraMinFromLabel('quando der'), '');
});

test('plParseHora accepts 24h, 12h, and rejects a bare hour', function () {
  function min(raw){ return ctx.plParseHora(raw).min; }
  function label(raw){ return ctx.plParseHora(raw).label; }
  assert.equal(min('16'), 16 * 60);
  assert.equal(label('16'), '16h');
  assert.equal(min('16:00h'), 16 * 60);
  assert.equal(min('4 PM'), 16 * 60);
  assert.equal(label('4 PM'), '16h');
  assert.equal(min('~4PM'), 16 * 60);
  assert.equal(label('~4PM'), '~16h');
  assert.equal(min('4:30 pm'), 16 * 60 + 30);
  assert.equal(label('4:30 pm'), '16h30');
  assert.equal(min('4h'), 4 * 60);
  assert.equal(min('04'), 4 * 60);
  assert.equal(min('12am'), 0);
  assert.equal(min('12pm'), 12 * 60);
  assert.equal(min('4 da tarde'), 16 * 60);
  assert.equal(min('10 da noite'), 22 * 60);
  assert.equal(ctx.plParseHora('09:30').ask, true);
  assert.equal(ctx.plParseHora('09:30').min, 9 * 60 + 30);
  assert.equal(ctx.plParseHora('09:30', 'pm').min, 21 * 60 + 30);
  assert.equal(ctx.plParseHora('09:30', 'pm').label, '21h30');
  assert.equal(ctx.plParseHora('8h30').ask, true);
  assert.equal(ctx.plParseHora('16:00').ask, false);
  assert.equal(ctx.plParseHora('16').ask, false);
  assert.equal(ctx.plParseHora('4').ok, false);
  assert.equal(ctx.plParseHora('25').ok, false);
  assert.equal(ctx.plParseHora('4:99').ok, false);
  assert.equal(ctx.plParseHora('13pm').ok, false);
  assert.equal(ctx.plParseHora('quando der').ok, true);
  assert.equal(ctx.plParseHora('quando der').min, '');
});

test('plSortEvents orders by time then ordem', function () {
  var list = ctx.plSortEvents([
    { id: 'c', horaMin: '', ordem: 1, titulo: 'Livre' },
    { id: 'b', horaMin: 960, ordem: 0, titulo: 'Tarde' },
    { id: 'a', horaMin: 510, ordem: 2, titulo: 'Manhã' }
  ]);
  assert.deepEqual(list.map(function (e) { return e.id; }), ['a', 'b', 'c']);
});

test('plSortEvents uses the clock label when horaMin is missing', function () {
  var list = ctx.plSortEvents([
    { id: 'late', hora: '20:30h', horaMin: '', ordem: 0, titulo: 'Restaurante' },
    { id: 'early', hora: '07:00h', horaMin: '', ordem: 1, titulo: 'Aeroporto' },
    { id: 'open', hora: 'quando der', horaMin: '', ordem: 0, titulo: 'Livre' }
  ]);
  assert.deepEqual(list.map(function (e) { return e.id; }), ['early', 'late', 'open']);
  assert.equal(ctx.plEventMin({ hora: '07:00h', horaMin: '' }), 7 * 60);
});

test('plNormIcon keeps the first one or two pasted glyphs', function () {
  assert.equal(ctx.plNormIcon(''), '');
  assert.equal(ctx.plNormIcon('  🍕  '), '🍕');
  assert.equal(ctx.plNormIcon('🐶🐱💼'), '🐶🐱');
});

test('plWeekday and plFmtDay are pt-BR', function () {
  assert.equal(ctx.plWeekday('2026-07-13'), 'seg');
  assert.equal(ctx.plFmtDay('2026-07-13'), '13/07');
  assert.match(ctx.plRangeHint('2026-07-13', '2026-07-18'), /6 dias/);
});

test('plParseJoinSheetId accepts a raw id, join URL, or Drive URL', function () {
  var id = '1AbCdEfGhIjKlMnOpQrStUvWxYz0123456789';
  assert.equal(cctx.plParseJoinSheetId(id), id);
  assert.equal(cctx.plParseJoinSheetId('https://joelboard.vercel.app/planner/?join=' + id), id);
  assert.equal(cctx.plParseJoinSheetId('https://docs.google.com/spreadsheets/d/' + id + '/edit#gid=0'), id);
  assert.equal(cctx.plParseJoinSheetId(''), '');
});

test('plMemberNeedsProfileWrite updates when the local icon or name is newer', function () {
  var me = { email: 'joel@x.com', nome: '', icone: '👤' };
  assert.equal(cctx.plMemberNeedsProfileWrite(me, 'joel@x.com', 'Joel', '🐻'), true);
  assert.equal(cctx.plMemberNeedsProfileWrite({ email: 'joel@x.com', nome: 'Joel', icone: '🐻' }, 'joel@x.com', 'Joel', '🐻'), false);
  assert.equal(cctx.plMemberNeedsProfileWrite(me, 'amigo@x.com', 'Joel', '🐻'), false);
});

test('collab sheets are not treated as the personal Planner workbook', function () {
  assert.equal(cctx.plIsCollabSpreadsheetGrid({ Meta: 1, Membros: 2, Dias: 3 }), true);
  assert.equal(cctx.plIsCollabSpreadsheetGrid({ Planos: 1, Dias: 2 }), false);
  assert.equal(cctx.plIsCollabSpreadsheetGrid({ Meta: 1, Membros: 2, Planos: 3 }), false);
  assert.equal(cctx.plIsCollabSpreadsheetGrid({ Meta: 1, Membros: 2, Itens: 3 }), false);
  assert.equal(cctx.plGridLooksLikeNotes({ Meta: 1, Membros: 2, Itens: 3 }), true);
  assert.equal(cctx.plPlanIdFromMeta(['t', '', '', '', '', '', '', ''], ['Viagem', 'sid', 'owner', 'a@b.com', 'plan-real']), 'plan-real');
  assert.equal(cctx.plPlanIdFromMeta(['t', '', '', '', '', '', '', 'plan-meta'], null), 'plan-meta');
  assert.match(planner, /namePart:'Joelboard Planner'/);
  assert.match(planner, /requiredTabs: \['Planos'\]/);
  assert.match(collab, /Joelboard Plano —/);
  assert.match(cctx.plJoinErrMessage({ message: 'HTTP 403' }), /Editor no Drive/);
  assert.match(cctx.plJoinErrMessage({ message: 'planilha_de_lista' }), /Notes/);
  assert.match(planner, /plPaintAcct/);
  assert.doesNotMatch(planner, /acctEmail'\)\.textContent='👤 '\+.*plAcctLabel/);
  assert.match(planner, /\['Planos',\[.*'Listas'\]/);
  assert.match(planner, /Colar lista do Notes/);
  assert.match(planner, /s\.sticker/);
  assert.match(planner, /plScrollFocusDay/);
  assert.match(planner, /id="pl-day-'/);
  assert.match(collab, /OwnerEmail', 'Listas'/);
});

test('collab Meta heal detects Notes-shaped headers and rows', function () {
  var headers = ['Titulo', 'Subtitulo', 'Inicio', 'Fim', 'Icone', 'Criado', 'Atualizado', 'ID', 'OwnerEmail', 'Listas'];
  var row = ['Viagem', '', '2026-07-13', '2026-07-18', '✈️', 't', 't', 'plan-1', 'a@b.com', ''];
  assert.equal(cctx.plCollabMetaNeedsHeal([headers, row], 'plan-1'), false);
  assert.equal(cctx.plCollabMetaNeedsHeal([
    ['Titulo', 'Tipo', 'Cor', 'Fixado', 'Criado', 'Atualizado', 'ID', 'Vence', 'OwnerEmail', 'Marcacao'],
    ['Viagem nacional', 'viagem', '#f59e0b', '0', '2026-07-01T00:00:00.000Z', 't', 'note-1', '', 'a@b.com', 'compartilhado']
  ], 'plan-1'), true);
  assert.equal(cctx.plCollabMetaNeedsHeal([headers, ['Viagem', '', '2026-07-13', '2026-07-18', '✈️', 't', 't', 'wrong', 'a@b.com', '']], 'plan-1'), true);
  var headerOnly = ['Titulo', 'Subtitulo', 'Inicio', 'Fim', 'Icone', 'Criado', 'Atualizado', 'ID', 'OwnerEmail', 'Marcacao'];
  assert.equal(cctx.plCollabMetaNeedsHeal([headerOnly, row], 'plan-1'), true);
  assert.equal(cctx.plCollabMetaRowTrustworthy(row, 'plan-1'), true);
});

test('collab Meta heal recovers dates and drops Notes leftovers', function () {
  assert.equal(cctx.plLooksLikeYmd('2026-07-13'), true);
  assert.equal(cctx.plLooksLikeYmd('#f59e0b'), false);
  assert.equal(cctx.plLooksLikePlanIcon('✈️'), true);
  assert.equal(cctx.plLooksLikePlanIcon('2026-07-01T00:00:00.000Z'), false);
  assert.equal(cctx.plIsNotesKind('viagem'), true);
  assert.equal(cctx.plSanitizeListaIds('compartilhado').join(','), '');
  assert.equal(cctx.plSanitizeListaIds('abc,pessoal').join(','), 'abc');
  var p = { id: 'plan-1', titulo: 'Viagem', subtitulo: 'viagem', inicio: '#f59e0b', fim: '0', icone: '2026-07-01T00:00:00.000Z', listaIds: ['compartilhado'] };
  cctx.plSanitizeCollabPlanMeta(p, null, [{ data: '2026-07-13' }, { data: '2026-07-18' }]);
  assert.equal(p.subtitulo, '');
  assert.equal(p.icone, '📅');
  assert.equal(p.inicio, '2026-07-13');
  assert.equal(p.fim, '2026-07-18');
  assert.equal((p.listaIds || []).join(','), '');
});

test('collab Meta rewrite covers the full header row, not only Listas', function () {
  assert.match(collab, /plHealCollabPlanMeta/);
  assert.match(collab, /Meta!A1:J2/);
  assert.match(collab, /Meta!A1:J1/);
  assert.match(planner, /function findPlanMetaRow/);
});
