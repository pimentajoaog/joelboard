/* Joelboard Refresh — shared storage & helpers. © 2026 Joel Soluções LTDA. */
var JB_REFRESH = (function () {
  var STORAGE_KEY = 'jb_auto_refresh';
  var COMMAND_NAME = 'toggle-refresh';
  var DEFAULT_SHORTCUT = 'Alt+Shift+R';
  var MIN_INTERVAL_SEC = 3;
  var MAX_INTERVAL_SEC = 3600;

  function defaultData() {
    return {
      defaults: { intervalSec: 30, pauseWhenInactive: true },
      tabs: {}
    };
  }

  function clampInterval(sec) {
    var n = parseInt(sec, 10);
    if (!n || n < MIN_INTERVAL_SEC) return MIN_INTERVAL_SEC;
    if (n > MAX_INTERVAL_SEC) return MAX_INTERVAL_SEC;
    return n;
  }

  function alarmName(tabId) {
    return 'jb-refresh-' + tabId;
  }

  function formatInterval(sec) {
    if (sec >= 60 && sec % 60 === 0) return (sec / 60) + ' min';
    return sec + ' s';
  }

  function isMacPlatform() {
    return /Mac|iPhone|iPad|iPod/.test(navigator.platform || '') ||
      /Mac OS X/.test(navigator.userAgent || '');
  }

  function formatShortcutDisplay(shortcut) {
    if (!shortcut) return 'Não definido';
    return shortcut
      .replace(/MacCtrl/g, isMacPlatform() ? '⌃' : 'Ctrl')
      .replace(/Command/g, '⌘')
      .replace(/Alt/g, isMacPlatform() ? '⌥' : 'Alt')
      .replace(/Shift/g, '⇧')
      .replace(/\+/g, ' + ')
      .replace(/Space/g, 'Espaço');
  }

  function eventToShortcut(e) {
    if (!e || e.key === 'Escape') return null;
    var isMac = isMacPlatform();
    var parts = [];
    if (e.altKey) parts.push('Alt');
    if (e.shiftKey) parts.push('Shift');
    if (isMac && e.metaKey) parts.push('Command');
    else if (e.ctrlKey) parts.push(isMac ? 'MacCtrl' : 'Ctrl');
    else if (!isMac && e.metaKey) parts.push('Ctrl');

    var key = e.key;
    if (!key || key === 'Control' || key === 'Alt' || key === 'Shift' || key === 'Meta') return null;
    if (key === ' ') key = 'Space';
    else if (key.length === 1) key = key.toUpperCase();
    else if (key.indexOf('Arrow') === 0) key = key.slice(5);
    else if (key === 'Delete') key = 'Delete';
    else return null;

    parts.push(key);
    if (parts.length < 2) return null;
    return parts.join('+');
  }

  function isValidShortcut(shortcut) {
    if (!shortcut) return false;
    var parts = shortcut.split('+');
    if (parts.length < 2) return false;
    var mods = parts.slice(0, -1);
    var hasCtrl = mods.indexOf('Ctrl') !== -1 || mods.indexOf('MacCtrl') !== -1;
    var hasAlt = mods.indexOf('Alt') !== -1;
    var hasCmd = mods.indexOf('Command') !== -1;
    return hasCtrl || hasAlt || hasCmd;
  }

  return {
    STORAGE_KEY: STORAGE_KEY,
    COMMAND_NAME: COMMAND_NAME,
    DEFAULT_SHORTCUT: DEFAULT_SHORTCUT,
    MIN_INTERVAL_SEC: MIN_INTERVAL_SEC,
    MAX_INTERVAL_SEC: MAX_INTERVAL_SEC,
    defaultData: defaultData,
    clampInterval: clampInterval,
    alarmName: alarmName,
    formatInterval: formatInterval,
    formatShortcutDisplay: formatShortcutDisplay,
    eventToShortcut: eventToShortcut,
    isValidShortcut: isValidShortcut,
    isMacPlatform: isMacPlatform
  };
})();
