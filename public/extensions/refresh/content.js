/* Joelboard Refresh — page overlay + shortcut listener. © 2026 Joel Soluções LTDA. */
(function () {
  var shortcut = JB_REFRESH.DEFAULT_SHORTCUT;
  var overlay = null;
  var tickTimer = null;
  var tabRunning = false;
  var pauseWhenInactive = true;
  var nextRefreshAt = 0;

  var COUNTDOWN_STYLE = [
    '#jb-refresh-countdown{',
    'position:fixed;bottom:16px;right:16px;z-index:2147483646;',
    'padding:8px 14px;background:#1b1f32;border:1px solid #2b3147;color:#34d399;',
    'font:600 13px/1.2 "Hanken Grotesk",system-ui,sans-serif;border-radius:99px;',
    'box-shadow:0 4px 20px rgba(0,0,0,.35);pointer-events:none;user-select:none;',
    'transition:opacity .2s ease;',
    '}',
    '#jb-refresh-countdown.off{opacity:0;}'
  ].join('');

  function injectStyle() {
    if (document.getElementById('jb-refresh-style')) return;
    var st = document.createElement('style');
    st.id = 'jb-refresh-style';
    st.textContent = COUNTDOWN_STYLE;
    (document.head || document.documentElement).appendChild(st);
  }

  function formatRemaining(ms) {
    var sec = Math.max(0, Math.ceil(ms / 1000));
    if (sec >= 3600) {
      var h = Math.floor(sec / 3600);
      var m = Math.floor((sec % 3600) / 60);
      return h + 'h ' + m + 'm';
    }
    if (sec >= 60) {
      var mins = Math.floor(sec / 60);
      return mins + 'm ' + (sec % 60) + 's';
    }
    return sec + 's';
  }

  function shouldShow() {
    if (!tabRunning) return false;
    if (pauseWhenInactive && document.visibilityState !== 'visible') return false;
    return true;
  }

  function ensureOverlay() {
    injectStyle();
    if (overlay && overlay.isConnected) return overlay;
    overlay = document.createElement('div');
    overlay.id = 'jb-refresh-countdown';
    overlay.setAttribute('aria-live', 'polite');
    overlay.setAttribute('aria-label', 'Auto-refresh countdown');
    (document.documentElement || document.body).appendChild(overlay);
    return overlay;
  }

  function hideOverlay() {
    if (!overlay) return;
    overlay.classList.add('off');
    overlay.style.display = 'none';
  }

  function paintCountdown() {
    if (!shouldShow()) {
      hideOverlay();
      return;
    }
    var remaining = nextRefreshAt - Date.now();
    var el = ensureOverlay();
    el.style.display = '';
    el.classList.remove('off');
    el.textContent = '↻ ' + formatRemaining(remaining);
  }

  function pollStatus() {
    chrome.runtime.sendMessage({ type: 'getTabCountdown' }, function (res) {
      if (chrome.runtime.lastError || !res || !res.running) {
        tabRunning = false;
        nextRefreshAt = 0;
        hideOverlay();
        return;
      }
      tabRunning = true;
      pauseWhenInactive = !!res.pauseWhenInactive;
      nextRefreshAt = res.nextRefreshAt || 0;
      paintCountdown();
    });
  }

  function startTick() {
    clearInterval(tickTimer);
    tickTimer = setInterval(paintCountdown, 250);
  }

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

  document.addEventListener('visibilitychange', paintCountdown);

  chrome.storage.onChanged.addListener(function (changes, area) {
    if (area !== 'local' || !changes[JB_REFRESH.STORAGE_KEY]) return;
    var data = changes[JB_REFRESH.STORAGE_KEY].newValue;
    if (data && data.defaults && data.defaults.shortcut) {
      shortcut = data.defaults.shortcut;
    }
    pollStatus();
  });

  window.addEventListener('message', function (ev) {
    if (!ev.data || ev.data.type !== 'jb-mini-sites-set' || !Array.isArray(ev.data.sites)) return;
    chrome.runtime.sendMessage({ type: 'setSites', sites: ev.data.sites });
  });

  loadShortcut();
  pollStatus();
  startTick();
  setInterval(pollStatus, 4000);
})();
