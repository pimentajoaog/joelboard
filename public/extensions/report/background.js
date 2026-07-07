/* Joelboard Report — service worker. © 2026 Joel Soluções LTDA. */
importScripts('lib/shared.js');

chrome.runtime.onInstalled.addListener(function () {
  chrome.storage.local.get([JB_REPORT.STORAGE_KEY], function (res) {
    if (!res[JB_REPORT.STORAGE_KEY]) {
      var patch = {};
      patch[JB_REPORT.STORAGE_KEY] = JB_REPORT.defaultData();
      chrome.storage.local.set(patch);
    }
  });
});
