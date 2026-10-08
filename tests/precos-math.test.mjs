import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  titlePassesKeywordFilter,
  parseWordList,
  wordImpact,
  normCompact,
  domainFromUrl,
  merchantDomain,
  storeKey,
  storeLabel,
  storeGroups,
  STORE_LABELS,
  storeMatchesRule,
  storeRulesForSearch,
  isBlockedStore,
  detectCurrency,
  filterOffers,
  filterBreakdown,
  lowestPricePerDay,
  mergeManualSeries,
  medianLastNDays,
  seriesInRange,
  discountBadge,
  discountVerdict,
  isGoogleLowTag,
  targetHit,
  offerKey
} from '../lib/precos-math.mjs';

const GPU_WORDS = {
  obrigatorias: '9070, xt',
  proibidas: 'notebook, laptop, pc gamer, kit, water block, waterblock, backplate, suporte, cabo, computador'
};
const GOOGLE_LINK = 'https://www.google.com.br/search?ibp=oshop&q=rx&prds=catalogid:1';

describe('keyword filter', () => {
  it('requires all tokens and rejects forbidden', () => {
    const o = GPU_WORDS;
    assert.equal(titlePassesKeywordFilter('Placa RX 9070 XT 16GB', o.obrigatorias, o.proibidas), true);
    assert.equal(titlePassesKeywordFilter('Notebook RTX 9070 XT', o.obrigatorias, o.proibidas), false);
    assert.equal(titlePassesKeywordFilter('AMD Radeon RX 9070', o.obrigatorias, o.proibidas), false);
    assert.equal(titlePassesKeywordFilter('RX 9070XT Gaming', o.obrigatorias, o.proibidas), true);
    assert.equal(titlePassesKeywordFilter('Water block RX 9070 XT', o.obrigatorias, o.proibidas), false);
  });
  it('forbidden words match at word starts, not inside other words', () => {
    assert.equal(titlePassesKeywordFilter('Cabos de força 9070 XT', '', 'cabo'), false);
    assert.equal(titlePassesKeywordFilter('Placa Skit 9070', '', 'kit'), true);
  });
  it('parses and dedupes word lists', () => {
    assert.deepEqual(parseWordList('9070, XT; xt |  16gb'), ['9070', 'XT', '16gb']);
    assert.deepEqual(parseWordList(''), []);
  });
  it('counts how many offers a word hides', () => {
    const offers = [{ titulo: 'RX 9070 XT' }, { titulo: 'Kit cabo 9070' }, { titulo: 'Notebook 9070 XT' }];
    assert.equal(wordImpact(offers, 'xt', 'req'), 1);
    assert.equal(wordImpact(offers, 'notebook', 'ban'), 1);
    assert.equal(wordImpact(offers, 'cabo', 'ban'), 1);
  });
});

describe('store identity', () => {
  it('merges domain-style and seller-suffixed names into one store', () => {
    assert.equal(storeKey('Mercado Livre'), 'mercadolivre');
    assert.equal(storeKey('mercadolivre.com.br'), 'mercadolivre');
    assert.equal(storeKey('Mercado Libre'), 'mercadolivre');
    assert.equal(storeKey('AliExpress - AliExpress-2678115129'), 'aliexpress');
    assert.equal(storeKey('AliExpress'), 'aliexpress');
    assert.equal(storeKey('www.terabyteshop.com.br'), 'terabyte');
    assert.equal(storeKey('KaBuM!'), 'kabum');
  });
  it('every canonical label maps back to its own key', () => {
    Object.keys(STORE_LABELS).forEach((k) => assert.equal(storeKey(STORE_LABELS[k]), k, k));
  });
  it('labels unknown stores with the nicest variant', () => {
    assert.equal(storeLabel('mercadolivre', { 'mercadolivre.com.br': 9 }), 'Mercado Livre');
    assert.equal(storeLabel('lojax', { lojax: 5, 'Loja X': 1 }), 'Loja X');
  });
  it('groups offers per canonical store, cheapest first', () => {
    const g = storeGroups([
      { loja: 'Mercado Livre', preco: 5000 },
      { loja: 'mercadolivre.com.br', preco: 4800 },
      { loja: 'AliExpress - AliExpress-1', preco: 4700 },
      { loja: 'AliExpress - AliExpress-2', preco: 4900 },
      { loja: 'Pichau', preco: 5500 }
    ], 'real');
    assert.deepEqual(g.map((x) => [x.nome, x.count, x.min]), [
      ['AliExpress', 2, 4700],
      ['Mercado Livre', 2, 4800],
      ['Pichau', 1, 5500]
    ]);
  });
});

