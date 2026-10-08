/* Preços detail + filter sheet rendered against the SerpApi sample. © 2026 Joel Soluções LTDA. */
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { flattenShopping, mapSerpOffer } from '../lib/precos-serp.mjs';

const mathJs = readFileSync(new URL('../public/precos-math.js', import.meta.url), 'utf8');
const uiJs = readFileSync(new URL('../public/finance-precos.js', import.meta.url), 'utf8');
const sample = JSON.parse(readFileSync(new URL('../scripts/samples/serpapi-google-shopping-rx-9070-xt.json', import.meta.url), 'utf8'));
const OFFERS = flattenShopping(sample).map(mapSerpOffer).filter(Boolean);
const TODAY = '2026-10-08';

function fakeEl() {
  const classes = new Set();
  return {
    innerHTML: '', textContent: '', value: '', checked: false, disabled: false, style: {},
    classList: {
      add: (c) => classes.add(c), remove: (c) => classes.delete(c), contains: (c) => classes.has(c),
      toggle: (c, on) => (on === undefined ? (classes.has(c) ? classes.delete(c) : classes.add(c)) : on ? classes.add(c) : classes.delete(c))
    },
    querySelectorAll: () => [], focus() {}, scrollIntoView() {}
  };
}

function boot(data) {
  const els = {};
  const calls = [];
  let n = 0;
  const ctx = {
    console,
    DATA: Object.assign({ settings: {}, precosBuscas: [], precosCapturas: [], precosLojas: [], precosManual: [], precosConferidas: [] }, data),
    document: { getElementById: (id) => (els[id] = els[id] || fakeEl()) },
    esc: (s) => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;'),
    escAttr: (s) => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/"/g, '&quot;'),
    todayStr: () => TODAY,
    t: () => 'Erro: ',
    showToast: () => {}, closeOverlay: () => {}, showConfirm: () => {}, jbSaveSetting: () => {},
    parseAmount: Number,
    setTimeout: () => 0,
    JB: { emptyState: (o) => '<div class="empty">' + o.title + ' ' + o.hint + ' ' + o.action + '</div>', dpSet() {}, dpGet() { return TODAY; } },
    jbRun: (method, ...args) => { calls.push([method, ...args]); return Promise.resolve({ success: true, id: 'r' + (++n) }); }
  };
  vm.createContext(ctx);
  vm.runInContext(mathJs + '\n' + uiJs, ctx);
  return { ctx, els, calls };
}

const BUSCA = { id: 'gpu', termo: 'RX 9070 XT', teto: '', obrigatorias: '', proibidas: '', arquivada: false, criado: 1 };

function capture(day, offers) {
  return { id: 'c-' + day, buscaId: 'gpu', data: day, json: JSON.stringify(offers), criado: Date.parse(day + 'T15:30:00Z') };
}

function count(html, needle) {
  return html.split(needle).length - 1;
}

test('one day of captures still draws the chart and merges store names', () => {
  const { ctx, els } = boot({ precosBuscas: [Object.assign({}, BUSCA)], precosCapturas: [capture(TODAY, OFFERS)] });
  ctx.openPrecosSearch('gpu');
  const chart = els.precosChart.innerHTML;
  assert.match(chart, /<svg/);
  assert.equal(count(chart, '<circle'), 1);
  assert.match(chart, /busque de novo amanhã/);
  assert.match(els.precosHero.innerHTML, /Menor preço hoje/);
  const bars = els.precosStoreBars.innerHTML;
  assert.equal(count(bars, '>Mercado Livre<'), 1);
  assert.equal(count(bars, '>AliExpress<'), 1);
  assert.doesNotMatch(bars, /mercadolivre\.com\.br|AliExpress-\d/);
  assert.match(els.precosOffersHead.innerHTML, /40 de 40/);
  assert.match(els.precosFetchRow.innerHTML, /Atualizar preços de hoje/);
});

