/* Joelboard Replace — service worker. © 2026 Joel Soluções LTDA. */
importScripts('lib/shared.js');

chrome.runtime.onInstalled.addListener(function (details) {
  if (details.reason !== 'install') return;
  chrome.storage.local.get([JB_REPLACE.STORAGE_KEY, 'jb_refresh_data'], function (res) {
    if (res[JB_REPLACE.STORAGE_KEY] || res.jb_refresh_data) return;
    var patch = {};
    patch[JB_REPLACE.STORAGE_KEY] = JB_REPLACE.defaultData();
    chrome.storage.local.set(patch);
  });
});