describe('store rules', () => {
  it('ignores Google hosts so one rule never matches every offer', () => {
    assert.equal(merchantDomain(GOOGLE_LINK), '');
    assert.equal(merchantDomain('google.com.br'), '');
    assert.equal(merchantDomain('https://www.kabum.com.br/p/1'), 'kabum.com.br');
    const shopee = { loja: 'Shopee', link: GOOGLE_LINK };
    const pichau = { loja: 'Pichau', link: GOOGLE_LINK };
    const legacy = { nome: 'Shopee', dominio: 'google.com.br' };
    assert.equal(storeMatchesRule(shopee, legacy), true);
    assert.equal(storeMatchesRule(pichau, legacy), false);
  });
  it('matches domain and name', () => {
    const offer = { loja: 'Best Buy', link: 'https://www.bestbuy.com/site/123', titulo: 'GPU' };
    assert.equal(storeMatchesRule(offer, { nome: 'Best Buy', dominio: '' }), true);
    assert.equal(storeMatchesRule(offer, { nome: '', dominio: 'bestbuy.com' }), true);
    assert.equal(isBlockedStore(offer, [{ nome: 'Best Buy', dominio: 'bestbuy.com' }], [], 'x'), true);
  });
  it('a rule saved for one name variant covers the others', () => {
    assert.equal(storeMatchesRule({ loja: 'mercadolivre.com.br', link: GOOGLE_LINK }, { nome: 'Mercado Livre' }), true);
    assert.equal(storeMatchesRule({ loja: 'AliExpress - AliExpress-99', link: GOOGLE_LINK }, { nome: 'AliExpress' }), true);
  });
  it('several pinned stores all stay visible', () => {
    const offers = [
      { loja: 'Mercado Livre', titulo: 'a', preco: 1, precoTexto: 'R$ 1' },
      { loja: 'mercadolivre.com.br', titulo: 'b', preco: 2, precoTexto: 'R$ 2' },
      { loja: 'Pichau', titulo: 'c', preco: 3, precoTexto: 'R$ 3' },
      { loja: 'Shopee', titulo: 'd', preco: 4, precoTexto: 'R$ 4' }
    ];
    const pins = [{ buscaId: 's1', nome: 'Mercado Livre' }, { buscaId: 's1', nome: 'Pichau' }];
    const shown = filterOffers(offers, { globalBlocks: [], searchAllows: pins, buscaId: 's1' });
    assert.deepEqual(shown.map((o) => o.titulo), ['a', 'b', 'c']);
  });
  it('allowlist restricts to listed stores only', () => {
    const a = { loja: 'Kabum', link: 'https://www.kabum.com.br/x', titulo: 'RX 9070 XT' };
    const b = { loja: 'Terabyte', link: 'https://terabyte.com.br/x', titulo: 'RX 9070 XT' };
    const allows = [{ buscaId: 's1', nome: 'Kabum', dominio: 'kabum.com.br' }];
    assert.equal(isBlockedStore(a, [], allows, 's1'), false);
    assert.equal(isBlockedStore(b, [], allows, 's1'), true);
  });
  it('splits sheet rows into pins and hides for one search', () => {
    const rows = [
      { id: '1', buscaId: 's1', tipo: 'permitida', nome: 'Pichau' },
      { id: '2', buscaId: 's2', tipo: 'permitida', nome: 'Kabum' },
      { id: '3', buscaId: '', tipo: 'bloqueada', nome: 'Best Buy' },
      { id: '4', buscaId: 's1', tipo: 'bloqueada', nome: 'Shopee' },
      { id: '5', buscaId: 's2', tipo: 'bloqueada', nome: 'Temu' }
    ];
    const r = storeRulesForSearch(rows, 's1');
    assert.deepEqual(r.pins.map((x) => x.id), ['1']);
    assert.deepEqual(r.hides.map((x) => x.id), ['3', '4']);
  });
});

describe('filter breakdown', () => {
  it('explains why offers are hidden', () => {
    const offers = [
      { loja: 'Kabum', titulo: 'RX 9070 XT', preco: 5000, precoTexto: 'R$ 5.000' },
      { loja: 'Shopee', titulo: 'RX 9070 XT', preco: 4000, precoTexto: 'R$ 4.000' },
      { loja: 'Kabum', titulo: 'Notebook 9070 XT', preco: 9000, precoTexto: 'R$ 9.000' },
      { loja: 'Best Buy', titulo: 'RX 9070 XT', preco: 500, precoTexto: 'US$ 500' }
    ];
    const bd = filterBreakdown(offers, {
      obrigatorias: GPU_WORDS.obrigatorias, proibidas: GPU_WORDS.proibidas,
      globalBlocks: [{ nome: 'Shopee' }], searchAllows: [], buscaId: 's1', hideNonBrl: true
    });
    assert.deepEqual(bd, { total: 4, shown: 1, loja: 1, palavras: 1, moeda: 1 });
  });
});

describe('currency', () => {
  it('detects non-BRL', () => {
    assert.equal(detectCurrency({ precoTexto: 'US$ 499', preco: 499 }), 'USD');
    assert.equal(detectCurrency({ precoTexto: 'R$ 4.599,90', preco: 4599.9 }), 'BRL');
  });
});

