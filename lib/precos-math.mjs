/* Preços — pure filters & metrics (browser PrecosMath + Node tests). */

export function normText(s) {
  return String(s == null ? '' : s)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ');
}

export function normCompact(s) {
  return normText(s).replace(/\s+/g, '');
}

export function parseRequiredForbidden(obrigatorias, proibidas) {
  const req = String(obrigatorias || '')
    .split(/[,;|]/)
    .map(function (w) { return normCompact(w.trim()); })
    .filter(Boolean);
  const ban = String(proibidas || '')
    .split(/[,;|]/)
    .map(function (w) { return normText(w.trim()); })
    .filter(Boolean);
  return { req, ban };
}

export function titlePassesKeywordFilter(titulo, obrigatorias, proibidas) {
  const t = normText(titulo);
  const tc = normCompact(titulo);
  const { req, ban } = parseRequiredForbidden(obrigatorias, proibidas);
  for (let i = 0; i < req.length; i++) {
    const w = req[i];
    if (!w) continue;
    if (tc.indexOf(w) === -1 && t.indexOf(w.replace(/(.)/g, '$1 ').trim()) === -1) return false;
  }
  for (let j = 0; j < ban.length; j++) {
    const b = ban[j];
    if (b && t.indexOf(b) > -1) return false;
  }
  return true;
}

export function normStoreName(name) {
  return normText(name).replace(/\s+/g, ' ').trim();
}

export function domainFromUrl(link) {
  if (!link) return '';
  try {
    const u = new URL(String(link));
    return u.hostname.replace(/^www\./i, '').toLowerCase();
  } catch (_) {
    const m = String(link).match(/([a-z0-9-]+\.[a-z]{2,}(?:\.[a-z]{2,})?)/i);
    return m ? m[1].toLowerCase().replace(/^www\./, '') : '';
  }
}

export function storeMatchesRule(offer, rule) {
  const name = normStoreName(offer.loja || '');
  const dom = domainFromUrl(offer.link || '');
  const rName = normStoreName(rule.nome || '');
  const rDom = String(rule.dominio || '').toLowerCase().replace(/^www\./, '');
  if (rName && name && (name === rName || name.indexOf(rName) > -1 || rName.indexOf(name) > -1)) return true;
  if (rDom && dom && (dom === rDom || dom.endsWith('.' + rDom) || rDom.endsWith('.' + dom))) return true;
  return false;
}

export function isBlockedStore(offer, globalBlocks, searchAllows, searchId) {
  const blocks = globalBlocks || [];
  for (let i = 0; i < blocks.length; i++) {
    if (storeMatchesRule(offer, blocks[i])) return true;
  }
  const allows = (searchAllows || []).filter(function (r) { return !searchId || String(r.buscaId || '') === String(searchId); });
  if (!allows.length) return false;
  for (let j = 0; j < allows.length; j++) {
    if (storeMatchesRule(offer, allows[j])) return false;
  }
  return true;
}

export function detectCurrency(offer) {
  const txt = String((offer && offer.precoTexto) || '');
  if (/R\s*\$/i.test(txt) || /,\d{2}\s*$/.test(txt)) return 'BRL';
  if (/US\s*\$|USD|\$\s*\d/.test(txt) && !/R\s*\$/i.test(txt)) return 'USD';
  if (offer && offer.extra && offer.extra.moeda) return String(offer.extra.moeda).toUpperCase();
  const p = Number(offer && offer.preco);
  if (p > 0 && p < 500 && !txt) return 'USD';
  return 'BRL';
}

export function offerPassesFilters(offer, opts) {
  opts = opts || {};
  if (!offer) return false;
  if (!titlePassesKeywordFilter(offer.titulo, opts.obrigatorias, opts.proibidas)) return false;
  if (isBlockedStore(offer, opts.globalBlocks, opts.searchAllows, opts.buscaId)) return false;
  if (opts.hideNonBrl && detectCurrency(offer) !== 'BRL') return false;
  return true;
}

export function filterOffers(offers, opts) {
  return (offers || []).filter(function (o) { return offerPassesFilters(o, opts); });
}

export function pickDisplayPrice(offer, kind) {
  if (!offer) return null;
  const av = offer.precoAvista != null ? Number(offer.precoAvista) : null;
  const real = offer.preco != null ? Number(offer.preco) : null;
  if (kind === 'avista' && av != null && !isNaN(av)) return av;
  if (real != null && !isNaN(real)) return real;
  return av;
}

export function offerKey(offer, day) {
  const link = String(offer.link || '').trim();
  if (link) return link;
  return [day, offer.loja, offer.titulo, offer.preco].join('|');
}

