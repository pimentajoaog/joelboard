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
  var shared = link.packSnapshot({
    id: 'n8', titulo: 'Mala', sticker: true, collabSheetId: 'sid',
    collabMembers: [{ email: 'a@b.com', nome: 'Ana', status: 'active' }]
  }, []);
  assert.equal(shared.collabSheetId, 'sid');
  assert.equal(shared.collabMembers.length, 1);
  var preset = link.packSnapshot({ id: 'n3', titulo: 'Kit', preset: true, sticker: true }, []);
  assert.equal(preset.sticker, false);
  var html = link.peekHtml(snap, { open: true, shareHint: 'só sua' });
  assert.match(html, /1\/3/);
  assert.match(html, /Roupas/);
  assert.match(html, /Chaves/);
  assert.match(html, /jb-link-item ck-t done/);
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

test('createList builds a personal compras note in ghost', async function () {
  ctx.JB = { isGhost: function () { return true; } };
  var snap = await link.createList({
    titulo: 'Doces',
    tipo: 'compras',
    cor: '🧁',
    itens: [
      { texto: 'Brigadeiro', marcavel: false, tipo: 'g' },
      { texto: '1 lata leite condensado', marcavel: true, tipo: '' }
    ]
  });
  assert.equal(snap.titulo, 'Doces');
  assert.equal(snap.tipo, 'compras');
  assert.equal(snap.total, 1);
  assert.equal(snap.items[0].tipo, 'g');
  assert.equal(link.bornGhostLists().length >= 1, true);
});

test('defaultPresets seed the two travel kits', function () {
  var packs = link.defaultPresets();
  assert.equal(packs.length, 2);
  assert.equal(packs[0].titulo, 'Viagem nacional');
  assert.equal(packs[1].titulo, 'Viagem internacional');
  assert.ok(packs[0].groups.some(function (g) { return g.g === 'Documentos'; }));
  assert.equal(link.isDefaultKitTitle('Viagem nacional'), true);
  assert.equal(link.isDefaultKitTitle('Viagem Nacional'), true);
  assert.equal(link.isDefaultKitTitle('Mala — fim de semana'), false);
});

test('listShareHint names Notes members instead of the personal warning', function () {
  ctx.JB = { email: function () { return 'me@x.com'; } };
  assert.equal(link.listShareHint({}), '');
  assert.equal(
    link.listShareHint({}, { planShared: true }),
    'Esta lista é só sua. Compartilhe no Notes se o grupo precisar.'
  );
  assert.equal(
    link.listShareHint({ collabSheetId: 'sid', collabMembers: [] }, { planShared: true }),
    'Compartilhada no Notes.'
  );
  assert.equal(
    link.listShareHint({
      collabSheetId: 'sid',
      collabMembers: [
        { email: 'me@x.com', nome: 'Eu', status: 'active' },
        { email: 'gabi@x.com', nome: 'Gabi', status: 'active' },
        { email: 'joel@x.com', nome: 'Joel', status: 'active' }
      ]
    }, { planShared: true }),
    'Compartilhada com Gabi e Joel.'
  );
});

test('parseCollabListPack reads Meta + Itens from a shared note sheet', function () {
  var pack = link.parseCollabListPack(
    [
      ['Titulo', 'Tipo', 'Cor', 'Fixado', 'Criado', 'Atualizado', 'ID'],
      ['Viagem nacional', 'viagem', '🧳', '', '', '', 'trip1']
    ],
    [
      ['NotaID', 'Ordem', 'Texto', 'Marcavel', 'Feito', 'ID', 'Tipo'],
      ['trip1', 1, 'RG ou CNH', true, false, 'c1', '']
    ],
    'fallback'
  );
  assert.equal(pack.notas.length, 1);
  assert.equal(pack.notas[0].id, 'trip1');
  assert.equal(pack.notas[0].preset, false);
  assert.equal(pack.notas[0].sticker, true);
  assert.equal(pack.itens[0].texto, 'RG ou CNH');
});

test('loadSnapshots fills attached lists from Notes Compartilhadas', async function () {
  var calls = [];
  ctx.JB = {
    isGhost: function () { return false; },
    getSheetId: function () { return 'personal-notes'; },
    api: function (method, url) {
      calls.push(url);
      if (url.indexOf('personal-notes') >= 0 && url.indexOf('batchGet') >= 0) {
        return Promise.resolve({
          valueRanges: [
            { values: [['Titulo'], ['Kit', 'viagem', '', '', '', '', 'kit1', '', '1', '']] },
            { values: [['NotaID'], ['kit1', 1, 'RG', true, false, 'i1', '']] }
          ]
        });
      }
      if (url.indexOf('Compartilhadas') >= 0) {
        return Promise.resolve({
          values: [
            ['Titulo', 'SheetID', 'Papel', 'Owner', 'ListaID'],
            ['Viagem nacional', 'collab-sid', 'owner', 'a@b.com', 'trip1']
          ]
        });
      }
      if (url.indexOf('collab-sid') >= 0 && url.indexOf('Membros') >= 0) {
        return Promise.resolve({
          values: [
            ['Email', 'Nome', 'Icone', 'Papel', 'Status'],
            ['a@b.com', 'Ana', '🦊', 'owner', 'active'],
            ['c@d.com', 'Caio', '🐻', 'editor', 'active']
          ]
        });
      }
      if (url.indexOf('collab-sid') >= 0) {
        return Promise.resolve({
          valueRanges: [
            { values: [['Titulo'], ['Viagem nacional', 'viagem', '', '', '', '', 'trip1']] },
            { values: [['NotaID'], ['trip1', 1, 'Passaporte', true, false, 'c1', '']] }
          ]
        });
      }
      return Promise.resolve({});
    }
  };
  var snaps = await link.loadSnapshots(['trip1']);
  assert.equal(snaps.length, 1);
  assert.equal(snaps[0].id, 'trip1');
  assert.equal(snaps[0].titulo, 'Viagem nacional');
  assert.equal(snaps[0].items[0].texto, 'Passaporte');
  assert.equal(snaps[0].collabSheetId, 'collab-sid');
  assert.equal(snaps[0].collabMembers[1].nome, 'Caio');
  assert.ok(calls.some(function (u) { return u.indexOf('Compartilhadas') >= 0; }));
  assert.ok(calls.some(function (u) { return u.indexOf('collab-sid') >= 0; }));
  assert.ok(calls.some(function (u) { return u.indexOf('Membros') >= 0; }));
});
