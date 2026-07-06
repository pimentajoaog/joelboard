/* Joelboard Refresh — service worker. © 2026 Joel Soluções LTDA. */
importScripts('lib/shared.js');

chrome.runtime.onInstalled.addListener(function (details) {
  if (details.reason !== 'install') return;
  chrome.storage.local.get('jb_refresh_data', function (res) {
    if (res.jb_refresh_data) return;
    chrome.storage.local.set({ jb_refresh_data: JB_REFRESH.defaultData() });
  });
});