test('several days draw a line with date labels', () => {
  const older = OFFERS.map((o) => Object.assign({}, o, { preco: o.preco * 1.1 }));
  const { ctx, els } = boot({
    precosBuscas: [Object.assign({}, BUSCA)],
    precosCapturas: [capture('2026-10-01', older), capture('2026-10-07', older), capture(TODAY, OFFERS)]
  });
  ctx.openPrecosSearch('gpu');
  const chart = els.precosChart.innerHTML;
  assert.match(chart, /class="precos-line"/);
  assert.match(chart, /class="precos-area"/);
  assert.equal(count(chart, '<circle'), 3);
  assert.match(chart, />01\/10</);
  assert.match(chart, />hoje</);
  assert.match(els.precosHero.innerHTML, /Desconto real|Preço comum|Acima do normal/);
});

test('filter sheet lists each store once and saves several pinned stores', async () => {
  const { ctx, els, calls } = boot({ precosBuscas: [Object.assign({}, BUSCA)], precosCapturas: [capture(TODAY, OFFERS)] });
  ctx.openPrecosSearch('gpu');
  ctx.openPrecosFilters();
  const stores = els.pfStores.innerHTML;
  assert.equal(count(stores, 'pf-store-name">Mercado Livre<'), 1);
  assert.equal(count(stores, 'pf-store-name">AliExpress<'), 1);
  assert.match(stores, /14 ofertas hoje/);
  ctx.precosDraftStore('pin', 'mercadolivre');
  ctx.precosDraftStore('pin', 'pichau');
  assert.match(els.pfSummary.innerHTML, /<b>21<\/b> de 40/);
  assert.match(els.pfStores.innerHTML, /is-out/);
  ctx.submitPrecosFilters();
  await new Promise((r) => setImmediate(r));
  await new Promise((r) => setImmediate(r));
  const adds = calls.filter((c) => c[0] === 'addPrecosLoja');
  assert.deepEqual(adds.map((c) => [c[1].tipo, c[1].nome, c[1].buscaId]), [
    ['permitida', 'Mercado Livre', 'gpu'],
    ['permitida', 'Pichau', 'gpu']
  ]);
  assert.match(els.precosOffersHead.innerHTML, /21 de 40/);
});

test('legacy hidden stores show up in the sheet and only hide themselves', () => {
  const { ctx, els } = boot({
    precosBuscas: [Object.assign({}, BUSCA)],
    precosCapturas: [capture(TODAY, OFFERS)],
    precosLojas: [
      { id: 'l1', buscaId: '', tipo: 'bloqueada', nome: 'Shopee', dominio: 'google.com.br', criado: 1 },
      { id: 'l2', buscaId: '', tipo: 'bloqueada', nome: 'Best Buy', dominio: 'bestbuy.com', criado: 1 }
    ]
  });
  ctx.openPrecosSearch('gpu');
  assert.match(els.precosOffersHead.innerHTML, /36 de 40/);
  ctx.openPrecosFilters();
  const stores = els.pfStores.innerHTML;
  assert.match(stores, /is-hide"><div class="pf-store-main"><div class="pf-store-name">Shopee<span class="pf-tag">todas as buscas/);
  assert.match(stores, /Best Buy/);
  assert.match(stores, /sem ofertas recentes/);
});

test('when filters hide everything the detail explains why', () => {
  const { ctx, els } = boot({
    precosBuscas: [Object.assign({}, BUSCA, { obrigatorias: 'naoexiste' })],
    precosCapturas: [capture(TODAY, OFFERS)]
  });
  ctx.openPrecosSearch('gpu');
  const hero = els.precosHero.innerHTML;
  assert.match(hero, /Nenhuma oferta passou nos seus filtros/);
  assert.match(hero, /40 por palavras/);
  assert.match(hero, /Limpar filtros/);
  assert.equal(els.precosOffersList.innerHTML, '');
});

test('no captures yet shows an empty chart, not a blank space', () => {
  const { ctx, els } = boot({ precosBuscas: [Object.assign({}, BUSCA)] });
  ctx.openPrecosSearch('gpu');
  assert.match(els.precosChart.innerHTML, /aparece depois da primeira busca/);
  assert.match(els.precosFetchRow.innerHTML, /Buscar preços de hoje/);
  ctx.renderPrecos();
  assert.match(els.precosList.innerHTML, /Toque para buscar o primeiro preço/);
});

test('empty list has no example button', () => {
  const { ctx, els } = boot({});
  ctx.renderPrecos();
  assert.match(els.precosList.innerHTML, /Nenhuma busca ainda/);
  assert.doesNotMatch(els.precosList.innerHTML, /exemplo|9070/i);
});
