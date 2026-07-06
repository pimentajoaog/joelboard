/* Joelboard — shared core (auth + Google API). © 2026 Joel Soluções LTDA. */
(function () {
  var CLIENT_ID = '49262188240-l70ka2666t315gb2gmsvu357f2h7769i.apps.googleusercontent.com';
  var SCOPES = 'openid email profile https://www.googleapis.com/auth/spreadsheets https://www.googleapis.com/auth/drive.file';
  var TOK = 'jb_tok', EXP = 'jb_tok_exp', EML = 'jb_email';
  var tokenClient = null, pendingRes = null, pendingRej = null, inflightToken = null, refreshTimer = null;
  var SILENT_TIMEOUT_MS = 15000;

  function lg(k){ try { return localStorage.getItem(k); } catch (_) { return null; } }
  function ls(k, v){ try { localStorage.setItem(k, v); } catch (_) {} }
  function lr(k){ try { localStorage.removeItem(k); } catch (_) {} }

  function tokenExpiresAt(){ return Number(lg(EXP) || 0); }
  function isTokenValid(){ var t = lg(TOK), e = tokenExpiresAt(); return !!(t && e && Date.now() < e); }
  function cachedToken(){ return isTokenValid() ? lg(TOK) : ''; }
  function hasSession(){ if (lg('jb_signedout')) return false; return !!(lg(EML) || lg(TOK)); }
  function saveToken(tok, expiresIn){
    ls(TOK, tok);
    ls(EXP, String(Date.now() + (Number(expiresIn) || 3600) * 1000 - 120000));
    lr('jb_signedout');
    scheduleTokenRefresh();
  }
  function email(){ return lg(EML) || ''; }

  function clearRefreshTimer(){ if (refreshTimer) { clearTimeout(refreshTimer); refreshTimer = null; } }
  function scheduleTokenRefresh(){
    clearRefreshTimer();
    if (!hasSession()) return;
    var exp = tokenExpiresAt();
    if (!exp) return;
    var ms = exp - Date.now() - 300000;
    if (ms < 30000) ms = 30000;
    refreshTimer = setTimeout(function () {
      requestToken(false).catch(function () {}).then(function () { scheduleTokenRefresh(); });
    }, ms);
  }

  function ensureToken(interactive){
    if (isTokenValid()) return Promise.resolve(lg(TOK));
    return requestToken(!!interactive);
  }

  function ensureClient(cb){
    if (window.google && google.accounts && google.accounts.oauth2) {
      if (!tokenClient) {
        tokenClient = google.accounts.oauth2.initTokenClient({ client_id: CLIENT_ID, scope: SCOPES, callback: function (r) {
          if (r && r.access_token) {
            saveToken(r.access_token, r.expires_in);
            if (pendingRes) { var f = pendingRes; pendingRes = pendingRej = null; f(r.access_token); }
          }
          else { if (pendingRej) { var g = pendingRej; pendingRes = pendingRej = null; g(new Error('auth_failed')); } }
        } });
      }
      cb();
    } else setTimeout(function () { ensureClient(cb); }, 150);
  }

  var CONSENT_KEY = 'jb_consent';
  function needConsent(){ try { return localStorage.getItem(CONSENT_KEY) !== SCOPES; } catch (_) { return false; } }
  function ackConsent(){ try { localStorage.setItem(CONSENT_KEY, SCOPES); } catch (_) {} }
  function showConsent(onOk, onCancel){
    var ov = document.createElement('div');
    ov.id = 'jbConsent';
    ov.setAttribute('style', 'position:fixed;inset:0;background:rgba(0,0,0,0.72);display:flex;align-items:center;justify-content:center;z-index:99999;padding:20px');
    ov.innerHTML = '<div style="background:#1b1f32;border:1px solid #2b3147;border-radius:20px;max-width:430px;width:100%;padding:26px;color:#e7eaf3;max-height:92vh;overflow:auto;font-family:inherit">'
      + '<div style="font-size:20px;font-weight:800;margin-bottom:6px">Antes de entrar</div>'
      + '<div style="font-size:13px;color:#8a93a8;line-height:1.55;margin-bottom:16px">O Google vai mostrar um aviso de <b style="color:#e7eaf3">\u201capp n\u00e3o verificado\u201d</b>. \u00c9 esperado \u2014 este \u00e9 um app pessoal, ainda n\u00e3o verificado pelo Google. \u00c9 seguro: toque em <b style="color:#e7eaf3">Avan\u00e7ado \u2192 Acessar</b> para continuar.</div>'
      + '<div style="background:#252a40;border-radius:12px;padding:14px 16px;font-size:13px;line-height:1.55;margin-bottom:18px">'
      + '<div style="font-weight:700;color:#34d399;margin-bottom:4px">\u2713 O que o app usa</div>'
      + '<div style="color:#cdd3e3">Uma planilha criada por ele no <b>seu</b> Google Drive (seus dados ficam a\u00ed) e seu e-mail/nome s\u00f3 para te identificar.</div>'
      + '<div style="font-weight:700;color:#fb7185;margin:12px 0 4px">\u2715 O que ele N\u00c3O acessa</div>'
      + '<div style="color:#cdd3e3">Seus outros arquivos, e-mails ou contatos. Nada \u00e9 enviado a terceiros \u2014 tudo fica na sua conta Google.</div>'
      + '</div>'
      + '<button id="jbcGo" style="background:#fff;color:#1f2430;border:none;border-radius:12px;padding:13px;font-size:15px;font-weight:700;width:100%;cursor:pointer;font-family:inherit">Continuar com Google</button>'
      + '<button id="jbcNo" style="background:none;border:none;color:#8a93a8;font-size:13px;text-decoration:underline;cursor:pointer;width:100%;margin-top:12px;font-family:inherit">Agora n\u00e3o</button>'
      + '</div>';
    document.body.appendChild(ov);
    function close(){ if (ov.parentNode) ov.parentNode.removeChild(ov); }
    ov.querySelector('#jbcGo').onclick = function(){ close(); if (onOk) onOk(); };
    ov.querySelector('#jbcNo').onclick = function(){ close(); if (onCancel) onCancel(); };
  }
  // interactive=false => silent; true => shows the pre-consent explainer (first login / when scopes change), then Google
  function requestToken(interactive){
    if (!interactive && inflightToken) return inflightToken;
    var p = new Promise(function (res, rej) {
      if (interactive) { lr('jb_signedout'); }
      else if (lg('jb_signedout')) { rej(new Error('signed_out')); return; }
      function go(){ ensureClient(function () {
        pendingRes = res; pendingRej = rej;
        if (!interactive) setTimeout(function () { if (pendingRej === rej) { pendingRes = pendingRej = null; rej(new Error('silent_timeout')); } }, SILENT_TIMEOUT_MS);
        try { tokenClient.requestAccessToken(interactive ? {} : { prompt: 'none' }); }
        catch (e) { if (pendingRej === rej) { pendingRes = pendingRej = null; } rej(e); }
      }); }
      if (interactive && needConsent()) showConsent(function(){ ackConsent(); go(); }, function(){ rej(new Error('cancelled')); });
      else go();
    });
    if (!interactive) inflightToken = p.finally(function () { inflightToken = null; });
    return p;
  }

  function fetchEmail(tok){
    return fetch('https://www.googleapis.com/oauth2/v3/userinfo', { headers: { Authorization: 'Bearer ' + (tok || cachedToken()) } })
      .then(function (r) { return r.json(); }).then(function (u) { ls(EML, u.email || ''); return u.email || ''; })
      .catch(function () { return email(); });
  }

  // core API call: Bearer auth + auto silent-refresh & retry once on 401
  function api(method, url, body){
    function doFetch(t){
      var o = { method: method || 'GET', headers: { Authorization: 'Bearer ' + t } };
      if (body) { o.headers['Content-Type'] = 'application/json'; o.body = JSON.stringify(body); }
      return fetch(url, o);
    }
    function handle(r, allowRefresh){
      if (r.status === 401 && allowRefresh) {
        return requestToken(false).then(function (nt) { return doFetch(nt).then(function (r2) { return handle(r2, false); }); });
      }
      if (!r.ok) return r.text().then(function (tx) { throw new Error('HTTP ' + r.status + ' — ' + tx.slice(0, 200)); });
      return (r.status === 204) ? {} : r.json();
    }
    var tok = cachedToken();
    if (!tok) return requestToken(false).then(function (t) { return doFetch(t).then(function (r) { return handle(r, true); }); });
    return doFetch(tok).then(function (r) { return handle(r, true); });
  }

  // per-app sheet id (namespaced); migrates the old single key for finance
  function sheetKey(app){ return 'jb_sheet_' + app; }
  function getSheetId(app){ var v = lg(sheetKey(app)); if (!v && app === 'finance') { v = lg('joelboard_sheet_id'); if (v) ls(sheetKey(app), v); } return v || ''; }
  function setSheetId(app, id){ ls(sheetKey(app), id); }
  function clearSheetId(app){ lr(sheetKey(app)); if (app === 'finance') lr('joelboard_sheet_id'); }

  // --- shared sheet resolution: search by app-specific name, validate required tabs, auto-pick a single match, self-heal a stale/wrong id ---
  function sheetTabs(id){
    return api('GET', 'https://sheets.googleapis.com/v4/spreadsheets/' + id + '?fields=sheets.properties(sheetId,title)')
      .then(function (meta) { var grid = {}; (meta.sheets || []).forEach(function (x) { grid[x.properties.title] = x.properties.sheetId; }); return grid; });
  }
  function searchSheets(namePart){
    var q = "mimeType='application/vnd.google-apps.spreadsheet' and trashed=false and name contains '" + String(namePart).replace(/'/g, '') + "'";
    return api('GET', 'https://www.googleapis.com/drive/v3/files?q=' + encodeURIComponent(q) + '&fields=files(id,name)&orderBy=createdTime')
      .then(function (res) { return res.files || []; });
  }
  // opts {app, namePart, requiredTabs}. Resolves {id, grid}. Rejects Error('JB_NEED_SHEET') with .files (0 or >1) when the app must show its gate/picker.
  function isAuthErr(err){ var m = String((err && err.message) || ''); return m.indexOf('silent_timeout') > -1 || m.indexOf('auth_failed') > -1 || m.indexOf('401') > -1 || m.indexOf('cancelled') > -1; }
  function resolveSheet(opts){
    var app = opts.app, namePart = opts.namePart, need = opts.requiredTabs || [];
    function valid(grid){ return need.length ? need.some(function (t) { return grid[t] != null; }) : true; }
    // returns {id,grid} if this sheet matches; null to skip (wrong tabs / 403 / 404); rethrows auth errors so the app can re-login
    // {id,grid} if matches; null to skip (wrong tabs / sheet truly gone = 404|403); auth errors rethrow (re-login); transient errors (network/5xx/429) rethrow so we DON'T wipe a valid cached id
    function tryId(id){ return sheetTabs(id).then(function (grid) { return valid(grid) ? { id: id, grid: grid } : null; }, function (err) { if (isAuthErr(err)) throw err; var hm = String((err && err.message) || '').match(/HTTP (\d+)/); var st = hm ? +hm[1] : 0; if (st === 404 || st === 403) return null; throw err; }); }
    function needErr(files){ var e = new Error('JB_NEED_SHEET'); e.files = files || []; return e; }
    function fromSearch(){
      return searchSheets(namePart).then(function (files) {
        var i = 0;
        function next(){ if (i >= files.length) throw needErr([]); return tryId(files[i].id).then(function (ctx) { if (ctx) { setSheetId(app, ctx.id); return ctx; } i++; return next(); }); }
        return next();
      });
    }
    var cached = getSheetId(app);
    if (!cached) return fromSearch();
    return tryId(cached).then(function (ctx) { if (ctx) return ctx; clearSheetId(app); return fromSearch(); });
  }

  function signOut(){ clearRefreshTimer(); var t = lg(TOK); try { if (t && window.google && google.accounts && google.accounts.oauth2 && google.accounts.oauth2.revoke) google.accounts.oauth2.revoke(t, function () {}); } catch (_) {} lr(TOK); lr(EXP); lr(EML); ls('jb_signedout', '1'); }

  function initAuthPersistence(){
    if (hasSession()) {
      if (isTokenValid()) scheduleTokenRefresh();
      else ensureToken(false).then(scheduleTokenRefresh).catch(function () {});
    }
    document.addEventListener('visibilitychange', function () {
      if (document.visibilityState !== 'visible' || !hasSession()) return;
      if (!isTokenValid()) ensureToken(false).catch(function () {});
    });
  }

  // --- shared mobile scroll-lock: toggle .jb-noscroll on <html>/<body> behind any open .overlay modal.
  // The styling (scrollbar, scroll-lock, modal sizing) lives in the shared joelboard.css linked by every app. ---
  function initScrollLock(){
    function sync(){ var on = !!document.querySelector('.overlay.open'); document.documentElement.classList.toggle('jb-noscroll', on); if (document.body) document.body.classList.toggle('jb-noscroll', on); }
    try { new MutationObserver(sync).observe(document.body, { subtree: true, attributes: true, attributeFilter: ['class'] }); } catch (_) {}
    sync();
  }
  function whenReady(fn){ if (document.body) fn(); else document.addEventListener('DOMContentLoaded', fn); }
  whenReady(initScrollLock);
  whenReady(initAuthPersistence);

  // --- shared feedback (posts to the app owner's Google Form) + a tiny core toast ---
  var FB_FORM = { action: 'https://docs.google.com/forms/d/e/1FAIpQLSdfIXwvv96V8E2aMsS0Yu9AlugAy0NZ7-eAklGisFO6cuSCuA/formResponse', nameEntry: 'entry.2102774097', kindEntry: 'entry.1066607309', msgEntry: 'entry.315076588' };
  function jbToast(msg){ var t = document.createElement('div'); t.textContent = msg; t.setAttribute('style', 'position:fixed;left:50%;bottom:32px;transform:translateX(-50%);background:#1b1f32;border:1px solid #2b3147;color:#e7eaf3;padding:12px 18px;border-radius:99px;z-index:100000;font-family:inherit;font-size:14px;font-weight:600;box-shadow:0 8px 28px rgba(0,0,0,0.4)'); document.body.appendChild(t); setTimeout(function(){ if (t.parentNode) t.parentNode.removeChild(t); }, 2600); }
  function feedback(appName){
    var ov = document.createElement('div'); ov.id = 'jbFb';
    ov.setAttribute('style', 'position:fixed;inset:0;background:rgba(0,0,0,0.72);display:flex;align-items:center;justify-content:center;z-index:99999;padding:20px');
    var kind = 'bug';
    ov.innerHTML = '<div style="background:#1b1f32;border:1px solid #2b3147;border-radius:20px;max-width:430px;width:100%;padding:24px;color:#e7eaf3;max-height:92vh;overflow:auto;font-family:inherit">'
      + '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px"><div style="font-size:19px;font-weight:800">Enviar feedback</div><button id="jbFbX" style="background:none;border:none;color:#8a93a8;font-size:20px;cursor:pointer;font-family:inherit;line-height:1">×</button></div>'
      + '<div style="font-size:12px;color:#8a93a8;margin-bottom:14px">' + (appName || 'Joelboard') + ' · vai direto pro Joel 👋</div>'
      + '<div style="display:flex;gap:8px;margin-bottom:12px"><button id="jbFbBug" style="flex:1;border-radius:10px;padding:10px;font-weight:700;cursor:pointer;font-family:inherit;font-size:14px">🐛 Bug</button><button id="jbFbFeat" style="flex:1;border-radius:10px;padding:10px;font-weight:700;cursor:pointer;font-family:inherit;font-size:14px">💡 Ideia</button></div>'
      + '<input id="jbFbName" placeholder="Seu nome (opcional)" style="width:100%;background:#252a40;border:1px solid #2b3147;border-radius:10px;padding:11px;color:#e7eaf3;font-size:14px;margin-bottom:10px;font-family:inherit">'
      + '<textarea id="jbFbMsg" placeholder="O que aconteceu? O que você gostaria?" rows="4" style="width:100%;background:#252a40;border:1px solid #2b3147;border-radius:10px;padding:11px;color:#e7eaf3;font-size:14px;font-family:inherit;resize:vertical;box-sizing:border-box"></textarea>'
      + '<div id="jbFbErr" style="color:#fb7185;font-size:12px;margin-top:8px;min-height:14px"></div>'
      + '<button id="jbFbSend" style="background:#fff;color:#1f2430;border:none;border-radius:12px;padding:13px;font-size:15px;font-weight:700;width:100%;cursor:pointer;font-family:inherit;margin-top:4px">Enviar</button>'
      + '</div>';
    document.body.appendChild(ov);
    function close(){ if (ov.parentNode) ov.parentNode.removeChild(ov); }
    ov.addEventListener('click', function(e){ if (e.target === ov) close(); });
    var bug = ov.querySelector('#jbFbBug'), feat = ov.querySelector('#jbFbFeat');
    function paint(){ bug.style.background = kind==='bug'?'#fff':'transparent'; bug.style.color = kind==='bug'?'#1f2430':'#e7eaf3'; bug.style.border = kind==='bug'?'none':'1px solid #2b3147'; feat.style.background = kind==='feature'?'#fff':'transparent'; feat.style.color = kind==='feature'?'#1f2430':'#e7eaf3'; feat.style.border = kind==='feature'?'none':'1px solid #2b3147'; }
    bug.onclick = function(){ kind='bug'; paint(); }; feat.onclick = function(){ kind='feature'; paint(); }; paint();
    ov.querySelector('#jbFbName').value = email() ? email().split('@')[0] : '';
    ov.querySelector('#jbFbX').onclick = close;
    ov.querySelector('#jbFbSend').onclick = function(){
      var msg = (ov.querySelector('#jbFbMsg').value || '').trim();
      if (!msg) { ov.querySelector('#jbFbErr').textContent = 'Escreva uma mensagem.'; return; }
      var btn = ov.querySelector('#jbFbSend'); btn.disabled = true; btn.textContent = 'Enviando…';
      var fd = new FormData();
      fd.append(FB_FORM.nameEntry, (ov.querySelector('#jbFbName').value || '').trim() || email() || '');
      fd.append(FB_FORM.kindEntry, kind==='feature' ? 'Feature request' : 'Bug report');
      fd.append(FB_FORM.msgEntry, '[' + (appName || 'Joelboard') + '] ' + msg + (email() ? (' — ' + email()) : ''));
      function done(){ close(); jbToast('✓ Feedback enviado. Obrigado!'); }
      fetch(FB_FORM.action, { method: 'POST', mode: 'no-cors', body: fd }).then(done, done);
    };
  }

  // --- shared theming: skins live in /themes.css (body[data-skin]); selection persists per-app in localStorage ---
  var SKINS = [
    { id:'default',  name:'Default',  bg:'#0d0f18', card:'#1b1f32', accent:'#818cf8', text:'#e2e8f0' },
    { id:'garden',   name:'Garden',   bg:'#f3ede0', card:'#fffdf8', accent:'#7c9a6e', text:'#3b352c' },
    { id:'aperture', name:'Aperture', bg:'#fbfbf9', card:'#f1f0ec', accent:'#e8482b', text:'#101010' },
    { id:'arcade',   name:'Arcade',   bg:'#0a0a16', card:'#171936', accent:'#22e0e0', text:'#dfe3ff' },
    { id:'sorbet',   name:'Sorbet',   bg:'#fdf4fb', card:'#ffffff', accent:'#c264e8', text:'#4a3a52' },
    { id:'press',    name:'Press',    bg:'#f3efe6', card:'#fbf9f3', accent:'#1a1a1a', text:'#1c1813' },
    { id:'mint',     name:'Mint',     bg:'#eefaf4', card:'#ffffff', accent:'#0fb981', text:'#0f3329' }
  ];
  function skinKey(app){ return 'jb_skin_' + app; }
  function getSkin(app){ return lg(skinKey(app)) || 'default'; }
  function applySkinAttr(id){ whenReady(function(){ if (id && id !== 'default') document.body.setAttribute('data-skin', id); else document.body.removeAttribute('data-skin'); }); }
  function applySkin(app){ applySkinAttr(getSkin(app)); applyModeAttr(getMode(app)); }
  function setSkin(app, id){ if (id && id !== 'default') ls(skinKey(app), id); else lr(skinKey(app)); applySkinAttr(id); applyModeAttr(getMode(app)); return id; }
  // --- day / night mode (orthogonal to skin; each skin has a native mode, user can flip) ---
  var SKIN_MODE = { arcade:'dark', garden:'light', aperture:'light', sorbet:'light', press:'light', mint:'light' };
  function nativeMode(app){ return SKIN_MODE[getSkin(app)] || 'dark'; }
  function modeKey(app){ return 'jb_mode_' + app; }
  function getMode(app){ return lg(modeKey(app)) || nativeMode(app); }
  function applyModeAttr(m){ whenReady(function(){ document.body.setAttribute('data-mode', (m==='light'?'light':'dark')); }); }
  function applyMode(app){ applyModeAttr(getMode(app)); }
  function setMode(app, m){ m=(m==='light'?'light':'dark'); ls(modeKey(app), m); applyModeAttr(m); return m; }
  function toggleMode(app){ return setMode(app, getMode(app)==='light'?'dark':'light'); }
  function renderSkinPicker(app, el, onChange){
    if (!el) return;
    var cur = getSkin(app), mode = getMode(app);
    var toggle = '<button type="button" class="jb-mode-toggle" data-jbmode="1">'
      + '<span>' + (mode==='light' ? '☀️ Modo claro' : '🌙 Modo escuro') + '</span>'
      + '<span class="jb-mode-hint">alternar</span></button>';
    el.innerHTML = toggle + '<div class="jb-skins">' + SKINS.map(function (s) {
      return '<button type="button" class="jb-skin' + (s.id===cur?' on':'') + '" data-sk="' + s.id + '" style="background:' + s.bg + ';color:' + s.text + (s.id===cur?(';border-color:'+s.accent):'') + '">'
        + '<span class="jb-skin-dot" style="background:' + s.accent + '"></span><span>' + s.name + '</span></button>';
    }).join('') + '</div>';
    var mt = el.querySelector('[data-jbmode]');
    if (mt) mt.addEventListener('click', function(){ toggleMode(app); renderSkinPicker(app, el, onChange); if (onChange) onChange(cur); });
    Array.prototype.forEach.call(el.querySelectorAll('.jb-skin'), function (b) {
      b.addEventListener('click', function () { var id=b.getAttribute('data-sk'); setSkin(app, id); renderSkinPicker(app, el, onChange); if (onChange) onChange(id); });
    });
  }

  // --- shared confirm dialog: styled + theme-adaptive, builds its own DOM (no per-app markup). opts:{yes,no,danger,onNo,html} ---
  function confirm(title, msg, onYes, opts){
    opts = opts || {};
    var ov = document.createElement('div'); ov.className = 'overlay'; ov.style.zIndex = '100000';
    var yesBg = opts.danger ? 'var(--expense, #ef4444)' : 'var(--brand)';
    var yesFg = opts.danger ? '#fff' : 'var(--on-brand)';
    ov.innerHTML = '<div class="modal" style="max-width:360px">'
      + '<div class="mt" data-jbc="t" style="margin-bottom:8px"></div>'
      + '<div data-jbc="m" style="color:var(--muted);font-size:13px;line-height:1.5;margin-bottom:18px"></div>'
      + '<div style="display:flex;gap:10px">'
      +   '<button data-jbc="no" style="flex:1;background:var(--surface2);color:var(--text);border:1px solid var(--border);border-radius:var(--radius-sm);padding:11px;font-size:14px;font-weight:600;cursor:pointer;font-family:inherit"></button>'
      +   '<button data-jbc="y" style="flex:1;background:' + yesBg + ';color:' + yesFg + ';border:none;border-radius:var(--radius-sm);padding:11px;font-size:14px;font-weight:700;cursor:pointer;font-family:inherit"></button>'
      + '</div></div>';
    ov.querySelector('[data-jbc=t]').textContent = title || '';
    var m = ov.querySelector('[data-jbc=m]'); if (opts.html) m.innerHTML = msg || ''; else m.textContent = msg || '';
    ov.querySelector('[data-jbc=no]').textContent = opts.no || 'Cancelar';
    ov.querySelector('[data-jbc=y]').textContent = opts.yes || 'Confirmar';
    document.body.appendChild(ov);
    requestAnimationFrame(function(){ ov.classList.add('open'); });
    function close(){ ov.classList.remove('open'); setTimeout(function(){ if (ov.parentNode) ov.parentNode.removeChild(ov); }, 200); }
    function no(){ close(); if (opts.onNo) opts.onNo(); }
    ov.querySelector('[data-jbc=no]').onclick = no;
    ov.querySelector('[data-jbc=y]').onclick = function(){ close(); if (onYes) onYes(); };
    ov.addEventListener('click', function(e){ if (e.target === ov) no(); });
    return close;
  }

  // --- shared custom dropdown: app renders .jb-dd markup (button + .jb-dd-menu of .jb-dd-opt); core toggles open + closes on outside-click ---
  function ddClose(){ var o = document.querySelectorAll('.jb-dd.open'); for (var i = 0; i < o.length; i++) o[i].classList.remove('open'); }
  function ddToggle(btn){ var dd = (btn && btn.closest) ? btn.closest('.jb-dd') : null; if (!dd) return; var wasOpen = dd.classList.contains('open'); ddClose(); if (!wasOpen) { dd.classList.add('open'); var sel = dd.querySelector('.jb-dd-opt.is-sel'); if (sel && sel.scrollIntoView) { try { sel.scrollIntoView({ block: 'nearest' }); } catch (_) {} } } }
  whenReady(function(){ document.addEventListener('click', function (e) { if (!(e.target && e.target.closest && e.target.closest('.jb-dd'))) ddClose(); }); });

  // --- shared guided tour (coach-marks). Self-contained DOM. steps:[{sel,title,body,go}] (go runs before the step → switch tabs etc.; no sel = centered card). ---
  var _tSteps=null, _tI=0, _tApp='', _tDone=null;
  function tourDone(app){ return lg('jb_tour_'+app)==='1'; }
  function tour(app, steps, opts){
    opts=opts||{}; _tApp=app; _tSteps=steps||[]; _tI=0; _tDone=opts.onDone||null;
    if(!_tSteps.length) return;
    var ov=document.getElementById('jbTour');
    if(!ov){
      ov=document.createElement('div'); ov.id='jbTour';
      ov.innerHTML='<div class="jbt-block"></div><div class="jbt-hole"></div><div class="jbt-pop"><div class="jbt-step"></div><div class="jbt-title"></div><div class="jbt-body"></div><div class="jbt-foot"><button class="jbt-skip">Pular</button><div class="jbt-nav"><button class="jbt-back">Voltar</button><button class="jbt-next">Próximo</button></div></div></div>';
      document.body.appendChild(ov);
      ov.querySelector('.jbt-skip').onclick=function(){ tourEnd(true); };
      ov.querySelector('.jbt-back').onclick=function(){ if(_tI>0){ _tI--; tourRender(); } };
      ov.querySelector('.jbt-next').onclick=function(){ if(_tI<_tSteps.length-1){ _tI++; tourRender(); } else tourEnd(true); };
      window.addEventListener('resize', function(){ var o=document.getElementById('jbTour'); if(o && o.style.display==='block') tourPosition(); });
    }
    ov.style.display='block'; tourRender();
  }
  function tourRender(){
    var step=_tSteps[_tI], ov=document.getElementById('jbTour'); if(!ov) return;
    if(step.go){ try{ step.go(); }catch(_){} }
    ov.querySelector('.jbt-step').textContent='Passo '+(_tI+1)+' de '+_tSteps.length;
    ov.querySelector('.jbt-title').textContent=step.title||'';
    ov.querySelector('.jbt-body').textContent=step.body||'';
    ov.querySelector('.jbt-back').style.visibility=_tI>0?'visible':'hidden';
    ov.querySelector('.jbt-next').textContent=(_tI<_tSteps.length-1)?'Próximo':'Concluir';
    setTimeout(tourPosition, step.go?200:20);
  }
  function tourPosition(){
    var step=_tSteps[_tI], ov=document.getElementById('jbTour'); if(!ov) return;
    var block=ov.querySelector('.jbt-block'), hole=ov.querySelector('.jbt-hole'), pop=ov.querySelector('.jbt-pop');
    var rect=null; if(step.sel){ var el=document.querySelector(step.sel); if(el){ try{ el.scrollIntoView({block:'nearest'}); }catch(_){} rect=el.getBoundingClientRect(); } }
    if(rect && rect.width){ var pad=6; hole.style.display='block'; block.style.background='transparent'; hole.style.left=(rect.left-pad)+'px'; hole.style.top=(rect.top-pad)+'px'; hole.style.width=(rect.width+pad*2)+'px'; hole.style.height=(rect.height+pad*2)+'px'; }
    else { hole.style.display='none'; block.style.background='rgba(0,0,0,0.66)'; }
    pop.style.display='block';
    if(rect && rect.width){ var ph=pop.offsetHeight||180, pw=pop.offsetWidth||300; var top=rect.bottom+12; if(top+ph>window.innerHeight-8) top=Math.max(8, rect.top-ph-12); var left=Math.min(Math.max(8,rect.left), window.innerWidth-pw-8); pop.style.top=top+'px'; pop.style.left=left+'px'; pop.style.transform='none'; }
    else { pop.style.top='50%'; pop.style.left='50%'; pop.style.transform='translate(-50%,-50%)'; }
  }
  function tourEnd(markDone){ var ov=document.getElementById('jbTour'); if(ov) ov.style.display='none'; if(markDone) ls('jb_tour_'+_tApp,'1'); if(_tDone) _tDone(); }


  // ---- Shared in-app date picker (popup month calendar) ----
  function datePicker(curISO, onPick, opts){
    opts = opts || {};
    var MO=['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
    var DOW=['D','S','T','Q','Q','S','S'];
    function p2(n){ return (n<10?'0':'')+n; }
    function isoOf(y,m,d){ return y+'-'+p2(m+1)+'-'+p2(d); }
    function parse(x){ var a=String(x||'').split('-'); return (a.length===3)? new Date(+a[0],+a[1]-1,+a[2]) : null; }
    var sel = (curISO && /^\d{4}-\d{2}-\d{2}$/.test(curISO)) ? curISO : '';
    var base = parse(sel) || new Date();
    var vy=base.getFullYear(), vm=base.getMonth();
    var t=new Date(), todayISO=isoOf(t.getFullYear(),t.getMonth(),t.getDate());
    var ov=document.createElement('div'); ov.className='overlay';
    ov.innerHTML = '<div class="modal jb-cal" role="dialog">'
      + '<div class="jb-cal-head"><button type="button" class="jb-cal-nav" data-nav="-1" aria-label="Anterior">‹</button>'
      + '<div class="jb-cal-title"></div>'
      + '<button type="button" class="jb-cal-nav" data-nav="1" aria-label="Próximo">›</button></div>'
      + '<div class="jb-cal-dows">' + DOW.map(function(w){return '<span>'+w+'</span>';}).join('') + '</div>'
      + '<div class="jb-cal-grid"></div>'
      + '<div class="jb-cal-foot"><button type="button" class="jb-cal-link" data-act="clear">'+(opts.clearLabel||'Limpar')+'</button>'
      + '<button type="button" class="jb-cal-link strong" data-act="today">Hoje</button></div></div>';
    document.body.appendChild(ov);
    requestAnimationFrame(function(){ ov.classList.add('open'); });
    function close(){ ov.classList.remove('open'); setTimeout(function(){ if(ov.parentNode) ov.parentNode.removeChild(ov); }, 220); }
    function draw(){
      ov.querySelector('.jb-cal-title').textContent = MO[vm]+' '+vy;
      var first=new Date(vy,vm,1).getDay(), dim=new Date(vy,vm+1,0).getDate(), cells='';
      for(var i=0;i<first;i++) cells+='<span class="jb-cal-d empty"></span>';
      for(var d=1;d<=dim;d++){ var iso=isoOf(vy,vm,d), cls='jb-cal-d'; if(iso===todayISO) cls+=' today'; if(iso===sel) cls+=' sel'; cells+='<button type="button" class="'+cls+'" data-d="'+d+'">'+d+'</button>'; }
      ov.querySelector('.jb-cal-grid').innerHTML=cells;
    }
    ov.addEventListener('click', function(e){
      if(e.target===ov){ close(); return; }
      var nav=e.target.closest && e.target.closest('.jb-cal-nav'); if(nav){ vm+=(+nav.getAttribute('data-nav')); if(vm<0){vm=11;vy--;} if(vm>11){vm=0;vy++;} draw(); return; }
      var act=e.target.closest && e.target.closest('[data-act]'); if(act){ var a=act.getAttribute('data-act'); if(a==='clear'){ onPick(''); } else { var n=new Date(); onPick(isoOf(n.getFullYear(),n.getMonth(),n.getDate())); } close(); return; }
      var day=e.target.closest && e.target.closest('.jb-cal-d'); if(day && day.getAttribute('data-d')){ onPick(isoOf(vy,vm,+day.getAttribute('data-d'))); close(); return; }
    });
    draw();
  }

  // date-field glue: a .datebtn button stores ISO in data-iso, shows dd/mm/yyyy
  function dpFmt(iso){ var p=String(iso||'').split('-'); return p.length===3? p[2]+'/'+p[1]+'/'+p[0] : (iso||''); }
  function dpSet(id, iso){ var b=document.getElementById(id); if(!b) return; b.setAttribute('data-iso', iso||''); b.textContent = iso? dpFmt(iso) : (b.getAttribute('data-ph')||'Escolher data…'); b.classList.toggle('empty', !iso); }
  function dpGet(id){ var b=document.getElementById(id); return b? (b.getAttribute('data-iso')||'') : ''; }
  function dpOpen(id, onChange){ var b=document.getElementById(id); if(!b) return; datePicker(b.getAttribute('data-iso')||'', function(iso){ dpSet(id, iso); if(typeof onChange==='function') onChange(iso); }); }

  window.JB = {
    CLIENT_ID: CLIENT_ID, SCOPES: SCOPES,
    cachedToken: cachedToken, hasSession: hasSession, ensureToken: ensureToken, email: email, fetchEmail: fetchEmail,
    requestToken: requestToken, signOut: signOut, api: api,
    getSheetId: getSheetId, setSheetId: setSheetId, clearSheetId: clearSheetId,
    sheetTabs: sheetTabs, resolveSheet: resolveSheet,
    feedback: feedback, toast: jbToast, confirm: confirm, whenReady: whenReady,
    SKINS: SKINS, getSkin: getSkin, setSkin: setSkin, applySkin: applySkin, renderSkinPicker: renderSkinPicker, ddToggle: ddToggle, ddClose: ddClose, tour: tour, tourDone: tourDone, datePicker: datePicker, getMode: getMode, setMode: setMode, toggleMode: toggleMode, applyMode: applyMode, dpOpen: dpOpen, dpSet: dpSet, dpGet: dpGet, fmtDate: dpFmt
  };
})();
