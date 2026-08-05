/* Joelboard Fit — Macros tab. Loads after fit.js. © 2026 Joel Soluções LTDA. */
var MACRO_MEALS_DEFAULT = [
  { id: 'breakfast', name: 'Café da manhã', order: 0 },
  { id: 'lunch', name: 'Almoço', order: 1 },
  { id: 'dinner', name: 'Jantar', order: 2 },
  { id: 'snacks', name: 'Lanches', order: 3 }
];
var MACRO_GOALS_DEFAULT = { p: 150, c: 200, g: 65, f: 25, sf: 10, kcal: 2200, water: 2000 };
var MACRO_SHOW_DEFAULT = { p: true, c: true, g: true, f: true, sf: true, kcal: true, water: true };
var MACRO_ACTIVITY = [
  { id: 'sedentary', mult: 1.2 },
  { id: 'light', mult: 1.375 },
  { id: 'moderate', mult: 1.55 },
  { id: 'active', mult: 1.725 },
  { id: 'very', mult: 1.9 }
];
var MACRO_GOAL_ADJ = { cut: -400, maintain: 0, bulk: 300 };
var MACRO_GOAL_LABEL = { cut: 'Perder peso', maintain: 'Manter peso', bulk: 'Ganhar massa' };
var MACRO_PRESETS_GLOBAL = [
  { l: '100 g', g: 100 }, { l: '50 g', g: 50 }, { l: '30 g', g: 30 },
  { l: '1 colher sopa (~15 g)', g: 15 }, { l: '1 colher chá (~5 g)', g: 5 }
];
var _bundledFoods = null, _macroDate = null, _macroPick = null, _macroEdit = null, _macroCustomEdit = null, _macroSearchT = null, _macroMealsSortable = null, _offCache = {}, _stMacros = false, _macroVpBound = false, _macroWaterOpen = false, _macroWaterPour = false, _macroWaterOutsideBound = false;

function macroToday() { return JB.todayYmd(); }
function macroDate() { return _macroDate || macroToday(); }
function macroSetDate(d) { _macroDate = d; renderMacros(); }

