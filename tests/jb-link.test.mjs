/* Tests for Notes ↔ Planner list links. © 2026 Joel Soluções LTDA. */
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';

const src = readFileSync(new URL('../public/jb-link.js', import.meta.url), 'utf8');
const ctx = { console, Date, Math, Number, String, Object, Array, Promise, Boolean };
ctx.window = ctx;
vm.createContext(ctx);
vm.runInContext(src, ctx);
const link = ctx.JB_LINK;
assert.ok(link, 'JB_LINK is attached');

test('parseIds and mergeIds keep unique note ids', function () {
  assert.equal(link.parseIds('a, b; a  c').join(','), 'a,b,c');
  assert.equal(link.mergeIds(['n1'], 'n2,n1').join(','), 'n1,n2');
  assert.equal(link.formatIds(['n2', 'n2', 'n1']), 'n2,n1');
});

test('packSnapshot counts checkable items and peekHtml strikes done ones', function () {
  var note = { id: 'n1', titulo: 'Mala', tipo: 'viagem', cor: '🧳' };
  var itens = [
    { notaId: 'n1', ordem: 0, texto: 'Docs', marcavel: false, feito: false, tipo: 'g' },
    { notaId: 'n1', ordem: 1, texto: 'Carregador', marcavel: true, feito: true, tipo: '' },
    { notaId: 'n1', ordem: 2, texto: 'Roupas', marcavel: true, feito: false, tipo: '' },
    { notaId: 'n1', ordem: 3, texto: 'Chaves', marcavel: true, feito: false, tipo: '' }
  ];
  var snap = link.packSnapshot(note, itens);
  assert.equal(snap.done, 1);
  assert.equal(snap.total, 3);
  assert.equal(snap.open, 2);
  var sticky = link.packSnapshot({ id: 'n2', titulo: 'Mala', sticker: true }, []);
  assert.equal(sticky.sticker, true);
  var preset = link.packSnapshot({ id: 'n3', titulo: 'Kit', preset: true, sticker: true }, []);
  assert.equal(preset.sticker, false);
  var html = link.peekHtml(snap, { open: true, shareHint: 'só sua' });
  assert.match(html, /1\/3/);
  assert.match(html, /Roupas/);
  assert.match(html, /Chaves/);
  assert.match(html, /jb-link-item done/);
  assert.match(html, /Carregador/);
  assert.match(html, /jb-link-g/);
  assert.match(html, /Docs/);
  assert.match(html, /s[oó] sua/i);
  assert.match(html, /\/notas\/\?lista=n1/);
});

test('peekHtml keeps nested subgroups in order', function () {
  var snap = link.packSnapshot({ id: 'n4', titulo: 'Kit' }, [
    { notaId: 'n4', ordem: 0, texto: 'Mala', marcavel: false, feito: false, tipo: 'g' },
    { notaId: 'n4', ordem: 1, texto: 'Tech', marcavel: false, feito: false, tipo: 'g1' },
    { notaId: 'n4', ordem: 2, texto: 'Carregador', marcavel: true, feito: true, tipo: '' },
    { notaId: 'n4', ordem: 3, texto: 'Roupas', marcavel: true, feito: false, tipo: '' }
  ]);
  var html = link.peekHtml(snap, { open: true });
  var mala = html.indexOf('Mala');
  var tech = html.indexOf('Tech');
  var carg = html.indexOf('Carregador');
  var ropa = html.indexOf('Roupas');
  assert.ok(mala >= 0 && mala < tech && tech < carg && carg < ropa);
  assert.match(html, /jb-link-g d0/);
  assert.match(html, /jb-link-g d1/);
  var rows = link.peekRows(snap);
  assert.equal(rows[0].group, true);
  assert.equal(rows[1].depth, 1);
  assert.equal(rows[2].depth, 2);
});

test('bornListTitle nests kit under plan and day', function () {
  assert.equal(link.bornListTitle('Viagem nacional', {
    planTitle: 'Julioel SP',
    inicio: '2026-07-12',
    dayTitle: 'Rolê a noite'
  }), 'Viagem nacional · Julioel SP · 2026 {Rolê a noite}');
  assert.equal(link.bornListTitle('Viagem nacional', {
    planTitle: 'Julioel SP - 2026',
    inicio: '2026-07-12'
  }), 'Viagem nacional · Julioel SP - 2026');
  assert.equal(link.bornListTitle('Mala', {}), 'Mala');
});

test('mergeCalEvents hides a Notes due that is already stuck on a plan', function () {
  var evs = link.mergeCalEvents([
    { app: 'notas', rawId: 'n1', title: 'Chile', listaIds: [] },
    { app: 'planner', rawId: 'p1', title: 'Roteiro', listaIds: ['n1'] }
  ]);
  assert.equal(evs.length, 1);
  assert.equal(evs[0].app, 'planner');
  assert.equal(evs[0].linkedNotes, true);
});

test('defaultPresets seed the two travel kits', function () {
  var packs = link.defaultPresets();
  assert.equal(packs.length, 2);
  assert.equal(packs[0].titulo, 'Viagem nacional');
  assert.equal(packs[1].titulo, 'Viagem internacional');
  assert.ok(packs[0].groups.some(function (g) { return g.g === 'Documentos'; }));
});
