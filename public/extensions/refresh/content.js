/* Joelboard Refresh — page shortcut listener. © 2026 Joel Soluções LTDA. */
(function () {
  var shortcut = JB_REFRESH.DEFAULT_SHORTCUT;

  function loadShortcut() {
    chrome.storage.local.get([JB_REFRESH.STORAGE_KEY], function (res) {
      var data = res[JB_REFRESH.STORAGE_KEY];
      if (data && data.defaults && data.defaults.shortcut) {
        shortcut = data.defaults.shortcut;
      }
    });
  }

  document.addEventListener('keydown', function (e) {
    if (!JB_REFRESH.matchesShortcut(e, shortcut)) return;
    e.preventDefault();
    e.stopPropagation();
    chrome.runtime.sendMessage({ type: 'toggleTab' });
  }, true);

  chrome.storage.onChanged.addListener(function (changes, area) {
    if (area !== 'local' || !changes[JB_REFRESH.STORAGE_KEY]) return;
    var data = changes[JB_REFRESH.STORAGE_KEY].newValue;
    if (data && data.defaults && data.defaults.shortcut) {
      shortcut = data.defaults.shortcut;
    }
  });

  loadShortcut();
})();
