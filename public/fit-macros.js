/* Joelboard Fit — Macros tab. Loads after fit.js. © 2026 Joel Soluções LTDA. */
var MACRO_MEALS_DEFAULT = [
  { id: 'breakfast', name: 'Café da manhã', order: 0 },
  { id: 'lunch', name: 'Almoço', order: 1 },
  { id: 'dinner', name: 'Jantar', order: 2 },
  { id: 'snacks', name: 'Lanches', order: 3 }
];
var MACRO_GOALS_DEFAULT = { p: 150, c: 200, g: 65, kcal: 2200 };
var MACRO_SHOW_DEFAULT = { p: true, c: true, g: true, kcal: true };
var MACRO_PRESETS_GLOBAL = [
  { l: '100 g', g: 100 }, { l: '50 g', g: 50 }, { l: '30 g', g: 30 },
  { l: '1 colher sopa (~15 g)', g: 15 }, { l: '1 colher chá (~5 g)', g: 5 }
];
var _bundledFoods = null, _macroDate = null, _macroPick = null, _macroEdit = null, _macroCustomEdit = null, _macroSearchT = null, _macroMealsSortable = null, _offCache = {}, _stMacros = false;

function macroToday() { return new Date().toISOString().slice(0, 10); }
function macroDate() { return _macroDate || macroToday(); }
function macroSetDate(d) { _macroDate = d; renderMacros(); }

function macroMeals() {
  var m = (DATA.config && DATA.config.macromeals) || [];
  if (!m.length) return MACRO_MEALS_DEFAULT.slice();
  return m.slice().sort(function (a, b) { return (a.order || 0) - (b.order || 0); });
}
function macroGoals() {
  var g = (DATA.config && DATA.config.macrogoals) || {};
  return { p: Number(g.p) || MACRO_GOALS_DEFAULT.p, c: Number(g.c) || MACRO_GOALS_DEFAULT.c, g: Number(g.g) || MACRO_GOALS_DEFAULT.g, kcal: Number(g.kcal) || MACRO_GOALS_DEFAULT.kcal };
}
function macroShow() {
  var s = (DATA.config && DATA.config.macroshow) || {};
  return { p: s.p !== false, c: s.c !== false, g: s.g !== false, kcal: s.kcal !== false };
}
function macroFavs() { return (DATA.config && DATA.config.macrofavs) || []; }

function macroSaveMeals(meals) {
  DATA.config = DATA.config || {};
  DATA.config.macromeals = meals;
  saveConfig('macromeals', JSON.stringify(meals));
}
function macroSaveGoals(g) {
  DATA.config = DATA.config || {};
  DATA.config.macrogoals = g;
  saveConfig('macrogoals', JSON.stringify(g));
}
function macroSaveShow(s) {
  DATA.config = DATA.config || {};
  DATA.config.macroshow = s;
  saveConfig('macroshow', JSON.stringify(s));
}
function macroSaveFavs(f) {
  DATA.config = DATA.config || {};
  DATA.config.macrofavs = f;
  saveConfig('macrofavs', JSON.stringify(f));
}

function macroLogRow(e) {
  return [e.date, e.mealId, e.name, e.grams, e.p, e.c, e.g, e.k, e.ref, e.src, e.id];
}
function macroFoodRow(f) {
  return [f.name, f.p100, f.c100, f.g100, f.k100, f.id];
}
function macroParseLog(r) {
  return { id: r[10], date: String(r[0]), mealId: String(r[1]), name: r[2], grams: Number(r[3]) || 0, p: Number(r[4]) || 0, c: Number(r[5]) || 0, g: Number(r[6]) || 0, k: Number(r[7]) || 0, ref: String(r[8] || ''), src: r[9] || 'bundled' };
}
function macroParseFood(r) {
  return { id: r[5], name: r[0], p100: Number(r[1]) || 0, c100: Number(r[2]) || 0, g100: Number(r[3]) || 0, k100: Number(r[4]) || 0 };
}

