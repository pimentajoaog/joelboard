/* Finance — Preços (price watch). Loaded after finance.js. © Joelboard */
var PRECOS_OPEN_ID = null;
var PRECOS_CHART_RANGE = null;
var PRECOS_FETCHING = false;
var PRECOS_SHOW_ALL = false;
var PRECOS_VIEW_OFFERS = [];
var PRECOS_DRAFT = null;
var PRECOS_CARD_OPEN = {};
var PRECOS_WIDGET_OPEN = false;
var PRECOS_BATCH = null;
var PRECOS_OFFERS_PREVIEW = 8;
var PRECOS_BARS_MAX = 8;
var PRECOS_DROP_MAX = 5;
/* Sheets caps a cell at 50k characters. */
var PRECOS_SHEET_CHARS = 45000;

function precosUid(){ return 'p' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }

var PK = {
  emptyTitle: 'Nenhuma busca ainda',
  emptyHint: 'Adicione um produto e busque o preço de hoje. Busque de novo nos próximos dias para montar o histórico.',
  newSearch: '+ Nova busca',
  fetchToday: 'Buscar preços de hoje',
  fetchAgain: 'Atualizar preços de hoje',
  fetching: 'Buscando…',
  lastNever: 'Ainda sem buscas — cada busca guarda os preços do dia.',
  todayLow: 'Menor preço hoje',
  noToday: 'Sem preços de hoje',
  noTodayHint: 'Toque em Buscar preços de hoje para somar mais um dia ao histórico.',
  allFiltered: 'Nenhuma oferta passou nos seus filtros',
  adjustFilters: 'Ajustar filtros',
  clearFilters: 'Limpar filtros',
  median30: 'Mediana 30 dias',
  allTimeLow: 'Menor já visto',
  target: 'Seu alvo',
  setTarget: 'Definir',
  targetHit: 'No preço-alvo',
  offersToday: 'Ofertas de hoje',
  filters: 'Filtros',
  seeOffer: 'Ver oferta',
  markConferida: 'Marcar conferida',
  conferida: '✓ Conferida',
  hideStore: 'Ocultar loja',
  hiddenToast: ' oculta nesta busca',
  showMore: 'Ver todas as ofertas',
  showLess: 'Mostrar menos',
  byStore: 'Hoje por loja',
  cheapest: 'mais barata',
  chartEmpty: 'O gráfico aparece depois da primeira busca.',
  chartEmptyRange: 'Sem preços neste período.',
  chartOneDay: '1 dia de histórico — busque de novo amanhã para formar a linha.',
  range30: '30 dias',
  range90: '90 dias',
  rangeAll: 'Tudo',
  vsMedian: 'vs sua mediana',
  googleLow: 'Google: preço baixo',
  normalPrice: 'normal ',
  pin: '★ Só estas',
  hide: 'Ocultar',
  allSearches: 'todas as buscas',
  outOfPins: 'fora das lojas marcadas',
  noStores: 'Busque preços primeiro para ver as lojas.',
  storesToggle: 'Ver preço por loja',
  dropPinned: 'Lojas marcadas',
  dropTop: 'Mais baratas por loja',
  dropEmpty: 'Busque preços para ver cada loja.',
  dropPick: 'Escolher lojas',
  noOfferToday: 'sem oferta',
  firstSearch: '1ª busca',
  noSearch: 'sem busca ainda',
  noChange: 'sem mudança',
  widgetTitle: '💰 Preços',
  widgetOpen: 'Abrir resumo de preços',
  widgetFavHint: 'Toque em ☆ para fixar um produto aqui.',
  favorite: 'Favorito',
  fetchAll: 'Buscar preços de hoje',
  fetchAllAgain: 'Buscar todas de novo',
  saveFilters: 'Salvar filtros',
  saving: 'Salvando…',
  savedFilters: '✓ Filtros salvos',
  confirmArchive: 'Arquivar esta busca?',
  confirmArchiveMsg: 'Os preços guardados e filtros ficam na planilha, mas a busca some da lista.'
};

function precosFmt(n) {
  if (n == null || isNaN(n)) return '—';
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(n);
}

function precosFmtShort(n) {
  if (n == null || isNaN(n)) return '';
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', notation: 'compact', maximumFractionDigits: 1 }).format(n);
}

function precosTodayKey() { return todayStr(); }

function precosDayLabel(day) {
  var today = precosTodayKey();
  if (day === today) return 'hoje';
  if (PrecosMath.daysBetween(day, today) === 1) return 'ontem';
  return String(day).slice(8, 10) + '/' + String(day).slice(5, 7);
}

function precosOnDay(day) {
  var l = precosDayLabel(day);
  return l.indexOf('/') > -1 ? 'em ' + l : l;
}

function precosPct(p) { return Math.round(Math.abs(Number(p) || 0)); }

function precosSafeLink(link) {
  return /^https?:\/\//i.test(String(link || '')) ? String(link) : '';
}

function precosPrefs() {
  var s = (DATA && DATA.settings) || {};
  return {
    priceKind: s.precos_price_kind === 'avista' ? 'avista' : 'real',
    showBoth: s.precos_show_both === true || s.precos_show_both === 'true' || s.precos_show_both === 1,
    chartRange: s.precos_chart_range || '30',
    hideNonBrl: s.precos_hide_non_brl !== false && s.precos_hide_non_brl !== 'false' && s.precos_hide_non_brl !== 0
  };
}

function precosSavePref(key, val) {
  if (!DATA.settings) DATA.settings = {};
  DATA.settings[key] = val;
  jbSaveSetting(key, val);
}

function precosActiveBuscas() {
  return ((DATA && DATA.precosBuscas) || []).filter(function (b) { return !b.arquivada; });
}

function precosBusca(id) {
  return precosActiveBuscas().find(function (b) { return String(b.id) === String(id); }) || null;
}

function precosRules(buscaId) {
  return PrecosMath.storeRulesForSearch((DATA && DATA.precosLojas) || [], buscaId);
}

function precosRuleKey(r) { return PrecosMath.storeKey(r.nome || r.dominio || ''); }

function precosStoreName(offer) {
  var variants = {};
  variants[PrecosMath.storeBaseName(offer && offer.loja)] = 1;
  return PrecosMath.storeLabel(PrecosMath.storeKey(offer && offer.loja), variants);
}

function precosOptsFromParts(buscaId, parts) {
  return {
    obrigatorias: parts.obrigatorias || '',
    proibidas: parts.proibidas || '',
    globalBlocks: parts.hides || [],
    searchAllows: (parts.pins || []).map(function (p) { return { buscaId: buscaId, nome: p.nome, dominio: p.dominio || '' }; }),
    buscaId: buscaId,
    hideNonBrl: parts.hideNonBrl,
    priceKind: parts.priceKind
  };
}

function precosFilterOpts(busca) {
  var rules = precosRules(busca.id);
  var p = precosPrefs();
  return precosOptsFromParts(busca.id, {
    pins: rules.pins, hides: rules.hides,
    obrigatorias: busca.obrigatorias, proibidas: busca.proibidas,
    hideNonBrl: p.hideNonBrl, priceKind: p.priceKind
  });
}

function precosActiveFilterCount(busca) {
  var rules = precosRules(busca.id);
  var keys = {};
  rules.pins.concat(rules.hides).forEach(function (r) { keys[r.tipo + ':' + precosRuleKey(r)] = 1; });
  return Object.keys(keys).length
    + PrecosMath.parseWordList(busca.obrigatorias).length
    + PrecosMath.parseWordList(busca.proibidas).length;
}

function precosRawFromSheet(buscaId) {
  var raw = {};
  var id = String(buscaId);
  ((DATA && DATA.precosCapturas) || []).forEach(function (c) {
    if (String(c.buscaId) !== id) return;
    var day = String(c.data || '').slice(0, 10);
    if (!day) return;
    try {
      var offers = JSON.parse(c.json || '[]');
      if (offers && offers.length) raw[day] = offers;
    } catch (_) {}
  });
  return raw;
}

function precosLastCapture(buscaId) {
  var last = null;
  ((DATA && DATA.precosCapturas) || []).forEach(function (c) {
    if (String(c.buscaId) !== String(buscaId)) return;
    if (!last || String(c.data) > String(last.data)) last = c;
  });
  if (!last) return null;
  var count = 0;
  try { count = (JSON.parse(last.json || '[]') || []).length; } catch (_) {}
  return { data: String(last.data).slice(0, 10), criado: Number(last.criado) || 0, count: count };
}

function precosPackForSheet(offers) {
  var list = PrecosMath.sortByPrice(offers || [], 'real').map(function (o) {
    var c = { loja: o.loja, titulo: o.titulo, preco: o.preco, precoTexto: o.precoTexto, precoAvista: o.precoAvista, link: o.link || '' };
    if (o.precoNormal) c.precoNormal = o.precoNormal;
    if (o.tag) c.tag = o.tag;
    if (o.extra) c.extra = o.extra;
    return c;
  });
  var json = JSON.stringify(list);
  if (json.length > PRECOS_SHEET_CHARS) {
    list.forEach(function (c) { delete c.extra; });
    json = JSON.stringify(list);
  }
  while (json.length > PRECOS_SHEET_CHARS && list.length > 1) {
    list.pop();
    json = JSON.stringify(list);
  }
  return { json: json, count: list.length };
}

