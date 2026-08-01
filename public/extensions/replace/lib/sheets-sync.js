/* Joelboard Mini — Google Sheets sync (extension). © 2026 Joel Soluções LTDA. */
var JB_SHEETS = (function () {
  var CLIENT_ID = '49262188240-l70ka2666t315gb2gmsvu357f2h7769i.apps.googleusercontent.com';
  var SCOPES = 'openid email profile https://www.googleapis.com/auth/spreadsheets https://www.googleapis.com/auth/drive.file';
  var TOK_KEY = 'jb_ext_tok';
  var TOK_EXP_KEY = 'jb_ext_tok_exp';
  var EML_KEY = 'jb_ext_email';
  var SHEET_ID_KEY = 'jb_sheet_mini_replace';
  var SYNC_TS_KEY = 'jb_replace_sync_ts';
  var SHEET_TITLE = 'Joelboard Mini';
  var APP_NAME = 'mini-replace';

  var TAB_SNIPPETS = 'Replace';
  var TAB_VARS = 'ReplaceVars';
  var TAB_SETTINGS = 'ReplaceSettings';
  var HDR_SNIPPETS = ['Nome', 'Trigger', 'Text', 'Enabled', 'ID'];
  var HDR_VARS = ['Chave', 'Valor'];
  var HDR_SETTINGS = ['Chave', 'Valor'];
  var REQUIRED_TABS = [TAB_SNIPPETS, TAB_VARS, TAB_SETTINGS];

  var AUTH_URL = 'https://joelboard.vercel.app/mini/replace-auth.html';
  var AUTH_URL_LOCAL = 'http://localhost:5173/mini/replace-auth.html';

  function openAuthUrl(cb) {
    chrome.tabs.query({ url: ['http://localhost/*', 'http://127.0.0.1/*'] }, function (tabs) {
      cb((tabs && tabs.length) ? AUTH_URL_LOCAL : AUTH_URL);
    });
  }

  function ssUrl(path) {
    return 'https://sheets.googleapis.com/v4/spreadsheets' + path;
  }

  function storageGet(keys) {
    return new Promise(function (resolve) {
      chrome.storage.local.get(keys, resolve);
    });
  }

  function storageSet(obj) {
    return new Promise(function (resolve) {
      chrome.storage.local.set(obj, resolve);
    });
  }

  function readToken(data) {
    data = data || {};
    var tok = data[TOK_KEY] || '';
    var exp = Number(data[TOK_EXP_KEY] || 0);
    if (!tok || Date.now() > exp - 60000) return '';
    return tok;
  }

  function isSignedIn() {
    return storageGet([TOK_KEY, TOK_EXP_KEY]).then(function (d) { return !!readToken(d); });
  }

  function email() {
    return storageGet([EML_KEY]).then(function (d) { return d[EML_KEY] || ''; });
  }

  function getSheetId() {
    return storageGet([SHEET_ID_KEY]).then(function (d) { return d[SHEET_ID_KEY] || ''; });
  }

  function setSheetId(id) {
    return storageSet({ jb_sheet_mini_replace: id || '' });
  }

  function saveToken(tok, expiresIn) {
    var exp = Date.now() + (Number(expiresIn || 3600) * 1000);
    var patch = {};
    patch[TOK_KEY] = tok;
    patch[TOK_EXP_KEY] = exp;
    return storageSet(patch);
  }

  function storeAuth(payload) {
    payload = payload || {};
    var tok = payload.token || '';
    var exp = Number(payload.exp || 0);
    if (!exp && tok) exp = Date.now() + 3580000;
    var patch = {};
    patch[TOK_KEY] = tok;
    patch[TOK_EXP_KEY] = exp;
    patch[EML_KEY] = payload.email || '';
    if (payload.sheetId) patch[SHEET_ID_KEY] = payload.sheetId;
    return storageSet(patch).then(function () {
      if (!payload.email && tok) return fetchEmail(tok);
      return payload.email || '';
    });
  }

  function clearAuth() {
    var patch = {};
    patch[TOK_KEY] = '';
    patch[TOK_EXP_KEY] = 0;
    patch[EML_KEY] = '';
    return storageSet(patch);
  }

  function fetchEmail(tok) {
    return fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: 'Bearer ' + tok }
    }).then(function (r) { return r.json(); }).then(function (u) {
      var em = u.email || '';
      if (em) storageSet({ jb_ext_email: em });
      return em;
    }).catch(function () { return ''; });
  }

  function requestTokenInteractive() {
    return storageGet([TOK_KEY, TOK_EXP_KEY]).then(function (d) {
      var cached = readToken(d);
      if (cached) return cached;
      return new Promise(function (resolve, reject) {
        openAuthUrl(function (authUrl) {
        chrome.tabs.create({ url: authUrl, active: true }, function (tab) {
          if (chrome.runtime.lastError || !tab || !tab.id) {
            reject(new Error('auth_tab_failed'));
            return;
          }
          var tabId = tab.id;
          var done = false;
          function finish(ok, tok, err) {
            if (done) return;
            done = true;
            chrome.storage.onChanged.removeListener(onStore);
            chrome.tabs.onRemoved.removeListener(onClose);
            if (ok && tok) resolve(tok);
            else reject(new Error(err || 'auth_failed'));
          }
          function onStore(changes, area) {
            if (area !== 'local' || !changes[TOK_KEY]) return;
            storageGet([TOK_KEY, TOK_EXP_KEY]).then(function (d2) {
              var t = readToken(d2);
              if (t) finish(true, t);
            });
          }
          function onClose(closedId) {
            if (closedId !== tabId) return;
            storageGet([TOK_KEY, TOK_EXP_KEY]).then(function (d2) {
              var t = readToken(d2);
              if (t) finish(true, t);
              else finish(false, null, 'auth_cancelled');
            });
          }
          chrome.storage.onChanged.addListener(onStore);
          chrome.tabs.onRemoved.addListener(onClose);
        });
        });
      });
    });
  }

  function requestToken(interactive) {
    return storageGet([TOK_KEY, TOK_EXP_KEY]).then(function (d) {
      var cached = readToken(d);
      if (cached) return cached;
      if (interactive) return requestTokenInteractive();
      return Promise.reject(new Error('auth_required'));
    });
  }

  function api(method, url, body) {
    return requestToken(false).then(function (tok) {
      var opts = { method: method || 'GET', headers: { Authorization: 'Bearer ' + tok } };
      if (body != null) {
        opts.headers['Content-Type'] = 'application/json';
        opts.body = JSON.stringify(body);
      }
      return fetch(url, opts).then(function (r) {
        if (r.status === 401) {
          return storageSet({ jb_ext_tok: '', jb_ext_tok_exp: 0 }).then(function () {
            var e = new Error('auth_required');
            e.status = 401;
            throw e;
          });
        }
        if (!r.ok) {
          return r.text().then(function (tx) {
            var e = new Error('HTTP ' + r.status + ' — ' + tx.slice(0, 180));
            e.status = r.status;
            throw e;
          });
        }
        return r.status === 204 ? {} : r.json();
      });
    });
  }

  function sheetTabs(id) {
    return api('GET', ssUrl('/' + id + '?fields=sheets.properties(sheetId,title)')).then(function (meta) {
      var grid = {};
      (meta.sheets || []).forEach(function (x) {
        grid[x.properties.title] = x.properties.sheetId;
      });
      return grid;
    });
  }

  function searchSheets(namePart) {
    var q = "mimeType='application/vnd.google-apps.spreadsheet' and trashed=false and name contains '" + String(namePart).replace(/'/g, '') + "'";
    return api('GET', 'https://www.googleapis.com/drive/v3/files?q=' + encodeURIComponent(q) + '&fields=files(id,name)&orderBy=createdTime')
      .then(function (res) { return res.files || []; });
  }

  function trySheetId(id) {
    return sheetTabs(id).then(function (grid) {
      var ok = REQUIRED_TABS.every(function (t) { return grid[t] != null; });
      return ok ? { id: id, grid: grid } : null;
    }, function (err) {
      var st = err.status || 0;
      if (st === 404 || st === 403) return null;
      throw err;
    });
  }

  function resolveSheet() {
    return getSheetId().then(function (cached) {
      function fromSearch() {
        return searchSheets(SHEET_TITLE).then(function (files) {
          var i = 0;
          function next() {
            if (i >= files.length) return Promise.reject(new Error('need_sheet'));
            return trySheetId(files[i].id).then(function (ctx) {
              if (ctx) return setSheetId(ctx.id).then(function () { return ctx; });
              i++;
              return next();
            });
          }
          return next();
        });
      }
      if (!cached) return fromSearch();
      return trySheetId(cached).then(function (ctx) {
        if (ctx) return ctx;
        return setSheetId('').then(fromSearch);
      });
    });
  }

  function createSheet() {
    return api('POST', ssUrl(''), {
      properties: { title: SHEET_TITLE },
      sheets: REQUIRED_TABS.map(function (t) {
        var hdr = t === TAB_SNIPPETS ? HDR_SNIPPETS : (t === TAB_VARS ? HDR_VARS : HDR_SETTINGS);
        return { properties: { title: t } };
      })
    }).then(function (ss) {
      var id = ss.spreadsheetId;
      var data = REQUIRED_TABS.map(function (t) {
        var hdr = t === TAB_SNIPPETS ? HDR_SNIPPETS : (t === TAB_VARS ? HDR_VARS : HDR_SETTINGS);
        return { range: t + '!A1', values: [hdr] };
      });
      return api('POST', ssUrl('/' + id + '/values:batchUpdate'), {
        valueInputOption: 'RAW',
        data: data
      }).then(function () { return setSheetId(id).then(function () { return { id: id }; }); });
    });
  }

  function ensureSheet() {
    return resolveSheet().catch(function (err) {
      if (err.message === 'need_sheet') return createSheet();
      throw err;
    });
  }

  function batchGet(id, ranges) {
    var q = ranges.map(function (r) { return 'ranges=' + encodeURIComponent(r); }).join('&');
    return api('GET', ssUrl('/' + id + '/values:batchGet?' + q + '&valueRenderOption=UNFORMATTED_VALUE'));
  }

  function writeTab(id, tab, rows) {
    var hdr = tab === TAB_SNIPPETS ? HDR_SNIPPETS : (tab === TAB_VARS ? HDR_VARS : HDR_SETTINGS);
    var values = [hdr].concat(rows || []);
    return api('PUT', ssUrl('/' + id + '/values/' + encodeURIComponent(tab + '!A1') + '?valueInputOption=RAW'), {
      values: values
    });
  }

  function markSynced() {
    return storageSet({ jb_replace_sync_ts: new Date().toISOString() });
  }

  function lastSyncTs() {
    return storageGet([SYNC_TS_KEY]).then(function (d) { return d[SYNC_TS_KEY] || ''; });
  }

  return {
    CLIENT_ID: CLIENT_ID,
    SCOPES: SCOPES,
    APP_NAME: APP_NAME,
    TAB_SNIPPETS: TAB_SNIPPETS,
    TAB_VARS: TAB_VARS,
    TAB_SETTINGS: TAB_SETTINGS,
    isSignedIn: isSignedIn,
    email: email,
    getSheetId: getSheetId,
    setSheetId: setSheetId,
    requestToken: requestToken,
    requestTokenInteractive: requestTokenInteractive,
    storeAuth: storeAuth,
    clearAuth: clearAuth,
    api: api,
    ensureSheet: ensureSheet,
    createSheet: createSheet,
    resolveSheet: resolveSheet,
    batchGet: batchGet,
    writeTab: writeTab,
    markSynced: markSynced,
    lastSyncTs: lastSyncTs
  };
})();
