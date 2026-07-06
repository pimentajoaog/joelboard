/* Joelboard Refresh — service worker. © 2026 Joel Soluções LTDA. */
importScripts('lib/shared.js');

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

function scheduleRefresh(tabId, intervalSec) {
  var name = JB_REFRESH.alarmName(tabId);
  chrome.alarms.clear(name, function () {
    chrome.alarms.create(name, { when: Date.now() + intervalSec * 1000 });
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
      pauseWhenInactive: pauseWhenInactive
    };

    saveState(state, function () {
      scheduleRefresh(tabId, intervalSec);
      updateBadge(tabId, true, intervalSec);
      if (cb) cb({ running: true, intervalSec: intervalSec, pauseWhenInactive: pauseWhenInactive });
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
      defaults: state.defaults
    });
  });
}

chrome.alarms.onAlarm.addListener(function (alarm) {
  if (alarm.name.indexOf('jb-refresh-') !== 0) return;
  var tabId = parseInt(alarm.name.replace('jb-refresh-', ''), 10);
  if (!tabId) return;

  getState(function (state) {
    var cfg = state.tabs[String(tabId)];
    if (!cfg || !cfg.running) return;

    function reschedule() {
      scheduleRefresh(tabId, cfg.intervalSec);
    }

    if (cfg.pauseWhenInactive) {
      isTabActive(tabId, function (active) {
        if (!active) {
          reschedule();
          return;
        }
        chrome.tabs.get(tabId, function (tab) {
          if (chrome.runtime.lastError || !tab) {
            stopRefresh(tabId);
            return;
          }
          chrome.tabs.reload(tabId, reschedule);
        });
      });
      return;
    }

    chrome.tabs.get(tabId, function (tab) {
      if (chrome.runtime.lastError || !tab) {
        stopRefresh(tabId);
        return;
      }
      chrome.tabs.reload(tabId, reschedule);
    });
  });
});

chrome.tabs.onRemoved.addListener(function (tabId) {
  stopRefresh(tabId);
});

function toggleRefreshForActiveTab(cb) {
  chrome.tabs.query({ active: true, lastFocusedWindow: true }, function (tabs) {
    var tab = tabs[0];
    if (!tab || tab.id == null) {
      if (cb) cb({ ok: false, reason: 'no-tab' });
      return;
    }
    if (tab.url && /^(chrome|chrome-extension|edge|devtools|about):/.test(tab.url)) {
      if (cb) cb({ ok: false, reason: 'unsupported' });
      return;
    }
    getTabStatus(tab.id, function (status) {
      if (status.running) {
        stopRefresh(tab.id, function (res) {
          if (cb) cb({ ok: true, tabId: tab.id, running: false, intervalSec: status.intervalSec, pauseWhenInactive: status.pauseWhenInactive, result: res });
        });
      } else {
        startRefresh(tab.id, { intervalSec: status.intervalSec, pauseWhenInactive: status.pauseWhenInactive }, function (res) {
          if (cb) cb({ ok: true, tabId: tab.id, running: true, result: res });
        });
      }
    });
  });
}

chrome.commands.onCommand.addListener(function (command) {
  if (command !== JB_REFRESH.COMMAND_NAME) return;
  toggleRefreshForActiveTab();
});

chrome.runtime.onMessage.addListener(function (msg, _sender, sendResponse) {
  if (msg.type === 'getStatus') {
    getTabStatus(msg.tabId, sendResponse);
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
        startRefresh(msg.tabId, msg.opts || {}, sendResponse);
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
  if (msg.type === 'getShortcut') {
    chrome.commands.getAll(function (commands) {
      var cmd = commands.filter(function (c) { return c.name === JB_REFRESH.COMMAND_NAME; })[0];
      sendResponse({ shortcut: (cmd && cmd.shortcut) || '' });
    });
    return true;
  }
});

chrome.runtime.onInstalled.addListener(function (details) {
  if (details.reason === 'install') {
    chrome.storage.local.get([JB_REFRESH.STORAGE_KEY], function (res) {
      if (res[JB_REFRESH.STORAGE_KEY]) return;
      var patch = {};
      patch[JB_REFRESH.STORAGE_KEY] = JB_REFRESH.defaultData();
      chrome.storage.local.set(patch);
    });
  }
  if (details.reason === 'install' || details.reason === 'update') {
    chrome.commands.getAll(function (commands) {
      var cmd = commands.filter(function (c) { return c.name === JB_REFRESH.COMMAND_NAME; })[0];
      if (cmd && cmd.shortcut) return;
      chrome.commands.update({
        name: JB_REFRESH.COMMAND_NAME,
        shortcut: JB_REFRESH.DEFAULT_SHORTCUT
      });
    });
  }
});