export function lowestPricePerDay(rawByDay, opts) {
  const out = {};
  Object.keys(rawByDay || {}).sort().forEach(function (day) {
    const list = filterOffers(rawByDay[day], opts);
    let min = null;
    list.forEach(function (o) {
      const p = pickDisplayPrice(o, opts.priceKind || 'real');
      if (p == null || isNaN(p)) return;
      if (min == null || p < min.val) min = { val: p, origin: 'auto', loja: o.loja, titulo: o.titulo };
    });
    if (min != null) out[day] = min;
  });
  return out;
}

export function mergeManualSeries(autoByDay, manualRows, opts) {
  opts = opts || {};
  const merged = Object.assign({}, autoByDay || {});
  (manualRows || []).forEach(function (m) {
    const day = String(m.data || '').slice(0, 10);
    const p = Number(m.valor);
    if (!day || isNaN(p)) return;
    const cur = merged[day];
    if (!cur || p < cur.val) {
      merged[day] = { val: p, origin: 'manual', loja: m.loja || '', titulo: m.obs || '' };
    } else if (cur && p === cur.val && cur.origin === 'auto') {
      merged[day] = Object.assign({}, cur, { origin: 'both' });
    }
  });
  return merged;
}

export function seriesInRange(series, rangeDays, today) {
  today = today || new Date().toISOString().slice(0, 10);
  const keys = Object.keys(series || {}).sort();
  if (rangeDays === 'all' || rangeDays === Infinity) return keys.map(function (k) { return { day: k, point: series[k] }; });
  const n = Number(rangeDays) || 30;
  const cut = new Date(today + 'T12:00:00');
  cut.setDate(cut.getDate() - n + 1);
  const cutStr = cut.toISOString().slice(0, 10);
  return keys.filter(function (k) { return k >= cutStr && k <= today; }).map(function (k) { return { day: k, point: series[k] }; });
}

export function medianLastNDays(series, n, today) {
  const pts = seriesInRange(series, n, today).map(function (x) { return x.point.val; });
  if (!pts.length) return null;
  const sorted = pts.slice().sort(function (a, b) { return a - b; });
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

export function pctBelowMedian(todayPrice, median) {
  if (todayPrice == null || median == null || median <= 0) return null;
  return ((median - todayPrice) / median) * 100;
}

export function discountBadge(todayPrice, median, dayCount) {
  if (dayCount < 3) return 'poucos';
  if (todayPrice == null || median == null) return 'poucos';
  const pct = pctBelowMedian(todayPrice, median);
  if (pct != null && pct >= 10) return 'real';
  return 'nao';
}

export function allTimeLow(series) {
  let min = null;
  Object.keys(series || {}).forEach(function (d) {
    const v = series[d].val;
    if (min == null || v < min.val) min = { day: d, val: v };
  });
  return min;
}

export function targetHit(todayPrice, target) {
  if (target == null || target === '' || isNaN(Number(target))) return false;
  return todayPrice != null && todayPrice <= Number(target);
}

export function todayLowestFromRaw(rawByDay, today, opts) {
  const day = rawByDay && rawByDay[today];
  if (!day) return null;
  const list = filterOffers(day, opts).slice().sort(function (a, b) {
    return pickDisplayPrice(a, opts.priceKind) - pickDisplayPrice(b, opts.priceKind);
  });
  if (!list.length) return null;
  const o = list[0];
  return {
    offer: o,
    price: pickDisplayPrice(o, opts.priceKind),
    key: offerKey(o, today)
  };
}

export function storesSeenLastDays(rawByDay, days, today) {
  today = today || new Date().toISOString().slice(0, 10);
  const cut = new Date(today + 'T12:00:00');
  cut.setDate(cut.getDate() - (Number(days) || 30));
  const cutStr = cut.toISOString().slice(0, 10);
  const map = {};
  Object.keys(rawByDay || {}).forEach(function (d) {
    if (d < cutStr || d > today) return;
    (rawByDay[d] || []).forEach(function (o) {
      const name = String(o.loja || '').trim();
      if (!name) return;
      const k = normStoreName(name);
      if (!map[k]) map[k] = { nome: name, dominio: domainFromUrl(o.link), count: 0 };
      map[k].count++;
    });
  });
  return Object.keys(map).map(function (k) { return map[k]; }).sort(function (a, b) { return b.count - a.count; });
}

export const DEFAULT_RX_KEYWORDS = {
  obrigatorias: '9070, xt',
  proibidas: 'notebook, laptop, pc gamer, kit, water block, waterblock, backplate, suporte, cabo, computador'
};

export const DEFAULT_GLOBAL_BLOCKS = [
  { nome: 'Best Buy', dominio: 'bestbuy.com' },
  { nome: 'Newegg', dominio: 'newegg.com' },
  { nome: 'B&H', dominio: 'bhphotovideo.com' },
  { nome: 'eBay', dominio: 'ebay.com' },
  { nome: 'Walmart', dominio: 'walmart.com' }
];
