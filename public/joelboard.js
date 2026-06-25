/* Joelboard — shared core (auth + Google API). © 2026 Joel Soluções LTDA. */
(function () {
  var CLIENT_ID = '49262188240-l70ka2666t315gb2gmsvu357f2h7769i.apps.googleusercontent.com';
  var SCOPES = 'openid email profile https://www.googleapis.com/auth/spreadsheets https://www.googleapis.com/auth/drive.file';
  var TOK = 'jb_tok', EXP = 'jb_tok_exp', EML = 'jb_email';
  var tokenClient = null, pendingRes = null, pendingRej = null;

  function lg(k){ try { return localStorage.getItem(k); } catch (_) { return null; } }
  function ls(k, v){ try { localStorage.setItem(k, v); } catch (_) {} }
  function lr(k){ try { localStorage.removeItem(k); } catch (_) {} }

  function cachedToken(){ var t = lg(TOK), e = Number(lg(EXP) || 0); return (t && Date.now() < e) ? t : ''; }
  function saveToken(tok, expiresIn){ ls(TOK, tok); ls(EXP, String(Date.now() + (Number(expiresIn) || 3600) * 1000 - 120000)); }
  function email(){ return lg(EML) || ''; }

  function ensureClient(cb){
    if (window.google && google.accounts && google.accounts.oauth2) {
      if (!tokenClient) {
        tokenClient = google.accounts.oauth2.initTokenClient({ client_id: CLIENT_ID, scope: SCOPES, callback: function (r) {
          if (r && r.access_token) { saveToken(r.access_token, r.expires_in); if (pendingRes) { var f = pendingRes; pendingRes = pendingRej = null; f(r.access_token); } }
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
    return new Promise(function (res, rej) {
      function go(){ ensureClient(function () {
        pendingRes = res; pendingRej = rej;
        if (!interactive) setTimeout(function () { if (pendingRej === rej) { pendingRes = pendingRej = null; rej(new Error('silent_timeout')); } }, 4500);
        try { tokenClient.requestAccessToken(interactive ? {} : { prompt: '' }); }
        catch (e) { if (pendingRej === rej) { pendingRes = pendingRej = null; } rej(e); }
      }); }
      if (interactive && needConsent()) showConsent(function(){ ackConsent(); go(); }, function(){ rej(new Error('cancelled')); });
      else go();
    });
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
    function tryId(id){ return sheetTabs(id).then(function (grid) { return valid(grid) ? { id: id, grid: grid } : null; }, function (err) { if (isAuthErr(err)) throw err; return null; }); }
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

  function signOut(){ var t = lg(TOK); try { if (t && window.google && google.accounts && google.accounts.oauth2 && google.accounts.oauth2.revoke) google.accounts.oauth2.revoke(t, function () {}); } catch (_) {} lr(TOK); lr(EXP); lr(EML); }

  // --- shared mobile scroll-lock: toggle .jb-noscroll on <html>/<body> behind any open .overlay modal.
  // The styling (scrollbar, scroll-lock, modal sizing) lives in the shared joelboard.css linked by every app. ---
  function initScrollLock(){
    function sync(){ var on = !!document.querySelector('.overlay.open'); document.documentElement.classList.toggle('jb-noscroll', on); if (document.body) document.body.classList.toggle('jb-noscroll', on); }
    try { new MutationObserver(sync).observe(document.body, { subtree: true, attributes: true, attributeFilter: ['class'] }); } catch (_) {}
    sync();
  }
  function whenReady(fn){ if (document.body) fn(); else document.addEventListener('DOMContentLoaded', fn); }
  whenReady(initScrollLock);

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

  window.JB = {
    CLIENT_ID: CLIENT_ID, SCOPES: SCOPES,
    cachedToken: cachedToken, email: email, fetchEmail: fetchEmail,
    requestToken: requestToken, api: api, signOut: signOut,
    getSheetId: getSheetId, setSheetId: setSheetId, clearSheetId: clearSheetId,
    resolveSheet: resolveSheet, sheetTabs: sheetTabs,
    feedback: feedback, toast: jbToast
  };
})();
