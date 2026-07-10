/* Joelboard Replace — text expansion (content script). © 2026 Joel Soluções LTDA. */
(function () {
  if (window.__JB_REPLACE_ON__) return;
  window.__JB_REPLACE_ON__ = 1;

  var data = null;
  var pendingPrompt = null;
  var expanding = false;

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

  function applyToField(st, trigger, text, matchStart, caseSensitive, suffix) {
    suffix = suffix == null ? '' : String(suffix);
    var el = st.element;
    if (!el || !trigger) return false;
    el.focus();

    if (st.kind === 'ce') {
      var sel = window.getSelection();
      if (!sel || !sel.rangeCount) return false;
      var range = sel.getRangeAt(0);
      var pre = range.cloneRange();
      pre.selectNodeContents(el);
      pre.setEnd(range.startContainer, range.startOffset);
      var beforeNow = pre.toString();
      var trigStart = (matchStart != null && matchStart >= 0)
        ? matchStart
        : beforeNow.length - trigger.length;
      if (trigStart < 0) return false;
      var hay = caseSensitive ? beforeNow : beforeNow.toLowerCase();
      var needle = caseSensitive ? trigger : trigger.toLowerCase();
      if (hay.slice(trigStart, trigStart + trigger.length) !== needle) return false;
      var startPos = findTextPosition(el, trigStart);
      var endPos = findTextPosition(el, trigStart + trigger.length);
      if (!startPos || !endPos) return false;
      range = document.createRange();
      range.setStart(startPos.node, startPos.offset);
      range.setEnd(endPos.node, endPos.offset);
      sel.removeAllRanges();
      sel.addRange(range);
      var useHtml = JB_REPLACE.hasFormatting(text);
      var insertVal = (useHtml ? JB_REPLACE.bodyToHtml(text) : text) + suffix;
      var ok = useHtml
        ? document.execCommand('insertHTML', false, insertVal)
        : document.execCommand('insertText', false, insertVal);
      try {
        el.dispatchEvent(new InputEvent('input', {
          bubbles: true,
          inputType: 'insertReplacementText',
          data: useHtml ? '' : text
        }));
      } catch (_) {
        el.dispatchEvent(new Event('input', { bubbles: true }));
      }
      return ok;
    }

    var plain = JB_REPLACE.bodyToPlain(text) + suffix;
    var val = el.value;
    var selStart = el.selectionStart;
    var selEnd = el.selectionEnd;
    if (selStart == null || selEnd == null) return false;
    var trigStart = (matchStart != null && matchStart >= 0)
      ? matchStart
      : selStart - trigger.length;
    if (trigStart < 0 || trigStart + trigger.length > val.length) return false;
    var typed = val.slice(trigStart, trigStart + trigger.length);
    if (caseSensitive ? typed !== trigger : typed.toLowerCase() !== trigger.toLowerCase()) return false;
    var trigEnd = trigStart + trigger.length;
    var preserved = '';
    if (selStart === selEnd && selStart >= trigEnd) {
      preserved = val.slice(trigEnd, selStart);
    }
    var after = val.slice(selEnd);

    var newVal = val.slice(0, trigStart) + plain + preserved + after;
    setNativeValue(el, newVal);
    var pos = trigStart + plain.length + preserved.length;
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

  function blurActiveField() {
    var ae = document.activeElement;
    if (!ae || ae === document.body || ae === document.documentElement) return;
    try { ae.blur(); } catch (_) {}
  }

  function promptVars(body, vars, builtins) {
    return new Promise(function (resolve) {
      var missing = JB_REPLACE.missingVars(body, vars, builtins);
      if (!missing.length) { resolve(vars); return; }
      if (pendingPrompt) { resolve(null); return; }

      blurActiveField();

      var host = document.createElement('div');
      host.id = 'jbr-prompt-root';
      host.style.cssText = 'position:fixed;inset:0;z-index:2147483647;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,.65);padding:18px;box-sizing:border-box';

      var iframe = document.createElement('iframe');
      iframe.src = chrome.runtime.getURL('prompt.html');
      iframe.title = 'Completar template';
      iframe.setAttribute('aria-label', 'Completar template');
      iframe.style.cssText = 'border:0;width:100%;max-width:560px;height:320px;background:transparent;color-scheme:dark';

      host.appendChild(iframe);
      document.documentElement.appendChild(host);
      pendingPrompt = host;

      function cleanup() {
        window.removeEventListener('message', onMsg);
        if (host.parentNode) host.parentNode.removeChild(host);
        pendingPrompt = null;
      }

      function onMsg(ev) {
        if (ev.source !== iframe.contentWindow || !ev.data || ev.data.type !== 'jbr-prompt') return;
        if (ev.data.action === 'ready') {
          iframe.contentWindow.postMessage({
            type: 'jbr-prompt-init',
            body: body,
            vars: vars,
            builtins: builtins
          }, '*');
          return;
        }
        if (ev.data.action === 'resize' && ev.data.height) {
          var maxH = Math.max(220, Math.min(ev.data.height + 8, Math.floor(window.innerHeight * 0.82)));
          iframe.style.height = maxH + 'px';
          return;
        }
        if (ev.data.action === 'ok') {
          var filled = ev.data.values || {};
          Object.keys(filled).forEach(function (k) { vars[k] = filled[k]; });
          cleanup();
          resolve(vars);
          return;
        }
        if (ev.data.action === 'skip') {
          cleanup();
          resolve(vars);
          return;
        }
        if (ev.data.action === 'cancel') {
          cleanup();
          resolve(null);
        }
      }

      window.addEventListener('message', onMsg);
    });
  }

  function doExpand(st, snippet, matchStart, caseSensitive, suffix) {
    if (expanding) return Promise.resolve(false);
    expanding = true;
    var trig = snippet.trigger || '';
    captureSnapshot(st);
    var body = snippet.body || '';
    var vars = Object.assign({}, data.vars || {});
    var builtins = buildBuiltins();
    var needsClip = JB_REPLACE.needsClipboard(body);

    function finish(clipText) {
      var expanded = JB_REPLACE.applyClipboard(body, clipText);
      return promptVars(expanded, vars, builtins).then(function (filled) {
        if (!filled) return false;
        var out = JB_REPLACE.expandVars(expanded, filled, builtins);
        return applyToField(st, trig, out, matchStart, caseSensitive, suffix);
      });
    }

    var chain = needsClip
      ? readClipboard().then(function (clip) { return finish(clip); })
      : finish('');
    return chain.finally(function () { expanding = false; });
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
    if (expanding) return;
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
    var suffix = key === ' ' ? ' ' : '';
    doExpand(st, match.snippet, match.start, !!settings.caseSensitive, suffix).then(function (ok) {
      if (ok) showToast('✓ ' + (match.snippet.label || match.snippet.trigger));
    });
  }, true);

  document.addEventListener('input', function (e) {
    if (expanding || pendingPrompt) return;
    if (e.isComposing) return;
    var el = e.target;
    if (!isEditable(el)) return;
    if (!data || !data.settings || !data.settings.expandOnType) return;
    var st = getFieldState(el);
    if (!st) return;
    var settings = data.settings || {};
    var match = JB_REPLACE.findSnippetMatch(data.snippets, st.before, !!settings.caseSensitive);
    if (!match) return;
    if (match.end !== (st.before || '').length) return;
    doExpand(st, match.snippet, match.start, !!settings.caseSensitive).then(function (ok) {
      if (ok) showToast('✓ ' + (match.snippet.label || match.snippet.trigger));
    });
  }, true);

  if (!document.getElementById('jbr-styles')) {
    var style = document.createElement('style');
    style.id = 'jbr-styles';
    style.textContent = ''
      + '.jbr-toast{position:fixed;left:50%;bottom:24px;transform:translateX(-50%);background:#1b1f32;border:1px solid #2b3147;color:#e7eaf3;padding:10px 16px;border-radius:99px;z-index:2147483646;font:600 13px "Hanken Grotesk",system-ui,sans-serif;box-shadow:0 8px 28px rgba(0,0,0,.45);pointer-events:none}';
    document.documentElement.appendChild(style);
  }

  window.addEventListener('message', function (ev) {
    if (!ev.data || ev.data.type !== 'jb-mini-sites-set' || !Array.isArray(ev.data.sites)) return;
    chrome.runtime.sendMessage({ type: 'setSites', sites: ev.data.sites });
  });
})();
