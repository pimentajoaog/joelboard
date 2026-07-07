/* Joelboard Replace — prompt iframe logic. © 2026 Joel Soluções LTDA. */
(function () {
  var titleEl = document.getElementById('title');
  var inputEl = document.getElementById('value');
  var skipBtn = document.getElementById('skip');
  var okBtn = document.getElementById('ok');
  var currentKey = '';

  function reply(action, value) {
    window.parent.postMessage({
      type: 'jbr-prompt',
      action: action,
      key: currentKey,
      value: value == null ? '' : String(value)
    }, '*');
  }

  function submit() {
    reply('ok', (inputEl.value || '').trim());
  }

  skipBtn.addEventListener('click', function () { reply('skip'); });
  okBtn.addEventListener('click', submit);
  inputEl.addEventListener('keydown', function (e) {
    if (e.key === 'Enter') { e.preventDefault(); submit(); }
    if (e.key === 'Escape') { e.preventDefault(); reply('cancel'); }
  });

  window.addEventListener('message', function (e) {
    if (e.source !== window.parent || !e.data || e.data.type !== 'jbr-prompt-init') return;
    currentKey = e.data.key || '';
    titleEl.textContent = 'Variável: {{' + currentKey + '}}';
    inputEl.value = e.data.preset != null ? String(e.data.preset) : '';
    inputEl.setAttribute('aria-label', 'Valor para {{' + currentKey + '}}');
    inputEl.focus();
    inputEl.select();
  });

  window.parent.postMessage({ type: 'jbr-prompt', action: 'ready' }, '*');
})();
