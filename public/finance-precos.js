/* Finance — Preços (price watch). Loaded after finance.js. © Joelboard */
var PRECOS_RAW = {};
var PRECOS_RAW_BY_ID = {};
function precosUid(){ return 'p' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }
var PRECOS_OPEN_ID = null;
var PRECOS_CHART_RANGE = null;
var PRECOS_USE_SAMPLE = false;
var PRECOS_FETCHING = false;

var PK = {
  title: '💰 Preços',
  emptyTitle: 'Nenhuma busca ainda',
  emptyHint: 'Monitore o menor preço do dia e veja se vale a pena comprar.',
  newSearch: '+ Nova busca',
  sampleNotice: 'Dados de exemplo — só para testar a interface.',
  fetchNow: 'Buscar preços agora',
  fetching: 'Buscando…',
  offersEmptyToday: 'Nenhuma oferta hoje — toque em Buscar preços.',
  todayLow: 'Menor hoje',
  median30: 'Mediana 30 dias',
  allTimeLow: 'Menor histórico',
  targetHit: 'No preço-alvo',
  discountReal: 'Desconto real?',
  discountYes: 'Desconto real',
  discountNo: 'Sem desconto de verdade',
  discountFew: 'Poucos dados',
  offersToday: 'Ofertas de hoje',
  conferida: 'Conferida',
  markConferida: 'Marcar conferida',
  unmarkConferida: 'Desmarcar',
  openStore: 'Abrir na loja',
  blockStore: 'Bloquear esta loja',
  blockUndo: 'Loja bloqueada',
  manual: 'Registrar preço manual',
  filters: 'Filtros e teto',
  settings: 'Ajustes de Preços',
  deleteSearch: 'Arquivar busca',
  chartEmpty: 'Busque preços em dias diferentes para ver o gráfico (ou registre manual).',
  range30: '30 dias',
  range90: '90 dias',
  rangeAll: 'Tudo',
  vsMedian: 'vs mediana',
  newSearchTitle: 'Nova busca',
  term: 'Termo de busca',
  save: 'Salvar',
  cancel: 'Cancelar',
  teto: 'Preço-alvo (opcional)',
  obrigatorias: 'Palavras obrigatórias (todas)',
  proibidas: 'Palavras proibidas (nenhuma)',
  storesSeen: 'Lojas nos últimos 30 dias',
  globalBlocks: 'Bloqueios globais',
  hideNonBrl: 'Ocultar preços que não estão em reais',
  priceKind: 'Preço padrão',
  priceReal: 'Parcelado / preço cheio',
  priceAvista: 'À vista / PIX',
  showBoth: 'Mostrar à vista quando existir',
  chartDefault: 'Intervalo padrão do gráfico',
  confirmArchive: 'Arquivar esta busca?',
  confirmArchiveMsg: 'Os dados manuais e filtros ficam na planilha, mas a busca some da lista.',
  exampleBtn: 'Experimentar exemplo RX 9070 XT'
};