function precosManualFor(buscaId) {
  return ((DATA && DATA.precosManual) || []).filter(function (m) { return String(m.buscaId) === String(buscaId); });
}

function precosConferidaMap(buscaId) {
  var m = {};
  ((DATA && DATA.precosConferidas) || []).forEach(function (c) {
    if (String(c.buscaId) === String(buscaId)) m[c.chave] = c;
  });
  return m;
}

function precosBuildSeries(busca, raw, opts) {
  opts = opts || precosFilterOpts(busca);
  var auto = PrecosMath.lowestPricePerDay(raw, opts);
  return PrecosMath.mergeManualSeries(auto, precosManualFor(busca.id));
}

/** Everything the card and the detail view show for one search. */
function precosSnapshot(busca) {
  var today = precosTodayKey();
  var raw = precosRawFromSheet(busca.id);
  var opts = precosFilterOpts(busca);
  var dayOffers = raw[today] || [];
  var shown = PrecosMath.sortByPrice(PrecosMath.filterOffers(dayOffers, opts), opts.priceKind);
  var low = shown[0] || null;
  var lowPrice = low ? PrecosMath.pickDisplayPrice(low, opts.priceKind) : null;
  var series = precosBuildSeries(busca, raw, opts);
  var dayCount = PrecosMath.seriesInRange(series, 30, today).length;
  var median = dayCount >= 2 ? PrecosMath.medianLastNDays(series, 30, today) : null;
  var verdict = PrecosMath.discountVerdict({
    todayPrice: lowPrice,
    median: median,
    dayCount: dayCount,
    normalPrice: low && low.precoNormal,
    googleLow: low && PrecosMath.isGoogleLowTag(low)
  });
  return {
    today: today, raw: raw, opts: opts, dayOffers: dayOffers, shown: shown,
    low: low, lowPrice: lowPrice, series: series, dayCount: dayCount, median: median,
    verdict: verdict, last: precosLastCapture(busca.id),
    hit: lowPrice != null && PrecosMath.targetHit(lowPrice, busca.teto)
  };
}

function precosVerdictView(v, dayCount) {
  if (!v || v.kind === 'sem') return null;
  var min = PrecosMath.MIN_HISTORY_DAYS;
  var need = v.need ? 'Seu histórico: ' + dayCount + ' de ' + min + ' dias para comparar com seus próprios preços.' : '';
  if (v.kind === 'real') return { cls: 'k-real', title: '✓ Desconto real', sub: precosPct(v.pct) + '% abaixo da sua mediana de 30 dias.' };
  if (v.kind === 'nao') {
    if (v.pct < 0) return { cls: 'k-acima', title: 'Acima do normal', sub: precosPct(v.pct) + '% acima da sua mediana de 30 dias.' };
    return { cls: 'k-nao', title: 'Preço comum', sub: (v.pct >= 1 ? 'Só ' + precosPct(v.pct) + '% abaixo da' : 'Igual à') + ' sua mediana de 30 dias.' };
  }
  if (v.kind === 'google') {
    var g = v.normal ? 'Preço normal ' + precosFmt(v.normal) + (v.pct > 0 ? ' — ' + precosPct(v.pct) + '% abaixo. ' : '. ') : '';
    return { cls: 'k-google', title: '✓ Google marca preço baixo', sub: g + need };
  }
  if (v.kind === 'google-normal') {
    if (v.pct < -2) return { cls: 'k-acima', title: 'Acima do preço normal', sub: 'Google indica ' + precosFmt(v.normal) + ' como normal. ' + need };
    return { cls: 'k-nao', title: 'Perto do preço normal', sub: 'Google indica ' + precosFmt(v.normal) + ' como normal. ' + need };
  }
  return { cls: 'k-poucos', title: 'Ainda sem comparação', sub: 'Busque de novo em mais ' + v.need + (v.need === 1 ? ' dia' : ' dias') + ' para saber se é desconto real.' };
}

function precosVerdictShort(v) {
  if (!v) return null;
  if (v.kind === 'real') return { cls: 'good', txt: '−' + precosPct(v.pct) + '% ' + PK.vsMedian };
  if (v.kind === 'nao') return v.pct < 0 ? { cls: 'bad', txt: '+' + precosPct(v.pct) + '% ' + PK.vsMedian } : { cls: '', txt: 'preço comum' };
  if (v.kind === 'google') return { cls: 'good', txt: PK.googleLow };
  return null;
}

function renderPrecos() {
  renderPrecosList();
  renderPrecosWidget();
}

var PRECOS_CHEVRON = '<svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true"><path d="M6 3.5 10.5 8 6 12.5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
var PRECOS_TAG_ICON = '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.59 13.41 13.42 20.58a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82Z"/><circle cx="7.5" cy="7.5" r="1.6" fill="currentColor" stroke="none"/></svg>';

function renderPrecosList() {
  var list = document.getElementById('precosList');
  if (!list) return;
  var buscas = precosActiveBuscas();
  if (!buscas.length) {
    list.innerHTML = JB.emptyState({ icon: '💰', title: PK.emptyTitle, hint: PK.emptyHint, action: PK.newSearch, onclick: 'openPrecosNew()' });
    return;
  }
  list.innerHTML = buscas.map(function (b) {
    var s = precosSnapshot(b);
    var open = !!PRECOS_CARD_OPEN[b.id];
    var idArg = '\'' + escAttr(b.id) + '\'';
    var price = s.lowPrice;
    var store = s.low ? precosStoreName(s.low) : '';
    var when = '';
    if (price == null && s.last) {
      var pts = PrecosMath.seriesInRange(s.series, 'all', s.today);
      var lastPt = pts[pts.length - 1];
      if (lastPt) { price = lastPt.point.val; store = lastPt.point.loja ? precosStoreName({ loja: lastPt.point.loja }) : ''; when = lastPt.day; }
    }
    var meta = [];
    var short = precosVerdictShort(s.verdict);
    if (short) meta.push('<span class="' + short.cls + '">' + esc(short.txt) + '</span>');
    if (!s.last) meta.push('<span>Toque para buscar o primeiro preço</span>');
    else if (s.last.data !== s.today) meta.push('<span>Última busca ' + esc(precosDayLabel(s.last.data)) + ' · toque para atualizar</span>');
    else meta.push('<span>Atualizado hoje</span>');
    return '<div class="precos-card' + (open ? ' open' : '') + (s.hit ? ' target-hit' : '') + '">'
      + '<button type="button" class="precos-card-arrow" aria-expanded="' + open + '" aria-label="' + escAttr(PK.storesToggle) + '" title="' + escAttr(PK.storesToggle) + '" onclick="precosToggleCard(' + idArg + ')">' + PRECOS_CHEVRON + '</button>'
      + '<button type="button" class="precos-card-main" onclick="openPrecosSearch(' + idArg + ')">'
      + '<div class="precos-card-top"><span class="precos-term">' + esc(b.termo) + '</span>'
      + (s.hit ? '<span class="precos-badge">' + esc(PK.targetHit) + '</span>' : '') + '</div>'
      + '<div class="precos-card-mid">' + (price != null ? precosFmt(price) : '—')
      + (store ? '<span class="precos-card-store">' + (when ? esc(precosDayLabel(when)) + ' · ' : '') + 'na ' + esc(store) + '</span>' : '') + '</div>'
      + '<div class="precos-card-meta">' + meta.join('') + '</div></button>'
      + (open ? '<div class="precos-card-drop">' + precosStoreDropHtml(b, s) + '</div>' : '')
      + '</div>';
  }).join('');
}

function precosToggleCard(id) {
  PRECOS_CARD_OPEN[id] = !PRECOS_CARD_OPEN[id];
  renderPrecosList();
}

function precosLatestDay(raw, today) {
  if (raw[today]) return today;
  var days = Object.keys(raw).sort();
  return days[days.length - 1] || '';
}

/** Lowest price per store on the latest searched day: the pinned stores, or the cheapest few. */
function precosStoreDrop(busca, s) {
  var day = precosLatestDay(s.raw, s.today);
  if (!day) return { mode: 'empty', day: '', rows: [], more: 0 };
  var offers = day === s.today ? s.shown : PrecosMath.filterOffers(s.raw[day], s.opts);
  var groups = PrecosMath.storeGroups(offers, s.opts.priceKind).filter(function (g) { return g.min != null; });
  var pinKeys = [];
  var pinNames = {};
  precosRules(busca.id).pins.forEach(function (r) {
    var k = precosRuleKey(r);
    if (pinKeys.indexOf(k) < 0) { pinKeys.push(k); pinNames[k] = PrecosMath.storeLabel(k, precosVariant(r.nome || r.dominio)); }
  });
  var toRow = function (g) { return { key: g.key, nome: g.nome, price: g.min, link: precosSafeLink(g.minOffer && g.minOffer.link) }; };
  if (!pinKeys.length) {
    return { mode: 'top', day: day, rows: groups.slice(0, PRECOS_DROP_MAX).map(toRow), more: Math.max(0, groups.length - PRECOS_DROP_MAX) };
  }
  var byKey = {};
  groups.forEach(function (g) { byKey[g.key] = g; });
  var found = [];
  var missing = [];
  pinKeys.forEach(function (k) {
    if (byKey[k]) found.push(toRow(byKey[k]));
    else missing.push({ key: k, nome: pinNames[k], price: null, past: precosLastSeenStore(s.raw, k, s.opts, day) });
  });
  found.sort(function (a, b) { return a.price - b.price; });
  return { mode: 'pins', day: day, rows: found.concat(missing), more: 0 };
}

