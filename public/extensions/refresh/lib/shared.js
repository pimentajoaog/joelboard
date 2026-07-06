/* Joelboard Refresh — shared storage & helpers. © 2026 Joel Soluções LTDA. */
var JB_REFRESH = (function () {
  var STORAGE_KEY = 'jb_auto_refresh';
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

  return {
    STORAGE_KEY: STORAGE_KEY,
    MIN_INTERVAL_SEC: MIN_INTERVAL_SEC,
    MAX_INTERVAL_SEC: MAX_INTERVAL_SEC,
    defaultData: defaultData,
    clampInterval: clampInterval,
    alarmName: alarmName,
    formatInterval: formatInterval
  };
})();
