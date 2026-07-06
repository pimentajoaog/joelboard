/* Joelboard Refresh — service worker. © 2026 Joel Soluções LTDA. */
importScripts('lib/shared.js', 'lib/sites.js');

function getState(cb) {
  chrome.storage.local.get([JB_REFRESH.STORAGE_KEY], function (res) {
    cb(res[JB_REFRESH.STORAGE_KEY] || JB_REFRESH.defaultData());
  });
}

function saveState(state, cb) {
  var patch = {};
  patch[JB_REFRESH.STORAGE_KEY] = state;
  chrome.storage.local.set(patch, cb || function () {});
}

function setTabNextRefresh(state, tabId, intervalSec) {
  var nextAt = Date.now() + intervalSec * 1000;
  var cfg = state.tabs[String(tabId)];
  if (cfg) cfg.nextRefreshAt = nextAt;
  return nextAt;
}

function scheduleRefresh(tabId, intervalSec) {
  var name = JB_REFRESH.alarmName(tabId);
  getState(function (state) {
    var nextAt = setTabNextRefresh(state, tabId, intervalSec);
    saveState(state, function () {
      chrome.alarms.clear(name, function () {
        chrome.alarms.create(name, { when: nextAt });
      });
    });
  });
}

function isTabActive(tabId, cb) {
  chrome.tabs.query({ active: true, lastFocusedWindow: true }, function (tabs) {
    cb(tabs.length && tabs[0].id === tabId);
  });
}

function updateBadge(tabId, running, intervalSec) {
  if (!running) {
    chrome.action.setBadgeText({ tabId: tabId, text: '' });
    return;
  }
  var label = intervalSec >= 60 ? Math.round(intervalSec / 60) + 'm' : intervalSec + 's';
  chrome.action.setBadgeBackgroundColor({ tabId: tabId, color: '#059669' });
  chrome.action.setBadgeText({ tabId: tabId, text: label });
}

function injectContent(tabId, cb) {
  chrome.scripting.executeScript({
    target: { tabId: tabId },
    func: function () { return !!window.__JB_REFRESH_ON__; }
  }, function (check) {
    if (chrome.runtime.lastError) {
      if (cb) cb(false, chrome.runtime.lastError.message);
      return;
    }
    if (check && check[0] && check[0].result) {
      if (cb) cb(true);
      return;
    }
    chrome.scripting.executeScript({
      target: { tabId: tabId },
      files: ['lib/shared.js', 'lib/sites.js', 'content.js']
    }, function () {
      if (cb) cb(!chrome.runtime.lastError, chrome.runtime.lastError && chrome.runtime.lastError.message);
    });
  });
}

function ensureInject(tabId, url, cb) {
  if (!JB_SITES.isInjectableUrl(url)) {
    if (cb) cb(false, 'unsupported');
    return;
  }
  JB_SITES.ensurePermissions(url, function (perm) {
    if (!perm.ok) {
      if (cb) cb(false, perm.reason || 'denied');
      return;
    }
    injectContent(tabId, function (ok, err) {
      if (cb) cb(!!ok, ok ? null : (err || 'inject-failed'));
    });
  });
}

function reloadTab(tabId, cb) {
  chrome.tabs.get(tabId, function (tab) {
    if (chrome.runtime.lastError || !tab) {
      stopRefresh(tabId);
      if (cb) cb(false);
      return;
    }
    chrome.tabs.reload(tabId, cb || function () {});
  });
}

function startRefresh(tabId, opts, cb) {
  getState(function (state) {
    var intervalSec = JB_REFRESH.clampInterval(
      opts.intervalSec != null ? opts.intervalSec : state.defaults.intervalSec
    );
    var pauseWhenInactive = opts.pauseWhenInactive != null
      ? !!opts.pauseWhenInactive
      : !!state.defaults.pauseWhenInactive;

    state.defaults.intervalSec = intervalSec;
    state.defaults.pauseWhenInactive = pauseWhenInactive;
    state.tabs[String(tabId)] = {
      running: true,
      intervalSec: intervalSec,
      pauseWhenInactive: pauseWhenInactive,
      nextRefreshAt: Date.now() + intervalSec * 1000
    };

    saveState(state, function () {
      chrome.tabs.get(tabId, function (tab) {
        if (chrome.runtime.lastError || !tab || !tab.url) {
          if (cb) cb({ running: false, error: 'no-tab' });
          return;
        }
        JB_SITES.ensurePermissions(tab.url, function (perm) {
          if (!perm.ok) {
            stopRefresh(tabId);
            if (cb) cb({ running: false, error: perm.reason || 'denied' });
            return;
          }
          reloadTab(tabId, function () {
            scheduleRefresh(tabId, intervalSec);
            updateBadge(tabId, true, intervalSec);
            if (cb) cb({ running: true, intervalSec: intervalSec, pauseWhenInactive: pauseWhenInactive });
          });
        });
      });
    });
  });
}