function precosLastSeenStore(raw, key, opts, beforeDay) {
  var days = Object.keys(raw).filter(function (d) { return d < beforeDay; }).sort().reverse();
  for (var i = 0; i < days.length; i++) {
    var g = PrecosMath.storeGroups(PrecosMath.filterOffers(raw[days[i]], opts), opts.priceKind)
      .find(function (x) { return x.key === key && x.min != null; });
    if (g) return { day: days[i], price: g.min };
  }
  return null;
}

function precosStoreDropHtml(busca, s) {
  var drop = precosStoreDrop(busca, s);
  if (drop.mode === 'empty') return '<div class="precos-drop-hint">' + esc(PK.dropEmpty) + '</div>';
  var min = drop.rows.length && drop.rows[0].price != null ? drop.rows[0].price : null;
  var head = '<div class="precos-drop-head">' + esc(drop.mode === 'pins' ? PK.dropPinned : PK.dropTop) + ' · ' + esc(precosOnDay(drop.day)) + '</div>';
  var rows = drop.rows.map(function (r, i) {
    var sub;
    if (r.price == null) {
      sub = PK.noOfferToday + ' ' + precosOnDay(drop.day) + (r.past ? ' · última ' + precosFmt(r.past.price) + ' ' + precosOnDay(r.past.day) : '');
    } else {
      sub = i === 0 ? PK.cheapest : '+' + precosPct((r.price - min) / min * 100) + '% que a mais barata';
    }
    var inner = '<span class="precos-drop-name">' + esc(r.nome) + (r.link ? ' <span class="precos-drop-go">↗</span>' : '') + '</span>'
      + '<span class="precos-drop-val">' + (r.price != null ? esc(precosFmt(r.price)) : '—') + '</span>'
      + '<span class="precos-drop-sub">' + esc(sub) + '</span>';
    var cls = 'precos-drop-row' + (i === 0 && r.price != null ? ' best' : '') + (r.price == null ? ' missing' : '');
    return r.link
      ? '<a class="' + cls + '" href="' + escAttr(r.link) + '" target="_blank" rel="noopener">' + inner + '</a>'
      : '<div class="' + cls + '">' + inner + '</div>';
  }).join('');
  var foot = '';
  if (drop.mode === 'top') {
    foot = '<div class="precos-drop-foot">' + (drop.more ? '<span>+ ' + drop.more + ' lojas mais caras</span>' : '<span></span>')
      + '<button type="button" class="sec-action" onclick="precosPickStores(\'' + escAttr(busca.id) + '\')">★ ' + esc(PK.dropPick) + '</button></div>';
  }
  return head + rows + foot;
}

function precosPickStores(id) {
  openPrecosSearch(id);
  openPrecosFilters();
}

/* ---------- Visão geral widget ---------- */

function precosFavIds() {
  var raw = String((DATA && DATA.settings && DATA.settings.precos_favoritas) || '');
  return raw.split(',').map(function (x) { return x.trim(); }).filter(Boolean);
}

function precosToggleFav(id) {
  var ids = precosFavIds();
  var i = ids.indexOf(String(id));
  if (i > -1) ids.splice(i, 1);
  else ids.push(String(id));
  precosSavePref('precos_favoritas', ids.join(','));
  renderPrecosWidget();
}

/** Latest lowest price vs the search before it. */
function precosChange(series, today) {
  var pts = PrecosMath.seriesInRange(series, 'all', today);
  var last = pts[pts.length - 1] || null;
  var prev = pts[pts.length - 2] || null;
  if (!last) return { kind: 'none', last: null, prev: null };
  if (!prev) return { kind: 'first', last: last, prev: null };
  var delta = last.point.val - prev.point.val;
  var pct = prev.point.val ? delta / prev.point.val * 100 : 0;
  return { kind: Math.abs(delta) < 0.005 ? 'same' : delta < 0 ? 'down' : 'up', delta: delta, pct: pct, last: last, prev: prev };
}

function precosPctTxt(p) {
  var a = Math.abs(p);
  return (a > 0 && a < 1 ? a.toFixed(1).replace('.', ',') : String(Math.round(a))) + '%';
}

function precosChangeHtml(ch, short) {
  if (ch.kind === 'none') return short ? '' : '<span class="precos-chg">' + esc(PK.noSearch) + '</span>';
  if (ch.kind === 'first') return short ? '' : '<span class="precos-chg">' + esc(PK.firstSearch) + '</span>';
  if (ch.kind === 'same') return '<span class="precos-chg">' + esc(short ? '=' : PK.noChange + ' vs ' + precosDayLabel(ch.prev.day)) + '</span>';
  var arrow = ch.kind === 'down' ? '▼' : '▲';
  var txt = short
    ? arrow + precosPctTxt(ch.pct)
    : arrow + ' ' + precosFmt(Math.abs(ch.delta)) + ' · ' + precosPctTxt(ch.pct) + ' vs ' + precosDayLabel(ch.prev.day);
  return '<span class="precos-chg ' + ch.kind + '">' + esc(txt) + '</span>';
}

function precosWidgetItems() {
  var favs = precosFavIds();
  return precosActiveBuscas().map(function (b) {
    var s = precosSnapshot(b);
    return { busca: b, snap: s, change: precosChange(s.series, s.today), fav: favs.indexOf(String(b.id)) > -1 };
  });
}

/* Gutter fits a 46px icon plus a 12px gap only once the centered 1160px column leaves ≥76px on the left: (1312 − 1160) / 2. */
var PRECOS_WIDGET_GUTTER = 1312;

function precosWidgetSlot() {
  if (typeof window === 'undefined' || !window.matchMedia) return 'inline';
  if (window.matchMedia('(max-width: 540px)').matches) return 'month';
  if (window.matchMedia('(min-width: ' + PRECOS_WIDGET_GUTTER + 'px)').matches) return 'gutter';
  return 'inline';
}

function precosWidgetMount() {
  var el = document.getElementById('precosWidget');
  if (!el || !document.querySelector) return;
  var slot = precosWidgetSlot();
  el.classList.remove('pw-gutter', 'pw-inline', 'pw-month');
  el.classList.add('pw-' + slot);
  var parent = slot === 'month' ? document.querySelector('.month-nav')
    : slot === 'inline' ? document.querySelector('.header-right')
    : document.querySelector('.header');
  if (!parent || el.parentNode === parent) return;
  if (slot === 'inline') parent.insertBefore(el, parent.firstChild);
  else if (slot === 'gutter') parent.insertBefore(el, parent.firstChild);
  else parent.appendChild(el);
}

function precosWidgetHot(item) {
  return !!(item.snap && (item.snap.hit || (item.snap.verdict && item.snap.verdict.kind === 'google')));
}

function precosWidgetLabel(items) {
  var hot = items.filter(precosWidgetHot);
  if (items.length === 1) {
    var bits = ['Preços: ' + items[0].busca.termo];
    if (items[0].snap && items[0].snap.hit) bits.push('no preço-alvo');
    if (items[0].snap && items[0].snap.verdict && items[0].snap.verdict.kind === 'google') bits.push('preço baixo');
    return bits.join(', ');
  }
  if (hot.length === 1) return 'Preços: ' + hot[0].busca.termo + (hot[0].snap.hit ? ', no preço-alvo' : ', preço baixo');
  if (hot.length) return 'Preços: ' + hot.length + ' produtos em preço baixo ou no alvo';
  return 'Preços: ' + items.length + (items.length === 1 ? ' produto' : ' produtos');
}

function renderPrecosWidget() {
  var el = document.getElementById('precosWidget');
  if (!el) return;
  var onOverview = typeof currentTab === 'undefined' || currentTab === 'overview';
  var items = onOverview ? precosWidgetItems() : [];
  if (!items.length) {
    el.hidden = true;
    el.innerHTML = '';
    el.classList.remove('open');
    PRECOS_WIDGET_OPEN = false;
    return;
  }
  el.hidden = false;
  el.classList.toggle('open', PRECOS_WIDGET_OPEN);
  var sheet = precosWidgetSlot() === 'month';
  var hot = items.some(precosWidgetHot);
  el.innerHTML = '<button type="button" class="pw-fab" id="pwToggle" aria-expanded="' + (PRECOS_WIDGET_OPEN ? 'true' : 'false') + '" aria-controls="pwPanel" aria-label="' + escAttr(precosWidgetLabel(items)) + '" onclick="precosWidgetToggle(' + (PRECOS_WIDGET_OPEN ? 'false' : 'true') + ')">'
    + '<span class="pw-ico" aria-hidden="true">' + PRECOS_TAG_ICON + '</span>'
    + '<span class="pw-dot ' + (hot ? 'good' : 'neutral') + '" aria-hidden="true"></span></button>'
    + (PRECOS_WIDGET_OPEN ? (sheet ? '<div class="pw-scrim" onclick="precosWidgetToggle(false)"></div>' : '') + precosWidgetPanelHtml(items) : '');
  precosWidgetMount();
}