describe('metrics', () => {
  const raw = {
    '2026-10-01': [
      { loja: 'Kabum', titulo: 'RX 9070 XT', preco: 5000, precoTexto: 'R$ 5.000' },
      { loja: 'Best Buy', titulo: 'RX 9070 XT', preco: 400, precoTexto: 'US$ 400' }
    ],
    '2026-10-02': [{ loja: 'Kabum', titulo: 'RX 9070 XT', preco: 4800, precoTexto: 'R$ 4.800' }]
  };
  const opts = { obrigatorias: GPU_WORDS.obrigatorias, proibidas: GPU_WORDS.proibidas, globalBlocks: [{ nome: 'Best Buy', dominio: 'bestbuy.com' }], hideNonBrl: true, priceKind: 'real' };

  it('lowest per day ignores blocked and junk', () => {
    const s = lowestPricePerDay(raw, opts);
    assert.equal(s['2026-10-01'].val, 5000);
    assert.equal(s['2026-10-02'].val, 4800);
  });

  it('merges manual and picks lower', () => {
    const auto = lowestPricePerDay(raw, opts);
    const merged = mergeManualSeries(auto, [{ data: '2026-10-02', valor: 4700, loja: 'Loja', obs: 'manual' }]);
    assert.equal(merged['2026-10-02'].val, 4700);
    assert.equal(merged['2026-10-02'].origin, 'manual');
  });

  it('range keeps the last N calendar days', () => {
    const series = { '2026-09-01': { val: 1 }, '2026-09-10': { val: 2 }, '2026-10-08': { val: 3 } };
    assert.deepEqual(seriesInRange(series, 30, '2026-10-08').map((p) => p.day), ['2026-09-10', '2026-10-08']);
    assert.equal(seriesInRange(series, 'all', '2026-10-08').length, 3);
  });

  it('median and discount badge', () => {
    const series = { '2026-10-01': { val: 5000 }, '2026-10-02': { val: 4800 }, '2026-10-03': { val: 4700 } };
    const med = medianLastNDays(series, 30, '2026-10-03');
    assert.ok(med > 4700 && med < 5000);
    assert.equal(discountBadge(4200, med, 3), 'real');
    assert.equal(discountBadge(4900, med, 3), 'nao');
    assert.equal(discountBadge(4200, med, 2), 'poucos');
  });

  it('target hit', () => {
    assert.equal(targetHit(4500, 4600), true);
    assert.equal(targetHit(4500, ''), false);
    assert.equal(targetHit(4500, null), false);
  });
});

describe('discount verdict', () => {
  it('uses your own median once there are 3 days', () => {
    assert.equal(discountVerdict({ todayPrice: 4200, median: 4800, dayCount: 3 }).kind, 'real');
    assert.equal(discountVerdict({ todayPrice: 4700, median: 4800, dayCount: 5 }).kind, 'nao');
    assert.ok(discountVerdict({ todayPrice: 5200, median: 4800, dayCount: 5 }).pct < 0);
  });
  it("falls back to Google's normal price on day one", () => {
    const v = discountVerdict({ todayPrice: 5063.79, dayCount: 1, normalPrice: 5300, googleLow: true });
    assert.equal(v.kind, 'google');
    assert.equal(v.need, 2);
    assert.equal(v.normal, 5300);
    assert.equal(discountVerdict({ todayPrice: 5250, dayCount: 1, normalPrice: 5300 }).kind, 'google-normal');
    assert.equal(discountVerdict({ todayPrice: 4000, dayCount: 1, normalPrice: 5300 }).kind, 'google');
  });
  it('asks for more days when there is nothing to compare', () => {
    assert.deepEqual(discountVerdict({ todayPrice: 4000, dayCount: 1 }), { kind: 'poucos', pct: null, basis: '', need: 2 });
    assert.equal(discountVerdict({ todayPrice: null, dayCount: 4 }).kind, 'sem');
  });
  it('reads Google low-price tags', () => {
    assert.equal(isGoogleLowTag({ tag: 'PREÇO BAIXO' }), true);
    assert.equal(isGoogleLowTag({ tag: 'Frete grátis' }), false);
    assert.equal(isGoogleLowTag({}), false);
  });
});

describe('normCompact', () => {
  it('normalizes spacing', () => {
    assert.equal(normCompact('9070 XT'), '9070xt');
  });
});

describe('domainFromUrl', () => {
  it('strips www', () => {
    assert.equal(domainFromUrl('https://www.kabum.com.br/p/1'), 'kabum.com.br');
  });
});

describe('offerKey', () => {
  it('prefers link', () => {
    assert.equal(offerKey({ link: 'https://x', loja: 'A' }, '2026-10-01'), 'https://x');
  });
});
