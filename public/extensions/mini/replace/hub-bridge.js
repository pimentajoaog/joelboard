/* Joelboard Replace — Hub sync bridge (joelboard.vercel.app only). © 2026 Joel Soluções LTDA. */
(function () {
  if (window.__JB_REPLACE_HUB__) return;
  window.__JB_REPLACE_HUB__ = 1;

  function reply(requestId, payload) {
    window.postMessage(Object.assign({ type: 'jb-mini-replace-reply', requestId: requestId }, payload), '*');
  }

  window.addEventListener('message', function (ev) {
    if (ev.source !== window || !ev.data || !ev.data.type) return;
    var d = ev.data;
    var rid = d.requestId;
    if (d.type === 'jb-mini-replace-get') {
      chrome.runtime.sendMessage({ type: 'replaceGetData' }, function (res) {
        if (chrome.runtime.lastError) {
          reply(rid, { ok: false, error: chrome.runtime.lastError.message || 'extension_error' });
          return;
        }
        reply(rid, { ok: !!(res && res.ok), data: res && res.data });
      });
      return;
    }
    if (d.type === 'jb-mini-replace-set' && d.data) {
      chrome.runtime.sendMessage({ type: 'replaceSetData', data: d.data }, function (res) {
        if (chrome.runtime.lastError) {
          reply(rid, { ok: false, error: chrome.runtime.lastError.message || 'extension_error' });
          return;
        }
        reply(rid, { ok: !!(res && res.ok) });
      });
      return;
    }
    if (d.type === 'jb-mini-replace-sync') {
      chrome.runtime.sendMessage({ type: 'replaceSyncNow' }, function (res) {
        if (chrome.runtime.lastError) {
          reply(rid, { ok: false, error: chrome.runtime.lastError.message || 'extension_error' });
          return;
        }
        reply(rid, { ok: !!(res && res.ok), data: res && res.data, error: res && res.error });
      });
      return;
    }
    if (d.type === 'jb-mini-replace-set-sheet' && d.sheetId) {
      chrome.runtime.sendMessage({ type: 'setSheetId', sheetId: d.sheetId }, function (res) {
        if (chrome.runtime.lastError) {
          reply(rid, { ok: false, error: chrome.runtime.lastError.message || 'extension_error' });
          return;
        }
        reply(rid, { ok: !!(res && res.ok) });
      });
      return;
    }
    if (d.type === 'jb-mini-replace-auth' && d.token) {
      chrome.runtime.sendMessage({
        type: 'replaceStoreAuth',
        token: d.token,
        exp: d.exp,
        email: d.email || '',
        sheetId: d.sheetId || ''
      }, function (res) {
        if (chrome.runtime.lastError) {
          reply(rid, { ok: false, error: chrome.runtime.lastError.message || 'extension_error' });
          return;
        }
        reply(rid, { ok: !!(res && res.ok), error: res && res.error });
      });
    }
  });

  try { window.dispatchEvent(new Event('jb-replace-bridge-ready')); } catch (_) {}
})();
