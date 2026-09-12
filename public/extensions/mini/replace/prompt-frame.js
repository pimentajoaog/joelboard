/* Joelboard Replace — inline template prompt. © 2026 Joel Soluções LTDA. */
(function () {
  var previewEl = document.getElementById('preview');
  var skipBtn = document.getElementById('skip');
  var okBtn = document.getElementById('ok');
  var inputs = [];

  function reply(action, payload) {
    window.parent.postMessage(Object.assign({ type: 'jbr-prompt', action: action }, payload || {}), '*');
  }

  function notifySize() {
    reply('resize', { height: Math.ceil(document.body.scrollHeight) });
  }

  function syncVar(key, value) {
    inputs.forEach(function (inp) {
      if (inp.getAttribute('data-var') === key && inp.value !== value) inp.value = value;
    });
  }

  function collectValues() {
    var out = {};
    inputs.forEach(function (inp) {
      var key = inp.getAttribute('data-var');
      if (!key) return;
      var v = (inp.value || '').trim();
      if (v) out[key] = v;
    });
    return out;
  }

  function focusInput(index) {
    if (!inputs.length) return;
    var i = index;
    if (i < 0) i = 0;
    if (i >= inputs.length) i = inputs.length - 1;
    inputs[i].focus();
    inputs[i].select();
  }

  function submit() {
    reply('ok', { values: collectValues() });
  }

  function renderPreview(body, vars, builtins) {
    previewEl.textContent = '';
    inputs = [];
    var parts = JB_REPLACE.tokenizeTemplate(body, vars, builtins);
    parts.forEach(function (part) {
      if (part.type === 'text') {
        previewEl.appendChild(document.createTextNode(part.text));
        return;
      }
      if (part.missing) {
        var inp = document.createElement('input');
        inp.type = 'text';
        inp.className = 'ph-input';
        inp.setAttribute('data-var', part.key);
        inp.placeholder = part.key;
        inp.autocomplete = 'off';
        inp.spellcheck = false;
        inp.setAttribute('aria-label', part.key);
        inp.style.minWidth = Math.max(6, part.key.length + 2) + 'ch';
        inp.addEventListener('input', function () { syncVar(part.key, inp.value); });
        inp.addEventListener('keydown', function (e) {
          if (e.key === 'Enter') {
            e.preventDefault();
            var idx = inputs.indexOf(inp);
            if (idx >= inputs.length - 1) submit();
            else focusInput(idx + 1);
          }
          if (e.key === 'Escape') { e.preventDefault(); reply('cancel'); }
        });
        previewEl.appendChild(inp);
        inputs.push(inp);
        return;
      }
      var chip = document.createElement('span');
      chip.className = 'ph-resolved';
      chip.textContent = part.value;
      chip.title = part.builtin ? '{{' + part.key + '}}' : part.key;
      previewEl.appendChild(chip);
    });
    notifySize();
    if (inputs.length) focusInput(0);
  }

  skipBtn.addEventListener('click', function () { reply('skip'); });
  okBtn.addEventListener('click', submit);

  window.addEventListener('message', function (e) {
    if (e.source !== window.parent || !e.data || e.data.type !== 'jbr-prompt-init') return;
    renderPreview(e.data.body || '', e.data.vars || {}, e.data.builtins || {});
  });

  window.parent.postMessage({ type: 'jbr-prompt', action: 'ready' }, '*');
})();
