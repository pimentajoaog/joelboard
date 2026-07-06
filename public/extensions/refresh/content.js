/* Joelboard Refresh — text expansion (content script). © 2026 Joel Soluções LTDA. */
(function () {
  var data = null;
  var pendingPrompt = null;

  function refreshData() {
    return JB_REFRESH.load().then(function (d) { data = d; return d; });
  }

  refreshData();
  chrome.storage.onChanged.addListener(function (chg) {
    if (chg.jb_refresh_data) data = chg.jb_refresh_data.newValue;
  });

  function isEditable(el) {
    if (!el || el.disabled || el.readOnly) return false;
    var tag = el.tagName;
    if (tag === 'TEXTAREA') return true;
    if (tag === 'INPUT') {
      var t = (el.type || 'text').toLowerCase();
      return t === 'text' || t === 'search' || t === 'email' || t === 'url' || t === 'tel' || t === '' || !t;
    }
    if (el.isContentEditable) return true;
    return false;
  }

  function getFieldState(el) {
    if (el.isContentEditable) {
      var sel = window.getSelection();
      if (!sel || sel.rangeCount < 0) return null;
      var range = sel.getRangeAt(0);
      if (!el.contains(range.startContainer)) return null;
      var pre = range.cloneRange();
      pre.selectNodeContents(el);
      pre.setEnd(range.startContainer, range.startOffset);
      return { before: pre.toString(), after: '', element: el, kind: 'ce' };
    }
    var start = el.selectionStart;
    var end = el.selectionEnd;
    if (start == null || end == null || start !== end) return null;
    return {
      before: el.value.slice(0, start),
      after: el.value.slice(end),
      element: el,
      kind: 'input',
      pos: start
    };
  }

  function setFieldValue(st, text) {
    var el = st.element;
    var trigLen = st.triggerLen || 0;
    if (st.kind === 'ce') {
      var sel = window.getSelection();
      if (!sel || !sel.rangeCount) return;
      var range = sel.getRangeAt(0);
      var node = range.startContainer;
      var off = range.startOffset;
      if (node.nodeType === 3 && off >= trigLen) {
        var t = node.textContent || '';
        node.textContent = t.slice(0, off - trigLen) + text + t.slice(off);
        var nr = document.createRange();
        nr.setStart(node, off - trigLen + text.length);
        nr.collapse(true);
        sel.removeAllRanges();
        sel.addRange(nr);
      }
      return;
    }
    el.value = st.before.slice(0, st.before.length - trigLen) + text + st.after;
    var newPos = st.before.length - trigLen + text.length;
    el.selectionStart = el.selectionEnd = newPos;
    el.dispatchEvent(new Event('input', { bubbles: true }));
  }

  function buildBuiltins() {
    return {
      date: JB_REFRESH.BUILTIN.date(),
      time: JB_REFRESH.BUILTIN.time(),
      datetime: JB_REFRESH.BUILTIN.datetime(),
      ano: JB_REFRESH.BUILTIN.ano()
    };
  }

  function readClipboard() {
    return navigator.clipboard.readText().catch(function () { return ''; });
  }

  function promptVars(missing, vars) {
    return new Promise(function (resolve) {
      if (!missing.length) { resolve(vars); return; }
      if (pendingPrompt) { resolve(null); return; }
      var key = missing[0];
      var ov = document.createElement('div');
      ov.className = 'jbr-prompt-overlay';
      ov.innerHTML = '<div class="jbr-prompt">'
        + '<div class="jbr-prompt-title">Variável: {{' + key + '}}</div>'
        + '<div class="jbr-prompt-hint">Preencha para expandir o template.</div>'
        + '<input class="jbr-prompt-input" type="text" placeholder="' + key + '">'
        + '<div class="jbr-prompt-btns">'
        + '<button type="button" class="jbr-btn ghost" data-act="skip">Pular</button>'
        + '<button type="button" class="jbr-btn primary" data-act="ok">OK</button>'
        + '</div></div>';
      document.documentElement.appendChild(ov);
      pendingPrompt = ov;
      var inp = ov.querySelector('.jbr-prompt-input');
      inp.focus();
      function close() {
        if (ov.parentNode) ov.parentNode.removeChild(ov);
        pendingPrompt = null;
      }
      ov.querySelector('[data-act="skip"]').onclick = function () {
        close();
        resolve(promptVars(missing.slice(1), vars));
      };
      ov.querySelector('[data-act="ok"]').onclick = function () {
        var v = (inp.value || '').trim();
        if (v) vars[key] = v;
        close();
        resolve(promptVars(missing.slice(1), vars));
      };
      inp.onkeydown = function (e) {
        if (e.key === 'Enter') { e.preventDefault(); ov.querySelector('[data-act="ok"]').click(); }
        if (e.key === 'Escape') { e.preventDefault(); close(); resolve(null); }
      };
    });
  }

  function doExpand(st, snippet) {
    var trig = snippet.trigger || '';
    st.triggerLen = trig.length;
    var body = snippet.body || '';
    var vars = Object.assign({}, data.vars || {});
    var builtins = buildBuiltins();
    var needsClip = body.indexOf('{{clipboard}}') > -1 || body.indexOf('{{Clipboard}}') > -1;

    function finish(builtinsExtra) {
      Object.assign(builtins, builtinsExtra || {});
      var missing = JB_REFRESH.missingVars(body, vars, builtins);
      return promptVars(missing, vars).then(function (filled) {
        if (!filled) return false;
        var out = JB_REFRESH.expandVars(body, filled, builtins);
        setFieldValue(st, out);
        return true;
      });
    }

    if (needsClip) {
      return readClipboard().then(function (clip) {
        builtins.clipboard = clip;
        return finish();
      });
    }
    return finish();
  }

  function showToast(msg) {
    var t = document.createElement('div');
    t.className = 'jbr-toast';
    t.textContent = msg;
    document.documentElement.appendChild(t);
    setTimeout(function () { if (t.parentNode) t.parentNode.removeChild(t); }, 2200);
  }

  document.addEventListener('keydown', function (e) {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    var key = e.key;
    if (key !== ' ' && key !== 'Tab' && key !== 'Enter') return;
    var el = e.target;
    if (!isEditable(el)) return;
    if (!data) return;
    var st = getFieldState(el);
    if (!st) return;
    var settings = data.settings || {};
    var snippet = JB_REFRESH.findSnippet(data.snippets, st.before, !!settings.caseSensitive);
    if (!snippet) return;
    if (key === ' ' && !settings.expandOnSpace) return;
    if (key === 'Tab' && !settings.expandOnTab) return;
    if (key === 'Enter' && !settings.expandOnEnter) return;
    e.preventDefault();
    doExpand(st, snippet).then(function (ok) {
      if (ok) showToast('✓ ' + (snippet.label || snippet.trigger));
    });
  }, true);

  if (!document.getElementById('jbr-styles')) {
    var style = document.createElement('style');
    style.id = 'jbr-styles';
    style.textContent = ''
      + '.jbr-toast{position:fixed;left:50%;bottom:24px;transform:translateX(-50%);background:#1b1f32;border:1px solid #2b3147;color:#e7eaf3;padding:10px 16px;border-radius:99px;z-index:2147483646;font:600 13px "Hanken Grotesk",system-ui,sans-serif;box-shadow:0 8px 28px rgba(0,0,0,.45);pointer-events:none}'
      + '.jbr-prompt-overlay{position:fixed;inset:0;background:rgba(0,0,0,.65);display:flex;align-items:center;justify-content:center;z-index:2147483647;padding:18px;font-family:"Hanken Grotesk",system-ui,sans-serif}'
      + '.jbr-prompt{background:#1b1f32;border:1px solid #2b3147;border-radius:16px;padding:20px;width:100%;max-width:340px;color:#e7eaf3}'
      + '.jbr-prompt-title{font-size:16px;font-weight:800;margin-bottom:4px}'
      + '.jbr-prompt-hint{font-size:12px;color:#7b85a0;margin-bottom:12px}'
      + '.jbr-prompt-input{width:100%;padding:10px 12px;background:#252a40;border:1px solid #2b3147;border-radius:10px;color:#e7eaf3;font-size:14px;outline:none;font-family:inherit}'
      + '.jbr-prompt-input:focus{border-color:#22d3ee}'
      + '.jbr-prompt-btns{display:flex;gap:8px;margin-top:14px}'
      + '.jbr-btn{flex:1;padding:10px;border-radius:10px;font-size:13px;font-weight:700;cursor:pointer;border:none;font-family:inherit}'
      + '.jbr-btn.primary{background:#22d3ee;color:#06222b}'
      + '.jbr-btn.ghost{background:#252a40;color:#e7eaf3;border:1px solid #2b3147}';
    document.documentElement.appendChild(style);
  }
})();