function stopRefresh(tabId, cb) {
  getState(function (state) {
    delete state.tabs[String(tabId)];
    saveState(state, function () {
      chrome.alarms.clear(JB_REFRESH.alarmName(tabId));
      updateBadge(tabId, false);
      if (cb) cb({ running: false });
    });
  });
}

function getTabStatus(tabId, cb) {
  getState(function (state) {
    var cfg = state.tabs[String(tabId)];
    cb({
      running: !!(cfg && cfg.running),
      intervalSec: cfg ? cfg.intervalSec : state.defaults.intervalSec,
      pauseWhenInactive: cfg ? cfg.pauseWhenInactive : state.defaults.pauseWhenInactive,
      nextRefreshAt: cfg ? cfg.nextRefreshAt : 0,
      defaults: state.defaults
    });
  });
}

function doScheduledReload(tabId, cfg) {
  function reschedule() {
    scheduleRefresh(tabId, cfg.intervalSec);
  }

  if (cfg.pauseWhenInactive) {
    isTabActive(tabId, function (active) {
      if (!active) {
        reschedule();
        return;
      }
      reloadTab(tabId, reschedule);
    });
    return;
  }

  reloadTab(tabId, reschedule);
}

chrome.alarms.onAlarm.addListener(function (alarm) {
  if (alarm.name.indexOf('jb-refresh-') !== 0) return;
  var tabId = parseInt(alarm.name.replace('jb-refresh-', ''), 10);
  if (!tabId) return;

  getState(function (state) {
    var cfg = state.tabs[String(tabId)];
    if (!cfg || !cfg.running) return;
    doScheduledReload(tabId, cfg);
  });
});

chrome.tabs.onRemoved.addListener(function (tabId) {
  stopRefresh(tabId);
});

chrome.tabs.onUpdated.addListener(function (tabId, info, tab) {
  if (info.status !== 'complete' || !tab.url) return;
  getState(function (state) {
    var cfg = state.tabs[String(tabId)];
    if (!cfg || !cfg.running) return;
    ensureInject(tabId, tab.url, function () {});
  });
});

function toggleRefreshForTab(tabId, cb) {
  if (tabId == null) {
    if (cb) cb({ ok: false, reason: 'no-tab' });
    return;
  }
  chrome.tabs.get(tabId, function (tab) {
    if (chrome.runtime.lastError || !tab) {
      if (cb) cb({ ok: false, reason: 'no-tab' });
      return;
    }
    if (!JB_SITES.isInjectableUrl(tab.url)) {
      if (cb) cb({ ok: false, reason: 'unsupported' });
      return;
    }
    getTabStatus(tabId, function (status) {
      if (status.running) {
        stopRefresh(tabId, function (res) {
          if (cb) cb({ ok: true, tabId: tabId, running: false, result: res });
        });
      } else {
        startRefresh(tabId, { intervalSec: status.intervalSec, pauseWhenInactive: status.pauseWhenInactive }, function (res) {
          if (cb) cb({ ok: true, tabId: tabId, running: !!res.running, result: res, error: res.error });
        });
      }
    });
  });
}

function toggleRefreshForActiveTab(cb) {
  chrome.tabs.query({ active: true, lastFocusedWindow: true }, function (tabs) {
    var tab = tabs[0];
    if (!tab || tab.id == null) {
      if (cb) cb({ ok: false, reason: 'no-tab' });
      return;
    }
    toggleRefreshForTab(tab.id, cb);
  });
}