function precosWidgetPrice(item) {
  var last = item.change.last;
  if (!last) return { txt: '—', when: '' };
  return { txt: precosFmt(last.point.val), when: last.day === item.snap.today ? '' : precosOnDay(last.day) };
}

function precosWidgetBatchTxt() {
  return PRECOS_BATCH ? 'Buscando ' + Math.min(PRECOS_BATCH.done + 1, PRECOS_BATCH.total) + ' de ' + PRECOS_BATCH.total + '…' : '';
}

/** Same short verdict the search card shows, only when there is a real gap (discount, above normal, or Google's low-price tag). */
function precosWidgetVerdict(item) {
  var s = precosVerdictShort(item.snap && item.snap.verdict);
  if (!s || !s.cls) return '';
  return '<span class="pw-verdict ' + s.cls + '">' + esc(s.txt) + '</span>';
}

function precosWidgetPanelHtml(items) {
  var today = precosTodayKey();
  var sorted = items.filter(function (x) { return x.fav; }).concat(items.filter(function (x) { return !x.fav; }));
  var rows = sorted.map(function (x) {
    var p = precosWidgetPrice(x);
    var id = escAttr(x.busca.id);
    return '<div class="pw-row">'
      + '<button type="button" class="pw-star' + (x.fav ? ' on' : '') + '" aria-pressed="' + x.fav + '" aria-label="' + escAttr(PK.favorite + ': ' + x.busca.termo) + '" title="' + escAttr(PK.favorite) + '" onclick="precosToggleFav(\'' + id + '\')">' + (x.fav ? '★' : '☆') + '</button>'
      + '<button type="button" class="pw-main" onclick="precosWidgetOpenSearch(\'' + id + '\')">'
      + '<span class="pw-row-top"><span class="pw-name">' + esc(x.busca.termo) + '</span><span class="pw-val">' + esc(p.txt) + '</span></span>'
      + '<span class="pw-row-sub">' + precosChangeHtml(x.change, false) + precosWidgetVerdict(x) + (p.when ? '<span class="pw-when">' + esc(p.when) + '</span>' : '') + '</span>'
      + '</button></div>';
  }).join('');
  var pending = items.filter(function (x) { return !x.snap.last || x.snap.last.data !== today; }).length;
  var label = PRECOS_BATCH ? precosWidgetBatchTxt() : pending ? PK.fetchAll + (items.length > 1 ? ' (' + pending + ')' : '') : PK.fetchAllAgain;
  var meta = (items.length - pending) + ' de ' + items.length + (items.length === 1 ? ' atualizada hoje' : ' atualizadas hoje');
  var hint = items.some(function (x) { return x.fav; }) ? '' : '<div class="pw-hint">' + esc(PK.widgetFavHint) + '</div>';
  return '<div id="pwPanel" class="pw-panel" role="dialog" aria-label="' + escAttr(PK.widgetTitle) + '">'
    + '<div class="pw-head"><span class="pw-ico" aria-hidden="true">' + PRECOS_TAG_ICON + '</span>'
    + '<span class="pw-titles"><span class="pw-title">Preços</span><span class="pw-sub">' + items.length + (items.length === 1 ? ' produto acompanhado' : ' produtos acompanhados') + '</span></span>'
    + '<button type="button" class="pw-close" aria-label="Fechar" onclick="precosWidgetToggle(false)">✕</button></div>'
    + hint + '<div class="pw-list">' + rows + '</div>'
    + '<div class="pw-foot"><button type="button" class="btn-primary pw-fetch" onclick="precosFetchAll()"' + (PRECOS_FETCHING ? ' disabled' : '') + '>' + esc(label) + '</button>'
    + '<button type="button" class="sec-action pw-open-full" onclick="precosWidgetGo()">Ver em Contas</button>'
    + '<div class="pw-meta">' + esc(meta) + '</div></div></div>';
}

function precosWidgetToggle(open) {
  var next = !!open;
  var closing = PRECOS_WIDGET_OPEN && !next;
  var opening = !PRECOS_WIDGET_OPEN && next;
  PRECOS_WIDGET_OPEN = next;
  renderPrecosWidget();
  var target = closing ? document.getElementById('pwToggle') : opening && document.querySelector ? document.querySelector('#pwPanel .pw-close') : null;
  if (target && target.focus) target.focus();
}

function precosWidgetGo() {
  PRECOS_WIDGET_OPEN = false;
  renderPrecosWidget();
  if (typeof switchTab === 'function') switchTab('bills');
  var card = document.getElementById('precosCard');
  if (card && card.scrollIntoView) card.scrollIntoView({ block: 'start' });
}

function precosWidgetOpenSearch(id) {
  PRECOS_WIDGET_OPEN = false;
  renderPrecosWidget();
  openPrecosSearch(id);
}

/** Searches every product not updated today (or all of them again), one at a time. */
function precosFetchAll() {
  if (PRECOS_FETCHING) return;
  var today = precosTodayKey();
  var buscas = precosActiveBuscas();
  var pending = buscas.filter(function (b) { var l = precosLastCapture(b.id); return !l || l.data !== today; });
  var list = pending.length ? pending : buscas;
  if (!list.length) return;
  PRECOS_FETCHING = true;
  PRECOS_BATCH = { done: 0, total: list.length, failed: 0, err: '' };
  renderPrecosWidget();
  var chain = Promise.resolve();
  list.forEach(function (b) {
    chain = chain
      .then(function () { return precosFetchOffers(b); })
      .catch(function (e) { PRECOS_BATCH.failed++; PRECOS_BATCH.err = (e && e.message) || String(e); })
      .then(function () { PRECOS_BATCH.done++; renderPrecosWidget(); });
  });
  return chain.then(function () {
    var batch = PRECOS_BATCH;
    PRECOS_BATCH = null;
    PRECOS_FETCHING = false;
    if (batch.failed) showToast(t('err.prefix') + batch.failed + ' de ' + batch.total + ' falharam — ' + batch.err, 'error');
    else showToast('✓ ' + batch.total + (batch.total === 1 ? ' busca atualizada' : ' buscas atualizadas'));
    renderPrecos();
    if (PRECOS_OPEN_ID) paintPrecosSearch();
  });
}

function openPrecosSearch(id) {
  PRECOS_OPEN_ID = id;
  PRECOS_SHOW_ALL = false;
  document.getElementById('precosDetailOverlay').classList.add('open');
  paintPrecosSearch();
}

function closePrecosSearch() {
  PRECOS_OPEN_ID = null;
  document.getElementById('precosDetailOverlay').classList.remove('open');
}

function precosSetHtml(id, html) {
  var el = document.getElementById(id);
  if (el) el.innerHTML = html;
}

function paintPrecosSearch() {
  var busca = precosBusca(PRECOS_OPEN_ID);
  if (!busca) return;
  var s = precosSnapshot(busca);
  var range = PRECOS_CHART_RANGE || precosPrefs().chartRange || '30';
  document.getElementById('precosDetailTitle').textContent = busca.termo;
  precosSetHtml('precosFetchRow', precosFetchRowHtml(s));
  precosSetHtml('precosHero', precosHeroHtml(busca, s));
  precosSetHtml('precosStats', precosStatsHtml(busca, s));
  precosSetHtml('precosChart', precosChartHtml(s.series, busca.teto, range, s.today));
  precosSetHtml('precosStoreBars', precosStoreBarsHtml(s.shown, s.opts.priceKind));
  precosSetHtml('precosOffersHead', precosOffersHeadHtml(busca, s));
  precosSetHtml('precosOffersList', precosOffersHtml(busca, s));
}

function precosFetchRowHtml(s) {
  var fetchedToday = s.last && s.last.data === s.today;
  var label = PRECOS_FETCHING ? PK.fetching : fetchedToday ? PK.fetchAgain : PK.fetchToday;
  var meta = PK.lastNever;
  if (s.last) {
    var hour = s.last.criado && fetchedToday
      ? ' às ' + new Date(s.last.criado).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
      : '';
    meta = 'Última busca ' + precosDayLabel(s.last.data) + hour + ' · ' + s.last.count + ' ofertas guardadas';
  }
  return '<button type="button" class="btn-primary precos-fetch" id="precosFetchBtn" onclick="refreshPrecosSearch()"' + (PRECOS_FETCHING ? ' disabled' : '') + '>' + esc(label) + '</button>'
    + '<div class="precos-fetch-meta">' + esc(meta) + '</div>';
}