function macroEntriesFor(date) {
  return (DATA.macrolog || []).filter(function (e) { return e.date === date; });
}
function macroTotals(entries) {
  var t = { p: 0, c: 0, g: 0, k: 0 };
  (entries || []).forEach(function (e) {
    t.p += e.p; t.c += e.c; t.g += e.g; t.k += e.k;
  });
  t.p = Math.round(t.p * 10) / 10;
  t.c = Math.round(t.c * 10) / 10;
  t.g = Math.round(t.g * 10) / 10;
  t.k = Math.round(t.k);
  return t;
}
function macroScale(p100, c100, g100, k100, grams) {
  var f = (Number(grams) || 0) / 100;
  return {
    p: Math.round((Number(p100) || 0) * f * 10) / 10,
    c: Math.round((Number(c100) || 0) * f * 10) / 10,
    g: Math.round((Number(g100) || 0) * f * 10) / 10,
    k: Math.round((Number(k100) || 0) * f)
  };
}

function macroRing(pct, color, label, val, goal, unit) {
  var C = 2 * Math.PI * 36, pctClamped = Math.min(1, Math.max(0, pct)), off = C * (1 - pctClamped);
  return '<div class="mring"><svg viewBox="0 0 80 80" width="72" height="72">'
    + '<circle cx="40" cy="40" r="36" fill="none" style="stroke:var(--surface2)" stroke-width="7"/>'
    + (pctClamped > 0 ? '<circle class="mring-arc" cx="40" cy="40" r="36" fill="none" stroke="' + color + '" stroke-width="7" stroke-linecap="round" stroke-dasharray="' + C + '" stroke-dashoffset="' + C + '" data-off="' + off + '" transform="rotate(-90 40 40)"/>' : '')
    + '</svg><div class="mring-in"><div class="mring-val">' + val + '</div><div class="mring-lbl">' + label + '</div></div></div>'
    + '<div class="mring-meta">' + Math.round(pctClamped * 100) + '% <span class="muted">/ ' + goal + unit + '</span></div>';
}
function animateMacroRings(root) {
  root = root || document;
  requestAnimationFrame(function () {
    requestAnimationFrame(function () {
      var arcs = root.querySelectorAll ? root.querySelectorAll('.mring-arc') : [];
      for (var i = 0; i < arcs.length; i++) arcs[i].style.strokeDashoffset = arcs[i].getAttribute('data-off') || '0';
    });
  });
}

function macroFmtDate(iso) {
  if (iso === macroToday()) return 'Hoje';
  var p = iso.split('-');
  return p[2] + '/' + p[1];
}

function loadBundledFoods(cb) {
  if (_bundledFoods) { cb(_bundledFoods); return; }
  fetch('/fit-foods.json').then(function (r) { return r.json(); }).then(function (j) {
    _bundledFoods = (j || []).map(function (f) {
      return { id: f.id, name: f.n, p100: f.p, c100: f.c, g100: f.g, k100: f.k, src: 'bundled', presets: f.presets || [], tags: f.tags || [] };
    });
    cb(_bundledFoods);
  }).catch(function () { _bundledFoods = []; cb([]); });
}

function macroCustomFoods() {
  return (DATA.macrofoods || []).map(function (f) {
    return { id: f.id, name: f.name, p100: f.p100, c100: f.c100, g100: f.g100, k100: f.k100, src: 'custom', presets: [] };
  });
}

