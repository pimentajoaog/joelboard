/* Joelboard Replace — text expansion (content script). © 2026 Joel Soluções LTDA. */
(function () {
  var data = null;
  var pendingPrompt = null;

  var inputValSet = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value');
  var areaValSet = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value');

  function syncData() {
    return JB_REPLACE.load().then(function (d) { data = d; return d; });
  }

  syncData();
  chrome.storage.onChanged.addListener(function (chg) {
    if (chg.jb_replace_data) data = chg.jb_replace_data.newValue;
    else if (chg.jb_refresh_data) data = chg.jb_refresh_data.newValue;
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
      if (!sel || !sel.rangeCount) return null;
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

  function captureSnapshot(st) {
    var el = st.element;
    if (st.kind === 'ce') {
      st.snapshot = { beforeLen: (st.before || '').length };
    } else {
      st.snapshot = {
        value: el.value,
        selStart: el.selectionStart,
        selEnd: el.selectionEnd
      };
    }
  }

  function setNativeValue(el, value) {
    var setter = el.tagName === 'TEXTAREA' ? areaValSet : inputValSet;
    if (setter && setter.set) setter.set.call(el, value);
    else el.value = value;
    try {
      el.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertReplacementText', data: value }));
    } catch (_) {
      el.dispatchEvent(new Event('input', { bubbles: true }));
    }
    el.dispatchEvent(new Event('change', { bubbles: true }));
  }

  function findTextPosition(root, charIndex) {
    var walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null);
    var count = 0;
    var node;
    while ((node = walker.nextNode())) {
      var len = (node.textContent || '').length;
      if (count + len >= charIndex) {
        return { node: node, offset: charIndex - count };
      }
      count += len;
    }
    return null;
  }

  function applyToField(st, trigger, text, matchStart, caseSensitive) {
    var el = st.element;
    if (!el || !trigger) return false;
    el.focus();

    if (st.kind === 'ce') {
      var beforeLen = (st.snapshot && st.snapshot.beforeLen != null)
        ? st.snapshot.beforeLen
        : (st.before || '').length;
      var trigStart = (matchStart != null && matchStart >= 0)
        ? matchStart
        : beforeLen - trigger.length;
      var startPos = findTextPosition(el, trigStart);
      var endPos = findTextPosition(el, trigStart + trigger.length);
      if (!startPos || !endPos) return false;
      var sel = window.getSelection();
      var range = document.createRange();
      range.setStart(startPos.node, startPos.offset);
      range.setEnd(endPos.node, endPos.offset);
      sel.removeAllRanges();
      sel.addRange(range);
      var ok = document.execCommand('insertText', false, text);
      try {
        el.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertReplacementText', data: text }));
      } catch (_) {
        el.dispatchEvent(new Event('input', { bubbles: true }));
      }
      return ok;
    }

    var snap = st.snapshot;
    var val = snap ? snap.value : el.value;
    var selStart = snap ? snap.selStart : el.selectionStart;
    var selEnd = snap ? snap.selEnd : el.selectionEnd;
    var trigStart = (matchStart != null && matchStart >= 0)
      ? matchStart
      : selStart - trigger.length;
    if (trigStart < 0 || trigStart + trigger.length > val.length) return false;
    var typed = val.slice(trigStart, trigStart + trigger.length);
    if (caseSensitive ? typed !== trigger : typed.toLowerCase() !== trigger.toLowerCase()) return false;
    var after = val.slice(selEnd);

    var newVal = val.slice(0, trigStart) + text + after;
    setNativeValue(el, newVal);
    var pos = trigStart + text.length;
    try { el.setSelectionRange(pos, pos); } catch (_) {}
    return true;
  }

  function buildBuiltins() {
    return {
      date: JB_REPLACE.BUILTIN.date(),
      time: JB_REPLACE.BUILTIN.time(),
      datetime: JB_REPLACE.BUILTIN.datetime(),
      ano: JB_REPLACE.BUILTIN.ano()
    };
  }

  function readClipboard() {
    return navigator.clipboard.readText().catch(function () { return ''; });
  }

  function stopBubble(ev) {
    ev.stopPropagation();
  }

  function promptVars(missing, vars) {
    return new Promise(function (resolve) {
      if (!missing.length) { resolve(vars); return; }
      if (pendingPrompt) { resolve(null); return; }
      var key = missing[0];
      var ov = document.createElement('div');
      ov.className = 'jbr-prompt-overlay';
      ['keydown', 'keypress', 'keyup', 'input'].forEach(function (type) {
        ov.addEventListener(type, stopBubble, true);
      });

      var box = document.createElement('div');
      box.className = 'jbr-prompt';

      var title = document.createElement('div');
      title.className = 'jbr-prompt-title';
      title.textContent = 'Variável: {{' + key + '}}';

      var hint = document.createElement('div');
      hint.className = 'jbr-prompt-hint';
      hint.textContent = 'Preencha para expandir o template.';

      var inp = document.createElement('input');
      inp.className = 'jbr-prompt-input';
      inp.type = 'text';
      inp.placeholder = 'Digite o valor…';
      inp.autocomplete = 'off';
      inp.spellcheck = false;
      var preset = vars[key] != null ? vars[key] : vars[key.toLowerCase()];
      if (preset != null && String(preset) !== '') inp.value = String(preset);

      var btns = document.createElement('div');
      btns.className = 'jbr-prompt-btns';

      var skipBtn = document.createElement('button');
      skipBtn.type = 'button';
      skipBtn.className = 'jbr-btn ghost';
      skipBtn.setAttribute('data-act', 'skip');
      skipBtn.textContent = 'Pular';

      var okBtn = document.createElement('button');
      okBtn.type = 'button';
      okBtn.className = 'jbr-btn primary';
      okBtn.setAttribute('data-act', 'ok');
      okBtn.textContent = 'OK';

      btns.appendChild(skipBtn);
      btns.appendChild(okBtn);
      box.appendChild(title);
      box.appendChild(hint);
      box.appendChild(inp);
      box.appendChild(btns);
      ov.appendChild(box);
      document.documentElement.appendChild(ov);
      pendingPrompt = ov;

      function close() {
        if (ov.parentNode) ov.parentNode.removeChild(ov);
        pendingPrompt = null;
      }
      skipBtn.onclick = function () {
        close();
        resolve(promptVars(missing.slice(1), vars));
      };
      okBtn.onclick = function () {
        var v = (inp.value || '').trim();
        if (v) vars[key] = v;
        close();
        resolve(promptVars(missing.slice(1), vars));
      };
      inp.onkeydown = function (e) {
        e.stopPropagation();
        if (e.key === 'Enter') { e.preventDefault(); okBtn.click(); }
        if (e.key === 'Escape') { e.preventDefault(); close(); resolve(null); }
      };
      requestAnimationFrame(function () {
        inp.focus();
        inp.select();
      });
    });
  }

  function doExpand(st, snippet, matchStart, caseSensitive) {
    var trig = snippet.trigger || '';
    captureSnapshot(st);
    var body = snippet.body || '';
    var vars = Object.assign({}, data.vars || {});
    var builtins = buildBuiltins();
    var needsClip = JB_REPLACE.needsClipboard(body);

    function finish(clipText) {
      var expanded = JB_REPLACE.applyClipboard(body, clipText);
      var missing = JB_REPLACE.missingVars(expanded, vars, builtins);
      return promptVars(missing, vars).then(function (filled) {
        if (!filled) return false;
        var out = JB_REPLACE.expandVars(expanded, filled, builtins);
        return applyToField(st, trig, out, matchStart, caseSensitive);
      });
    }

    if (needsClip) {
      return readClipboard().then(function (clip) { return finish(clip); });
    }
    return finish('');
  }

  function showToast(msg) {
    var t = document.createElement('div');
    t.className = 'jbr-toast';
    t.textContent = msg;
    document.documentElement.appendChild(t);
    setTimeout(function () { if (t.parentNode) t.parentNode.removeChild(t); }, 2200);
  }

  document.addEventListener('keydown', function (e) {
    if (pendingPrompt) return;
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    var key = e.key;
    if (key !== ' ' && key !== 'Tab' && key !== 'Enter') return;
    var el = e.target;
    if (!isEditable(el)) return;
    if (!data) return;
    var st = getFieldState(el);
    if (!st) return;
    var settings = data.settings || {};
    var match = JB_REPLACE.findSnippetMatch(data.snippets, st.before, !!settings.caseSensitive);
    if (!match) return;
    if (key === ' ' && !settings.expandOnSpace) return;
    if (key === 'Tab' && !settings.expandOnTab) return;
    if (key === 'Enter' && !settings.expandOnEnter) return;
    e.preventDefault();
    e.stopPropagation();
    doExpand(st, match.snippet, match.start, !!settings.caseSensitive).then(function (ok) {
      if (ok) showToast('✓ ' + (match.snippet.label || match.snippet.trigger));
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
      + '.jbr-prompt-input{display:block;box-sizing:border-box;width:100%;padding:10px 12px;background:#252a40!important;border:1px solid #2b3147;border-radius:10px;color:#e7eaf3!important;-webkit-text-fill-color:#e7eaf3!important;font-size:14px;outline:none;font-family:inherit;pointer-events:auto!important;opacity:1!important}'
      + '.jbr-prompt-input:focus{border-color:#22d3ee}'
      + '.jbr-prompt-btns{display:flex;gap:8px;margin-top:14px}'
      + '.jbr-btn{flex:1;padding:10px;border-radius:10px;font-size:13px;font-weight:700;cursor:pointer;border:none;font-family:inherit}'
      + '.jbr-btn.primary{background:#22d3ee;color:#06222b}'
      + '.jbr-btn.ghost{background:#252a40;color:#e7eaf3;border:1px solid #2b3147}';
    document.documentElement.appendChild(style);
  }

  window.addEventListener('message', function (ev) {
    if (!ev.data || ev.data.type !== 'jb-mini-sites-set' || !Array.isArray(ev.data.sites)) return;
    chrome.runtime.sendMessage({ type: 'setSites', sites: ev.data.sites });
  });
})();