function precosHeroHtml(busca, s) {
  if (!s.dayOffers.length) {
    var pts = PrecosMath.seriesInRange(s.series, 'all', s.today);
    var lastPt = pts[pts.length - 1];
    return '<div class="precos-hero"><div class="precos-hero-lbl">' + esc(PK.noToday) + '</div>'
      + (lastPt ? '<div class="precos-hero-store">Último menor preço: <b>' + esc(precosFmt(lastPt.point.val)) + '</b> ' + esc(precosDayLabel(lastPt.day)) + (lastPt.point.loja ? ' na ' + esc(precosStoreName({ loja: lastPt.point.loja })) : '') + '</div>' : '')
      + '<div class="precos-hero-empty">' + esc(PK.noTodayHint) + '</div></div>';
  }
  if (!s.shown.length) {
    var bd = PrecosMath.filterBreakdown(s.dayOffers, s.opts);
    return '<div class="precos-hero"><div class="precos-hero-lbl">' + esc(PK.allFiltered) + '</div>'
      + '<div class="precos-hero-empty">' + esc(precosBreakdownText(bd)) + '</div>'
      + '<div class="precos-hero-btns"><button type="button" class="sec-action" onclick="openPrecosFilters()">' + esc(PK.adjustFilters) + '</button>'
      + '<button type="button" class="sec-action muted" onclick="openPrecosFilters(true)">' + esc(PK.clearFilters) + '</button></div></div>';
  }
  var low = s.low;
  var link = precosSafeLink(low.link);
  var av = low.precoAvista != null ? PrecosMath.pickDisplayPrice(low, 'avista') : null;
  var extra = s.opts.priceKind !== 'avista' && av != null && av < s.lowPrice ? ' · PIX ' + esc(precosFmt(av)) : '';
  var view = precosVerdictView(s.verdict, s.dayCount);
  return '<div class="precos-hero' + (s.hit ? ' target-hit' : '') + '">'
    + '<div class="precos-hero-lbl">' + esc(PK.todayLow) + '</div>'
    + '<div class="precos-hero-row"><span class="precos-hero-val">' + esc(precosFmt(s.lowPrice)) + '</span>'
    + (s.hit ? '<span class="precos-badge">🎯 ' + esc(PK.targetHit) + '</span>' : '') + '</div>'
    + '<div class="precos-hero-store">na <b>' + esc(precosStoreName(low)) + '</b>' + extra
    + (link ? ' · <a href="' + escAttr(link) + '" target="_blank" rel="noopener">' + esc(PK.seeOffer) + '</a>' : '') + '</div>'
    + (view ? '<div class="precos-verdict ' + view.cls + '">' + esc(view.title) + (view.sub ? '<small>' + esc(view.sub) + '</small>' : '') + '</div>' : '')
    + '</div>';
}

function precosBreakdownText(bd) {
  var parts = [];
  if (bd.loja) parts.push(bd.loja + ' por loja');
  if (bd.palavras) parts.push(bd.palavras + ' por palavras');
  if (bd.moeda) parts.push(bd.moeda + ' fora de reais');
  return bd.total + (bd.total === 1 ? ' oferta' : ' ofertas') + ' hoje' + (parts.length ? ' — escondidas: ' + parts.join(', ') + '.' : '.');
}

function precosStatsHtml(busca, s) {
  var atl = PrecosMath.allTimeLow(s.series);
  var med = s.median != null
    ? precosStat(PK.median30, precosFmt(s.median), s.dayCount + ' dias')
    : precosStat(PK.median30, '—', s.dayCount + ' de ' + PrecosMath.MIN_HISTORY_DAYS + ' dias');
  var low = atl
    ? precosStat(PK.allTimeLow, precosFmt(atl.val), precosDayLabel(atl.day) + (atl.loja ? ' · ' + precosStoreName({ loja: atl.loja }) : ''))
    : precosStat(PK.allTimeLow, '—', '');
  var hasTarget = busca.teto !== '' && busca.teto != null && !isNaN(Number(busca.teto));
  var tgtSub = '';
  if (hasTarget && s.lowPrice != null) tgtSub = s.hit ? '✓ atingido' : 'faltam ' + precosFmt(s.lowPrice - Number(busca.teto));
  var tgt = hasTarget
    ? precosStat(PK.target, precosFmt(Number(busca.teto)), tgtSub)
    : '<div class="precos-stat"><div class="precos-stat-lbl">' + esc(PK.target) + '</div><button type="button" class="precos-stat-link" onclick="openPrecosFilters(false, \'pfTeto\')">' + esc(PK.setTarget) + '</button></div>';
  return '<div class="precos-stats">' + med + low + tgt + '</div>';
}

function precosStat(lbl, val, sub) {
  return '<div class="precos-stat"><div class="precos-stat-lbl">' + esc(lbl) + '</div><div class="precos-stat-val">' + esc(val) + '</div>'
    + (sub ? '<div class="precos-stat-sub">' + esc(sub) + '</div>' : '') + '</div>';
}

function precosChartHtml(series, target, range, today) {
  var chips = ['30', '90', 'all'].map(function (r) {
    var lbl = r === '30' ? PK.range30 : r === '90' ? PK.range90 : PK.rangeAll;
    return '<button type="button" class="precos-range' + (range === r ? ' on' : '') + '" onclick="precosSetRange(\'' + r + '\')">' + esc(lbl) + '</button>';
  }).join('');
  var head = '<div class="precos-chart-head"><div class="sec-title">Histórico</div><div class="precos-range-row">' + chips + '</div></div>';
  var pts = PrecosMath.seriesInRange(series, range === 'all' ? 'all' : Number(range), today);
  if (!pts.length) {
    return '<div class="precos-chart-wrap">' + head + '<div class="precos-chart-empty">' + esc(Object.keys(series || {}).length ? PK.chartEmptyRange : PK.chartEmpty) + '</div></div>';
  }
  var W = 320, H = 156, padL = 46, padR = 12, padT = 14, padB = 22;
  var innerW = W - padL - padR, innerH = H - padT - padB;
  var vals = pts.map(function (p) { return p.point.val; });
  var tgt = target !== '' && target != null && !isNaN(Number(target)) ? Number(target) : null;
  var lo = Math.min.apply(null, vals.concat(tgt != null ? [tgt] : []));
  var hi = Math.max.apply(null, vals.concat(tgt != null ? [tgt] : []));
  if (lo === hi) { lo = lo * 0.95 || -50; hi = hi * 1.05 || 50; }
  var pad = (hi - lo) * 0.1;
  lo -= pad; hi += pad;
  var first = pts[0].day, lastDay = pts[pts.length - 1].day;
  var span = PrecosMath.daysBetween(first, lastDay);
  function X(day) { return span ? padL + (PrecosMath.daysBetween(first, day) / span) * innerW : padL + innerW / 2; }
  function Y(v) { return padT + innerH * (1 - (v - lo) / (hi - lo)); }
  var grid = [0, 0.5, 1].map(function (f) {
    var v = hi - (hi - lo) * f;
    var y = padT + innerH * f;
    return '<line x1="' + padL + '" y1="' + y.toFixed(1) + '" x2="' + (W - padR) + '" y2="' + y.toFixed(1) + '" class="precos-grid"/>'
      + '<text x="' + (padL - 6) + '" y="' + (y + 3).toFixed(1) + '" text-anchor="end" class="precos-axis">' + esc(precosFmtShort(v)) + '</text>';
  }).join('');
  var xs = '<text x="' + (span ? padL : padL + innerW / 2) + '" y="' + (H - 6) + '" text-anchor="' + (span ? 'start' : 'middle') + '" class="precos-axis">' + esc(precosDayLabel(first)) + '</text>'
    + (span ? '<text x="' + (W - padR) + '" y="' + (H - 6) + '" text-anchor="end" class="precos-axis">' + esc(precosDayLabel(lastDay)) + '</text>' : '');
  var line = '';
  if (pts.length > 1) {
    var d = pts.map(function (p, i) { return (i ? 'L' : 'M') + X(p.day).toFixed(1) + ' ' + Y(p.point.val).toFixed(1); }).join(' ');
    var base = (padT + innerH).toFixed(1);
    line = '<path d="M' + X(first).toFixed(1) + ' ' + base + ' L' + d.slice(1) + ' L' + X(lastDay).toFixed(1) + ' ' + base + ' Z" class="precos-area"/>'
      + '<path d="' + d + '" class="precos-line" fill="none"/>';
  }
  var targetLine = '';
  if (tgt != null) {
    var ty = Y(tgt).toFixed(1);
    targetLine = '<line x1="' + padL + '" y1="' + ty + '" x2="' + (W - padR) + '" y2="' + ty + '" class="precos-target-line"/>'
      + '<text x="' + (W - padR) + '" y="' + (Number(ty) - 4) + '" text-anchor="end" class="precos-target-lbl">alvo</text>';
  }
  var dots = pts.map(function (p, i) {
    var manual = p.point.origin === 'manual' || p.point.origin === 'both';
    var isLast = i === pts.length - 1;
    var tip = precosDayLabel(p.day) + ' · ' + precosFmt(p.point.val) + (p.point.loja ? ' · ' + precosStoreName({ loja: p.point.loja }) : '') + (manual ? ' (manual)' : '');
    return '<circle cx="' + X(p.day).toFixed(1) + '" cy="' + Y(p.point.val).toFixed(1) + '" r="' + (isLast ? 4.5 : 3) + '" class="precos-dot' + (manual ? ' manual' : '') + (isLast ? ' last' : '') + '"><title>' + esc(tip) + '</title></circle>';
  }).join('');
  var lastPt = pts[pts.length - 1];
  var lx = X(lastPt.day), ly = Y(lastPt.point.val);
  var anchor = lx > W - padR - 40 ? 'end' : lx < padL + 40 ? 'start' : 'middle';
  var valLbl = '<text x="' + lx.toFixed(1) + '" y="' + (ly - 9).toFixed(1) + '" text-anchor="' + anchor + '" class="precos-val-lbl">' + esc(precosFmtShort(lastPt.point.val)) + '</text>';
  return '<div class="precos-chart-wrap">' + head
    + '<svg class="precos-chart" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="Histórico do menor preço por dia">'
    + grid + xs + targetLine + line + dots + valLbl + '</svg>'
    + (pts.length === 1 ? '<div class="precos-chart-note">' + esc(PK.chartOneDay) + '</div>' : '')
    + '</div>';
}

