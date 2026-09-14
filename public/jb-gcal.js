/* Joelboard → Google Calendar (opt-in Hub publish). © 2026 Joel Soluções LTDA.
   Classic global; loads after /joelboard.js. Exposes JB.gcal / JB_GCAL.
   One-way: Hub events into an app-created "Joelboard" agenda. No reminders. */
(function () {
  var CAL_SCOPE = 'https://www.googleapis.com/auth/calendar.app.created';
  var API = 'https://www.googleapis.com/calendar/v3';
  var KEY_ON = 'jb_gcal';
  var KEY_ID = 'jb_gcal_id';
  var KEY_AT = 'jb_gcal_at';
  var KEY_LINK = 'jb_gcal_link';
  var KEY_ERR = 'jb_gcal_err';
  var KEY_WANT = 'jb_gcal_want';
  var CAL_NAME = 'Joelboard';
  var CAL_DESC = 'Eventos do Calendar do Hub Joelboard. Lembretes desligados — avisos por app vêm depois.';
  var APP_LABEL = { finance: 'Finance', fit: 'Fit', study: 'Study', notas: 'Notes', planner: 'Planner', recipes: 'Recipes' };
  var syncTimer = null;
  var lastPack = null;
  var syncing = false;
  var queued = null;
  var busy = false;

  function lg(k){ try { return localStorage.getItem(k); } catch (_) { return null; } }
  function ls(k, v){ try { localStorage.setItem(k, v); } catch (_) {} }
  function lr(k){ try { localStorage.removeItem(k); } catch (_) {} }
  function sg(k){ try { return sessionStorage.getItem(k); } catch (_) { return null; } }
  function ss(k, v){ try { sessionStorage.setItem(k, v); } catch (_) {} }
  function sr(k){ try { sessionStorage.removeItem(k); } catch (_) {} }
  function pad(n){ return (n < 10 ? '0' : '') + n; }
  function isOn(){ return lg(KEY_ON) === '1'; }
  function setOn(v){ if (v) ls(KEY_ON, '1'); else lr(KEY_ON); }
  function calId(){ return lg(KEY_ID) || ''; }
  function setCalId(id){ if (id) ls(KEY_ID, id); else lr(KEY_ID); }
  function calLink(){ return lg(KEY_LINK) || ''; }
  function setCalLink(url){ if (url) ls(KEY_LINK, url); else lr(KEY_LINK); }
  function lastAt(){ return Number(lg(KEY_AT) || 0) || 0; }
  function setLastAt(ms){ if (ms) ls(KEY_AT, String(ms)); else lr(KEY_AT); }
  function lastErr(){ return lg(KEY_ERR) || ''; }
  function setLastErr(msg){ if (msg) ls(KEY_ERR, String(msg).slice(0, 180)); else lr(KEY_ERR); }
  function tz(){
    try { return Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/Sao_Paulo'; }
    catch (_) { return 'America/Sao_Paulo'; }
  }
  function pageOrigin(explicit){
    if (explicit) return String(explicit).replace(/\/$/, '');
    try { return String((window.location && window.location.origin) || '').replace(/\/$/, '') || 'https://joelboard.vercel.app'; }
    catch (_) { return 'https://joelboard.vercel.app'; }
  }
  function addDaysYmd(iso, n){
    var p = String(iso || '').slice(0, 10).split('-');
    if (p.length < 3) return '';
    var d = new Date(Number(p[0]), Number(p[1]) - 1, Number(p[2]) + (n || 0));
    if (isNaN(d.getTime())) return '';
    return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  }
  function minToHm(min){
    min = Number(min) || 0;
    if (min < 0) min = 0;
    if (min > 1439) min = 1439;
    return pad(Math.floor(min / 60)) + ':' + pad(min % 60);
  }
  function hasClock(e){
    var t = e && e.timeMin;
    if (t === '' || t == null) return false;
    var n = Number(t);
    return n >= 0 && n < 1440;
  }
  function absHref(href, origin){
    href = String(href || '');
    origin = pageOrigin(origin);
    if (!href) return origin + '/';
    if (/^https?:\/\//i.test(href)) return href;
    return origin + (href.charAt(0) === '/' ? href : '/' + href);
  }
  function appLabel(app){ return APP_LABEL[app] || 'Joelboard'; }

  function eventBody(e, opts){
    opts = opts || {};
    e = e || {};
    var origin = pageOrigin(opts.origin);
    var zone = opts.timeZone || tz();
    var date = String(e.date || '').slice(0, 10);
    var summary = String(e.title || 'Joelboard');
    if (e.done) summary = '✓ ' + summary;
    var url = absHref(e.href, origin);
    var desc = appLabel(e.app);
    if (e.subtitle) desc += ' · ' + e.subtitle;
    desc += '\n' + url;
    var start, end;
    if (hasClock(e)) {
      var tmin = Number(e.timeMin);
      start = { dateTime: date + 'T' + minToHm(tmin) + ':00', timeZone: zone };
      end = { dateTime: date + 'T' + minToHm(Math.min(1439, tmin + 60)) + ':00', timeZone: zone };
    } else {
      start = { date: date };
      end = { date: addDaysYmd(date, 1) };
    }
    return {
      summary: summary,
      description: desc,
      start: start,
      end: end,
      source: { title: 'Joelboard', url: url },
      extendedProperties: { private: { jb: String(e.id || '') } },
      reminders: { useDefault: false, overrides: [] },
      status: 'confirmed',
      transparency: e.done ? 'transparent' : 'opaque'
    };
  }

  function jbIdOf(g){
    try { return String((g.extendedProperties && g.extendedProperties.private && g.extendedProperties.private.jb) || ''); }
    catch (_) { return ''; }
  }
  function boundKey(b){
    if (!b) return '';
    if (b.date) return 'd:' + b.date;
    var dt = String(b.dateTime || '');
    var m = dt.match(/^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2})/);
    return 't:' + (m ? m[1] : dt);
  }
  function eventStamp(body){
    body = body || {};
    return [
      body.summary || '',
      boundKey(body.start),
      boundKey(body.end),
      String(body.description || '').replace(/\r\n/g, '\n'),
      body.transparency || 'opaque',
      (body.reminders && body.reminders.useDefault) ? '1' : '0'
    ].join('\n');
  }
  function sameEvent(g, body){
    return eventStamp({
      summary: g && g.summary,
      start: g && g.start,
      end: g && g.end,
      description: g && g.description,
      transparency: (g && g.transparency) || 'opaque',
      reminders: { useDefault: !!(g && g.reminders && g.reminders.useDefault) }
    }) === eventStamp(body);
  }

  function syncPlan(hubEvents, gcalEvents, opts){
    var want = {};
    (hubEvents || []).forEach(function (e) {
      if (!e || !e.id) return;
      var date = String(e.date || '').slice(0, 10);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return;
      want[String(e.id)] = e;
    });
    var have = {};
    var remove = [];
    (gcalEvents || []).forEach(function (g) {
      if (!g || !g.id) return;
      var jb = jbIdOf(g);
      if (!jb) return;
      if (!want[jb]) remove.push(g.id);
      else have[jb] = g;
    });
    var upsert = [];
    Object.keys(want).forEach(function (id) {
      var body = eventBody(want[id], opts);
      var g = have[id];
      if (!g) upsert.push({ method: 'POST', body: body });
      else if (!sameEvent(g, body)) upsert.push({ method: 'PATCH', id: g.id, body: body });
    });
    return { upsert: upsert, remove: remove };
  }

  function toast(msg){ if (window.JB && JB.toast) JB.toast(msg); }
  function ghost(){ return !!(window.JB && JB.isGhost && JB.isGhost()); }
  function signedIn(){ return !!(window.JB && JB.isSignedIn && JB.isSignedIn()); }
  function qOff(){ return { queue: false }; }
  function calUrl(path){ return API + path; }
  function calApi(method, path, body){
    return JB.api(method, calUrl(path), body || undefined, qOff());
  }
  function openUrl(id){
    if (!id) return '';
    return 'https://calendar.google.com/calendar/r?cid=' + encodeURIComponent(id);
  }
  function ymdToIso(ymd, end){
    var p = String(ymd || '').slice(0, 10).split('-');
    var d = new Date(Number(p[0]), Number(p[1]) - 1, Number(p[2]), end ? 23 : 0, end ? 59 : 0, end ? 59 : 0);
    return d.toISOString();
  }

  function paint(){
    var tg = document.getElementById('hubGcalTg');
    var st = document.getElementById('hubGcalStatus');
    var open = document.getElementById('hubGcalOpen');
    if (tg) {
      var on = isOn();
      var err = lastErr();
      tg.classList.toggle('on', on && !err);
      tg.setAttribute('aria-pressed', on ? 'true' : 'false');
      tg.disabled = !!(busy || (ghost() && !on));
      tg.textContent = !on ? 'Publicar no Google Calendar' : (err ? 'Tentar de novo' : 'Publicando no Google Calendar');
    }
    if (st) {
      if (ghost()) st.textContent = 'Ghost não publica no Google — ligue isto com uma conta real.';
      else if (!signedIn()) st.textContent = 'Entre com Google para publicar o Calendar.';
      else if (busy || syncing) st.textContent = 'Publicando…';
      else if (lastErr()) st.textContent = lastErr();
      else if (isOn() && lastAt()) {
        var d = new Date(lastAt());
        st.textContent = 'Última publicação: ' + pad(d.getDate()) + '/' + pad(d.getMonth() + 1) + ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes()) + '. Sem lembretes.';
      } else if (isOn()) st.textContent = 'Ligado — publica depois que o Calendar do Hub carregar.';
      else st.textContent = '';
    }
    if (open) {
      var href = calLink() || openUrl(calId());
      var show = !!(isOn() && href && !lastErr());
      open.classList.toggle('on', show);
      open.hidden = !show;
      if (href) open.href = href;
    }
  }

  function setBusy(v){ busy = !!v; paint(); }

  function requestCalendarScope(opts){
    opts = opts || {};
    if (!window.JB || !JB.requestExtraScope) return Promise.reject(new Error('no_auth'));
    try { ss(KEY_WANT, '1'); } catch (_) {}
    return JB.requestExtraScope(CAL_SCOPE, { force: !!opts.force }).then(function (tok) {
      sr(KEY_WANT);
      return tok;
    }, function (err) {
      if (err && String(err.message || err) === 'oauth_redirect') return new Promise(function () {});
      sr(KEY_WANT);
      throw err;
    });
  }

  function rememberCal(cal){
    if (!cal || !cal.id) return;
    setCalId(cal.id);
    setCalLink(cal.htmlLink || openUrl(cal.id));
  }
  function clearCal(){
    setCalId('');
    setCalLink('');
    setLastAt(0);
  }
  function createCalendar(){
    return calApi('POST', '/calendars', {
      summary: CAL_NAME,
      description: CAL_DESC,
      timeZone: tz()
    }).then(function (cal) {
      rememberCal(cal);
      return cal;
    });
  }
  function ensureCalendar(){
    var id = calId();
    if (!id) return createCalendar();
    return calApi('GET', '/calendars/' + encodeURIComponent(id)).then(function (cal) {
      rememberCal(cal);
      return cal;
    }).catch(function (err) {
      if (err && (err.status === 404 || err.status === 410)) {
        clearCal();
        return createCalendar();
      }
      throw err;
    });
  }
  function removePublishedCalendar(){
    var id = calId();
    if (!id) {
      clearCal();
      return Promise.resolve('missing');
    }
    return calApi('DELETE', '/calendars/' + encodeURIComponent(id)).then(function () {
      clearCal();
      return 'deleted';
    }).catch(function (err) {
      if (err && (err.status === 404 || err.status === 410)) {
        clearCal();
        return 'deleted';
      }
      throw err;
    });
  }

  function listEvents(id, start, end){
    var all = [];
    var timeMin = encodeURIComponent(ymdToIso(start, false));
    var timeMax = encodeURIComponent(ymdToIso(addDaysYmd(end, 1), false));
    function page(token){
      var q = '/calendars/' + encodeURIComponent(id) + '/events?singleEvents=true&showDeleted=false&maxResults=2500'
        + '&timeMin=' + timeMin + '&timeMax=' + timeMax;
      if (token) q += '&pageToken=' + encodeURIComponent(token);
      return calApi('GET', q).then(function (res) {
        (res.items || []).forEach(function (it) { all.push(it); });
        if (res.nextPageToken) return page(res.nextPageToken);
        return all;
      });
    }
    return page('');
  }

  function pool(items, n, worker){
    items = items || [];
    if (!items.length) return Promise.resolve();
    var i = 0, active = 0, failed = null;
    return new Promise(function (res, rej) {
      function kick(){
        if (failed) return;
        if (i >= items.length && active === 0) { res(); return; }
        while (active < n && i < items.length) {
          (function (item) {
            active++;
            Promise.resolve(worker(item)).then(function () {
              active--;
              kick();
            }, function (err) {
              failed = err || new Error('gcal_sync');
              rej(failed);
            });
          })(items[i++]);
        }
      }
      kick();
    });
  }

  function applyPlan(id, plan){
    var base = '/calendars/' + encodeURIComponent(id) + '/events';
    return pool(plan.remove, 3, function (eid) {
      return calApi('DELETE', base + '/' + encodeURIComponent(eid) + '?sendUpdates=none').catch(function (err) {
        if (err && (err.status === 404 || err.status === 410)) return;
        throw err;
      });
    }).then(function () {
      return pool(plan.upsert, 3, function (op) {
        if (op.method === 'PATCH') {
          return calApi('PATCH', base + '/' + encodeURIComponent(op.id) + '?sendUpdates=none', op.body);
        }
        return calApi('POST', base + '?sendUpdates=none', op.body);
      });
    });
  }

  function packWindow(pack){
    if (pack && pack.window && pack.window.start && pack.window.end) return pack.window;
    if (window.JB && JB.cal && JB.cal.rangeForView && JB.cal.addDays) {
      var r = JB.cal.rangeForView('month', pack && pack.range && pack.range.date);
      return { start: JB.cal.addDays(r.start, -7), end: JB.cal.addDays(r.end, 14) };
    }
    var today = (window.JB && JB.todayYmd) ? JB.todayYmd() : addDaysYmd(new Date().toISOString().slice(0, 10), 0);
    return { start: addDaysYmd(today, -7), end: addDaysYmd(today, 45) };
  }

  function errMessage(err){
    var code = err && err.code;
    if (code === 'JB_CALENDAR_API_OFF') return 'Ligue a API Google Calendar no projeto Google deste login.';
    if (code === 'JB_NEED_CALENDAR_SCOPE') return 'O Google ainda não liberou o Calendar. Toque em Tentar de novo e aceite a permissão extra.';
    if (err && (err.message === 'cancelled' || err.message === 'access_denied')) return 'Publicação no Google Calendar cancelada.';
    if (err && err.message === 'ghost') return 'Ghost não publica no Google Calendar.';
    return 'Não foi possível publicar no Google Calendar.';
  }

  function runSync(pack, opts){
    opts = opts || {};
    pack = pack || lastPack;
    if (!isOn() || ghost() || !signedIn() || !window.JB || !JB.api) return Promise.resolve();
    if (syncing) { queued = pack; return Promise.resolve(); }
    syncing = true;
    paint();
    var win = packWindow(pack);
    var asked = false;
    function go(){
      return ensureCalendar().then(function (cal) {
        return listEvents(cal.id, win.start, win.end).then(function (remote) {
          var plan = syncPlan((pack && pack.events) || [], remote);
          return applyPlan(cal.id, plan);
        });
      });
    }
    return go().catch(function (err) {
      if (err && err.code === 'JB_NEED_CALENDAR_SCOPE' && !asked) {
        asked = true;
        return requestCalendarScope({ force: true }).then(go);
      }
      throw err;
    }).then(function () {
      setLastErr('');
      setLastAt(Date.now());
      if (opts.toast) toast('Agenda Joelboard no Google Calendar.');
    }).catch(function (err) {
      setLastErr(errMessage(err));
      if (opts.toast || opts.force) toast(errMessage(err));
    }).then(function () {
      syncing = false;
      paint();
      if (queued) {
        var next = queued;
        queued = null;
        return runSync(next);
      }
    });
  }

  function scheduleSync(pack){
    lastPack = pack || lastPack;
    if (!isOn() || ghost()) return;
    clearTimeout(syncTimer);
    syncTimer = setTimeout(function () { runSync(lastPack); }, 1400);
  }

  function startPublish(){
    setBusy(true);
    requestCalendarScope({ force: true }).then(function () {
      setOn(true);
      setLastErr('');
      paint();
      return runSync(lastPack, { toast: true, force: true });
    }).catch(function (err) {
      setOn(false);
      setLastErr(errMessage(err));
      toast(errMessage(err));
    }).then(function () { setBusy(false); paint(); });
  }
  function stopPublish(){
    function finish(ok){
      setOn(false);
      setLastErr('');
      setBusy(false);
      paint();
      toast(ok
        ? 'Agenda Joelboard removida do Google Calendar.'
        : 'Parou de publicar. Se a agenda Joelboard ainda aparecer no Google, apague por lá.');
    }
    setBusy(true);
    paint();
    function del(){ return removePublishedCalendar(); }
    del().then(function () { finish(true); }, function (err) {
      if (err && err.code === 'JB_NEED_CALENDAR_SCOPE') {
        return requestCalendarScope({ force: true }).then(del).then(function () { finish(true); }, function () { finish(false); });
      }
      finish(false);
    });
  }
  function toggle(){
    if (ghost()) { toast('Ghost não publica no Google Calendar.'); paint(); return; }
    if (!signedIn()) { toast('Entre com Google para publicar o Calendar.'); return; }
    if (isOn() && lastErr()) { startPublish(); return; }
    if (isOn()) {
      if (window.JB && JB.confirm) {
        JB.confirm('Parar de publicar?', 'Apaga a agenda Joelboard no Google Calendar. O Calendar do Hub continua aqui.', stopPublish, {
          yes: 'Apagar agenda', no: 'Cancelar', danger: true
        });
      } else stopPublish();
      return;
    }
    startPublish();
  }

  function consumePending(){
    if (sg(KEY_WANT) !== '1') return;
    sr(KEY_WANT);
    if (ghost() || !signedIn()) return;
    var granted = window.JB && JB.hasGrantedScope && JB.hasGrantedScope(CAL_SCOPE);
    if (!granted) return;
    setOn(true);
    setLastErr('');
    toast('Agenda Joelboard no Google Calendar.');
    scheduleSync(lastPack);
  }

  var api = {
    CAL_SCOPE: CAL_SCOPE,
    CAL_NAME: CAL_NAME,
    eventBody: eventBody,
    jbIdOf: jbIdOf,
    sameEvent: sameEvent,
    syncPlan: syncPlan,
    addDaysYmd: addDaysYmd,
    isOn: isOn,
    paint: paint,
    toggle: toggle,
    scheduleSync: scheduleSync,
    sync: function (pack, opts) { return runSync(pack, opts); }
  };
  window.JB_GCAL = api;
  if (window.JB) window.JB.gcal = api;

  if (window.JB && JB.whenReady) {
    JB.whenReady(function () {
      consumePending();
      paint();
    });
  } else {
    paint();
  }
})();
