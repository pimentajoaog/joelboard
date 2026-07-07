/* Joelboard Replace — service worker. © 2026 Joel Soluções LTDA. */
importScripts('lib/shared.js', 'lib/sites.js');

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

function maybeInject(tabId, url) {
  if (!JB_SITES.isInjectableUrl(url)) return;
  JB_SITES.checkPermissions(url, function (perm) {
    if (!perm.ok) return;
    injectReplace(tabId);
  });
}

chrome.tabs.onUpdated.addListener(function (tabId, info, tab) {
  if (info.status === 'complete' && tab.url) maybeInject(tabId, tab.url);
});

chrome.runtime.onMessage.addListener(function (msg, sender, sendResponse) {
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
  if (details.reason !== 'install') return;
  chrome.storage.local.get([JB_REPLACE.STORAGE_KEY, 'jb_refresh_data'], function (res) {
    if (res[JB_REPLACE.STORAGE_KEY] || res.jb_refresh_data) return;
    var patch = {};
    patch[JB_REPLACE.STORAGE_KEY] = JB_REPLACE.defaultData();
    chrome.storage.local.set(patch);
  });
});
