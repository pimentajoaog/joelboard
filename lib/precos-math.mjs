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

export function parseWordList(s) {
  const seen = {};
  return String(s || '')
    .split(/[,;|\n]/)
    .map(function (w) { return w.trim(); })
    .filter(function (w) {
      const k = normCompact(w);
      if (!k || seen[k]) return false;
      seen[k] = true;
      return true;
    });
}

export function parseRequiredForbidden(obrigatorias, proibidas, obrigatoriasOr) {
  const req = parseWordList(obrigatorias).map(normCompact).filter(Boolean);
  const reqOr = parseWordList(obrigatoriasOr).map(normCompact).filter(Boolean);
  const ban = parseWordList(proibidas).map(function (w) { return normText(w).trim(); }).filter(Boolean);
  return { req, reqOr, ban };
}

function titleHasRequired(t, tc, w) {
  return tc.indexOf(w) > -1 || t.indexOf(w.replace(/(.)/g, '$1 ').trim()) > -1;
}

/** Forbidden words match at a word start, so "cabo" also catches "cabos". */
function titleHasForbidden(t, w) {
  return (' ' + t).indexOf(' ' + w) > -1;
}

export function titlePassesKeywordFilter(titulo, obrigatorias, proibidas, obrigatoriasOr) {
  const t = normText(titulo);
  const tc = normCompact(titulo);
  const { req, reqOr, ban } = parseRequiredForbidden(obrigatorias, proibidas, obrigatoriasOr);
  for (let i = 0; i < req.length; i++) {
    if (req[i] && !titleHasRequired(t, tc, req[i])) return false;
  }
  if (reqOr.length) {
    let any = false;
    for (let k = 0; k < reqOr.length; k++) {
      if (reqOr[k] && titleHasRequired(t, tc, reqOr[k])) { any = true; break; }
    }
    if (!any) return false;
  }
  for (let j = 0; j < ban.length; j++) {
    if (ban[j] && titleHasForbidden(t, ban[j])) return false;
  }
  return true;
}