function macroNorm(s) {
  return String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function macroFoodHaystack(f) {
  return macroNorm([f.name].concat(f.tags || []).concat(f.id ? [String(f.id).replace(/-/g, ' ')] : []).join(' '));
}

function macroSearchBundled(q, list) {
  q = macroNorm(q).trim();
  if (!q) return list.slice(0, 24);
  return list.filter(function (f) { return macroFoodHaystack(f).indexOf(q) > -1; }).slice(0, 24);
}

function macroSearchOff(q, cb) {
  q = (q || '').trim();
  if (!q || q.length < 2) { cb([]); return; }
  if (_offCache[q]) { cb(_offCache[q]); return; }
  var url = 'https://world.openfoodfacts.org/cgi/search.pl?search_terms=' + encodeURIComponent(q) + '&json=1&page_size=12&fields=product_name,brands,nutriments,code';
  fetch(url).then(function (r) { return r.json(); }).then(function (data) {
    var out = [];
    (data.products || []).forEach(function (p) {
      var n = p.nutriments || {};
      var p100 = Number(n['proteins_100g']); var c100 = Number(n['carbohydrates_100g']);
      var g100 = Number(n['fat_100g']); var k100 = Number(n['energy-kcal_100g']);
      if (!(p100 >= 0) && !(c100 >= 0) && !(g100 >= 0) && !(k100 > 0)) return;
      var name = (p.product_name || '').trim();
      if (p.brands) name += (name ? ' · ' : '') + String(p.brands).split(',')[0].trim();
      if (!name) return;
      out.push({ id: 'off:' + p.code, name: name, p100: p100 || 0, c100: c100 || 0, g100: g100 || 0, k100: k100 || 0, src: 'off', presets: [] });
    });
    _offCache[q] = out;
    cb(out);
  }).catch(function () { cb([]); });
}

function renderMacros() {
  var el = $('p-macros'); if (!el || !DATA) return;
  var date = macroDate(), entries = macroEntriesFor(date), totals = macroTotals(entries);
  var goals = macroGoals(), show = macroShow(), meals = macroMeals();
  var rings = '';
  if (show.kcal) rings += '<div class="mring-wrap">' + macroRing(totals.k / goals.kcal, 'var(--primary)', 'kcal', totals.k, goals.kcal, '') + '</div>';
  if (show.p) rings += '<div class="mring-wrap">' + macroRing(totals.p / goals.p, '#60a5fa', 'Proteína', totals.p, goals.p, 'g') + '</div>';
  if (show.c) rings += '<div class="mring-wrap">' + macroRing(totals.c / goals.c, '#fbbf24', 'Carbs', totals.c, goals.c, 'g') + '</div>';
  if (show.g) rings += '<div class="mring-wrap">' + macroRing(totals.g / goals.g, '#34d399', 'Gordura', totals.g, goals.g, 'g') + '</div>';

  var mealHtml = meals.map(function (m) {
    var items = entries.filter(function (e) { return e.mealId === m.id; });
    var mt = macroTotals(items);
    var lines = items.length ? items.map(function (it) {
      return '<div class="mline" onclick="macroEditEntry(\'' + it.id + '\')">'
        + '<div class="mline-l"><div class="mline-n">' + esc(it.name) + '</div><div class="mline-g">' + it.grams + ' g · P ' + it.p + ' · C ' + it.c + ' · G ' + it.g + ' · ' + it.k + ' kcal</div></div>'
        + '<button class="rm" onclick="event.stopPropagation();macroDelEntry(\'' + it.id + '\')">✕</button></div>';
    }).join('') : '<div class="rg" style="padding:6px 2px">Nenhum alimento ainda.</div>';
    return '<div class="mmeal"><div class="mmeal-h"><span class="mmeal-t">' + esc(m.name) + '</span>'
      + '<span class="mmeal-sum">P ' + mt.p + ' · C ' + mt.c + ' · G ' + mt.g + ' · ' + mt.k + ' kcal</span></div>'
      + lines
      + '<button class="madd" onclick="macroOpenAdd(\'' + m.id + '\')">+ Adicionar alimento</button></div>';
  }).join('');

  var favs = macroFavs().slice(0, 8);
  var favHtml = favs.length ? '<div class="mfav"><div class="sect" style="margin-bottom:8px">Favoritos</div><div class="mfav-row">'
    + favs.map(function (f) {
      return '<button class="mfav-btn" onclick="macroQuickFav(\'' + escAttr(f.key) + '\')">' + esc(f.name) + '</button>';
    }).join('') + '</div></div>' : '';

  el.innerHTML = '<div class="mhead">'
    + '<button class="lnk" onclick="macroNav(-1)">‹</button>'
    + '<button class="field datebtn" style="flex:1;text-align:center" onclick="macroPickDate()">' + macroFmtDate(date) + '</button>'
    + '<button class="lnk" onclick="macroNav(1)">›</button>'
    + '<button class="lnk" onclick="macroCopyYesterday()" title="Copiar ontem">↻</button>'
    + '</div>'
    + '<div class="mrings">' + (rings || '<div class="rg">Defina metas em <button class="lnk" onclick="openMacroSettings()">Ajustes → Macros</button></div>') + '</div>'
    + favHtml + '<div class="jb-meal-list">' + mealHtml + '</div>';
  animateMacroRings(el);
  if (!_stMacros) {
    _stMacros = true;
    var ml = el.querySelector('.jb-meal-list');
    if (ml) JB.staggerChildren(ml, 'macros-meals');
  }
}

function macroNav(d) {
  var p = macroDate().split('-').map(Number);
  var dt = new Date(p[0], p[1] - 1, p[2]);
  dt.setDate(dt.getDate() + d);
  macroSetDate(dt.getFullYear() + '-' + String(dt.getMonth() + 1).padStart(2, '0') + '-' + String(dt.getDate()).padStart(2, '0'));
}
function macroPickDate() {
  JB.datePicker(macroDate(), function (iso) { if (iso) macroSetDate(iso); });
}

function macroOpenAdd(mealId) {
  _macroPick = { mealId: mealId, food: null, grams: 100 };
  $('macroSearch').value = '';
  $('macroStep1').style.display = '';
  $('macroStep2').style.display = 'none';
  $('macroAddTitle').textContent = 'Adicionar alimento';
  renderMacroSearch('');
  renderMacroFavQuick();
  $('macroAddOverlay').classList.add('open');
  setTimeout(function () { var i = $('macroSearch'); if (i) i.focus(); }, 60);
}
function macroCloseAdd() { $('macroAddOverlay').classList.remove('open'); _macroPick = null; }

function renderMacroFavQuick() {
  var el = $('macroFavQuick'); if (!el) return;
  var favs = macroFavs().slice(0, 6);
  el.innerHTML = favs.length ? favs.map(function (f, i) {
    return '<button class="mfav-btn" onclick="macroSelectFavIdx(' + i + ')">' + esc(f.name) + '</button>';
  }).join('') : '';
}
function macroSelectFavIdx(i) {
  var f = macroFavs()[i];
  if (f) macroSelectFood({ id: f.id, name: f.name, p100: f.p100, c100: f.c100, g100: f.g100, k100: f.k100, src: f.src, presets: [] });
}

function onMacroSearch(v) {
  clearTimeout(_macroSearchT);
  _macroSearchT = setTimeout(function () { renderMacroSearch(v); }, 300);
}

function renderMacroSearch(q) {
  var el = $('macroSearchList'); if (!el) return;
  el.innerHTML = '<div class="rg" style="padding:10px">Buscando…</div>';
  loadBundledFoods(function (bundled) {
    var custom = macroCustomFoods();
    var local = macroSearchBundled(q, bundled.concat(custom));
    macroSearchOff(q, function (off) {
      var seen = {}, rows = [];
      local.forEach(function (f) { if (!seen[f.id]) { seen[f.id] = 1; rows.push(f); } });
      off.forEach(function (f) { if (!seen[f.id]) { seen[f.id] = 1; rows.push(f); } });
      if (!rows.length) {
        el.innerHTML = '<div class="rg" style="padding:10px">Nada encontrado. <button class="lnk" onclick="macroOpenCustom()">Criar alimento custom</button></div>';
        return;
      }
      el.innerHTML = rows.map(function (f) {
        return '<div class="addrow" onclick="macroSelectFoodById(\'' + escAttr(f.id) + '\',\'' + escAttr(f.src) + '\')">'
          + '<span>' + esc(f.name) + (f.src === 'off' ? ' <span class="modebadge">OFF</span>' : '') + '</span>'
          + '<span class="plus">P' + f.p100 + ' C' + f.c100 + ' G' + f.g100 + '</span></div>';
      }).join('') + (q ? '<div class="addrow create" onclick="macroOpenCustom(\'' + escAttr(q) + '\')"><span>Criar “' + esc(q) + '” como custom</span><span class="plus">＋</span></div>' : '');
    });
  });
}

function macroFindFood(id, src) {
  var custom = (DATA.macrofoods || []).find(function (f) { return f.id === id; });
  if (custom) return { id: custom.id, name: custom.name, p100: custom.p100, c100: custom.c100, g100: custom.g100, k100: custom.k100, src: 'custom', presets: [] };
  if (_bundledFoods) {
    var b = _bundledFoods.find(function (f) { return f.id === id; });
    if (b) return b;
  }
  if (src === 'off' && _offCache) {
    var keys = Object.keys(_offCache);
    for (var i = 0; i < keys.length; i++) {
      var hit = _offCache[keys[i]].find(function (f) { return f.id === id; });
      if (hit) return hit;
    }
  }
  return null;
}

function macroSelectFoodById(id, src) {
  loadBundledFoods(function () {
    var f = macroFindFood(id, src);
    if (!f) return;
    macroSelectFood(f);
  });
}
function macroSelectFood(f) {
  if (typeof f === 'string') try { f = JSON.parse(f); } catch (e) { return; }
  if (!_macroPick) return;
  _macroPick.food = f;
  _macroPick.grams = 100;
  $('macroStep1').style.display = 'none';
  $('macroStep2').style.display = '';
  $('macroAddTitle').textContent = f.name;
  var presets = (f.presets || []).map(function (p) { return { l: p.l, g: p.g }; }).concat(MACRO_PRESETS_GLOBAL);
  var seen = {}, uniq = [];
  presets.forEach(function (p) { if (!seen[p.g]) { seen[p.g] = 1; uniq.push(p); } });
  $('macroPresets').innerHTML = uniq.slice(0, 8).map(function (p) {
    return '<button class="mpreset" onclick="macroSetGrams(' + p.g + ')">' + esc(p.l) + '</button>';
  }).join('');
  $('macroGrams').value = 100;
  macroUpdatePreview();
}
function macroSetGrams(g) { $('macroGrams').value = g; macroUpdatePreview(); }
function macroUpdatePreview() {
  if (!_macroPick || !_macroPick.food) return;
  var g = Number(($('macroGrams').value || '').replace(',', '.')) || 0;
  var s = macroScale(_macroPick.food.p100, _macroPick.food.c100, _macroPick.food.g100, _macroPick.food.k100, g);
  $('macroPreview').textContent = 'P ' + s.p + ' g · C ' + s.c + ' g · G ' + s.g + ' g · ' + s.k + ' kcal';
}

function macroConfirmAdd() {
  if (!_macroPick || !_macroPick.food) return;
  var g = Number(($('macroGrams').value || '').replace(',', '.')) || 0;
  if (!(g > 0)) { toast('Informe a quantidade em gramas'); return; }
  var f = _macroPick.food, s = macroScale(f.p100, f.c100, f.g100, f.k100, g);
  var entry = { id: uuid(), date: macroDate(), mealId: _macroPick.mealId, name: f.name, grams: g, p: s.p, c: s.c, g: s.g, k: s.k, ref: f.id, src: f.src };
  DATA.macrolog = DATA.macrolog || [];
  DATA.macrolog.push(entry);
  macroPersistAppend(entry);
  macroAddFav(f);
  macroCloseAdd();
  renderMacros();
  toast('✓ Adicionado');
}

function macroPersistAppend(entry) {
  JB.persist({
    run: function () {
      return JB.api('POST', ssUrl('/values/MacroLog:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS'), { values: [macroLogRow(entry)] });
    },
    onError: fitWriteErr
  });
}
function macroPersistUpdate(entry) {
  JB.persist({
    run: function () {
      return fitFindRow('MacroLog', 10, entry.id).then(function (row) {
        if (row < 0) throw new Error('Registro não encontrado');
        return JB.api('PUT', ssUrl('/values/' + encodeURIComponent('MacroLog!A' + row + ':K' + row) + '?valueInputOption=RAW'), { values: [macroLogRow(entry)] });
      });
    },
    onError: fitWriteErr
  });
}
function macroPersistDelete(id) {
  JB.persist({
    run: function () {
      return fitFindRow('MacroLog', 10, id).then(function (row) {
        if (row < 0) throw new Error('Registro não encontrado');
        return JB.api('POST', ssUrl(':batchUpdate'), { requests: [{ deleteDimension: { range: { sheetId: fitGrid['MacroLog'], dimension: 'ROWS', startIndex: row - 1, endIndex: row } } }] });
      });
    },
    onError: fitWriteErr
  });
}

function macroAddFav(f) {
  var favs = macroFavs(), key = f.src + ':' + f.id;
  favs = favs.filter(function (x) { return x.key !== key; });
  favs.unshift({ key: key, id: f.id, name: f.name, p100: f.p100, c100: f.c100, g100: f.g100, k100: f.k100, src: f.src });
  if (favs.length > 24) favs = favs.slice(0, 24);
  macroSaveFavs(favs);
}

function macroQuickFav(key) {
  var fav = macroFavs().find(function (f) { return f.key === key; });
  if (!fav) return;
  var meals = macroMeals();
  macroOpenAdd(meals[0] ? meals[0].id : 'breakfast');
  setTimeout(function () {
    macroSelectFood({ id: fav.id, name: fav.name, p100: fav.p100, c100: fav.c100, g100: fav.g100, k100: fav.k100, src: fav.src, presets: [] });
  }, 80);
}

function macroEditEntry(id) {
  var e = (DATA.macrolog || []).find(function (x) { return x.id === id; });
  if (!e) return;
  _macroEdit = e;
  $('macroEditName').textContent = e.name;
  $('macroEditGrams').value = e.grams;
  macroEditPreview();
  $('macroEditOverlay').classList.add('open');
}
function macroEditPreview() {
  if (!_macroEdit) return;
  var g = Number(($('macroEditGrams').value || '').replace(',', '.')) || 0;
  var per = macroScale(_macroEdit.p / (_macroEdit.grams || 100) * 100, _macroEdit.c / (_macroEdit.grams || 100) * 100, _macroEdit.g / (_macroEdit.grams || 100) * 100, _macroEdit.k / (_macroEdit.grams || 100) * 100, g);
  $('macroEditPreview').textContent = 'P ' + per.p + ' · C ' + per.c + ' · G ' + per.g + ' · ' + per.k + ' kcal';
}
function macroSaveEdit() {
  if (!_macroEdit) return;
  var g = Number(($('macroEditGrams').value || '').replace(',', '.')) || 0;
  if (!(g > 0)) return;
  var ratio = g / (_macroEdit.grams || 100);
  _macroEdit.grams = g;
  _macroEdit.p = Math.round(_macroEdit.p * ratio * 10) / 10;
  _macroEdit.c = Math.round(_macroEdit.c * ratio * 10) / 10;
  _macroEdit.g = Math.round(_macroEdit.g * ratio * 10) / 10;
  _macroEdit.k = Math.round(_macroEdit.k * ratio);
  macroPersistUpdate(_macroEdit);
  $('macroEditOverlay').classList.remove('open');
  _macroEdit = null;
  renderMacros();
  toast('✓ Atualizado');
}
function macroDelEntry(id) {
  DATA.macrolog = (DATA.macrolog || []).filter(function (e) { return e.id !== id; });
  macroPersistDelete(id);
  renderMacros();
  toast('✓ Removido');
}

function macroCopyYesterday() {
  var p = macroDate().split('-').map(Number);
  var dt = new Date(p[0], p[1] - 1, p[2]); dt.setDate(dt.getDate() - 1);
  var yd = dt.getFullYear() + '-' + String(dt.getMonth() + 1).padStart(2, '0') + '-' + String(dt.getDate()).padStart(2, '0');
  var src = macroEntriesFor(yd);
  if (!src.length) { toast('Ontem estava vazio'); return; }
  JB.confirm('Copiar ontem?', 'Adicionar ' + src.length + ' item(ns) de ' + macroFmtDate(yd) + ' para hoje.', function () {
    var rows = [], date = macroDate();
    src.forEach(function (e) {
      var n = { id: uuid(), date: date, mealId: e.mealId, name: e.name, grams: e.grams, p: e.p, c: e.c, g: e.g, k: e.k, ref: e.ref, src: e.src };
      DATA.macrolog.push(n);
      rows.push(macroLogRow(n));
    });
    JB.persist({
      run: function () {
        return JB.api('POST', ssUrl('/values/MacroLog:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS'), { values: rows });
      },
      onSuccess: function () { renderMacros(); toast('✓ Copiado'); },
      onError: fitWriteErr
    });
  });
}

function openMacroSettings() { openSettings('macros'); }

function renderMacroSettingsPanel() {
  var g = macroGoals(), s = macroShow();
  if ($('macroGoalP')) $('macroGoalP').value = g.p;
  if ($('macroGoalC')) $('macroGoalC').value = g.c;
  if ($('macroGoalG')) $('macroGoalG').value = g.g;
  if ($('macroGoalK')) $('macroGoalK').value = g.kcal;
  if ($('macroShowP')) $('macroShowP').classList.toggle('on', s.p);
  if ($('macroShowC')) $('macroShowC').classList.toggle('on', s.c);
  if ($('macroShowG')) $('macroShowG').classList.toggle('on', s.g);
  if ($('macroShowK')) $('macroShowK').classList.toggle('on', s.kcal);
  renderMacroMealsEditor();
  renderMacroCustomList();
}
function macroGoalsFromInputs() {
  return {
    p: Number($('macroGoalP').value) || 0,
    c: Number($('macroGoalC').value) || 0,
    g: Number($('macroGoalG').value) || 0,
    kcal: Number($('macroGoalK').value) || 0
  };
}
function macroSaveGoalsFromInputs() {
  macroSaveGoals(macroGoalsFromInputs());
  renderMacros();
}
function macroApplyMealOrder(meals) {
  meals.forEach(function (m, i) { m.order = i; });
  macroSaveMeals(meals);
  renderMacroMealsEditor();
  renderMacros();
}
function renderMacroMealsEditor() {
  var el = $('macroMealsEdit'); if (!el) return;
  el.innerHTML = macroMeals().map(function (m) {
    return '<div class="mmealedit" data-meal-id="' + escAttr(m.id) + '"><span class="dh" title="Arrastar">⠿</span>'
      + '<input class="field" value="' + escAttr(m.name) + '" onchange="macroRenameMealById(\'' + escAttr(m.id) + '\',this.value)">'
      + '<button class="rm" onclick="macroRemoveMealById(\'' + escAttr(m.id) + '\')">✕</button></div>';
  }).join('');
  initMacroMealsSort();
}
function initMacroMealsSort() {
  if (_macroMealsSortable) { try { _macroMealsSortable.destroy(); } catch (e) {} _macroMealsSortable = null; }
  var el = $('macroMealsEdit');
  if (!el || !window.Sortable || !el.querySelector('.mmealedit')) return;
  _macroMealsSortable = Sortable.create(el, {
    animation: 150,
    handle: '.dh',
    draggable: '.mmealedit',
    onEnd: function () {
      var ids = Array.prototype.slice.call(el.querySelectorAll('.mmealedit')).map(function (n) { return n.getAttribute('data-meal-id'); });
      var byId = {};
      macroMeals().forEach(function (m) { byId[m.id] = m; });
      var meals = ids.map(function (id) { return byId[id]; }).filter(Boolean);
      macroApplyMealOrder(meals);
    }
  });
}
function macroRenameMealById(id, name) {
  var meals = macroMeals();
  var m = meals.find(function (x) { return x.id === id; });
  if (!m) return;
  m.name = (name || '').trim() || m.name;
  macroSaveMeals(meals);
  renderMacros();
}
function macroRemoveMealById(id) {
  var meals = macroMeals();
  if (meals.length <= 1) { toast('Precisa de ao menos uma refeição'); return; }
  macroApplyMealOrder(meals.filter(function (x) { return x.id !== id; }));
}
function macroAddMeal() {
  var meals = macroMeals();
  meals.push({ id: 'meal_' + uuid().slice(0, 8), name: 'Nova refeição', order: meals.length });
  macroApplyMealOrder(meals);
}
function toggleMacroShow(el) {
  el.classList.toggle('on');
  macroSaveShow({
    p: $('macroShowP').classList.contains('on'),
    c: $('macroShowC').classList.contains('on'),
    g: $('macroShowG').classList.contains('on'),
    kcal: $('macroShowK').classList.contains('on')
  });
  renderMacros();
}

function macroCustomUi() {
  var editing = !!_macroCustomEdit;
  $('macroCustomTitle').textContent = editing ? 'Editar alimento' : 'Alimento custom';
  $('macroCustomDel').style.display = editing ? '' : 'none';
  $('macroCustomSave').textContent = editing ? 'Salvar alterações' : 'Salvar';
}
function macroCloseCustom() {
  $('macroCustomOverlay').classList.remove('open');
  _macroCustomEdit = null;
}
function macroOpenCustom(prefill) {
  _macroCustomEdit = null;
  macroCustomUi();
  $('macroCustomName').value = prefill || '';
  $('macroCustomP').value = ''; $('macroCustomC').value = ''; $('macroCustomG').value = ''; $('macroCustomK').value = '';
  $('macroCustomOverlay').classList.add('open');
}
function macroEditCustom(id) {
  var f = (DATA.macrofoods || []).find(function (x) { return x.id === id; });
  if (!f) return;
  _macroCustomEdit = id;
  macroCustomUi();
  $('macroCustomName').value = f.name;
  $('macroCustomP').value = f.p100; $('macroCustomC').value = f.c100;
  $('macroCustomG').value = f.g100; $('macroCustomK').value = f.k100;
  $('macroCustomOverlay').classList.add('open');
}
function macroSyncFavFood(f) {
  var key = 'custom:' + f.id, favs = macroFavs(), changed = false;
  favs = favs.map(function (x) {
    if (x.key !== key) return x;
    changed = true;
    return { key: key, id: f.id, name: f.name, p100: f.p100, c100: f.c100, g100: f.g100, k100: f.k100, src: 'custom' };
  });
  if (changed) macroSaveFavs(favs);
}
function macroSaveCustom() {
  var name = ($('macroCustomName').value || '').trim();
  var p100 = Number(($('macroCustomP').value || '').replace(',', '.')) || 0;
  var c100 = Number(($('macroCustomC').value || '').replace(',', '.')) || 0;
  var g100 = Number(($('macroCustomG').value || '').replace(',', '.')) || 0;
  var k100 = Number(($('macroCustomK').value || '').replace(',', '.')) || 0;
  if (!name) { toast('Nome obrigatório'); return; }
  DATA.macrofoods = DATA.macrofoods || [];
  if (_macroCustomEdit) {
    var row = DATA.macrofoods.find(function (x) { return x.id === _macroCustomEdit; });
    if (!row) return;
    row.name = name; row.p100 = p100; row.c100 = c100; row.g100 = g100; row.k100 = k100;
    JB.persist({
      run: function () {
        return fitFindRow('MacroFoods', 5, row.id).then(function (r) {
          if (r < 0) throw new Error('Alimento não encontrado');
          return JB.api('PUT', ssUrl('/values/' + encodeURIComponent('MacroFoods!A' + r + ':F' + r) + '?valueInputOption=RAW'), { values: [macroFoodRow(row)] });
        });
      },
      onSuccess: function () {
        macroSyncFavFood(row);
        macroCloseCustom();
        renderMacroCustomList();
        toast('✓ Atualizado');
      },
      onError: fitWriteErr
    });
    return;
  }
  var id = uuid(), row = { id: id, name: name, p100: p100, c100: c100, g100: g100, k100: k100 };
  DATA.macrofoods.push(row);
  JB.persist({
    run: function () {
      return JB.api('POST', ssUrl('/values/MacroFoods:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS'), { values: [macroFoodRow(row)] });
    },
    onSuccess: function () {
      macroCloseCustom();
      if (_macroPick) macroSelectFood({ id: id, name: name, p100: p100, c100: c100, g100: g100, k100: k100, src: 'custom', presets: [] });
      else { renderMacroCustomList(); toast('✓ Alimento salvo'); }
    },
    onError: fitWriteErr
  });
}
function macroDeleteCustom(id) {
  id = id || _macroCustomEdit;
  if (!id) return;
  var f = (DATA.macrofoods || []).find(function (x) { return x.id === id; });
  if (!f) return;
  JB.confirm('Excluir alimento?', 'Remover “' + f.name + '” da biblioteca custom.', function () {
    DATA.macrofoods = DATA.macrofoods.filter(function (x) { return x.id !== id; });
    var key = 'custom:' + id;
    var favs = macroFavs().filter(function (x) { return x.key !== key; });
    if (favs.length !== macroFavs().length) macroSaveFavs(favs);
    JB.persist({
      run: function () {
        return fitFindRow('MacroFoods', 5, id).then(function (r) {
          if (r < 0) throw new Error('Alimento não encontrado');
          return JB.api('POST', ssUrl(':batchUpdate'), { requests: [{ deleteDimension: { range: { sheetId: fitGrid['MacroFoods'], dimension: 'ROWS', startIndex: r - 1, endIndex: r } } }] });
        });
      },
      onSuccess: function () {
        macroCloseCustom();
        renderMacroCustomList();
        toast('✓ Removido');
      },
      onError: fitWriteErr
    });
  });
}
function renderMacroCustomList() {
  var el = $('macroCustomList'); if (!el) return;
  var foods = DATA.macrofoods || [];
  el.innerHTML = foods.length ? foods.map(function (f) {
    return '<div class="mcustom-row" onclick="macroEditCustom(\'' + f.id + '\')">'
      + '<div class="mcustom-l"><div class="rn">' + esc(f.name) + '</div><div class="rg">P' + f.p100 + ' C' + f.c100 + ' G' + f.g100 + ' · ' + f.k100 + ' kcal/100g</div></div>'
      + '<button class="rm" onclick="event.stopPropagation();macroDeleteCustom(\'' + f.id + '\')">✕</button></div>';
  }).join('') : '<div class="rg">Nenhum alimento custom ainda.</div>';
}