function macroMeals() {
  var m = (DATA.config && DATA.config.macromeals) || [];
  if (!m.length) return MACRO_MEALS_DEFAULT.slice();
  return m.slice().sort(function (a, b) { return (a.order || 0) - (b.order || 0); });
}
function macroGoals() {
  var g = (DATA.config && DATA.config.macrogoals) || {};
  var water = g.water != null && g.water !== '' ? Number(g.water) : MACRO_GOALS_DEFAULT.water;
  if (isNaN(water)) water = MACRO_GOALS_DEFAULT.water;
  return { p: Number(g.p) || MACRO_GOALS_DEFAULT.p, c: Number(g.c) || MACRO_GOALS_DEFAULT.c, g: Number(g.g) || MACRO_GOALS_DEFAULT.g, f: Number(g.f) || MACRO_GOALS_DEFAULT.f, sf: Number(g.sf) || MACRO_GOALS_DEFAULT.sf, kcal: Number(g.kcal) || MACRO_GOALS_DEFAULT.kcal, water: water };
}
function macroShow() {
  var s = (DATA.config && DATA.config.macroshow) || {};
  return { p: s.p !== false, c: s.c !== false, g: s.g !== false, f: s.f !== false, sf: s.sf !== false, kcal: s.kcal !== false, water: s.water !== false };
}
function macroWaterLog() {
  return (DATA.config && DATA.config.macrowaterlog) || {};
}
function macroWaterFor(date) {
  return Number(macroWaterLog()[date]) || 0;
}
function macroSaveWaterLog(log) {
  DATA.config = DATA.config || {};
  DATA.config.macrowaterlog = log;
  saveConfig('macrowaterlog', JSON.stringify(log));
}
function macroAddWater(ml) {
  ml = Number(ml) || 0;
  if (!ml) return;
  var date = macroDate(), log = macroWaterLog();
  log[date] = Math.max(0, macroWaterFor(date) + ml);
  _macroWaterPour = true;
  macroSaveWaterLog(log);
  renderMacros();
}
function macroAddWaterCustom() {
  var raw = ($('macroWaterCustom') && $('macroWaterCustom').value) || '';
  var v = Number(String(raw).replace(',', '.')) || 0;
  if (!(v > 0)) { toast('Informe os ml'); return; }
  macroAddWater(v);
  if ($('macroWaterCustom')) $('macroWaterCustom').value = '';
}
function macroResetWater() {
  var date = macroDate(), log = macroWaterLog();
  if (!macroWaterFor(date)) return;
  log[date] = 0;
  macroSaveWaterLog(log);
  renderMacros();
  toast('💧 Água zerada');
}
function macroSetWaterOpen(open, focusCustom) {
  _macroWaterOpen = !!open;
  var bar = document.querySelector('.mrings-bar');
  var w = document.querySelector('.mwater-widget');
  if (bar && w) {
    bar.classList.toggle('mwater-expanded', _macroWaterOpen);
    w.classList.toggle('open', _macroWaterOpen);
    var hit = w.querySelector('.mwater-hit');
    if (hit) hit.setAttribute('aria-expanded', _macroWaterOpen ? 'true' : 'false');
  }
  if (_macroWaterOpen) {
    macroBindWaterOutside();
    if (focusCustom !== false) {
      setTimeout(function () {
        var i = $('macroWaterCustom');
        if (i) try { i.focus({ preventScroll: true }); } catch (e) { i.focus(); }
      }, 380);
    }
  } else {
    macroUnbindWaterOutside();
  }
}
function macroToggleWater() {
  macroSetWaterOpen(!_macroWaterOpen);
}
function macroCloseWater() {
  if (!_macroWaterOpen) return;
  macroSetWaterOpen(false, false);
}
function macroBindWaterOutside() {
  if (_macroWaterOutsideBound) return;
  _macroWaterOutsideBound = true;
  setTimeout(function () {
    document.addEventListener('click', macroWaterOutsideClick, true);
  }, 0);
}
function macroUnbindWaterOutside() {
  if (!_macroWaterOutsideBound) return;
  _macroWaterOutsideBound = false;
  document.removeEventListener('click', macroWaterOutsideClick, true);
}
function macroWaterOutsideClick(e) {
  if (!_macroWaterOpen) return;
  var w = document.querySelector('.mwater-widget');
  if (w && w.contains(e.target)) return;
  macroCloseWater();
}
function macroWaterFmtMl(ml) {
  ml = Number(ml) || 0;
  if (ml >= 1000) return (Math.round(ml / 100) / 10) + 'L';
  return ml + ' ml';
}
function macroWaterWidgetHtml(ml, goal) {
  var pct = Math.min(100, Math.round((ml / Math.max(goal, 1)) * 100));
  var done = pct >= 100;
  var open = _macroWaterOpen;
  return '<aside class="mwater-widget' + (open ? ' open' : '') + (done ? ' mwater-done' : '') + '" aria-label="Água">'
    + '<button type="button" class="mwater-hit" onclick="macroToggleWater()" aria-expanded="' + (open ? 'true' : 'false') + '" title="Água — toque para adicionar">'
    + '<div class="mwater-glass" aria-hidden="true">'
    + '<div class="mwater-pour-stream"></div>'
    + '<div class="mwater-fill" data-pct="' + pct + '">'
    + '<div class="mwater-wave"></div><div class="mwater-wave mwater-wave2"></div>'
    + '</div></div>'
    + '<div class="mwater-mini">'
    + '<span class="mwater-mini-pct">' + pct + '%</span>'
    + '<span class="mwater-mini-ml">' + macroWaterFmtMl(ml) + '</span>'
    + (done ? '<span class="mwater-mini-done">✓</span>' : '')
    + '</div></button>'
    + '<div class="mwater-drawer" onclick="event.stopPropagation()">'
    + '<div class="mwater-drawer-hd">' + ml + ' / ' + goal + ' ml</div>'
    + '<div class="mwater-btns">' + [200, 250, 500].map(function (n) {
      return '<button type="button" class="mw-btn" onclick="macroAddWater(' + n + ')">+' + n + '</button>';
    }).join('') + '</div>'
    + '<div class="mwater-custom">'
    + '<input class="field mwater-in" id="macroWaterCustom" type="number" inputmode="numeric" placeholder="ml…" onkeydown="if(event.key===\'Enter\'){event.preventDefault();macroAddWaterCustom();}">'
    + '<button type="button" class="mw-btn mw-add" onclick="macroAddWaterCustom()">+</button>'
    + '</div>'
    + '<button type="button" class="lnk mwater-reset" onclick="macroResetWater()">Zerar hoje</button>'
    + '</div></aside>';
}
function animateWaterFill(root, pour) {
  root = root || document;
  requestAnimationFrame(function () {
    requestAnimationFrame(function () {
      var widgets = root.querySelectorAll ? root.querySelectorAll('.mwater-widget') : [];
      for (var w = 0; w < widgets.length; w++) {
        var glass = widgets[w].querySelector('.mwater-glass');
        var fill = widgets[w].querySelector('.mwater-fill');
        var stream = widgets[w].querySelector('.mwater-pour-stream');
        if (!fill) continue;
        var pct = fill.getAttribute('data-pct') || 0;
        if (pour && glass) {
          glass.classList.add('mwater-pouring');
          fill.classList.add('mwater-fill-pour');
          if (stream) stream.classList.add('on');
          (function (g, f, s) {
            setTimeout(function () {
              g.classList.remove('mwater-pouring');
              f.classList.remove('mwater-fill-pour');
              if (s) s.classList.remove('on');
            }, 780);
          })(glass, fill, stream);
        }
        fill.style.height = pct + '%';
      }
    });
  });
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

function macroProfile() {
  return (DATA.config && DATA.config.macroprofile) || {};
}
function macroSaveProfile(p) {
  DATA.config = DATA.config || {};
  DATA.config.macroprofile = p;
  saveConfig('macroprofile', JSON.stringify(p));
}
function macroLatestWeightKg() {
  var ps = (DATA.pesos || []).slice().sort(function (a, b) { return (b.date || '').localeCompare(a.date || ''); });
  return ps.length ? ps[0].kg : 0;
}
function macroShowCalcBanner() {
  if (DATA.config && DATA.config.macrocalcdismissed) return false;
  if ((macroProfile() || {}).applied) return false;
  return true;
}
function macroDismissCalcBanner() {
  DATA.config = DATA.config || {};
  DATA.config.macrocalcdismissed = true;
  saveConfig('macrocalcdismissed', '1');
  renderMacros();
}
function macroActivityMult(id) {
  var hit = MACRO_ACTIVITY.filter(function (a) { return a.id === id; })[0];
  return hit ? hit.mult : 1.55;
}
function macroCalcBmr(sex, kg, cm, age) {
  kg = Number(kg); cm = Number(cm); age = Number(age);
  if (!(kg > 0) || !(cm > 0) || !(age > 0)) return 0;
  var base = 10 * kg + 6.25 * cm - 5 * age;
  return Math.round(sex === 'f' ? base - 161 : base + 5);
}
function macroCalcProfileFromInputs() {
  return {
    sex: ($('macroCalcSex') && $('macroCalcSex').value) || 'm',
    age: Number(($('macroCalcAge') && $('macroCalcAge').value) || 0),
    height: Number(($('macroCalcHeight') && $('macroCalcHeight').value) || 0),
    weight: Number(String(($('macroCalcWeight') && $('macroCalcWeight').value) || '').replace(',', '.')) || 0,
    activity: ($('macroCalcActivity') && $('macroCalcActivity').value) || 'moderate',
    goal: ($('macroCalcGoal') && $('macroCalcGoal').value) || 'maintain'
  };
}
function macroCalcFromProfile(p) {
  var bmr = macroCalcBmr(p.sex, p.weight, p.height, p.age);
  if (!bmr) return null;
  var tdee = Math.round(bmr * macroActivityMult(p.activity));
  var adj = MACRO_GOAL_ADJ[p.goal] != null ? MACRO_GOAL_ADJ[p.goal] : 0;
  var kcal = Math.max(1200, tdee + adj);
  var kg = Number(p.weight) || macroLatestWeightKg();
  var pG = Math.round(kg * 2);
  var gG = Math.round(kg * 0.8);
  var pK = pG * 4, gK = gG * 9;
  var cK = Math.max(0, kcal - pK - gK);
  var cG = Math.round(cK / 4);
  var fiber = Math.max(20, Math.round(kcal / 1000 * 14));
  var sf = Math.max(8, Math.round(fiber * 0.4));
  var water = Math.max(1500, Math.round(kg * 35 / 250) * 250);
  return { bmr: bmr, tdee: tdee, adj: adj, kcal: kcal, p: pG, c: cG, g: gG, f: fiber, sf: sf, water: water, goalLabel: MACRO_GOAL_LABEL[p.goal] || '' };
}
function macroCalcPreviewHtml(r, p) {
  if (!r) return '<div class="mcalc-empty">Preencha idade, altura e peso para ver a estimativa.</div>';
  var adjTxt = r.adj < 0 ? ('−' + Math.abs(r.adj)) : (r.adj > 0 ? ('+' + r.adj) : '0');
  return '<div class="mcalc-hd">Estimativa diária</div>'
    + '<div class="mcalc-row"><span>BMR (repouso)</span><strong>' + r.bmr + ' kcal</strong></div>'
    + '<div class="mcalc-row"><span>TDEE (manutenção)</span><strong>' + r.tdee + ' kcal</strong></div>'
    + '<div class="mcalc-row"><span>Alvo · ' + esc(r.goalLabel) + ' (' + adjTxt + ')</span><strong>' + r.kcal + ' kcal</strong></div>'
    + '<div class="mcalc-macros">'
    + '<div class="mcalc-row"><span>Proteína</span><strong>' + r.p + ' g</strong></div>'
    + '<div class="mcalc-row"><span>Carbs</span><strong>' + r.c + ' g</strong></div>'
    + '<div class="mcalc-row"><span>Gordura</span><strong>' + r.g + ' g</strong></div>'
    + '<div class="mcalc-row"><span>Fibra / Fibra sol.</span><strong>' + r.f + ' / ' + r.sf + ' g</strong></div>'
    + '<div class="mcalc-row"><span>Água</span><strong>' + r.water + ' ml</strong></div>'
    + '</div>'
    + '<p class="legal-note">Estimativa educacional — não substitui nutricionista ou médico. <a href="/aviso.html#fit-macros" target="_blank" rel="noopener">Detalhes</a></p>';
}
function macroCalcUpdatePreview() {
  var el = $('macroCalcPreview'); if (!el) return;
  el.innerHTML = macroCalcPreviewHtml(macroCalcFromProfile(macroCalcProfileFromInputs()));
}
function macroFillCalcForm() {
  var p = macroProfile(), w = macroLatestWeightKg();
  if ($('macroCalcSex')) $('macroCalcSex').value = p.sex === 'f' ? 'f' : 'm';
  if ($('macroCalcAge')) $('macroCalcAge').value = p.age > 0 ? p.age : '';
  if ($('macroCalcHeight')) $('macroCalcHeight').value = p.height > 0 ? p.height : '';
  if ($('macroCalcWeight')) $('macroCalcWeight').value = (p.weight > 0 ? p.weight : w) || '';
  if ($('macroCalcActivity')) $('macroCalcActivity').value = p.activity || 'moderate';
  if ($('macroCalcGoal')) $('macroCalcGoal').value = p.goal || 'maintain';
  macroCalcUpdatePreview();
}
function macroOpenCalc() {
  macroFillCalcForm();
  $('macroCalcOverlay').classList.add('open');
}
function macroCloseCalc() {
  $('macroCalcOverlay').classList.remove('open');
}
function macroApplyCalc() {
  var p = macroCalcProfileFromInputs();
  var r = macroCalcFromProfile(p);
  if (!r) { toast('Preencha idade, altura e peso'); return; }
  p.applied = true;
  p.appliedAt = JB.todayYmd();
  macroSaveProfile(p);
  macroSaveGoals({ p: r.p, c: r.c, g: r.g, f: r.f, sf: r.sf, kcal: r.kcal, water: r.water });
  if ($('macroGoalP')) renderMacroSettingsPanel();
  macroCloseCalc();
  renderMacros();
  toast('✓ Metas aplicadas');
}
function macroCalcBannerHtml() {
  if (!macroShowCalcBanner()) return '';
  return '<div class="mcalc-banner">'
    + '<div class="mcalc-banner-t"><div class="mcalc-title">Calcule suas metas de macros</div>'
    + '<div class="rg">Estimativa com Mifflin-St Jeor — não substitui orientação profissional. <a href="/aviso.html#fit-macros" target="_blank" rel="noopener">Saiba mais</a></div></div>'
    + '<div class="mcalc-banner-actions"><button class="btn btn-primary" onclick="macroOpenCalc()">Calcular</button>'
    + '<button class="mcalc-banner-x" onclick="macroDismissCalcBanner()" title="Fechar">✕</button></div></div>';
}

function macroLogRow(e) {
  return [e.date, e.mealId, e.name, e.grams, e.p, e.c, e.g, e.f, e.sf, e.k, e.ref, e.src, e.id];
}
function macroFoodRow(f) {
  return [f.name, f.p100, f.c100, f.g100, f.k100, f.f100, f.sf100, f.id];
}
function macroParseLog(r) {
  if (r.length >= 13) {
    return { id: r[12], date: String(r[0]), mealId: String(r[1]), name: r[2], grams: Number(r[3]) || 0, p: Number(r[4]) || 0, c: Number(r[5]) || 0, g: Number(r[6]) || 0, f: Number(r[7]) || 0, sf: Number(r[8]) || 0, k: Number(r[9]) || 0, ref: String(r[10] || ''), src: r[11] || 'bundled' };
  }
  if (r.length >= 12) {
    return { id: r[11], date: String(r[0]), mealId: String(r[1]), name: r[2], grams: Number(r[3]) || 0, p: Number(r[4]) || 0, c: Number(r[5]) || 0, g: Number(r[6]) || 0, f: Number(r[7]) || 0, sf: 0, k: Number(r[8]) || 0, ref: String(r[9] || ''), src: r[10] || 'bundled' };
  }
  return { id: r[10], date: String(r[0]), mealId: String(r[1]), name: r[2], grams: Number(r[3]) || 0, p: Number(r[4]) || 0, c: Number(r[5]) || 0, g: Number(r[6]) || 0, f: 0, sf: 0, k: Number(r[7]) || 0, ref: String(r[8] || ''), src: r[9] || 'bundled' };
}
function macroParseFood(r) {
  if (r.length >= 8) {
    return { id: r[7], name: r[0], p100: Number(r[1]) || 0, c100: Number(r[2]) || 0, g100: Number(r[3]) || 0, k100: Number(r[4]) || 0, f100: Number(r[5]) || 0, sf100: Number(r[6]) || 0 };
  }
  if (r.length >= 7) {
    return { id: r[6], name: r[0], p100: Number(r[1]) || 0, c100: Number(r[2]) || 0, g100: Number(r[3]) || 0, k100: Number(r[4]) || 0, f100: Number(r[5]) || 0, sf100: 0 };
  }
  return { id: r[5], name: r[0], p100: Number(r[1]) || 0, c100: Number(r[2]) || 0, g100: Number(r[3]) || 0, k100: Number(r[4]) || 0, f100: 0, sf100: 0 };
}
function macroFindLogRow(id) {
  return fitFindRow('MacroLog', 12, id).then(function (r) {
    if (r >= 0) return r;
    return fitFindRow('MacroLog', 11, id).then(function (r2) {
      if (r2 >= 0) return r2;
      return fitFindRow('MacroLog', 10, id);
    });
  });
}
function macroFindFoodRow(id) {
  return fitFindRow('MacroFoods', 7, id).then(function (r) {
    if (r >= 0) return r;
    return fitFindRow('MacroFoods', 6, id).then(function (r2) {
      if (r2 >= 0) return r2;
      return fitFindRow('MacroFoods', 5, id);
    });
  });
}

function macroEntriesFor(date) {
  return (DATA.macrolog || []).filter(function (e) { return e.date === date; });
}
function macroTotals(entries) {
  var t = { p: 0, c: 0, g: 0, f: 0, sf: 0, k: 0 };
  (entries || []).forEach(function (e) {
    t.p += e.p; t.c += e.c; t.g += e.g; t.f += e.f || 0; t.sf += e.sf || 0; t.k += e.k;
  });
  t.p = Math.round(t.p * 10) / 10;
  t.c = Math.round(t.c * 10) / 10;
  t.g = Math.round(t.g * 10) / 10;
  t.f = Math.round(t.f * 10) / 10;
  t.sf = Math.round(t.sf * 10) / 10;
  t.k = Math.round(t.k);
  return t;
}
function macroScale(p100, c100, g100, k100, grams, f100, sf100) {
  var f = (Number(grams) || 0) / 100;
  return {
    p: Math.round((Number(p100) || 0) * f * 10) / 10,
    c: Math.round((Number(c100) || 0) * f * 10) / 10,
    g: Math.round((Number(g100) || 0) * f * 10) / 10,
    f: Math.round((Number(f100) || 0) * f * 10) / 10,
    sf: Math.round((Number(sf100) || 0) * f * 10) / 10,
    k: Math.round((Number(k100) || 0) * f)
  };
}
function macroFmtLine(t) {
  return 'P ' + t.p + ' · C ' + t.c + ' · G ' + t.g + ' · F ' + (t.f || 0) + ' · Fs ' + (t.sf || 0) + ' · ' + t.k + ' kcal';
}
function macroFmtFood100(f) {
  return 'P' + f.p100 + ' C' + f.c100 + ' G' + f.g100 + ' F' + (f.f100 || 0) + ' Fs' + (f.sf100 || 0);
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
      return { id: f.id, name: f.n, p100: f.p, c100: f.c, g100: f.g, k100: f.k, f100: Number(f.f) || 0, sf100: Number(f.fs) || 0, src: 'bundled', presets: f.presets || [], tags: f.tags || [] };
    });
    cb(_bundledFoods);
  }).catch(function () { _bundledFoods = []; cb([]); });
}

