import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  titlePassesKeywordFilter,
  normCompact,
  domainFromUrl,
  storeMatchesRule,
  isBlockedStore,
  detectCurrency,
  filterOffers,
  lowestPricePerDay,
  mergeManualSeries,
  medianLastNDays,
  pctBelowMedian,
  discountBadge,
  targetHit,
  offerKey,
  DEFAULT_RX_KEYWORDS
} from '../lib/precos-math.mjs';

describe('keyword filter', () => {
  it('requires all tokens and rejects forbidden', () => {
    const o = DEFAULT_RX_KEYWORDS;
    assert.equal(titlePassesKeywordFilter('Placa RX 9070 XT 16GB', o.obrigatorias, o.proibidas), true);
    assert.equal(titlePassesKeywordFilter('Notebook RTX 9070 XT', o.obrigatorias, o.proibidas), false);
    assert.equal(titlePassesKeywordFilter('AMD Radeon RX 9070', o.obrigatorias, o.proibidas), false);
    assert.equal(titlePassesKeywordFilter('RX 9070XT Gaming', o.obrigatorias, o.proibidas), true);
    assert.equal(titlePassesKeywordFilter('Water block RX 9070 XT', o.obrigatorias, o.proibidas), false);
  });
});

describe('store filter', () => {
  it('matches domain and name', () => {
    const offer = { loja: 'Best Buy', link: 'https://www.bestbuy.com/site/123', titulo: 'GPU' };
    assert.equal(storeMatchesRule(offer, { nome: 'Best Buy', dominio: '' }), true);
    assert.equal(storeMatchesRule(offer, { nome: '', dominio: 'bestbuy.com' }), true);
    assert.equal(isBlockedStore(offer, [{ nome: 'Best Buy', dominio: 'bestbuy.com' }], [], 'x'), true);
  });
  it('allowlist restricts to listed stores only', () => {
    const a = { loja: 'Kabum', link: 'https://www.kabum.com.br/x', titulo: 'RX 9070 XT' };
    const b = { loja: 'Terabyte', link: 'https://terabyte.com.br/x', titulo: 'RX 9070 XT' };
    const allows = [{ buscaId: 's1', nome: 'Kabum', dominio: 'kabum.com.br' }];
    assert.equal(isBlockedStore(a, [], allows, 's1'), false);
    assert.equal(isBlockedStore(b, [], allows, 's1'), true);
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
  const opts = { obrigatorias: DEFAULT_RX_KEYWORDS.obrigatorias, proibidas: DEFAULT_RX_KEYWORDS.proibidas, globalBlocks: [{ nome: 'Best Buy', dominio: 'bestbuy.com' }], hideNonBrl: true, priceKind: 'real' };

  it('lowest per day ignores blocked and junk', () => {
    const s = lowestPricePerDay(raw, opts);
    assert.equal(s['2026-10-01'].val, 5000);
    assert.equal(s['2026-10-02'].val, 4800);
  });

  it('merges manual and picks lower', () => {
    const auto = lowestPricePerDay(raw, opts);
    const merged = mergeManualSeries(auto, [{ data: '2026-10-02', valor: 4700, loja: 'Loja', obs: 'manual' }], opts);
    assert.equal(merged['2026-10-02'].val, 4700);
    assert.equal(merged['2026-10-02'].origin, 'manual');
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