function precosStoreBarsHtml(shown, kind) {
  var groups = PrecosMath.storeGroups(shown, kind).filter(function (g) { return g.min != null; });
  if (groups.length < 2) return '';
  var list = groups.slice(0, PRECOS_BARS_MAX);
  var min = list[0].min;
  var max = list[list.length - 1].min;
  var rows = list.map(function (g, i) {
    var w = max > min ? 24 + 76 * (g.min - min) / (max - min) : 100;
    var diff = i === 0 ? PK.cheapest : '+' + precosPct((g.min - min) / min * 100) + '%';
    return '<div class="precos-bar-row' + (i === 0 ? ' best' : '') + '">'
      + '<span class="precos-bar-name">' + esc(g.nome) + '</span>'
      + '<span class="precos-bar-track"><span class="precos-bar" style="width:' + w.toFixed(1) + '%"></span></span>'
      + '<span class="precos-bar-val">' + esc(precosFmt(g.min)) + '<small>' + esc(diff) + '</small></span></div>';
  }).join('');
  var more = groups.length > list.length ? '<div class="precos-bars-more">+ ' + (groups.length - list.length) + ' lojas mais caras</div>' : '';
  return '<div class="precos-bars"><div class="sec-title">' + esc(PK.byStore) + '</div>' + rows + more + '</div>';
}

function precosOffersHeadHtml(busca, s) {
  var n = precosActiveFilterCount(busca);
  var count = s.dayOffers.length ? s.shown.length + ' de ' + s.dayOffers.length : '';
  return '<div class="sec-title">' + esc(PK.offersToday) + '</div>'
    + '<span class="precos-count">' + esc(count) + '</span>'
    + '<button type="button" class="sec-action' + (n ? ' on' : '') + '" onclick="openPrecosFilters()">' + esc(PK.filters) + (n ? ' · ' + n : '') + '</button>';
}

function precosOffersHtml(busca, s) {
  PRECOS_VIEW_OFFERS = s.shown;
  if (!s.shown.length) return '';
  var conf = precosConferidaMap(busca.id);
  var prefs = precosPrefs();
  var kind = s.opts.priceKind;
  var list = PRECOS_SHOW_ALL ? s.shown : s.shown.slice(0, PRECOS_OFFERS_PREVIEW);
  var html = list.map(function (o, i) {
    var key = PrecosMath.offerKey(o, s.today);
    var p = PrecosMath.pickDisplayPrice(o, kind);
    var av = o.precoAvista != null ? PrecosMath.pickDisplayPrice(o, 'avista') : null;
    var tags = [];
    if (prefs.showBoth && av != null && av !== p) tags.push('<span class="precos-tag">PIX ' + esc(precosFmt(av)) + '</span>');
    if (o.extra && o.extra.parcelas) tags.push('<span class="precos-tag">' + esc(o.extra.parcelas) + '</span>');
    if (PrecosMath.isGoogleLowTag(o)) tags.push('<span class="precos-tag good">' + esc(PK.googleLow) + '</span>');
    if (o.precoNormal && o.precoNormal > p) tags.push('<span class="precos-tag">' + esc(PK.normalPrice + precosFmt(o.precoNormal)) + '</span>');
    var isConf = !!conf[key];
    var link = precosSafeLink(o.link);
    return '<div class="precos-offer' + (isConf ? ' conferida' : '') + '">'
      + '<div class="precos-offer-top"><span class="precos-offer-store">' + esc(precosStoreName(o)) + '</span>'
      + '<span class="precos-offer-price">' + esc(precosFmt(p)) + '</span></div>'
      + '<div class="precos-offer-title">' + esc(o.titulo) + '</div>'
      + (tags.length ? '<div class="precos-offer-tags">' + tags.join('') + '</div>' : '')
      + '<div class="precos-offer-actions">'
      + (link ? '<a class="sec-action" href="' + escAttr(link) + '" target="_blank" rel="noopener">' + esc(PK.seeOffer) + '</a>' : '')
      + '<button type="button" class="sec-action' + (isConf ? ' on' : '') + '" onclick="precosOfferAction(\'conf\',' + i + ')">' + esc(isConf ? PK.conferida : PK.markConferida) + '</button>'
      + '<button type="button" class="sec-action muted" onclick="precosOfferAction(\'hide\',' + i + ')">' + esc(PK.hideStore) + '</button>'
      + '</div></div>';
  }).join('');
  if (s.shown.length > PRECOS_OFFERS_PREVIEW) {
    html += '<button type="button" class="wiz-back precos-more" onclick="precosOfferAction(\'more\')">'
      + esc(PRECOS_SHOW_ALL ? PK.showLess : PK.showMore + ' (' + s.shown.length + ')') + '</button>';
  }
  return html;
}

function precosOfferAction(kind, i) {
  if (kind === 'more') { PRECOS_SHOW_ALL = !PRECOS_SHOW_ALL; paintPrecosSearch(); return; }
  var o = PRECOS_VIEW_OFFERS[i];
  if (!o) return;
  if (kind === 'conf') togglePrecosConferida(o);
  else if (kind === 'hide') precosHideStore(o);
}

function precosSetRange(r) {
  PRECOS_CHART_RANGE = r;
  precosSavePref('precos_chart_range', r);
  paintPrecosSearch();
}

function openPrecosNew() {
  document.getElementById('precosNewTerm').value = '';
  document.getElementById('precosNewTeto').value = '';
  document.getElementById('precosNewOverlay').classList.add('open');
  setTimeout(function () { var el = document.getElementById('precosNewTerm'); if (el) el.focus(); }, 60);
}

