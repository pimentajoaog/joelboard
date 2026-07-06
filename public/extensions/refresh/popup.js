/* Joelboard Refresh — popup. © 2026 Joel Soluções LTDA. */
(function () {
  var tabId = null;

  var $ = function (id) { return document.getElementById(id); };
  var tabUrl = $('tabUrl');
  var statusEl = $('status');
  var statusLabel = $('statusLabel');
  var statusDetail = $('statusDetail');
  var intervalVal = $('intervalVal');
  var intervalUnit = $('intervalUnit');
  var pauseInactive = $('pauseInactive');
  var btnStart = $('btnStart');
  var btnStop = $('btnStop');
  var presets = $('presets');

  function send(msg) {
    return new Promise(function (resolve) {
      chrome.runtime.sendMessage(msg, resolve);
    });
  }

  function readIntervalSec() {
    var val = parseInt(intervalVal.value, 10) || JB_REFRESH.MIN_INTERVAL_SEC;
    var sec = intervalUnit.value === 'min' ? val * 60 : val;
    return JB_REFRESH.clampInterval(sec);
  }

  function writeIntervalSec(sec) {
    sec = JB_REFRESH.clampInterval(sec);
    if (sec >= 60 && sec % 60 === 0) {
      intervalVal.value = sec / 60;
      intervalUnit.value = 'min';
    } else {
      intervalVal.value = sec;
      intervalUnit.value = 'sec';
    }
    highlightPreset(sec);
  }

  function highlightPreset(sec) {
    presets.querySelectorAll('.chip').forEach(function (chip) {
      chip.classList.toggle('on', parseInt(chip.dataset.sec, 10) === sec);
    });
  }

  function currentOpts() {
    return {
      intervalSec: readIntervalSec(),
      pauseWhenInactive: pauseInactive.checked
    };
  }

  function setRunning(running) {
    statusEl.classList.toggle('on', running);
    statusLabel.textContent = running ? 'Ativo' : 'Parado';
    btnStart.disabled = running;
    btnStop.disabled = !running;
    intervalVal.disabled = running;
    intervalUnit.disabled = running;
    presets.querySelectorAll('.chip').forEach(function (c) { c.disabled = running; });
  }

  function render(status) {
    writeIntervalSec(status.intervalSec);
    pauseInactive.checked = status.pauseWhenInactive;
    setRunning(status.running);
    if (status.running) {
      statusDetail.textContent = 'a cada ' + JB_REFRESH.formatInterval(status.intervalSec);
    } else {
      statusDetail.textContent = '';
    }
  }

  async function refreshUI() {
    var tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    var tab = tabs[0];
    if (!tab || tab.id == null) {
      tabUrl.textContent = 'Nenhuma aba ativa';
      btnStart.disabled = true;
      return;
    }
    tabId = tab.id;
    var host = '—';
    try {
      host = tab.url ? new URL(tab.url).hostname || tab.url : tab.url || '—';
    } catch (_e) {
      host = tab.url || '—';
    }
    tabUrl.textContent = host;
    tabUrl.title = tab.url || '';

    if (tab.url && (tab.url.startsWith('chrome://') || tab.url.startsWith('chrome-extension://') || tab.url.startsWith('edge://'))) {
      tabUrl.textContent = 'Página do navegador — não suportada';
      btnStart.disabled = true;
      btnStop.disabled = true;
      return;
    }

    var status = await send({ type: 'getStatus', tabId: tabId });
    render(status);
  }

  btnStart.addEventListener('click', async function () {
    if (tabId == null) return;
    var res = await send({ type: 'start', tabId: tabId, opts: currentOpts() });
    render(res);
  });

  btnStop.addEventListener('click', async function () {
    if (tabId == null) return;
    var res = await send({ type: 'stop', tabId: tabId });
    render(Object.assign({ intervalSec: readIntervalSec(), pauseWhenInactive: pauseInactive.checked }, res));
  });

  intervalVal.addEventListener('change', function () {
    writeIntervalSec(readIntervalSec());
    if (tabId != null) send({ type: 'update', tabId: tabId, opts: currentOpts() });
  });

  intervalUnit.addEventListener('change', function () {
    writeIntervalSec(readIntervalSec());
    if (tabId != null) send({ type: 'update', tabId: tabId, opts: currentOpts() });
  });

  pauseInactive.addEventListener('change', function () {
    if (tabId != null) send({ type: 'update', tabId: tabId, opts: currentOpts() });
  });

  presets.addEventListener('click', function (e) {
    var chip = e.target.closest('.chip');
    if (!chip || chip.disabled) return;
    writeIntervalSec(parseInt(chip.dataset.sec, 10));
    if (tabId != null) send({ type: 'update', tabId: tabId, opts: currentOpts() });
  });

  refreshUI();
})();
