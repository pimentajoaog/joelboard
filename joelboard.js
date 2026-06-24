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

  // interactive=false => silent ({prompt:''}); true => normal (may show account picker/consent)
  function requestToken(interactive){
    return new Promise(function (res, rej) {
      ensureClient(function () {
        pendingRes = res; pendingRej = rej;
        try { tokenClient.requestAccessToken(interactive ? {} : { prompt: '' }); }
        catch (e) { pendingRes = pendingRej = null; rej(e); }
      });
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

  function signOut(){ var t = lg(TOK); try { if (t && window.google && google.accounts && google.accounts.oauth2 && google.accounts.oauth2.revoke) google.accounts.oauth2.revoke(t, function () {}); } catch (_) {} lr(TOK); lr(EXP); lr(EML); }

  window.JB = {
    CLIENT_ID: CLIENT_ID, SCOPES: SCOPES,
    cachedToken: cachedToken, email: email, fetchEmail: fetchEmail,
    requestToken: requestToken, api: api, signOut: signOut,
    getSheetId: getSheetId, setSheetId: setSheetId, clearSheetId: clearSheetId
  };
})();
