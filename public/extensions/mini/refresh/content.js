/* Joelboard Refresh — page overlay + shortcut listener. © 2026 Joel Soluções LTDA. */
(function () {
  if (window.__JB_REFRESH_ON__) return;
  window.__JB_REFRESH_ON__ = 1;

  var shortcut = JB_REFRESH.DEFAULT_SHORTCUT;
  var overlay = null;
  var tickTimer = null;
  var pollTimer = null;
  var tabRunning = false;
  var pauseWhenInactive = true;
  var nextRefreshAt = 0;
  var dead = false;

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

  function extAlive() {
    if (dead) return false;
    try {
      return !!(chrome.runtime && chrome.runtime.id);
    } catch (_) {
      return false;
    }
  }

  function isInvalidatedErr(msg) {
    return /invalidated|extension context/i.test(String(msg || ''));
  }

  function retire() {
    if (dead) return;
    dead = true;
    tabRunning = false;
    nextRefreshAt = 0;
    clearInterval(tickTimer);
    tickTimer = null;
    clearInterval(pollTimer);
    pollTimer = null;
    hideOverlay();
  }

  function safeSend(msg, cb) {
    if (!extAlive()) {
      retire();
      if (cb) cb(null);
      return;
    }
    try {
      chrome.runtime.sendMessage(msg, function (res) {
        var err = chrome.runtime.lastError;
        if (err) {
          if (isInvalidatedErr(err.message)) retire();
          if (cb) cb(null);
          return;
        }
        if (cb) cb(res);
      });
    } catch (e) {
      if (isInvalidatedErr(e && e.message)) retire();
      else retire();
      if (cb) cb(null);
    }
  }

  function safeStorageGet(keys, cb) {
    if (!extAlive()) {
      retire();
      if (cb) cb({});
      return;
    }
    try {
      chrome.storage.local.get(keys, function (res) {
        var err = chrome.runtime.lastError;
        if (err) {
          if (isInvalidatedErr(err.message)) retire();
          if (cb) cb({});
          return;
        }
        if (cb) cb(res);
      });
    } catch (e) {
      retire();
      if (cb) cb({});
    }
  }

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
    if (!tabRunning || dead) return false;
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
    if (!extAlive()) {
      retire();
      return;
    }
    safeSend({ type: 'getTabCountdown' }, function (res) {
      if (dead) return;
      if (!res || !res.running) {
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
    tickTimer = setInterval(function () {
      if (!extAlive()) { retire(); return; }
      paintCountdown();
    }, 250);
  }

  function loadShortcut() {
    safeStorageGet([JB_REFRESH.STORAGE_KEY], function (res) {
      if (dead) return;
      var data = res[JB_REFRESH.STORAGE_KEY];
      if (data && data.defaults && data.defaults.shortcut) {
        shortcut = data.defaults.shortcut;
      }
    });
  }

  document.addEventListener('keydown', function (e) {
    if (dead || !JB_REFRESH.matchesShortcut(e, shortcut)) return;
    e.preventDefault();
    e.stopPropagation();
    safeSend({ type: 'toggleTab' });
  }, true);

  document.addEventListener('visibilitychange', function () {
    if (!dead) paintCountdown();
  });

  try {
    chrome.storage.onChanged.addListener(function (changes, area) {
      if (dead || !extAlive()) return;
      if (area !== 'local' || !changes[JB_REFRESH.STORAGE_KEY]) return;
      var data = changes[JB_REFRESH.STORAGE_KEY].newValue;
      if (data && data.defaults && data.defaults.shortcut) {
        shortcut = data.defaults.shortcut;
      }
      pollStatus();
    });
  } catch (_) {
    retire();
  }

  window.addEventListener('message', function (ev) {
    if (dead || !ev.data || ev.data.type !== 'jb-mini-sites-set' || !Array.isArray(ev.data.sites)) return;
    safeSend({ type: 'setSites', sites: ev.data.sites });
  });

  loadShortcut();
  pollStatus();
  startTick();
  pollTimer = setInterval(pollStatus, 4000);
})();
