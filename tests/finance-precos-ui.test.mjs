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

function boot(data, extra) {
  const els = {};
  const calls = [];
  let n = 0;
  const ctx = {
    ...extra,
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

const SSD = { id: 'ssd', termo: 'SSD 2TB', teto: '', obrigatorias: '', proibidas: '', arquivada: false, criado: 2 };
const kabumAt = (preco) => [{ loja: 'KaBuM!', titulo: 'Produto', preco, precoTexto: 'R$ ' + preco, link: 'https://www.kabum.com.br/p' }];

test('card arrow opens the cheapest stores when none are pinned', () => {
  const { ctx, els } = boot({ precosBuscas: [Object.assign({}, BUSCA)], precosCapturas: [capture(TODAY, OFFERS)] });
  ctx.renderPrecos();
  assert.doesNotMatch(els.precosList.innerHTML, /precos-card-drop/);
  ctx.precosToggleCard('gpu');
  const html = els.precosList.innerHTML;
  assert.match(html, /aria-expanded="true"/);
  assert.match(html, /Mais baratas por loja · hoje/);
  assert.equal(count(html, 'class="precos-drop-row'), 5);
  assert.match(html, /\+ 2 lojas mais caras/);
  assert.match(html, /Escolher lojas/);
  ctx.precosToggleCard('gpu');
  assert.doesNotMatch(els.precosList.innerHTML, /precos-card-drop/);
});

test('card arrow lists every pinned store, including ones without an offer today', () => {
  const pins = ['Mercado Livre', 'Pichau', 'Kabum'].map((nome, i) => ({ id: 'p' + i, buscaId: 'gpu', tipo: 'permitida', nome, dominio: '', criado: 1 }));
  const { ctx, els } = boot({
    precosBuscas: [Object.assign({}, BUSCA)],
    precosCapturas: [capture('2026-10-07', kabumAt(4999)), capture(TODAY, OFFERS)],
    precosLojas: pins
  });
  ctx.precosToggleCard('gpu');
  const html = els.precosList.innerHTML;
  assert.match(html, /Lojas marcadas · hoje/);
  assert.equal(count(html, 'class="precos-drop-row'), 3);
  const names = [...html.matchAll(/precos-drop-name">([^<]+)/g)].map((m) => m[1].trim());
  assert.deepEqual(names, ['Mercado Livre', 'Pichau', 'KaBuM!']);
  assert.match(html, /mais barata/);
  assert.match(html, /% que a mais barata/);
  assert.match(html, /sem oferta hoje · última R\$\s4\.999,00 ontem/);
});

test('widget shows starred products collapsed and every product expanded', () => {
  const { ctx, els } = boot({
    settings: { precos_favoritas: 'gpu' },
    precosBuscas: [Object.assign({}, BUSCA), Object.assign({}, SSD)],
    precosCapturas: [capture('2026-10-07', kabumAt(5000)), capture(TODAY, kabumAt(4500))]
  });
  ctx.renderPrecos();
  assert.equal(els.precosWidget.hidden, false);
  const pill = els.precosWidget.innerHTML;
  assert.match(pill, /pw-pill/);
  assert.match(pill, /RX 9070 XT/);
  assert.match(pill, /R\$\s4\.500,00/);
  assert.match(pill, /▼10%/);
  assert.match(pill, /pw-ico stale/);
  assert.match(pill, /1 sem busca hoje/);
  assert.doesNotMatch(pill, /SSD 2TB/);
  ctx.precosWidgetToggle(true);
  const panel = els.precosWidget.innerHTML;
  assert.match(panel, /▼ R\$\s500,00 · 10% vs ontem/);
  assert.match(panel, /SSD 2TB/);
  assert.match(panel, /sem busca ainda/);
  assert.ok(panel.indexOf('RX 9070 XT') < panel.indexOf('SSD 2TB'));
  assert.match(panel, /Buscar preços de hoje \(1\)/);
  assert.match(panel, /1 de 2 atualizadas hoje/);
});

test('widget without favorites shows a count and only appears on Visão geral', () => {
  const { ctx, els } = boot({ precosBuscas: [Object.assign({}, BUSCA), Object.assign({}, SSD)] });
  ctx.renderPrecos();
  assert.match(els.precosWidget.innerHTML, /pw-ico/);
  assert.match(els.precosWidget.innerHTML, /pw-name">Preços<\/span><span class="pw-count">2 produtos</);
  ctx.precosToggleFav('ssd');
  assert.equal(ctx.DATA.settings.precos_favoritas, 'ssd');
  assert.match(els.precosWidget.innerHTML, /SSD 2TB/);
  ctx.currentTab = 'bills';
  ctx.renderPrecosWidget();
  assert.equal(els.precosWidget.hidden, true);
  assert.equal(els.precosWidget.innerHTML, '');
});

test('Buscar todas searches only products not updated today, then all again', async () => {
  const urls = [];
  const fetch = (url) => {
    urls.push(url);
    return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({ offers: kabumAt(4400) }) });
  };
  const { ctx, els, calls } = boot({
    precosBuscas: [Object.assign({}, BUSCA), Object.assign({}, SSD)],
    precosCapturas: [capture(TODAY, kabumAt(4500))]
  }, { fetch });
  await ctx.precosFetchAll();
  assert.deepEqual(calls.filter((c) => c[0] === 'savePrecosCaptura').map((c) => c[1].buscaId), ['ssd']);
  assert.equal(urls.length, 1);
  assert.match(urls[0], /SSD%202TB/);
  ctx.precosWidgetToggle(true);
  assert.match(els.precosWidget.innerHTML, /Buscar todas de novo/);
  assert.match(els.precosWidget.innerHTML, /2 de 2 atualizadas hoje/);
  await ctx.precosFetchAll();
  assert.equal(urls.length, 3);
});

test('empty list has no example button', () => {
  const { ctx, els } = boot({});
  ctx.renderPrecos();
  assert.match(els.precosList.innerHTML, /Nenhuma busca ainda/);
  assert.doesNotMatch(els.precosList.innerHTML, /exemplo|9070/i);
});
