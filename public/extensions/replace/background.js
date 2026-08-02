/* Joelboard Replace — service worker. © 2026 Joel Soluções LTDA. */
importScripts('lib/shared.js', 'lib/sites.js', 'lib/sheets-sync.js', 'lib/sheet-data.js');

var pushTimer = null;

function tabExists(tabId, cb) {
  chrome.tabs.get(tabId, function (tab) {
    cb(!chrome.runtime.lastError && !!tab);
  });
}

function injectReplace(tabId, cb) {
  tabExists(tabId, function (ok) {
    if (!ok) {
      if (cb) cb(false);
      return;
    }
    chrome.scripting.executeScript({
      target: { tabId: tabId },
      func: function () { return !!window.__JB_REPLACE_ON__; }
    }, function (check) {
      if (chrome.runtime.lastError) {
        if (cb) cb(false);
        return;
      }
      if (check && check[0] && check[0].result) {
        if (cb) cb(true);
        return;
      }
      chrome.scripting.executeScript({
        target: { tabId: tabId },
        files: ['lib/shared.js', 'content.js']
      }, function () {
        if (cb) cb(!chrome.runtime.lastError);
      });
    });
  });
}

function maybeInjectHubBridge(tabId, url) {
  if (!url || url.indexOf('/mini/replace-auth.html') < 0) return;
  if (!/^https:\/\/joelboard\.vercel\.app\//.test(url) && !/^http:\/\/localhost/.test(url) && !/^http:\/\/127\.0\.0\.1/.test(url)) return;
  chrome.scripting.executeScript({
    target: { tabId: tabId },
    files: ['hub-bridge.js']
  });
}

function maybeInject(tabId, url) {
  if (!JB_SITES.isInjectableUrl(url)) return;
  JB_SITES.checkPermissions(url, function (perm) {
    if (!perm.ok) return;
    injectReplace(tabId);
  });
}

function notifyTabReload(tabId) {
  tabExists(tabId, function (ok) {
    if (!ok) return;
    chrome.scripting.executeScript({
      target: { tabId: tabId },
      func: function () {
        if (document.getElementById('jbr-update-toast')) return;
        var t = document.createElement('div');
        t.id = 'jbr-update-toast';
        t.textContent = 'Replace atualizado — recarregue esta aba (F5).';
        t.style.cssText = 'position:fixed;left:50%;bottom:24px;transform:translateX(-50%);background:#1b1f32;border:1px solid #2b3147;color:#e7eaf3;padding:10px 16px;border-radius:99px;z-index:2147483647;font:600 13px system-ui,sans-serif;box-shadow:0 8px 28px rgba(0,0,0,.45);pointer-events:none';
        document.documentElement.appendChild(t);
        setTimeout(function () { if (t.parentNode) t.parentNode.removeChild(t); }, 8000);
      }
    });
  });
}

function notifyOpenTabsOnUpdate() {
  chrome.tabs.query({}, function (tabs) {
    (tabs || []).forEach(function (tab) {
      if (!tab.id || !tab.url) return;
      if (!JB_SITES.isInjectableUrl(tab.url)) return;
      JB_SITES.checkPermissions(tab.url, function (perm) {
        if (perm.ok) notifyTabReload(tab.id);
      });
    });
  });
}

function schedulePush() {
  clearTimeout(pushTimer);
  pushTimer = setTimeout(function () {
    JB_SHEETS.isSignedIn().then(function (ok) {
      if (!ok) return;
      JB_REPLACE.load().then(function (data) {
        JB_REPLACE_SHEET.push(data).catch(function () {});
      });
    });
  }, 2500);
}

chrome.tabs.onUpdated.addListener(function (tabId, info, tab) {
  if (info.status === 'complete' && tab.url) {
    maybeInjectHubBridge(tabId, tab.url);
    maybeInject(tabId, tab.url);
  }
});

chrome.storage.onChanged.addListener(function (chg) {
  if (chg.jb_replace_data) schedulePush();
});

chrome.alarms.create('replace-sync', { periodInMinutes: 30 });
chrome.alarms.onAlarm.addListener(function (a) {
  if (a.name !== 'replace-sync') return;
  JB_SHEETS.isSignedIn().then(function (ok) {
    if (!ok) return;
    JB_REPLACE_SHEET.sync(true).catch(function () {});
  });
});

chrome.runtime.onMessage.addListener(function (msg, sender, sendResponse) {
  if (msg.type === 'schedulePush') {
    schedulePush();
    sendResponse({ ok: true });
    return;
  }
  if (msg.type === 'replaceGetData') {
    JB_REPLACE.load().then(function (data) {
      sendResponse({ ok: true, data: data });
    });
    return true;
  }
  if (msg.type === 'replaceSetData' && msg.data) {
    JB_REPLACE.save(msg.data).then(function () {
      sendResponse({ ok: true });
    });
    return true;
  }
  if (msg.type === 'replaceSyncNow') {
    JB_REPLACE_SHEET.sync(true).then(function (data) {
      sendResponse({ ok: true, data: data });
    }).catch(function (e) {
      sendResponse({ ok: false, error: (e && e.message) || 'sync_failed' });
    });
    return true;
  }
  if (msg.type === 'setSheetId' && msg.sheetId) {
    JB_SHEETS.setSheetId(msg.sheetId).then(function () {
      sendResponse({ ok: true });
    });
    return true;
  }
  if (msg.type === 'replaceStoreAuth' && msg.token) {
    JB_SHEETS.storeAuth({
      token: msg.token,
      exp: msg.exp,
      email: msg.email || '',
      sheetId: msg.sheetId || ''
    }).then(function () {
      sendResponse({ ok: true });
    }).catch(function (e) {
      sendResponse({ ok: false, error: (e && e.message) || 'store_failed' });
    });
    return true;
  }
  if (msg.type === 'getSites') {
    JB_SITES.loadSites(sendResponse);
    return true;
  }
  if (msg.type === 'addSite') {
    JB_SITES.addSite(msg.host, sendResponse);
    return true;
  }
  if (msg.type === 'removeSite') {
    JB_SITES.removeSite(msg.host, sendResponse);
    return true;
  }
  if (msg.type === 'setSites') {
    JB_SITES.saveSites(msg.sites, function () {
      JB_SITES.loadSites(function (sites) {
        sendResponse({ ok: true, sites: sites });
      });
    });
    return true;
  }
});

chrome.runtime.onMessageExternal.addListener(function (msg, sender, sendResponse) {
  if (msg.type === 'getSites') {
    JB_SITES.loadSites(sendResponse);
    return true;
  }
  if (msg.type === 'setSites' && Array.isArray(msg.sites)) {
    JB_SITES.saveSites(msg.sites, function () {
      JB_SITES.loadSites(function (sites) {
        sendResponse({ ok: true, sites: sites });
      });
    });
    return true;
  }
  if (msg.type === 'addSite' && msg.host) {
    JB_SITES.addSite(msg.host, sendResponse);
    return true;
  }
});

chrome.runtime.onInstalled.addListener(function (details) {
  if (details.reason === 'update') {
    notifyOpenTabsOnUpdate();
  }
  if (details.reason !== 'install') return;
  chrome.storage.local.get([JB_REPLACE.STORAGE_KEY, 'jb_refresh_data'], function (res) {
    if (res[JB_REPLACE.STORAGE_KEY] || res.jb_refresh_data) return;
    var patch = {};
    patch[JB_REPLACE.STORAGE_KEY] = JB_REPLACE.defaultData();
    chrome.storage.local.set(patch);
  });
});