function precosFmt(n) {
  if (n == null || isNaN(n)) return '—';
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(n);
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

function precosGlobalBlocks() {
  var rows = ((DATA && DATA.precosLojas) || []).filter(function (r) { return !r.buscaId && r.tipo === 'bloqueada'; });
  if (rows.length) return rows;
  return PrecosMath.DEFAULT_GLOBAL_BLOCKS.map(function (b) { return { nome: b.nome, dominio: b.dominio }; });
}

function precosAllows(buscaId) {
  return ((DATA && DATA.precosLojas) || []).filter(function (r) { return r.buscaId === buscaId && r.tipo === 'permitida'; });
}

function precosFilterOpts(busca) {
  var p = precosPrefs();
  return {
    obrigatorias: busca.obrigatorias,
    proibidas: busca.proibidas,
    globalBlocks: precosGlobalBlocks(),
    searchAllows: precosAllows(busca.id),
    buscaId: busca.id,
    hideNonBrl: p.hideNonBrl,
    priceKind: p.priceKind
  };
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

function precosMonthKeys(startDay, endDay) {
  var out = [];
  var d = new Date(startDay + 'T12:00:00');
  var end = new Date(endDay + 'T12:00:00');
  while (d <= end) {
    var ym = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
    if (out.indexOf(ym) === -1) out.push(ym);
    d.setMonth(d.getMonth() + 1);
  }
  return out;
}

function fetchPrecosMonth(searchId, ym) {
  var ck = searchId + ':' + ym;
  if (PRECOS_RAW[ck]) return Promise.resolve(PRECOS_RAW[ck]);
  return fetch('/data/precos/' + encodeURIComponent(searchId) + '/' + ym + '.json').then(function (r) {
    if (!r.ok) return {};
    return r.json();
  }).catch(function () { return {}; }).then(function (j) {
    PRECOS_RAW[ck] = j || {};
    return PRECOS_RAW[ck];
  });
}

function loadPrecosRaw(searchId) {
  var merged = precosRawFromSheet(searchId);
  if (!PRECOS_USE_SAMPLE || searchId !== 'rx-9070-xt') {
    PRECOS_RAW_BY_ID[searchId] = merged;
    return Promise.resolve(merged);
  }
  var today = todayStr();
  var start = new Date(today + 'T12:00:00');
  start.setDate(start.getDate() - 120);
  var months = precosMonthKeys(start.toISOString().slice(0, 10), today);
  return months.reduce(function (ch, ym) {
    return ch.then(function () {
      return fetchPrecosMonth(searchId, ym).then(function (part) {
        Object.keys(part || {}).forEach(function (d) {
          if (!merged[d]) merged[d] = part[d];
        });
      });
    });
  }, Promise.resolve()).then(function () {
    PRECOS_RAW_BY_ID[searchId] = merged;
    return merged;
  });
}

function precosActiveBuscas() {
  return ((DATA && DATA.precosBuscas) || []).filter(function (b) { return !b.arquivada; });
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

function precosBuildSeries(busca, raw) {
  var opts = precosFilterOpts(busca);
  var auto = PrecosMath.lowestPricePerDay(raw, opts);
  return PrecosMath.mergeManualSeries(auto, precosManualFor(busca.id), opts);
}

function precosTodayKey() { return todayStr(); }

function renderPrecos() {
  var list = document.getElementById('precosList');
  if (!list) return;
  var buscas = precosActiveBuscas();
  (function renderList() {
    if (!buscas.length) {
      list.innerHTML = JB.emptyState({
        icon: '💰',
        title: PK.emptyTitle,
        hint: PK.emptyHint,
        action: PK.newSearch,
        onclick: 'openPrecosNew()'
      }) + '<button type="button" class="wiz-back" style="width:100%;margin-top:10px" onclick="precosSeedExample()">' + esc(PK.exampleBtn) + '</button>';
      return;
    }
    var html = '';
    var chain = Promise.resolve();
    buscas.forEach(function (b) {
      chain = chain.then(function () {
        return loadPrecosRaw(b.id).then(function (raw) {
          var opts = precosFilterOpts(b);
          var series = precosBuildSeries(b, raw);
          var today = precosTodayKey();
          var low = PrecosMath.todayLowestFromRaw(raw, today, opts);
          var med = PrecosMath.medianLastNDays(series, 30, today);
          var hit = b.teto !== '' && b.teto != null && low && PrecosMath.targetHit(low.price, b.teto);
          var pct = low && med != null ? PrecosMath.pctBelowMedian(low.price, med) : null;
          html += '<button type="button" class="precos-card' + (hit ? ' target-hit' : '') + '" onclick="openPrecosSearch(\'' + escAttr(b.id) + '\')">'
            + '<div class="precos-card-top"><span class="precos-term">' + esc(b.termo) + '</span>'
            + (hit ? '<span class="precos-badge">' + esc(PK.targetHit) + '</span>' : '')
            + '</div>'
            + '<div class="precos-card-mid">' + (low ? precosFmt(low.price) : '—') + '</div>'
            + '<div class="precos-card-meta">'
            + (pct != null ? '<span>' + (pct >= 0 ? '−' + Math.round(pct) : '+' + Math.abs(Math.round(pct))) + '% ' + esc(PK.vsMedian) + '</span>' : '')
            + '</div></button>';
        });
      });
    });
    chain.then(function () {
      list.innerHTML = html || JB.emptyState({ icon: '💰', title: PK.emptyTitle, hint: PK.emptyHint, action: PK.newSearch, onclick: 'openPrecosNew()' });
    });
  })();
}

function openPrecosSearch(id) {
  PRECOS_OPEN_ID = id;
  document.getElementById('precosDetailOverlay').classList.add('open');
  paintPrecosSearch(true);
}

function closePrecosSearch() {
  PRECOS_OPEN_ID = null;
  document.getElementById('precosDetailOverlay').classList.remove('open');
}

function paintPrecosSearch(reloadRaw) {
  var busca = precosActiveBuscas().find(function (b) { return String(b.id) === String(PRECOS_OPEN_ID); });
  if (!busca) return;
  document.getElementById('precosDetailTitle').textContent = busca.termo;
  var notice = document.getElementById('precosSampleNotice');
  notice.style.display = PRECOS_USE_SAMPLE ? 'block' : 'none';
  notice.textContent = PK.sampleNotice;
  var fetchBtn = document.getElementById('precosFetchBtn');
  if (fetchBtn) {
    fetchBtn.disabled = PRECOS_FETCHING;
    fetchBtn.textContent = PRECOS_FETCHING ? PK.fetching : PK.fetchNow;
  }
  var paint = function (raw) {
    var opts = precosFilterOpts(busca);
    var series = precosBuildSeries(busca, raw);
    var prefs = precosPrefs();
    var range = PRECOS_CHART_RANGE || prefs.chartRange || '30';
    var today = precosTodayKey();
    var low = PrecosMath.todayLowestFromRaw(raw, today, opts);
    var med = PrecosMath.medianLastNDays(series, 30, today);
    var atl = PrecosMath.allTimeLow(series);
    var dayCount = Object.keys(series).length;
    var badge = PrecosMath.discountBadge(low && low.price, med, dayCount);
    var badgeLbl = badge === 'real' ? PK.discountYes : badge === 'nao' ? PK.discountNo : PK.discountFew;
    document.getElementById('precosChart').innerHTML = precosChartSvg(series, busca.teto, range, today);
    document.getElementById('precosTodayVal').textContent = low ? precosFmt(low.price) : '—';
    document.getElementById('precosMedVal').textContent = med != null ? precosFmt(med) : '—';
    document.getElementById('precosAtlVal').textContent = atl ? precosFmt(atl.val) : '—';
    var bEl = document.getElementById('precosDiscountBadge');
    bEl.textContent = PK.discountReal + ': ' + badgeLbl;
    bEl.className = 'precos-discount ' + badge;
    if (busca.teto !== '' && busca.teto != null && low && PrecosMath.targetHit(low.price, busca.teto)) {
      document.getElementById('precosTargetBadge').style.display = 'inline-flex';
    } else document.getElementById('precosTargetBadge').style.display = 'none';
    renderPrecosOffers(busca, raw, today, opts);
  };
  if (reloadRaw) loadPrecosRaw(busca.id).then(paint);
  else paint(PRECOS_RAW_BY_ID[busca.id] || {});
}

function renderPrecosOffers(busca, raw, today, opts) {
  var list = document.getElementById('precosOffersList');
  var day = raw[today] || [];
  var offers = PrecosMath.filterOffers(day, opts).slice().sort(function (a, b) {
    return PrecosMath.pickDisplayPrice(a, opts.priceKind) - PrecosMath.pickDisplayPrice(b, opts.priceKind);
  });
  var conf = precosConferidaMap(busca.id);
  var prefs = precosPrefs();
  if (!day.length) {
    list.innerHTML = '<div class="empty">' + esc(PK.offersEmptyToday) + '</div>';
    return;
  }
  if (!offers.length) {
    list.innerHTML = '<div class="empty">' + esc('Nenhuma oferta passou nos filtros hoje.') + '</div>';
    return;
  }
  list.innerHTML = offers.map(function (o) {
    var key = PrecosMath.offerKey(o, today);
    var p = PrecosMath.pickDisplayPrice(o, opts.priceKind);
    var av = o.precoAvista != null ? PrecosMath.pickDisplayPrice(o, 'avista') : null;
    var priceHtml = '<span class="precos-offer-price">' + precosFmt(p) + '</span>';
    if (prefs.showBoth && av != null && av !== p) priceHtml += '<span class="precos-offer-av">PIX ' + precosFmt(av) + '</span>';
    var isConf = !!conf[key];
    return '<div class="precos-offer' + (isConf ? ' conferida' : '') + '">'
      + '<div class="precos-offer-main"><div class="precos-offer-store">' + esc(o.loja) + '</div>'
      + '<div class="precos-offer-title">' + esc(o.titulo) + '</div>' + priceHtml + '</div>'
      + '<div class="precos-offer-actions">'
      + (o.link ? '<a class="sec-action" href="' + escAttr(o.link) + '" target="_blank" rel="noopener">' + esc(PK.openStore) + '</a>' : '')
      + '<button type="button" class="sec-action" onclick="togglePrecosConferida(\'' + escAttr(busca.id) + '\',\'' + escAttr(encodeURIComponent(key)) + '\',' + p + ')">' + esc(isConf ? PK.unmarkConferida : PK.markConferida) + '</button>'
      + '<button type="button" class="sec-action muted" onclick="precosBlockStore(\'' + escAttr(o.loja) + '\',\'' + escAttr(PrecosMath.domainFromUrl(o.link)) + '\')">' + esc(PK.blockStore) + '</button>'
      + '</div></div>';
  }).join('');
}

function precosChartSvg(series, target, range, today) {
  var pts = PrecosMath.seriesInRange(series, range === 'all' ? 'all' : Number(range), today);
  if (pts.length < 2) {
    return '<div class="precos-chart-empty">' + esc(PK.chartEmpty) + '</div>';
  }
  var w = 320; var h = 140; var pad = 28;
  var vals = pts.map(function (p) { return p.point.val; });
  var min = Math.min.apply(null, vals);
  var max = Math.max.apply(null, vals);
  if (target !== '' && target != null && !isNaN(Number(target))) {
    min = Math.min(min, Number(target));
    max = Math.max(max, Number(target));
  }
  if (min === max) { min -= 50; max += 50; }
  var xStep = (w - pad * 2) / (pts.length - 1);
  function xy(i, v) {
    var x = pad + i * xStep;
    var y = pad + (h - pad * 2) * (1 - (v - min) / (max - min));
    return [x, y];
  }
  var path = pts.map(function (p, i) {
    var c = xy(i, p.point.val);
    return (i ? 'L' : 'M') + c[0].toFixed(1) + ' ' + c[1].toFixed(1);
  }).join(' ');
  var dots = pts.map(function (p, i) {
    var c = xy(i, p.point.val);
    var manual = p.point.origin === 'manual' || p.point.origin === 'both';
    var tip = p.day + ' · ' + precosFmt(p.point.val);
    return '<circle cx="' + c[0].toFixed(1) + '" cy="' + c[1].toFixed(1) + '" r="' + (manual ? 4 : 3) + '" class="precos-dot' + (manual ? ' manual' : '') + '"><title>' + esc(tip) + '</title></circle>';
  }).join('');
  var targetLine = '';
  if (target !== '' && target != null && !isNaN(Number(target))) {
    var ty = xy(0, Number(target))[1];
    targetLine = '<line x1="' + pad + '" y1="' + ty.toFixed(1) + '" x2="' + (w - pad) + '" y2="' + ty.toFixed(1) + '" class="precos-target-line"/>';
  }
  var rangeBtns = ['30', '90', 'all'].map(function (r) {
    var lbl = r === '30' ? PK.range30 : r === '90' ? PK.range90 : PK.rangeAll;
    var on = (PRECOS_CHART_RANGE || precosPrefs().chartRange) === r ? ' on' : '';
    return '<button type="button" class="precos-range' + on + '" onclick="precosSetRange(\'' + r + '\')">' + esc(lbl) + '</button>';
  }).join('');
  return '<div class="precos-range-row">' + rangeBtns + '</div>'
    + '<svg class="precos-chart" viewBox="0 0 ' + w + ' ' + h + '" role="img" aria-label="Histórico de preços">'
    + targetLine + '<path d="' + path + '" class="precos-line" fill="none"/>' + dots + '</svg>';
}

function precosSetRange(r) {
  PRECOS_CHART_RANGE = r;
  precosSavePref('precos_chart_range', r);
  paintPrecosSearch(false);
}

function openPrecosNew() {
  document.getElementById('precosNewTerm').value = '';
  document.getElementById('precosNewTeto').value = '';
  document.getElementById('precosNewObr').value = PrecosMath.DEFAULT_RX_KEYWORDS.obrigatorias.replace(/,/g, ', ');
  document.getElementById('precosNewPro').value = PrecosMath.DEFAULT_RX_KEYWORDS.proibidas.replace(/,/g, ', ');
  document.getElementById('precosNewOverlay').classList.add('open');
}

function precosSlug(term) {
  return String(term || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || ('busca-' + Date.now().toString(36));
}

function submitPrecosNew() {
  var term = document.getElementById('precosNewTerm').value.trim();
  if (!term) { showToast('Informe o termo de busca.', 'error'); return; }
  var id = precosSlug(term);
  var data = {
    id: id, termo: term,
    teto: document.getElementById('precosNewTeto').value.trim(),
    obrigatorias: document.getElementById('precosNewObr').value.trim(),
    proibidas: document.getElementById('precosNewPro').value.trim(),
    arquivada: false, criado: Date.now()
  };
  jbRun('addPrecosBusca', data).then(function (res) {
    (DATA.precosBuscas = DATA.precosBuscas || []).push(Object.assign({}, data, { id: res.id || id }));
    closeOverlay('precosNewOverlay');
    renderPrecos();
    openPrecosSearch(res.id || id);
    showToast('✓ Busca criada — toque em Buscar preços quando quiser.');
  }).catch(function (e) { showToast(t('err.prefix') + e.message, 'error'); });
}

function refreshPrecosSearch() {
  if (!PRECOS_OPEN_ID || PRECOS_FETCHING) return;
  var busca = precosActiveBuscas().find(function (b) { return String(b.id) === String(PRECOS_OPEN_ID); });
  if (!busca) return;
  PRECOS_FETCHING = true;
  paintPrecosSearch(false);
  fetch('/api/precos?q=' + encodeURIComponent(busca.termo))
    .then(function (r) { return r.json().then(function (j) { return { ok: r.ok, j: j }; }); })
    .then(function (res) {
      var body = res.j || {};
      if (!res.ok || body.error) throw new Error(body.error || 'Falha na busca');
      var today = body.date || precosTodayKey();
      var offers = body.offers || [];
      var json = JSON.stringify(offers);
      return jbRun('savePrecosCaptura', { buscaId: busca.id, data: today, json: json, criado: Date.now() }).then(function () {
        DATA.precosCapturas = DATA.precosCapturas || [];
        var hit = false;
        DATA.precosCapturas.forEach(function (c) {
          if (String(c.buscaId) === String(busca.id) && c.data === today) { c.json = json; hit = true; }
        });
        if (!hit) DATA.precosCapturas.push({ id: precosUid(), buscaId: busca.id, data: today, json: json, criado: Date.now() });
        PRECOS_RAW_BY_ID[busca.id] = precosRawFromSheet(busca.id);
        showToast('✓ ' + offers.length + ' ofertas guardadas · ' + today);
      });
    })
    .catch(function (e) { showToast(t('err.prefix') + (e.message || e), 'error'); })
    .finally(function () {
      PRECOS_FETCHING = false;
      paintPrecosSearch(false);
      renderPrecos();
    });
}

function precosSeedExample() {
  var data = {
    id: 'rx-9070-xt', termo: 'RX 9070 XT',
    teto: '', obrigatorias: PrecosMath.DEFAULT_RX_KEYWORDS.obrigatorias,
    proibidas: PrecosMath.DEFAULT_RX_KEYWORDS.proibidas,
    arquivada: false, criado: Date.now()
  };
  PRECOS_USE_SAMPLE = true;
  var exists = ((DATA.precosBuscas) || []).some(function (b) { return b.id === data.id; });
  if (exists) { renderPrecos(); openPrecosSearch(data.id); return; }
  jbRun('addPrecosBusca', data).then(function () {
    DATA.precosBuscas = DATA.precosBuscas || [];
    DATA.precosBuscas.push(data);
    PrecosMath.DEFAULT_GLOBAL_BLOCKS.forEach(function (b) {
      jbRun('addPrecosLoja', { buscaId: '', tipo: 'bloqueada', nome: b.nome, dominio: b.dominio, criado: Date.now() });
    });
    renderPrecos();
    openPrecosSearch(data.id);
  }).catch(function (e) { showToast(t('err.prefix') + e.message, 'error'); });
}

function togglePrecosConferida(buscaId, keyEnc, preco) {
  var key = decodeURIComponent(keyEnc);
  var conf = precosConferidaMap(buscaId)[key];
  var on = !conf;
  jbRun('setPrecosConferida', buscaId, key, precosTodayKey(), preco, on).then(function () {
    DATA.precosConferidas = DATA.precosConferidas || [];
    DATA.precosConferidas = DATA.precosConferidas.filter(function (c) { return !(c.buscaId === buscaId && c.chave === key); });
    if (on) DATA.precosConferidas.push({ buscaId: buscaId, chave: key, data: precosTodayKey(), preco: preco, conferidoEm: Date.now() });
    paintPrecosSearch(false);
  }).catch(function (e) { showToast(t('err.prefix') + e.message, 'error'); });
}

function precosAllowStore(buscaId, nome, dominio) {
  jbRun('addPrecosLoja', { buscaId: buscaId, tipo: 'permitida', nome: nome, dominio: dominio || '', criado: Date.now() }).then(function (res) {
    DATA.precosLojas = DATA.precosLojas || [];
    DATA.precosLojas.push({ id: res.id || precosUid(), buscaId: buscaId, tipo: 'permitida', nome: nome, dominio: dominio || '', criado: Date.now() });
    showToast('✓ Loja na lista de permitidas desta busca');
    paintPrecosSearch(true);
  }).catch(function (e) { showToast(t('err.prefix') + e.message, 'error'); });
}

function precosBlockStore(nome, dominio) {
  jbRun('addPrecosLoja', { buscaId: '', tipo: 'bloqueada', nome: nome, dominio: dominio || '', criado: Date.now() }).then(function (res) {
    DATA.precosLojas = DATA.precosLojas || [];
    var row = { id: res.id || precosUid(), buscaId: '', tipo: 'bloqueada', nome: nome, dominio: dominio || '', criado: Date.now() };
    DATA.precosLojas.push(row);
    showToast(PK.blockUndo, null, function () {
      jbRun('deletePrecosLoja', row.id).then(function () {
        DATA.precosLojas = DATA.precosLojas.filter(function (x) { return x.id !== row.id; });
        paintPrecosSearch(true);
      });
    });
    paintPrecosSearch(true);
  }).catch(function (e) { showToast(t('err.prefix') + e.message, 'error'); });
}

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
    PRECOS_RAW = {};
    paintPrecosSearch(true);
    renderPrecos();
    showToast('✓ Preço manual registrado');
  }).catch(function (e) { showToast(t('err.prefix') + e.message, 'error'); });
}

function openPrecosFilters() {
  var b = precosActiveBuscas().find(function (x) { return x.id === PRECOS_OPEN_ID; });
  if (!b) return;
  document.getElementById('precosFilTeto').value = b.teto !== '' && b.teto != null ? b.teto : '';
  document.getElementById('precosFilObr').value = b.obrigatorias || '';
  document.getElementById('precosFilPro').value = b.proibidas || '';
  document.getElementById('precosFiltersOverlay').classList.add('open');
  loadPrecosRaw(b.id).then(function (raw) {
    var seen = PrecosMath.storesSeenLastDays(raw, 30, precosTodayKey());
    document.getElementById('precosStoresSeen').innerHTML = seen.map(function (s) {
      return '<div class="precos-store-row"><span>' + esc(s.nome) + ' <span class="muted">(' + s.count + ')</span></span>'
        + '<span class="precos-store-actions">'
        + '<button type="button" class="sec-action" onclick="precosAllowStore(\'' + escAttr(b.id) + '\',\'' + escAttr(s.nome) + '\',\'' + escAttr(s.dominio || '') + '\')">Permitir</button>'
        + '<button type="button" class="sec-action muted" onclick="precosBlockStore(\'' + escAttr(s.nome) + '\',\'' + escAttr(s.dominio || '') + '\')">Bloquear</button>'
        + '</span></div>';
    }).join('') || '<div class="muted">Nenhuma loja recente.</div>';
  });
}

function submitPrecosFilters() {
  var b = precosActiveBuscas().find(function (x) { return x.id === PRECOS_OPEN_ID; });
  if (!b) return;
  var patch = {
    termo: b.termo,
    teto: document.getElementById('precosFilTeto').value.trim(),
    obrigatorias: document.getElementById('precosFilObr').value.trim(),
    proibidas: document.getElementById('precosFilPro').value.trim(),
    arquivada: b.arquivada,
    criado: b.criado
  };
  jbRun('updatePrecosBusca', b.id, patch).then(function () {
    Object.assign(b, patch);
    closeOverlay('precosFiltersOverlay');
    PRECOS_RAW = {};
    paintPrecosSearch(true);
    renderPrecos();
    showToast('✓ Filtros salvos');
  }).catch(function (e) { showToast(t('err.prefix') + e.message, 'error'); });
}

function openPrecosSettingsPanel() {
  var p = precosPrefs();
  document.getElementById('precosSetHideBrl').checked = p.hideNonBrl;
  document.getElementById('precosSetShowBoth').checked = p.showBoth;
  document.getElementById('precosSetPriceKind').value = p.priceKind;
  document.getElementById('precosSetChartRange').value = p.chartRange;
  document.getElementById('precosSettingsOverlay').classList.add('open');
}

function submitPrecosSettingsPanel() {
  precosSavePref('precos_hide_non_brl', document.getElementById('precosSetHideBrl').checked ? 'true' : 'false');
  precosSavePref('precos_show_both', document.getElementById('precosSetShowBoth').checked ? 'true' : 'false');
  precosSavePref('precos_price_kind', document.getElementById('precosSetPriceKind').value);
  precosSavePref('precos_chart_range', document.getElementById('precosSetChartRange').value);
  closeOverlay('precosSettingsOverlay');
  paintPrecosSearch(true);
  showToast('✓ Ajustes salvos');
}

function archivePrecosSearch() {
  var b = precosActiveBuscas().find(function (x) { return x.id === PRECOS_OPEN_ID; });
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
    JB.onTabVisible(function () { if (document.getElementById('tab-bills').classList.contains('active')) renderPrecos(); });
  }
}
