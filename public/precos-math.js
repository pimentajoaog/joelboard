/* Preços math — built from lib/precos-math.mjs. Do not edit by hand. */
var PrecosMath = (() => {
  var __defProp = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };
  var __copyProps = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") {
      for (let key of __getOwnPropNames(from))
        if (!__hasOwnProp.call(to, key) && key !== except)
          __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
    }
    return to;
  };
  var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

  // lib/precos-math.mjs
  var precos_math_exports = {};
  __export(precos_math_exports, {
    MIN_HISTORY_DAYS: () => MIN_HISTORY_DAYS,
    STORE_LABELS: () => STORE_LABELS,
    allTimeLow: () => allTimeLow,
    daysBetween: () => daysBetween,
    detectCurrency: () => detectCurrency,
    discountBadge: () => discountBadge,
    discountVerdict: () => discountVerdict,
    domainFromUrl: () => domainFromUrl,
    filterBreakdown: () => filterBreakdown,
    filterOffers: () => filterOffers,
    isBlockedStore: () => isBlockedStore,
    isGoogleLowTag: () => isGoogleLowTag,
    lowestPricePerDay: () => lowestPricePerDay,
    medianLastNDays: () => medianLastNDays,
    merchantDomain: () => merchantDomain,
    mergeManualSeries: () => mergeManualSeries,
    normCompact: () => normCompact,
    normStoreName: () => normStoreName,
    normText: () => normText,
    offerKey: () => offerKey,
    offerPassesFilters: () => offerPassesFilters,
    offerRejectReason: () => offerRejectReason,
    offersInWindow: () => offersInWindow,
    parseRequiredForbidden: () => parseRequiredForbidden,
    parseWordList: () => parseWordList,
    pctBelowMedian: () => pctBelowMedian,
    pickDisplayPrice: () => pickDisplayPrice,
    seriesInRange: () => seriesInRange,
    sortByPrice: () => sortByPrice,
    storeBaseName: () => storeBaseName,
    storeGroups: () => storeGroups,
    storeKey: () => storeKey,
    storeLabel: () => storeLabel,
    storeMatchesRule: () => storeMatchesRule,
    storeRulesForSearch: () => storeRulesForSearch,
    targetHit: () => targetHit,
    titlePassesKeywordFilter: () => titlePassesKeywordFilter,
    todayLowestFromRaw: () => todayLowestFromRaw,
    wordImpact: () => wordImpact
  });
  function normText(s) {
    return String(s == null ? "" : s).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, " ");
  }
  function normCompact(s) {
    return normText(s).replace(/\s+/g, "");
  }
  function parseWordList(s) {
    const seen = {};
    return String(s || "").split(/[,;|\n]/).map(function(w) {
      return w.trim();
    }).filter(function(w) {
      const k = normCompact(w);
      if (!k || seen[k]) return false;
      seen[k] = true;
      return true;
    });
  }
  function parseRequiredForbidden(obrigatorias, proibidas, obrigatoriasOr) {
    const req = parseWordList(obrigatorias).map(normCompact).filter(Boolean);
    const reqOr = parseWordList(obrigatoriasOr).map(normCompact).filter(Boolean);
    const ban = parseWordList(proibidas).map(function(w) {
      return normText(w).trim();
    }).filter(Boolean);
    return { req, reqOr, ban };
  }
  function titleHasRequired(t, tc, w) {
    return tc.indexOf(w) > -1 || t.indexOf(w.replace(/(.)/g, "$1 ").trim()) > -1;
  }
  function titleHasForbidden(t, w) {
    return (" " + t).indexOf(" " + w) > -1;
  }
  function titlePassesKeywordFilter(titulo, obrigatorias, proibidas) {
    const t = normText(titulo);
    const tc = normCompact(titulo);
    const { req, ban } = parseRequiredForbidden(obrigatorias, proibidas);
    for (let i = 0; i < req.length; i++) {
      if (req[i] && !titleHasRequired(t, tc, req[i])) return false;
    }
    for (let j = 0; j < ban.length; j++) {
      if (ban[j] && titleHasForbidden(t, ban[j])) return false;
    }
    return true;
  }
  function wordImpact(offers, word, kind) {
    const w = kind === "req" ? normCompact(word) : normText(word).trim();
    if (!w) return 0;
    let n = 0;
    (offers || []).forEach(function(o) {
      const t = normText(o && o.titulo);
      const tc = normCompact(o && o.titulo);
      const has = kind === "req" ? titleHasRequired(t, tc, w) : titleHasForbidden(t, w);
      if (kind === "req" ? !has : has) n++;
    });
    return n;
  }
  function normStoreName(name) {
    return normText(name).replace(/\s+/g, " ").trim();
  }
  function domainFromUrl(link) {
    if (!link) return "";
    try {
      const u = new URL(String(link));
      return u.hostname.replace(/^www\./i, "").toLowerCase();
    } catch (_) {
      const m = String(link).match(/([a-z0-9-]+\.[a-z]{2,}(?:\.[a-z]{2,})?)/i);
      return m ? m[1].toLowerCase().replace(/^www\./, "") : "";
    }
  }
  var AGGREGATOR_HOST = /(^|\.)(google\.[a-z.]+|googleadservices\.com|gstatic\.com|serpapi\.com)$/i;
  function merchantDomain(link) {
    const d = String(link || "").indexOf("/") > -1 ? domainFromUrl(link) : String(link || "").toLowerCase().replace(/^www\./, "");
    return d && !AGGREGATOR_HOST.test(d) ? d : "";
  }
  var STORE_KEY_ALIASES = {
    mercadolibre: "mercadolivre",
    terabyteshop: "terabyte",
    magalu: "magazineluiza",
    magazinevoce: "magazineluiza",
    pontofrio: "ponto",
    shopeebrasil: "shopee",
    amazonbrasil: "amazon",
    aliexpressbrasil: "aliexpress"
  };
  var STORE_LABELS = {
    mercadolivre: "Mercado Livre",
    amazon: "Amazon",
    kabum: "KaBuM!",
    pichau: "Pichau",
    terabyte: "Terabyte",
    magazineluiza: "Magazine Luiza",
    casasbahia: "Casas Bahia",
    aliexpress: "AliExpress",
    shopee: "Shopee",
    americanas: "Americanas",
    submarino: "Submarino",
    carrefour: "Carrefour",
    fastshop: "Fast Shop",
    ponto: "Ponto",
    girafa: "Girafa",
    techinn: "Techinn",
    temu: "Temu",
    shein: "Shein"
  };
  function storeBaseName(name) {
    let s = String(name || "").trim();
    const head = s.split(/\s+[-–—|]\s+/)[0];
    if (head && head.trim()) s = head.trim();
    s = s.replace(/^https?:\/\//i, "").replace(/^www\./i, "");
    s = s.replace(/\.(com|net|org|shop|store|online|site|app)(\.br)?$/i, "").replace(/\.br$/i, "");
    return s.trim();
  }
  function storeKey(name) {
    const k = normCompact(storeBaseName(name)) || normCompact(name);
    if (!k) return "loja";
    return STORE_KEY_ALIASES[k] || k;
  }
  function storeLabel(key, variants) {
    if (STORE_LABELS[key]) return STORE_LABELS[key];
    let best = "";
    let bestScore = -1;
    Object.keys(variants || {}).forEach(function(v) {
      const score = (variants[v] || 0) + (/[A-Z]/.test(v) || /\s/.test(v) ? 1e3 : 0);
      if (score > bestScore) {
        best = v;
        bestScore = score;
      }
    });
    return best || key;
  }
  function storeMatchesRule(offer, rule) {
    const ok = storeKey(offer && offer.loja);
    const rk = rule && rule.nome ? storeKey(rule.nome) : "";
    if (rk && ok && rk === ok) return true;
    const dom = merchantDomain(offer && offer.link);
    const rDom = merchantDomain(rule && rule.dominio);
    if (rDom && dom && (dom === rDom || dom.endsWith("." + rDom) || rDom.endsWith("." + dom))) return true;
    return false;
  }
  function storeRulesForSearch(rows, buscaId) {
    const id = String(buscaId || "");
    const pins = [];
    const hides = [];
    (rows || []).forEach(function(r) {
      const b = String(r && r.buscaId || "");
      if (r.tipo === "permitida" && b === id) pins.push(r);
      else if (r.tipo === "bloqueada" && (b === "" || b === id)) hides.push(r);
    });
    return { pins, hides };
  }
  function isBlockedStore(offer, globalBlocks, searchAllows, searchId) {
    const blocks = globalBlocks || [];
    for (let i = 0; i < blocks.length; i++) {
      if (storeMatchesRule(offer, blocks[i])) return true;
    }
    const allows = (searchAllows || []).filter(function(r) {
      return !searchId || String(r.buscaId || "") === String(searchId);
    });
    if (!allows.length) return false;
    for (let j = 0; j < allows.length; j++) {
      if (storeMatchesRule(offer, allows[j])) return false;
    }
    return true;
  }
  function detectCurrency(offer) {
    const txt = String(offer && offer.precoTexto || "");
    if (/R\s*\$/i.test(txt) || /,\d{2}\s*$/.test(txt)) return "BRL";
    if (/US\s*\$|USD|\$\s*\d/.test(txt) && !/R\s*\$/i.test(txt)) return "USD";
    if (offer && offer.extra && offer.extra.moeda) return String(offer.extra.moeda).toUpperCase();
    const p = Number(offer && offer.preco);
    if (p > 0 && p < 500 && !txt) return "USD";
    return "BRL";
  }
  function offerRejectReason(offer, opts) {
    opts = opts || {};
    if (!offer) return "palavras";
    if (isBlockedStore(offer, opts.globalBlocks, opts.searchAllows, opts.buscaId)) return "loja";
    if (!titlePassesKeywordFilter(offer.titulo, opts.obrigatorias, opts.proibidas)) return "palavras";
    if (opts.hideNonBrl && detectCurrency(offer) !== "BRL") return "moeda";
    return "";
  }
  function offerPassesFilters(offer, opts) {
    return !!offer && offerRejectReason(offer, opts) === "";
  }
  function filterOffers(offers, opts) {
    return (offers || []).filter(function(o) {
      return offerPassesFilters(o, opts);
    });
  }
  function filterBreakdown(offers, opts) {
    const out = { total: 0, shown: 0, loja: 0, palavras: 0, moeda: 0 };
    (offers || []).forEach(function(o) {
      out.total++;
      const r = offerRejectReason(o, opts);
      if (r) out[r]++;
      else out.shown++;
    });
    return out;
  }
  function pickDisplayPrice(offer, kind) {
    if (!offer) return null;
    const av = offer.precoAvista != null ? Number(offer.precoAvista) : null;
    const real = offer.preco != null ? Number(offer.preco) : null;
    if (kind === "avista" && av != null && !isNaN(av)) return av;
    if (real != null && !isNaN(real)) return real;
    return av;
  }
  function sortByPrice(offers, kind) {
    return (offers || []).slice().sort(function(a, b) {
      return pickDisplayPrice(a, kind) - pickDisplayPrice(b, kind);
    });
  }
  function offerKey(offer, day) {
    const link = String(offer.link || "").trim();
    if (link) return link;
    return [day, offer.loja, offer.titulo, offer.preco].join("|");
  }
  function isGoogleLowTag(offer) {
    return /pre[cç]o\s+baixo|low\s+price/i.test(String(offer && offer.tag || ""));
  }
  function lowestPricePerDay(rawByDay, opts) {
    opts = opts || {};
    const out = {};
    Object.keys(rawByDay || {}).sort().forEach(function(day) {
      const list = filterOffers(rawByDay[day], opts);
      let min = null;
      list.forEach(function(o) {
        const p = pickDisplayPrice(o, opts.priceKind || "real");
        if (p == null || isNaN(p)) return;
        if (min == null || p < min.val) min = { val: p, origin: "auto", loja: o.loja, titulo: o.titulo };
      });
      if (min != null) out[day] = min;
    });
    return out;
  }
  function mergeManualSeries(autoByDay, manualRows) {
    const merged = Object.assign({}, autoByDay || {});
    (manualRows || []).forEach(function(m) {
      const day = String(m.data || "").slice(0, 10);
      const p = Number(m.valor);
      if (!day || isNaN(p)) return;
      const cur = merged[day];
      if (!cur || p < cur.val) {
        merged[day] = { val: p, origin: "manual", loja: m.loja || "", titulo: m.obs || "" };
      } else if (cur && p === cur.val && cur.origin === "auto") {
        merged[day] = Object.assign({}, cur, { origin: "both" });
      }
    });
    return merged;
  }
  function dayShift(day, n) {
    const d = /* @__PURE__ */ new Date(day + "T12:00:00Z");
    d.setUTCDate(d.getUTCDate() + n);
    return d.toISOString().slice(0, 10);
  }
  function daysBetween(a, b) {
    return Math.round((Date.parse(b + "T12:00:00Z") - Date.parse(a + "T12:00:00Z")) / 864e5);
  }
  function seriesInRange(series, rangeDays, today) {
    today = today || (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
    const keys = Object.keys(series || {}).sort();
    if (rangeDays === "all" || rangeDays === Infinity) return keys.map(function(k) {
      return { day: k, point: series[k] };
    });
    const n = Number(rangeDays) || 30;
    const cutStr = dayShift(today, -n + 1);
    return keys.filter(function(k) {
      return k >= cutStr && k <= today;
    }).map(function(k) {
      return { day: k, point: series[k] };
    });
  }
  function medianLastNDays(series, n, today) {
    const pts = seriesInRange(series, n, today).map(function(x) {
      return x.point.val;
    });
    if (!pts.length) return null;
    const sorted = pts.slice().sort(function(a, b) {
      return a - b;
    });
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
  }
  function pctBelowMedian(todayPrice, median) {
    if (todayPrice == null || median == null || median <= 0) return null;
    return (median - todayPrice) / median * 100;
  }
  function discountBadge(todayPrice, median, dayCount) {
    if (dayCount < 3) return "poucos";
    if (todayPrice == null || median == null) return "poucos";
    const pct = pctBelowMedian(todayPrice, median);
    if (pct != null && pct >= 10) return "real";
    return "nao";
  }
  var MIN_HISTORY_DAYS = 3;
  function discountVerdict(input) {
    const today = input && input.todayPrice != null ? Number(input.todayPrice) : null;
    const dayCount = Number(input && input.dayCount) || 0;
    if (today == null || isNaN(today)) return { kind: "sem", pct: null, basis: "", need: 0 };
    if (dayCount >= MIN_HISTORY_DAYS && input.median != null) {
      const pct = pctBelowMedian(today, input.median);
      return { kind: pct != null && pct >= 10 ? "real" : "nao", pct, basis: "historico", need: 0 };
    }
    const need = Math.max(0, MIN_HISTORY_DAYS - dayCount);
    const normal = Number(input && input.normalPrice);
    if (normal > 0) {
      const pct = (normal - today) / normal * 100;
      const low = pct >= 10 || !!(input && input.googleLow);
      return { kind: low ? "google" : "google-normal", pct, basis: "google", need, normal };
    }
    if (input && input.googleLow) return { kind: "google", pct: null, basis: "google", need };
    return { kind: "poucos", pct: null, basis: "", need };
  }
  function allTimeLow(series) {
    let min = null;
    Object.keys(series || {}).forEach(function(d) {
      const v = series[d].val;
      if (min == null || v < min.val) min = { day: d, val: v, loja: series[d].loja || "" };
    });
    return min;
  }
  function targetHit(todayPrice, target) {
    if (target == null || target === "" || isNaN(Number(target))) return false;
    return todayPrice != null && todayPrice <= Number(target);
  }
  function todayLowestFromRaw(rawByDay, today, opts) {
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
  function storeGroups(offers, priceKind) {
    const map = {};
    (offers || []).forEach(function(o) {
      if (!o) return;
      const k = storeKey(o.loja);
      if (!map[k]) map[k] = { key: k, variants: {}, count: 0, min: null, minOffer: null };
      const g = map[k];
      const base = storeBaseName(o.loja);
      if (base) g.variants[base] = (g.variants[base] || 0) + 1;
      g.count++;
      const p = pickDisplayPrice(o, priceKind);
      if (p != null && !isNaN(p) && (g.min == null || p < g.min)) {
        g.min = p;
        g.minOffer = o;
      }
    });
    return Object.keys(map).map(function(k) {
      const g = map[k];
      return { key: g.key, nome: storeLabel(g.key, g.variants), count: g.count, min: g.min, minOffer: g.minOffer };
    }).sort(function(a, b) {
      if (a.min == null && b.min == null) return b.count - a.count;
      if (a.min == null) return 1;
      if (b.min == null) return -1;
      return a.min - b.min;
    });
  }
  function offersInWindow(rawByDay, days, today) {
    today = today || (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
    const cutStr = dayShift(today, -(Number(days) || 30));
    const out = [];
    Object.keys(rawByDay || {}).forEach(function(d) {
      if (d < cutStr || d > today) return;
      (rawByDay[d] || []).forEach(function(o) {
        out.push(o);
      });
    });
    return out;
  }
  return __toCommonJS(precos_math_exports);
})();