function macroCustomFoods() {
  return (DATA.macrofoods || []).map(function (f) {
    return { id: f.id, name: f.name, p100: f.p100, c100: f.c100, g100: f.g100, k100: f.k100, f100: Number(f.f100) || 0, sf100: Number(f.sf100) || 0, src: 'custom', presets: [] };
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
      var f100 = Number(n['fiber_100g'] || n['fibers_100g']);
      if (!(p100 >= 0) && !(c100 >= 0) && !(g100 >= 0) && !(k100 > 0)) return;
      var name = (p.product_name || '').trim();
      if (p.brands) name += (name ? ' · ' : '') + String(p.brands).split(',')[0].trim();
      if (!name) return;
      out.push({ id: 'off:' + p.code, name: name, p100: p100 || 0, c100: c100 || 0, g100: g100 || 0, k100: k100 || 0, f100: f100 >= 0 ? f100 : 0, sf100: 0, src: 'off', presets: [] });
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
  if (show.f) rings += '<div class="mring-wrap">' + macroRing(totals.f / goals.f, '#c084fc', 'Fibra', totals.f, goals.f, 'g') + '</div>';
  if (show.sf) rings += '<div class="mring-wrap">' + macroRing(totals.sf / goals.sf, '#818cf8', 'Fibra sol.', totals.sf, goals.sf, 'g') + '</div>';

  var mealHtml = meals.map(function (m) {
    var items = entries.filter(function (e) { return e.mealId === m.id; });
    var mt = macroTotals(items);
    var lines = items.length ? items.map(function (it) {
      return '<div class="mline" onclick="macroEditEntry(\'' + it.id + '\')">'
        + '<div class="mline-l"><div class="mline-n">' + esc(it.name) + '</div><div class="mline-g">' + it.grams + ' g · ' + macroFmtLine(it) + '</div></div>'
        + '<button class="rm" onclick="event.stopPropagation();macroDelEntry(\'' + it.id + '\')">✕</button></div>';
    }).join('') : '<div class="rg" style="padding:6px 2px">Nenhum alimento ainda.</div>';
    return '<div class="mmeal"><div class="mmeal-h"><span class="mmeal-t">' + esc(m.name) + '</span>'
      + '<span class="mmeal-sum">' + macroFmtLine(mt) + '</span></div>'
      + lines
      + '<button class="madd" onclick="macroOpenAdd(\'' + m.id + '\')">+ Adicionar alimento</button></div>';
  }).join('');

  var favs = macroFavs().slice(0, 8);
  var favHtml = favs.length ? '<div class="mfav"><div class="sect" style="margin-bottom:8px">Favoritos</div><div class="mfav-row">'
    + favs.map(function (f) {
      return '<button class="mfav-btn" onclick="macroQuickFav(\'' + escAttr(f.key) + '\')">' + esc(f.name) + '</button>';
    }).join('') + '</div></div>' : '';

  var waterWidget = (show.water && goals.water > 0) ? macroWaterWidgetHtml(macroWaterFor(date), goals.water) : '';
  var ringsInner = rings || '<div class="rg">Defina metas em <button class="lnk" onclick="macroOpenCalc()">Calcular metas</button> ou <button class="lnk" onclick="openMacroSettings()">Ajustes → Macros</button></div>';
  var ringsBar = '<div class="mrings-bar' + (_macroWaterOpen ? ' mwater-expanded' : '') + '">'
    + '<div class="mrings mrings-main">' + ringsInner + '</div>'
    + waterWidget
    + '</div>';

  el.innerHTML = macroCalcBannerHtml()
    + '<div class="mhead">'
    + '<button class="lnk" onclick="macroNav(-1)">‹</button>'
    + '<button class="field datebtn" style="flex:1;text-align:center" onclick="macroPickDate()">' + macroFmtDate(date) + '</button>'
    + '<button class="lnk" onclick="macroNav(1)">›</button>'
    + '<button class="lnk" onclick="macroCopyYesterday()" title="Copiar ontem">↻</button>'
    + '</div>'
    + ringsBar
    + favHtml + '<div class="jb-meal-list">' + mealHtml + '</div>';
  animateMacroRings(el);
  animateWaterFill(el, _macroWaterPour);
  _macroWaterPour = false;
  if (_macroWaterOpen) macroBindWaterOutside();
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

function macroBindAddViewport() {
  if (_macroVpBound || !window.visualViewport) return;
  _macroVpBound = true;
  window.visualViewport.addEventListener('resize', macroSyncAddSheet);
  window.visualViewport.addEventListener('scroll', macroSyncAddSheet);
  var ov = $('macroAddOverlay');
  if (ov) ov.addEventListener('focusin', macroSyncAddSheet);
}
function macroSyncAddSheet() {
  var ov = $('macroAddOverlay');
  if (!ov || !ov.classList.contains('open')) return;
  var modal = ov.querySelector('.modal');
  if (!modal) return;
  if (window.innerWidth > 540 || !window.visualViewport) {
    modal.style.marginBottom = '';
    modal.style.maxHeight = '';
    return;
  }
  var vv = window.visualViewport;
  var kbGap = Math.max(0, window.innerHeight - (vv.height + vv.offsetTop));
  modal.style.marginBottom = kbGap ? kbGap + 'px' : '';
  modal.style.maxHeight = Math.max(240, vv.height - 16) + 'px';
}
function macroResetAddSheet() {
  var modal = $('macroAddOverlay') && $('macroAddOverlay').querySelector('.modal');
  if (modal) { modal.style.marginBottom = ''; modal.style.maxHeight = ''; }
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
  macroBindAddViewport();
  macroSyncAddSheet();
  setTimeout(function () {
    var i = $('macroSearch');
    if (i) {
      try { i.focus({ preventScroll: true }); } catch (e) { i.focus(); }
      macroSyncAddSheet();
    }
  }, 60);
}
function macroCloseAdd() {
  macroResetAddSheet();
  $('macroAddOverlay').classList.remove('open');
  _macroPick = null;
}

function renderMacroFavQuick() {
  var el = $('macroFavQuick'); if (!el) return;
  var favs = macroFavs().slice(0, 6);
  el.innerHTML = favs.length ? favs.map(function (f, i) {
    return '<button class="mfav-btn" onclick="macroSelectFavIdx(' + i + ')">' + esc(f.name) + '</button>';
  }).join('') : '';
}
function macroSelectFavIdx(i) {
  var f = macroFavs()[i];
  if (f) macroSelectFood({ id: f.id, name: f.name, p100: f.p100, c100: f.c100, g100: f.g100, k100: f.k100, f100: f.f100 || 0, sf100: f.sf100 || 0, src: f.src, presets: [] });
}

function onMacroSearch(v) {
  clearTimeout(_macroSearchT);
  _macroSearchT = setTimeout(function () { renderMacroSearch(v); }, 300);
}

function renderMacroSearch(q) {
  var el = $('macroSearchList'); if (!el) return;
  var loading = !el.querySelector('.addrow');
  if (loading) el.innerHTML = '<div class="rg" style="padding:10px">Buscando…</div>';
  loadBundledFoods(function (bundled) {
    var custom = macroCustomFoods();
    var local = macroSearchBundled(q, bundled.concat(custom));
    macroSearchOff(q, function (off) {
      var seen = {}, rows = [];
      local.forEach(function (f) { if (!seen[f.id]) { seen[f.id] = 1; rows.push(f); } });
      off.forEach(function (f) { if (!seen[f.id]) { seen[f.id] = 1; rows.push(f); } });
      if (!rows.length) {
        el.innerHTML = '<div class="rg" style="padding:10px">Nada encontrado. <button class="lnk" onclick="macroOpenCustom()">Criar alimento custom</button></div>';
        macroSyncAddSheet();
        return;
      }
      el.innerHTML = rows.map(function (f) {
        return '<div class="addrow" onclick="macroSelectFoodById(\'' + escAttr(f.id) + '\',\'' + escAttr(f.src) + '\')">'
          + '<span>' + esc(f.name) + (f.src === 'off' ? ' <span class="modebadge">OFF</span>' : '') + '</span>'
          + '<span class="plus">' + macroFmtFood100(f) + '</span></div>';
      }).join('') + (q ? '<div class="addrow create" onclick="macroOpenCustom(\'' + escAttr(q) + '\')"><span>Criar “' + esc(q) + '” como custom</span><span class="plus">＋</span></div>' : '');
      macroSyncAddSheet();
    });
  });
}

function macroFindFood(id, src) {
  var custom = (DATA.macrofoods || []).find(function (f) { return f.id === id; });
  if (custom) return { id: custom.id, name: custom.name, p100: custom.p100, c100: custom.c100, g100: custom.g100, k100: custom.k100, f100: Number(custom.f100) || 0, sf100: Number(custom.sf100) || 0, src: 'custom', presets: [] };
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
  macroSyncAddSheet();
}
function macroSetGrams(g) { $('macroGrams').value = g; macroUpdatePreview(); }
function macroUpdatePreview() {
  if (!_macroPick || !_macroPick.food) return;
  var g = Number(($('macroGrams').value || '').replace(',', '.')) || 0;
  var s = macroScale(_macroPick.food.p100, _macroPick.food.c100, _macroPick.food.g100, _macroPick.food.k100, g, _macroPick.food.f100, _macroPick.food.sf100);
  $('macroPreview').textContent = macroFmtLine(s);
}

function macroConfirmAdd() {
  if (!_macroPick || !_macroPick.food) return;
  var g = Number(($('macroGrams').value || '').replace(',', '.')) || 0;
  if (!(g > 0)) { toast('Informe a quantidade em gramas'); return; }
  var f = _macroPick.food, s = macroScale(f.p100, f.c100, f.g100, f.k100, g, f.f100, f.sf100);
  var entry = { id: uuid(), date: macroDate(), mealId: _macroPick.mealId, name: f.name, grams: g, p: s.p, c: s.c, g: s.g, f: s.f, sf: s.sf, k: s.k, ref: f.id, src: f.src };
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
      return macroFindLogRow(entry.id).then(function (row) {
        if (row < 0) throw new Error('Registro não encontrado');
        return JB.api('PUT', ssUrl('/values/' + encodeURIComponent('MacroLog!A' + row + ':M' + row) + '?valueInputOption=RAW'), { values: [macroLogRow(entry)] });
      });
    },
    onError: fitWriteErr
  });
}
function macroPersistDelete(id) {
  JB.persist({
    run: function () {
      return macroFindLogRow(id).then(function (row) {
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
  favs.unshift({ key: key, id: f.id, name: f.name, p100: f.p100, c100: f.c100, g100: f.g100, k100: f.k100, f100: f.f100 || 0, sf100: f.sf100 || 0, src: f.src });
  if (favs.length > 24) favs = favs.slice(0, 24);
  macroSaveFavs(favs);
}

function macroQuickFav(key) {
  var fav = macroFavs().find(function (f) { return f.key === key; });
  if (!fav) return;
  var meals = macroMeals();
  macroOpenAdd(meals[0] ? meals[0].id : 'breakfast');
  setTimeout(function () {
    macroSelectFood({ id: fav.id, name: fav.name, p100: fav.p100, c100: fav.c100, g100: fav.g100, k100: fav.k100, f100: fav.f100 || 0, sf100: fav.sf100 || 0, src: fav.src, presets: [] });
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
  var per = macroScale(_macroEdit.p / (_macroEdit.grams || 100) * 100, _macroEdit.c / (_macroEdit.grams || 100) * 100, _macroEdit.g / (_macroEdit.grams || 100) * 100, _macroEdit.k / (_macroEdit.grams || 100) * 100, g, (_macroEdit.f || 0) / (_macroEdit.grams || 100) * 100, (_macroEdit.sf || 0) / (_macroEdit.grams || 100) * 100);
  $('macroEditPreview').textContent = macroFmtLine(per);
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
  _macroEdit.f = Math.round((_macroEdit.f || 0) * ratio * 10) / 10;
  _macroEdit.sf = Math.round((_macroEdit.sf || 0) * ratio * 10) / 10;
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
      var n = { id: uuid(), date: date, mealId: e.mealId, name: e.name, grams: e.grams, p: e.p, c: e.c, g: e.g, f: e.f || 0, sf: e.sf || 0, k: e.k, ref: e.ref, src: e.src };
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
  if ($('macroGoalF')) $('macroGoalF').value = g.f;
  if ($('macroGoalSF')) $('macroGoalSF').value = g.sf;
  if ($('macroGoalK')) $('macroGoalK').value = g.kcal;
  if ($('macroGoalWater')) $('macroGoalWater').value = g.water;
  if ($('macroShowP')) $('macroShowP').classList.toggle('on', s.p);
  if ($('macroShowC')) $('macroShowC').classList.toggle('on', s.c);
  if ($('macroShowG')) $('macroShowG').classList.toggle('on', s.g);
  if ($('macroShowF')) $('macroShowF').classList.toggle('on', s.f);
  if ($('macroShowSF')) $('macroShowSF').classList.toggle('on', s.sf);
  if ($('macroShowK')) $('macroShowK').classList.toggle('on', s.kcal);
  if ($('macroShowWater')) $('macroShowWater').classList.toggle('on', s.water);
  renderMacroMealsEditor();
  renderMacroCustomList();
}
function macroGoalsFromInputs() {
  return {
    p: Number($('macroGoalP').value) || 0,
    c: Number($('macroGoalC').value) || 0,
    g: Number($('macroGoalG').value) || 0,
    f: Number($('macroGoalF').value) || 0,
    sf: Number($('macroGoalSF').value) || 0,
    kcal: Number($('macroGoalK').value) || 0,
    water: Number($('macroGoalWater').value) || 0
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
    f: $('macroShowF').classList.contains('on'),
    sf: $('macroShowSF').classList.contains('on'),
    kcal: $('macroShowK').classList.contains('on'),
    water: $('macroShowWater').classList.contains('on')
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
  $('macroCustomP').value = ''; $('macroCustomC').value = ''; $('macroCustomG').value = ''; $('macroCustomF').value = ''; $('macroCustomSF').value = ''; $('macroCustomK').value = '';
  $('macroCustomOverlay').classList.add('open');
}
function macroEditCustom(id) {
  var f = (DATA.macrofoods || []).find(function (x) { return x.id === id; });
  if (!f) return;
  _macroCustomEdit = id;
  macroCustomUi();
  $('macroCustomName').value = f.name;
  $('macroCustomP').value = f.p100; $('macroCustomC').value = f.c100;
  $('macroCustomG').value = f.g100; $('macroCustomF').value = f.f100 || 0; $('macroCustomSF').value = f.sf100 || 0; $('macroCustomK').value = f.k100;
  $('macroCustomOverlay').classList.add('open');
}
function macroSyncFavFood(f) {
  var key = 'custom:' + f.id, favs = macroFavs(), changed = false;
  favs = favs.map(function (x) {
    if (x.key !== key) return x;
    changed = true;
    return { key: key, id: f.id, name: f.name, p100: f.p100, c100: f.c100, g100: f.g100, k100: f.k100, f100: f.f100 || 0, sf100: f.sf100 || 0, src: 'custom' };
  });
  if (changed) macroSaveFavs(favs);
}
function macroSaveCustom() {
  var name = ($('macroCustomName').value || '').trim();
  var p100 = Number(($('macroCustomP').value || '').replace(',', '.')) || 0;
  var c100 = Number(($('macroCustomC').value || '').replace(',', '.')) || 0;
  var g100 = Number(($('macroCustomG').value || '').replace(',', '.')) || 0;
  var f100 = Number(($('macroCustomF').value || '').replace(',', '.')) || 0;
  var sf100 = Number(($('macroCustomSF').value || '').replace(',', '.')) || 0;
  var k100 = Number(($('macroCustomK').value || '').replace(',', '.')) || 0;
  if (!name) { toast('Nome obrigatório'); return; }
  DATA.macrofoods = DATA.macrofoods || [];
  if (_macroCustomEdit) {
    var row = DATA.macrofoods.find(function (x) { return x.id === _macroCustomEdit; });
    if (!row) return;
    row.name = name; row.p100 = p100; row.c100 = c100; row.g100 = g100; row.f100 = f100; row.sf100 = sf100; row.k100 = k100;
    JB.persist({
      run: function () {
        return macroFindFoodRow(row.id).then(function (r) {
          if (r < 0) throw new Error('Alimento não encontrado');
          return JB.api('PUT', ssUrl('/values/' + encodeURIComponent('MacroFoods!A' + r + ':H' + r) + '?valueInputOption=RAW'), { values: [macroFoodRow(row)] });
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
  var id = uuid(), row = { id: id, name: name, p100: p100, c100: c100, g100: g100, f100: f100, sf100: sf100, k100: k100 };
  DATA.macrofoods.push(row);
  JB.persist({
    run: function () {
      return JB.api('POST', ssUrl('/values/MacroFoods:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS'), { values: [macroFoodRow(row)] });
    },
    onSuccess: function () {
      macroCloseCustom();
      if (_macroPick) macroSelectFood({ id: id, name: name, p100: p100, c100: c100, g100: g100, f100: f100, sf100: sf100, k100: k100, src: 'custom', presets: [] });
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
        return macroFindFoodRow(id).then(function (r) {
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
      + '<div class="mcustom-l"><div class="rn">' + esc(f.name) + '</div><div class="rg">' + macroFmtFood100(f) + ' · ' + f.k100 + ' kcal/100g</div></div>'
      + '<button class="rm" onclick="event.stopPropagation();macroDeleteCustom(\'' + f.id + '\')">✕</button></div>';
  }).join('') : '<div class="rg">Nenhum alimento custom ainda.</div>';
}