function precosSlug(term) {
  var base = String(term || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'busca';
  var taken = ((DATA && DATA.precosBuscas) || []).some(function (b) { return String(b.id) === base; });
  return taken ? base + '-' + Date.now().toString(36) : base;
}

function submitPrecosNew() {
  var term = document.getElementById('precosNewTerm').value.trim();
  if (!term) { showToast('Informe o produto.', 'error'); return; }
  var data = {
    id: precosSlug(term), termo: term,
    teto: document.getElementById('precosNewTeto').value.trim(),
    obrigatorias: '', proibidas: '',
    arquivada: false, criado: Date.now()
  };
  jbRun('addPrecosBusca', data).then(function (res) {
    var id = (res && res.id) || data.id;
    (DATA.precosBuscas = DATA.precosBuscas || []).push(Object.assign({}, data, { id: id }));
    closeOverlay('precosNewOverlay');
    renderPrecos();
    openPrecosSearch(id);
    refreshPrecosSearch();
  }).catch(function (e) { showToast(t('err.prefix') + e.message, 'error'); });
}

function precosFetchOffers(busca) {
  return fetch('/api/precos?q=' + encodeURIComponent(busca.termo))
    .then(function (r) {
      return r.json().catch(function () { return {}; }).then(function (j) { return { ok: r.ok, status: r.status, j: j }; });
    })
    .then(function (res) {
      var body = res.j || {};
      if (!res.ok || body.error) throw new Error(body.error || ('Falha na busca (HTTP ' + res.status + ')'));
      var today = precosTodayKey();
      var pack = precosPackForSheet(body.offers || []);
      var now = Date.now();
      return jbRun('savePrecosCaptura', { buscaId: busca.id, data: today, json: pack.json, criado: now }).then(function () {
        DATA.precosCapturas = DATA.precosCapturas || [];
        var row = DATA.precosCapturas.find(function (c) { return String(c.buscaId) === String(busca.id) && c.data === today; });
        if (row) { row.json = pack.json; row.criado = now; }
        else DATA.precosCapturas.push({ id: precosUid(), buscaId: busca.id, data: today, json: pack.json, criado: now });
        return pack.count;
      });
    });
}

function refreshPrecosSearch() {
  if (!PRECOS_OPEN_ID || PRECOS_FETCHING) return;
  var busca = precosBusca(PRECOS_OPEN_ID);
  if (!busca) return;
  PRECOS_FETCHING = true;
  paintPrecosSearch();
  precosFetchOffers(busca)
    .then(function (n) { showToast('✓ ' + n + ' ofertas de hoje guardadas'); })
    .catch(function (e) { showToast(t('err.prefix') + (e.message || e), 'error'); })
    .finally(function () {
      PRECOS_FETCHING = false;
      paintPrecosSearch();
      renderPrecos();
    });
}

function togglePrecosConferida(offer) {
  var buscaId = PRECOS_OPEN_ID;
  var today = precosTodayKey();
  var key = PrecosMath.offerKey(offer, today);
  var preco = PrecosMath.pickDisplayPrice(offer, precosPrefs().priceKind);
  var on = !precosConferidaMap(buscaId)[key];
  jbRun('setPrecosConferida', buscaId, key, today, preco, on).then(function () {
    DATA.precosConferidas = (DATA.precosConferidas || []).filter(function (c) { return !(String(c.buscaId) === String(buscaId) && c.chave === key); });
    if (on) DATA.precosConferidas.push({ buscaId: buscaId, chave: key, data: today, preco: preco, conferidoEm: Date.now() });
    paintPrecosSearch();
  }).catch(function (e) { showToast(t('err.prefix') + e.message, 'error'); });
}

function precosHideStore(offer) {
  var buscaId = PRECOS_OPEN_ID;
  var nome = precosStoreName(offer);
  var data = { buscaId: buscaId, tipo: 'bloqueada', nome: nome, dominio: '', criado: Date.now() };
  jbRun('addPrecosLoja', data).then(function (res) {
    var row = Object.assign({ id: (res && res.id) || precosUid() }, data);
    DATA.precosLojas = DATA.precosLojas || [];
    DATA.precosLojas.push(row);
    paintPrecosSearch();
    renderPrecos();
    showToast(nome + PK.hiddenToast, null, function () {
      jbRun('deletePrecosLoja', row.id).then(function () {
        DATA.precosLojas = DATA.precosLojas.filter(function (x) { return x.id !== row.id; });
        paintPrecosSearch();
        renderPrecos();
      });
    });
  }).catch(function (e) { showToast(t('err.prefix') + e.message, 'error'); });
}

/* ---------- Filters sheet (draft until Salvar) ---------- */

function openPrecosFilters(cleared, focusId) {
  var b = precosBusca(PRECOS_OPEN_ID);
  if (!b) return;
  var rules = precosRules(b.id);
  var prefs = precosPrefs();
  var raw = precosRawFromSheet(b.id);
  var today = precosTodayKey();
  var days = Object.keys(raw).sort();
  var previewDay = raw[today] ? today : days[days.length - 1] || '';
  var d = {
    buscaId: b.id,
    pins: {}, hides: {}, globalHide: {}, labels: {},
    obr: PrecosMath.parseWordList(b.obrigatorias),
    pro: PrecosMath.parseWordList(b.proibidas),
    hideNonBrl: prefs.hideNonBrl, priceKind: prefs.priceKind, showBoth: prefs.showBoth,
    previewDay: previewDay,
    preview: previewDay ? raw[previewDay] : [],
    stores: []
  };
  rules.pins.forEach(function (r) { var k = precosRuleKey(r); d.pins[k] = true; d.labels[k] = d.labels[k] || PrecosMath.storeLabel(k, precosVariant(r.nome)); });
  rules.hides.forEach(function (r) {
    var k = precosRuleKey(r);
    d.hides[k] = true;
    if (!String(r.buscaId || '')) d.globalHide[k] = true;
    d.labels[k] = d.labels[k] || PrecosMath.storeLabel(k, precosVariant(r.nome || r.dominio));
  });
  var todayGroups = {};
  PrecosMath.storeGroups(d.preview, prefs.priceKind).forEach(function (g) { todayGroups[g.key] = g; });
  var seen = PrecosMath.storeGroups(PrecosMath.offersInWindow(raw, 30, today), prefs.priceKind);
  seen.sort(function (a, b2) {
    var ta = todayGroups[a.key] ? todayGroups[a.key].count : 0;
    var tb = todayGroups[b2.key] ? todayGroups[b2.key].count : 0;
    return tb - ta || b2.count - a.count || a.nome.localeCompare(b2.nome);
  });
  seen.forEach(function (g) {
    d.labels[g.key] = d.labels[g.key] || g.nome;
    var tg = todayGroups[g.key];
    d.stores.push({ key: g.key, todayCount: tg ? tg.count : 0, todayMin: tg ? tg.min : null, count: g.count });
  });
  Object.keys(d.labels).forEach(function (k) {
    if (!d.stores.some(function (st) { return st.key === k; })) d.stores.push({ key: k, todayCount: 0, todayMin: null, count: 0 });
  });
  PRECOS_DRAFT = d;
  if (cleared) precosDraftClear();
  document.getElementById('pfTeto').value = b.teto !== '' && b.teto != null ? b.teto : '';
  document.getElementById('pfObrInput').value = '';
  document.getElementById('pfProInput').value = '';
  var saveBtn = document.getElementById('pfSaveBtn');
  if (saveBtn) { saveBtn.disabled = false; saveBtn.textContent = PK.saveFilters; }
  precosRenderDraft();
  document.getElementById('precosFiltersOverlay').classList.add('open');
  if (focusId) setTimeout(function () { var el = document.getElementById(focusId); if (el) { el.focus(); el.scrollIntoView({ block: 'center' }); } }, 80);
}

function precosVariant(name) {
  var v = {};
  var base = PrecosMath.storeBaseName(name);
  if (base) v[base] = 1;
  return v;
}

function precosDraftOpts(d) {
  var toRules = function (map) { return Object.keys(map).filter(function (k) { return map[k]; }).map(function (k) { return { nome: d.labels[k] || k }; }); };
  return precosOptsFromParts(d.buscaId, {
    pins: toRules(d.pins), hides: toRules(d.hides),
    obrigatorias: d.obr.join(', '), proibidas: d.pro.join(', '),
    hideNonBrl: d.hideNonBrl, priceKind: d.priceKind
  });
}

function precosRenderDraft() {
  precosRenderDraftStores();
  precosRenderDraftWords();
  precosRenderDraftPrefs();
  precosRenderDraftSummary();
}

function precosRenderDraftStores() {
  var d = PRECOS_DRAFT;
  if (!d) return;
  var anyPin = Object.keys(d.pins).some(function (k) { return d.pins[k]; });
  var anyRule = anyPin || Object.keys(d.hides).some(function (k) { return d.hides[k]; });
  var reset = document.getElementById('pfStoresReset');
  if (reset) reset.style.display = anyRule ? '' : 'none';
  if (!d.stores.length) { precosSetHtml('pfStores', '<div class="precos-chart-empty">' + esc(PK.noStores) + '</div>'); return; }
  var dayTxt = d.previewDay ? precosDayLabel(d.previewDay) : '';
  precosSetHtml('pfStores', d.stores.map(function (st) {
    var pin = !!d.pins[st.key];
    var hide = !!d.hides[st.key];
    var out = anyPin && !pin && !hide;
    var meta = st.todayCount
      ? st.todayCount + (st.todayCount === 1 ? ' oferta ' : ' ofertas ') + dayTxt + ' · desde ' + precosFmt(st.todayMin)
      : st.count ? 'vista nos últimos 30 dias' : 'sem ofertas recentes';
    if (out) meta += ' · ' + PK.outOfPins;
    return '<div class="pf-store' + (pin ? ' is-pin' : '') + (hide ? ' is-hide' : '') + (out ? ' is-out' : '') + '">'
      + '<div class="pf-store-main"><div class="pf-store-name">' + esc(d.labels[st.key] || st.key)
      + (hide && d.globalHide[st.key] ? '<span class="pf-tag">' + esc(PK.allSearches) + '</span>' : '') + '</div>'
      + '<div class="pf-store-meta">' + esc(meta) + '</div></div>'
      + '<div class="pf-store-btns">'
      + '<button type="button" class="pf-btn pin' + (pin ? ' on' : '') + '" aria-pressed="' + pin + '" onclick="precosDraftStore(\'pin\',\'' + st.key + '\')">' + esc(PK.pin) + '</button>'
      + '<button type="button" class="pf-btn hide' + (hide ? ' on' : '') + '" aria-pressed="' + hide + '" onclick="precosDraftStore(\'hide\',\'' + st.key + '\')">' + esc(PK.hide) + '</button>'
      + '</div></div>';
  }).join(''));
}

function precosRenderDraftWords() {
  var d = PRECOS_DRAFT;
  if (!d) return;
  ['obr', 'pro'].forEach(function (which) {
    var words = d[which];
    var kind = which === 'obr' ? 'req' : 'ban';
    precosSetHtml(which === 'obr' ? 'pfObrList' : 'pfProList', words.map(function (w, i) {
      var n = PrecosMath.wordImpact(d.preview, w, kind);
      return '<span class="pf-chip">' + esc(w) + (n ? '<small>−' + n + '</small>' : '')
        + '<button type="button" aria-label="Remover ' + escAttr(w) + '" onclick="precosChipRemove(\'' + which + '\',' + i + ')">×</button></span>';
    }).join(''));
  });
}

function precosRenderDraftPrefs() {
  var d = PRECOS_DRAFT;
  if (!d) return;
  var seg = document.getElementById('pfPriceKind');
  if (seg) [].forEach.call(seg.querySelectorAll('button'), function (btn) { btn.classList.toggle('on', btn.getAttribute('data-kind') === d.priceKind); });
  var hb = document.getElementById('pfHideBrl');
  if (hb) hb.checked = d.hideNonBrl;
  var sb = document.getElementById('pfShowBoth');
  if (sb) sb.checked = d.showBoth;
}

function precosRenderDraftSummary() {
  var d = PRECOS_DRAFT;
  if (!d) return;
  if (!d.preview || !d.preview.length) {
    precosSetHtml('pfSummary', '<small>Busque preços para ver quantas ofertas cada filtro esconde.</small>');
    return;
  }
  var bd = PrecosMath.filterBreakdown(d.preview, precosDraftOpts(d));
  var parts = [];
  if (bd.loja) parts.push(bd.loja + ' por loja');
  if (bd.palavras) parts.push(bd.palavras + ' por palavras');
  if (bd.moeda) parts.push(bd.moeda + ' fora de reais');
  precosSetHtml('pfSummary', '<b>' + bd.shown + '</b> de ' + bd.total + ' ofertas de ' + esc(precosDayLabel(d.previewDay)) + ' aparecem'
    + (parts.length ? '<small>Escondidas: ' + esc(parts.join(' · ')) + '</small>' : ''));
}

function precosDraftStore(mode, key) {
  var d = PRECOS_DRAFT;
  if (!d) return;
  if (mode === 'pin') { d.pins[key] = !d.pins[key]; if (d.pins[key]) d.hides[key] = false; }
  else { d.hides[key] = !d.hides[key]; if (d.hides[key]) d.pins[key] = false; }
  precosRenderDraftStores();
  precosRenderDraftSummary();
}

function precosDraftResetStores() {
  var d = PRECOS_DRAFT;
  if (!d) return;
  d.pins = {};
  d.hides = {};
  precosRenderDraftStores();
  precosRenderDraftSummary();
}

function precosDraftClear() {
  var d = PRECOS_DRAFT;
  if (!d) return;
  d.pins = {};
  d.hides = {};
  d.obr = [];
  d.pro = [];
}

function precosChipCommit(which) {
  var d = PRECOS_DRAFT;
  var input = document.getElementById(which === 'obr' ? 'pfObrInput' : 'pfProInput');
  if (!d || !input || !input.value.trim()) return;
  var have = {};
  d[which].forEach(function (w) { have[PrecosMath.normCompact(w)] = 1; });
  PrecosMath.parseWordList(input.value).forEach(function (w) {
    if (!have[PrecosMath.normCompact(w)]) { d[which].push(w); have[PrecosMath.normCompact(w)] = 1; }
  });
  input.value = '';
  precosRenderDraftWords();
  precosRenderDraftSummary();
}

function precosChipKey(e, which) {
  var input = e.target;
  if (e.key === 'Enter' || e.key === ',') {
    e.preventDefault();
    precosChipCommit(which);
  } else if (e.key === 'Backspace' && !input.value && PRECOS_DRAFT && PRECOS_DRAFT[which].length) {
    PRECOS_DRAFT[which].pop();
    precosRenderDraftWords();
    precosRenderDraftSummary();
  }
}

function precosChipRemove(which, i) {
  if (!PRECOS_DRAFT) return;
  PRECOS_DRAFT[which].splice(i, 1);
  precosRenderDraftWords();
  precosRenderDraftSummary();
}

function precosChipFocus(e, which) {
  if (e.target.closest && e.target.closest('button')) return;
  var input = document.getElementById(which === 'obr' ? 'pfObrInput' : 'pfProInput');
  if (input) input.focus();
}

function precosDraftKind(kind) {
  if (!PRECOS_DRAFT) return;
  PRECOS_DRAFT.priceKind = kind === 'avista' ? 'avista' : 'real';
  precosRenderDraftPrefs();
  precosRenderDraftSummary();
}

function precosDraftPrefs() {
  if (!PRECOS_DRAFT) return;
  PRECOS_DRAFT.hideNonBrl = !!document.getElementById('pfHideBrl').checked;
  PRECOS_DRAFT.showBoth = !!document.getElementById('pfShowBoth').checked;
  precosRenderDraftSummary();
}

function submitPrecosFilters() {
  var d = PRECOS_DRAFT;
  var b = d && precosBusca(d.buscaId);
  if (!b) return;
  precosChipCommit('obr');
  precosChipCommit('pro');
  var rules = precosRules(b.id);
  var ops = [];
  [['pins', 'permitida', rules.pins], ['hides', 'bloqueada', rules.hides]].forEach(function (spec) {
    var want = d[spec[0]];
    var saved = {};
    spec[2].forEach(function (r) { var k = precosRuleKey(r); (saved[k] = saved[k] || []).push(r); });
    Object.keys(saved).forEach(function (k) {
      if (!want[k]) saved[k].forEach(function (r) { ops.push({ del: r }); });
    });
    Object.keys(want).forEach(function (k) {
      if (want[k] && !saved[k]) ops.push({ add: { buscaId: b.id, tipo: spec[1], nome: d.labels[k] || k, dominio: '', criado: Date.now() } });
    });
  });
  var teto = document.getElementById('pfTeto').value.trim();
  var patch = { termo: b.termo, teto: teto, obrigatorias: d.obr.join(', '), proibidas: d.pro.join(', '), arquivada: b.arquivada, criado: b.criado };
  var buscaChanged = String(patch.teto) !== String(b.teto == null ? '' : b.teto) || patch.obrigatorias !== (b.obrigatorias || '') || patch.proibidas !== (b.proibidas || '');
  var prefs = precosPrefs();
  var btn = document.getElementById('pfSaveBtn');
  if (btn) { btn.disabled = true; btn.textContent = PK.saving; }
  var chain = Promise.resolve();
  ops.forEach(function (op) {
    chain = chain.then(function () {
      if (op.del) {
        return jbRun('deletePrecosLoja', op.del.id).then(function () {
          DATA.precosLojas = (DATA.precosLojas || []).filter(function (x) { return x.id !== op.del.id; });
        });
      }
      return jbRun('addPrecosLoja', op.add).then(function (res) {
        (DATA.precosLojas = DATA.precosLojas || []).push(Object.assign({ id: (res && res.id) || precosUid() }, op.add));
      });
    });
  });
  if (buscaChanged) {
    chain = chain.then(function () {
      return jbRun('updatePrecosBusca', b.id, patch).then(function () { Object.assign(b, patch); });
    });
  }
  chain.then(function () {
    if (d.priceKind !== prefs.priceKind) precosSavePref('precos_price_kind', d.priceKind);
    if (d.hideNonBrl !== prefs.hideNonBrl) precosSavePref('precos_hide_non_brl', d.hideNonBrl ? 'true' : 'false');
    if (d.showBoth !== prefs.showBoth) precosSavePref('precos_show_both', d.showBoth ? 'true' : 'false');
    PRECOS_DRAFT = null;
    closeOverlay('precosFiltersOverlay');
    showToast(PK.savedFilters);
  }).catch(function (e) {
    showToast(t('err.prefix') + e.message, 'error');
    if (btn) { btn.disabled = false; btn.textContent = PK.saveFilters; }
  }).finally(function () {
    paintPrecosSearch();
    renderPrecos();
  });
}

/* ---------- Manual price + archive ---------- */

function openPrecosManual() {
  if (!PRECOS_OPEN_ID) return;
  document.getElementById('precosManVal').value = '';
  document.getElementById('precosManStore').value = '';
  document.getElementById('precosManNote').value = '';
  JB.dpSet('precosManDate', precosTodayKey());
  document.getElementById('precosManualOverlay').classList.add('open');
}

function submitPrecosManual() {
  var v = parseAmount(document.getElementById('precosManVal').value);
  if (isNaN(v) || v <= 0) { showToast('Valor inválido', 'error'); return; }
  var data = {
    buscaId: PRECOS_OPEN_ID,
    data: JB.dpGet('precosManDate') || precosTodayKey(),
    valor: v,
    loja: document.getElementById('precosManStore').value.trim(),
    obs: document.getElementById('precosManNote').value.trim(),
    criado: Date.now()
  };
  jbRun('addPrecosManual', data).then(function (res) {
    DATA.precosManual = DATA.precosManual || [];
    DATA.precosManual.push(Object.assign({ id: res.id }, data));
    closeOverlay('precosManualOverlay');
    paintPrecosSearch();
    renderPrecos();
    showToast('✓ Preço manual registrado');
  }).catch(function (e) { showToast(t('err.prefix') + e.message, 'error'); });
}

function archivePrecosSearch() {
  var b = precosBusca(PRECOS_OPEN_ID);
  if (!b) return;
  showConfirm(PK.confirmArchive, PK.confirmArchiveMsg, function () {
    var patch = { termo: b.termo, teto: b.teto, obrigatorias: b.obrigatorias, proibidas: b.proibidas, arquivada: true, criado: b.criado };
    jbRun('updatePrecosBusca', b.id, patch).then(function () {
      b.arquivada = true;
      closePrecosSearch();
      renderPrecos();
      showToast('✓ Busca arquivada');
    }).catch(function (e) { showToast(t('err.prefix') + e.message, 'error'); });
  });
}

function initPrecosOnBoot() {
  if (typeof JB !== 'undefined' && JB.onTabVisible) {
    JB.onTabVisible(function () {
      if (document.getElementById('tab-bills').classList.contains('active')) renderPrecos();
      else renderPrecosWidget();
    });
  }
  if (window._precosWidgetKeys) return;
  window._precosWidgetKeys = 1;
  /* Capture phase: the widget re-renders on click, which detaches the clicked node. */
  document.addEventListener('click', function (e) {
    if (!PRECOS_WIDGET_OPEN) return;
    var w = document.getElementById('precosWidget');
    if (w && !w.contains(e.target) && !(e.target.closest && e.target.closest('.overlay'))) precosWidgetToggle(false);
  }, true);
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && PRECOS_WIDGET_OPEN) precosWidgetToggle(false);
  });
  window.addEventListener('resize', function () { precosWidgetMount(); });
}