/** How many offers each word removes: required words count titles missing them, forbidden words count titles containing them. */
export function wordImpact(offers, word, kind) {
  const w = (kind === 'req' || kind === 'reqOr') ? normCompact(word) : normText(word).trim();
  if (!w) return 0;
  let n = 0;
  (offers || []).forEach(function (o) {
    const t = normText(o && o.titulo);
    const tc = normCompact(o && o.titulo);
    const has = (kind === 'req' || kind === 'reqOr') ? titleHasRequired(t, tc, w) : titleHasForbidden(t, w);
    if (kind === 'req' || kind === 'reqOr' ? !has : has) n++;
  });
  return n;
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

const AGGREGATOR_HOST = /(^|\.)(google\.[a-z.]+|googleadservices\.com|gstatic\.com|serpapi\.com)$/i;

/** Merchant domain from an offer link; Google Shopping / SerpApi links say nothing about the store. */
export function merchantDomain(link) {
  const d = String(link || '').indexOf('/') > -1 ? domainFromUrl(link) : String(link || '').toLowerCase().replace(/^www\./, '');
  return d && !AGGREGATOR_HOST.test(d) ? d : '';
}

const STORE_KEY_ALIASES = {
  mercadolibre: 'mercadolivre',
  terabyteshop: 'terabyte',
  magalu: 'magazineluiza',
  magazinevoce: 'magazineluiza',
  pontofrio: 'ponto',
  shopeebrasil: 'shopee',
  amazonbrasil: 'amazon',
  aliexpressbrasil: 'aliexpress'
};

export const STORE_LABELS = {
  mercadolivre: 'Mercado Livre',
  amazon: 'Amazon',
  kabum: 'KaBuM!',
  pichau: 'Pichau',
  terabyte: 'Terabyte',
  magazineluiza: 'Magazine Luiza',
  casasbahia: 'Casas Bahia',
  aliexpress: 'AliExpress',
  shopee: 'Shopee',
  americanas: 'Americanas',
  submarino: 'Submarino',
  carrefour: 'Carrefour',
  fastshop: 'Fast Shop',
  ponto: 'Ponto',
  girafa: 'Girafa',
  techinn: 'Techinn',
  temu: 'Temu',
  shein: 'Shein'
};

/** "AliExpress - AliExpress-123" → "AliExpress", "mercadolivre.com.br" → "mercadolivre". */
export function storeBaseName(name) {
  let s = String(name || '').trim();
  const head = s.split(/\s+[-–—|]\s+/)[0];
  if (head && head.trim()) s = head.trim();
  s = s.replace(/^https?:\/\//i, '').replace(/^www\./i, '');
  s = s.replace(/\.(com|net|org|shop|store|online|site|app)(\.br)?$/i, '').replace(/\.br$/i, '');
  return s.trim();
}

export function storeKey(name) {
  const k = normCompact(storeBaseName(name)) || normCompact(name);
  if (!k) return 'loja';
  return STORE_KEY_ALIASES[k] || k;
}

export function storeLabel(key, variants) {
  if (STORE_LABELS[key]) return STORE_LABELS[key];
  let best = '';
  let bestScore = -1;
  Object.keys(variants || {}).forEach(function (v) {
    const score = (variants[v] || 0) + (/[A-Z]/.test(v) || /\s/.test(v) ? 1000 : 0);
    if (score > bestScore) { best = v; bestScore = score; }
  });
  return best || key;
}

export function storeMatchesRule(offer, rule) {
  const ok = storeKey(offer && offer.loja);
  const rk = rule && rule.nome ? storeKey(rule.nome) : '';
  if (rk && ok && rk === ok) return true;
  const dom = merchantDomain(offer && offer.link);
  const rDom = merchantDomain(rule && rule.dominio);
  if (rDom && dom && (dom === rDom || dom.endsWith('.' + rDom) || rDom.endsWith('.' + dom))) return true;
  return false;
}

/** PrecosLojas rows that apply to one search: its pins, plus hides scoped to it or to every search. */
export function storeRulesForSearch(rows, buscaId) {
  const id = String(buscaId || '');
  const pins = [];
  const hides = [];
  (rows || []).forEach(function (r) {
    const b = String((r && r.buscaId) || '');
    if (r.tipo === 'permitida' && b === id) pins.push(r);
    else if (r.tipo === 'bloqueada' && (b === '' || b === id)) hides.push(r);
  });
  return { pins, hides };
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

/** '' when the offer is shown, else 'loja' | 'palavras' | 'moeda' (first rule that removed it). */
export function offerRejectReason(offer, opts) {
  opts = opts || {};
  if (!offer) return 'palavras';
  if (isBlockedStore(offer, opts.globalBlocks, opts.searchAllows, opts.buscaId)) return 'loja';
  if (!titlePassesKeywordFilter(offer.titulo, opts.obrigatorias, opts.proibidas, opts.obrigatoriasOr)) return 'palavras';
  if (opts.hideNonBrl && detectCurrency(offer) !== 'BRL') return 'moeda';
  return '';
}

export function offerPassesFilters(offer, opts) {
  return !!offer && offerRejectReason(offer, opts) === '';
}

export function filterOffers(offers, opts) {
  return (offers || []).filter(function (o) { return offerPassesFilters(o, opts); });
}

export function filterBreakdown(offers, opts) {
  const out = { total: 0, shown: 0, loja: 0, palavras: 0, moeda: 0 };
  (offers || []).forEach(function (o) {
    out.total++;
    const r = offerRejectReason(o, opts);
    if (r) out[r]++;
    else out.shown++;
  });
  return out;
}

export function pickDisplayPrice(offer, kind) {
  if (!offer) return null;
  const av = offer.precoAvista != null ? Number(offer.precoAvista) : null;
  const real = offer.preco != null ? Number(offer.preco) : null;
  if (kind === 'avista' && av != null && !isNaN(av)) return av;
  if (real != null && !isNaN(real)) return real;
  return av;
}

export function sortByPrice(offers, kind) {
  return (offers || []).slice().sort(function (a, b) {
    return pickDisplayPrice(a, kind) - pickDisplayPrice(b, kind);
  });
}

export function offerKey(offer, day) {
  const link = String(offer.link || '').trim();
  if (link) return link;
  return [day, offer.loja, offer.titulo, offer.preco].join('|');
}

export function isGoogleLowTag(offer) {
  return /pre[cç]o\s+baixo|low\s+price/i.test(String((offer && offer.tag) || ''));
}

export function lowestPricePerDay(rawByDay, opts) {
  opts = opts || {};
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

export function mergeManualSeries(autoByDay, manualRows) {
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

function dayShift(day, n) {
  const d = new Date(day + 'T12:00:00Z');
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

export function daysBetween(a, b) {
  return Math.round((Date.parse(b + 'T12:00:00Z') - Date.parse(a + 'T12:00:00Z')) / 86400000);
}

export function seriesInRange(series, rangeDays, today) {
  today = today || new Date().toISOString().slice(0, 10);
  const keys = Object.keys(series || {}).sort();
  if (rangeDays === 'all' || rangeDays === Infinity) return keys.map(function (k) { return { day: k, point: series[k] }; });
  const n = Number(rangeDays) || 30;
  const cutStr = dayShift(today, -n + 1);
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

export const MIN_HISTORY_DAYS = 3;

/**
 * Is today's lowest price a real deal?
 * With 3+ days of your own history: compare to your 30-day median.
 * Before that: fall back to Google's "Preço normal" / "Preço baixo" on the cheapest offer.
 */
export function discountVerdict(input) {
  const today = input && input.todayPrice != null ? Number(input.todayPrice) : null;
  const dayCount = Number(input && input.dayCount) || 0;
  if (today == null || isNaN(today)) return { kind: 'sem', pct: null, basis: '', need: 0 };
  if (dayCount >= MIN_HISTORY_DAYS && input.median != null) {
    const pct = pctBelowMedian(today, input.median);
    return { kind: pct != null && pct >= 10 ? 'real' : 'nao', pct: pct, basis: 'historico', need: 0 };
  }
  const need = Math.max(0, MIN_HISTORY_DAYS - dayCount);
  const normal = Number(input && input.normalPrice);
  if (normal > 0) {
    const pct = ((normal - today) / normal) * 100;
    const low = pct >= 10 || !!(input && input.googleLow);
    return { kind: low ? 'google' : 'google-normal', pct: pct, basis: 'google', need: need, normal: normal };
  }
  if (input && input.googleLow) return { kind: 'google', pct: null, basis: 'google', need: need };
  return { kind: 'poucos', pct: null, basis: '', need: need };
}

export function allTimeLow(series) {
  let min = null;
  Object.keys(series || {}).forEach(function (d) {
    const v = series[d].val;
    if (min == null || v < min.val) min = { day: d, val: v, loja: series[d].loja || '' };
  });
  return min;
}

export function targetHit(todayPrice, target) {
  if (target == null || target === '' || isNaN(Number(target))) return false;
  return todayPrice != null && todayPrice <= Number(target);
}

export function todayLowestFromRaw(rawByDay, today, opts) {
  opts = opts || {};
  const day = rawByDay && rawByDay[today];
  if (!day) return null;
  const list = sortByPrice(filterOffers(day, opts), opts.priceKind);
  if (!list.length) return null;
  const o = list[0];
  return {
    offer: o,
    price: pickDisplayPrice(o, opts.priceKind),
    key: offerKey(o, today)
  };
}

/**
 * Group offers by store (aliases merged).
 * Returns [{ key, nome, count, min, minOffer }] sorted by cheapest first.
 */
export function storeGroups(offers, priceKind) {
  const map = {};
  (offers || []).forEach(function (o) {
    if (!o) return;
    const k = storeKey(o.loja);
    if (!map[k]) map[k] = { key: k, variants: {}, count: 0, min: null, minOffer: null };
    const g = map[k];
    const base = storeBaseName(o.loja);
    if (base) g.variants[base] = (g.variants[base] || 0) + 1;
    g.count++;
    const p = pickDisplayPrice(o, priceKind);
    if (p != null && !isNaN(p) && (g.min == null || p < g.min)) { g.min = p; g.minOffer = o; }
  });
  return Object.keys(map).map(function (k) {
    const g = map[k];
    return { key: g.key, nome: storeLabel(g.key, g.variants), count: g.count, min: g.min, minOffer: g.minOffer };
  }).sort(function (a, b) {
    if (a.min == null && b.min == null) return b.count - a.count;
    if (a.min == null) return 1;
    if (b.min == null) return -1;
    return a.min - b.min;
  });
}

/** Offers from the last `days` days (inclusive of today), flattened. */
export function offersInWindow(rawByDay, days, today) {
  today = today || new Date().toISOString().slice(0, 10);
  const cutStr = dayShift(today, -(Number(days) || 30));
  const out = [];
  Object.keys(rawByDay || {}).forEach(function (d) {
    if (d < cutStr || d > today) return;
    (rawByDay[d] || []).forEach(function (o) { out.push(o); });
  });
  return out;
}