function requestDefaultSites() {
  JB_SITES.loadSites(function (sites) {
    var patterns = JB_SITES.originPatterns(sites);
    chrome.permissions.contains({ origins: patterns }, function (has) {
      if (!has) chrome.permissions.request({ origins: patterns });
    });
  });
}

chrome.runtime.onMessage.addListener(function (msg, sender, sendResponse) {
  if (msg.type === 'getStatus') {
    getTabStatus(msg.tabId, sendResponse);
    return true;
  }
  if (msg.type === 'getTabCountdown') {
    var tabId = sender.tab && sender.tab.id;
    if (!tabId) {
      sendResponse({ running: false });
      return true;
    }
    getTabStatus(tabId, sendResponse);
    return true;
  }
  if (msg.type === 'start') {
    startRefresh(msg.tabId, msg.opts || {}, sendResponse);
    return true;
  }
  if (msg.type === 'stop') {
    stopRefresh(msg.tabId, sendResponse);
    return true;
  }
  if (msg.type === 'update') {
    getTabStatus(msg.tabId, function (status) {
      if (status.running) {
        getState(function (state) {
          var cfg = state.tabs[String(msg.tabId)];
          if (!cfg) {
            sendResponse({ running: false });
            return;
          }
          if (msg.opts.intervalSec != null) {
            cfg.intervalSec = JB_REFRESH.clampInterval(msg.opts.intervalSec);
            state.defaults.intervalSec = cfg.intervalSec;
          }
          if (msg.opts.pauseWhenInactive != null) {
            cfg.pauseWhenInactive = !!msg.opts.pauseWhenInactive;
            state.defaults.pauseWhenInactive = cfg.pauseWhenInactive;
          }
          saveState(state, function () {
            scheduleRefresh(msg.tabId, cfg.intervalSec);
            updateBadge(msg.tabId, true, cfg.intervalSec);
            sendResponse({
              running: true,
              intervalSec: cfg.intervalSec,
              pauseWhenInactive: cfg.pauseWhenInactive,
              nextRefreshAt: cfg.nextRefreshAt
            });
          });
        });
      } else {
        getState(function (state) {
          if (msg.opts.intervalSec != null) {
            state.defaults.intervalSec = JB_REFRESH.clampInterval(msg.opts.intervalSec);
          }
          if (msg.opts.pauseWhenInactive != null) {
            state.defaults.pauseWhenInactive = !!msg.opts.pauseWhenInactive;
          }
          saveState(state, function () {
            sendResponse({
              running: false,
              intervalSec: state.defaults.intervalSec,
              pauseWhenInactive: state.defaults.pauseWhenInactive
            });
          });
        });
      }
    });
    return true;
  }
  if (msg.type === 'toggle') {
    toggleRefreshForActiveTab(sendResponse);
    return true;
  }
  if (msg.type === 'toggleTab') {
    var tabId = sender.tab && sender.tab.id;
    toggleRefreshForTab(tabId, sendResponse);
    return true;
  }
  if (msg.type === 'getShortcut') {
    getState(function (state) {
      sendResponse({ shortcut: state.defaults.shortcut || JB_REFRESH.DEFAULT_SHORTCUT });
    });
    return true;
  }
  if (msg.type === 'setShortcut') {
    if (!JB_REFRESH.isValidShortcut(msg.shortcut)) {
      sendResponse({ ok: false, error: 'invalid' });
      return true;
    }
    getState(function (state) {
      state.defaults.shortcut = msg.shortcut;
      saveState(state, function () {
        sendResponse({ ok: true, shortcut: msg.shortcut });
      });
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
        chrome.permissions.request({ origins: JB_SITES.originPatterns(sites) }, function () {
          sendResponse({ ok: true, sites: sites });
        });
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
        chrome.permissions.request({ origins: JB_SITES.originPatterns(sites) }, function () {
          sendResponse({ ok: true, sites: sites });
        });
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
  chrome.storage.local.get([JB_REFRESH.STORAGE_KEY], function (res) {
    if (!res[JB_REFRESH.STORAGE_KEY]) {
      var patch = {};
      patch[JB_REFRESH.STORAGE_KEY] = JB_REFRESH.defaultData();
      chrome.storage.local.set(patch);
    }
  });
  if (details.reason === 'install' || details.reason === 'update') {
    requestDefaultSites();
  }
});
