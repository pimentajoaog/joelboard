/* Joelboard shared rich-text editor. © 2026 Joel Soluções LTDA.
   Classic global script (NOT a module). Loads after /joelboard.js. */
(function () {
  var CELL_LIMIT = 50000;
  var AUTOSAVE_MS = 20000;
  var IMAGE_MAX_BYTES = 10 * 1024 * 1024;
  var IMAGE_OK = { 'image/png': 1, 'image/jpeg': 1, 'image/jpg': 1, 'image/webp': 1, 'image/gif': 1 };
  var FONT_SIZES = [8, 9, 10, 11, 12, 14, 16, 18, 20, 22, 24, 26, 28, 36, 48, 72];
  var FONT_SIZE_MIN = 8;
  var FONT_SIZE_MAX = 72;
  var FONT_SIZE_NAMED = {
    'xx-small': '9px', 'x-small': '10px', 'small': '13px', 'medium': '16px',
    'large': '18px', 'x-large': '24px', 'xx-large': '32px', 'xxx-large': '48px'
  };
  var FONT_TAG_SIZE = { '1': '10px', '2': '13px', '3': '16px', '4': '18px', '5': '24px', '6': '32px', '7': '48px' };
  var HIGHLIGHTS = [
    { label: 'Amarelo', color: '#fff59d' },
    { label: 'Verde', color: '#b9f6ca' },
    { label: 'Azul', color: '#84ffff' },
    { label: 'Rosa', color: '#f8bbd0' },
    { label: 'Laranja', color: '#ffcc80' },
    { label: 'Roxo', color: '#e1bee7' }
  ];
  var HIGHLIGHT_NAMED = {
    yellow: '#fff59d', lime: '#b9f6ca', green: '#b9f6ca', aqua: '#84ffff', cyan: '#84ffff',
    turquoise: '#84ffff', fuchsia: '#f8bbd0', magenta: '#f8bbd0', pink: '#f8bbd0',
    orange: '#ffcc80', red: '#ff8a80', blue: '#82b1ff', purple: '#e1bee7', violet: '#e1bee7'
  };
  var ALLOWED = { P:1, H1:1, H2:1, H3:1, DIV:1, BR:1, SPAN:1, STRONG:1, B:1, EM:1, I:1, U:1, S:1, STRIKE:1, A:1, UL:1, OL:1, LI:1, BLOCKQUOTE:1, PRE:1, CODE:1, HR:1, FONT:1, IMG:1 };

  function parseFontSizeInput(raw) {
    var n = parseFloat(String(raw == null ? '' : raw).replace(',', '.').replace(/px$/i, '').trim());
    if (!isFinite(n) || n <= 0) return 0;
    n = Math.round(n);
    if (n < FONT_SIZE_MIN) n = FONT_SIZE_MIN;
    if (n > FONT_SIZE_MAX) n = FONT_SIZE_MAX;
    return n;
  }
  function stepFontSize(current, dir) {
    var n = parseFontSizeInput(current) || 16;
    var i;
    if (dir > 0) {
      for (i = 0; i < FONT_SIZES.length; i++) if (FONT_SIZES[i] > n) return FONT_SIZES[i];
      return FONT_SIZES[FONT_SIZES.length - 1];
    }
    for (i = FONT_SIZES.length - 1; i >= 0; i--) if (FONT_SIZES[i] < n) return FONT_SIZES[i];
    return FONT_SIZES[0];
  }
  function cssFontSizeFromStyle(st) {
    st = String(st || '');
    var fs = st.match(/font-size\s*:\s*([0-9.]+)px/i);
    if (fs) {
      var n = parseFontSizeInput(fs[1]);
      return n ? n + 'px' : '';
    }
    var named = st.match(/font-size\s*:\s*(-webkit-)?(xx-small|x-small|small|medium|large|x-large|xx-large|xxx-large)/i);
    if (named) return FONT_SIZE_NAMED[named[2].toLowerCase()] || '';
    return '';
  }
  function isExecFontSizeMarker(el) {
    if (!el || el.nodeType !== 1) return false;
    if (el.tagName === 'FONT' && String(el.getAttribute('size') || '') === '7') return true;
    var st = String(el.getAttribute('style') || '').toLowerCase();
    return /font-size\s*:\s*(-webkit-)?(xxx-large|xx-large)\s*(;|$)/.test(st);
  }
  function rgbToHex(r, g, b) {
    function hx(n) {
      n = Math.max(0, Math.min(255, n | 0));
      return (n < 16 ? '0' : '') + n.toString(16);
    }
    return '#' + hx(r) + hx(g) + hx(b);
  }
  function normalizeHex(h) {
    h = String(h || '').toLowerCase();
    if (/^#[0-9a-f]{3}$/.test(h)) return '#' + h[1] + h[1] + h[2] + h[2] + h[3] + h[3];
    if (/^#[0-9a-f]{6}$/.test(h)) return h;
    return '';
  }
  function cssHighlightFromStyle(st) {
    st = String(st || '');
    if (/background-color\s*:\s*(transparent|inherit|initial|none)\b/i.test(st)) return '';
    var hex = st.match(/background-color\s*:\s*(#(?:[0-9a-f]{3}|[0-9a-f]{6}))\b/i);
    if (hex) return normalizeHex(hex[1]);
    var rgb = st.match(/background-color\s*:\s*rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)(?:\s*,\s*([\d.]+))?\s*\)/i);
    if (rgb) {
      if (rgb[4] != null && Number(rgb[4]) <= 0) return '';
      return rgbToHex(+rgb[1], +rgb[2], +rgb[3]);
    }
    var named = st.match(/background-color\s*:\s*([a-z]+)/i);
    if (named) return HIGHLIGHT_NAMED[named[1].toLowerCase()] || '';
    return '';
  }

  function safeDriveFileId(id) {
    var s = String(id || '').trim();
    return /^[A-Za-z0-9_-]{10,128}$/.test(s) ? s : '';
  }
  function isPasteImage(file) {
    if (!file) return false;
    var t = String(file.type || '').toLowerCase();
    if (IMAGE_OK[t]) return true;
    if (t) return false;
    return /\.(png|jpe?g|gif|webp)$/i.test(String(file.name || ''));
  }
  function pasteImageFiles(dt) {
    if (!dt) return [];
    var out = [];
    var seen = {};
    function add(f) {
      if (!isPasteImage(f)) return;
      var key = String(f.name || '') + ':' + String(f.size || 0) + ':' + String(f.lastModified || 0);
      if (seen[key]) return;
      seen[key] = 1;
      out.push(f);
    }
    var files = dt.files || [];
    var i;
    for (i = 0; i < files.length; i++) add(files[i]);
    var items = dt.items || [];
    for (i = 0; i < items.length; i++) {
      var it = items[i];
      if (!it || it.kind !== 'file') continue;
      if (it.type && !IMAGE_OK[String(it.type || '').toLowerCase()]) continue;
      add(it.getAsFile ? it.getAsFile() : null);
    }
    return out;
  }

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function safeHref(href) {
    var h = String(href || '').trim();
    if (/^https?:\/\//i.test(h)) return h;
    return '';
  }

  function inlineMd(raw) {
    var s = esc(raw);
    var codes = [];
    s = s.replace(/`([^`\n]+)`/g, function (_, c) {
      codes.push('<code>' + c + '</code>');
      return '\u0000C' + (codes.length - 1) + '\u0000';
    });
    s = s.replace(/\[([^\]]+)\]\(([^)]+)\)/g, function (_, text, href) {
      var url = safeHref(href);
      if (!url) return text;
      return '<a href="' + esc(url) + '" target="_blank" rel="noopener">' + text + '</a>';
    });
    s = s.replace(/\*\*([^*\n]+)\*\*/g, '<strong>$1</strong>');
    s = s.replace(/\*([^*\n]+)\*/g, '<em>$1</em>');
    s = s.replace(/__([^_\n]+)__/g, '<u>$1</u>');
    s = s.replace(/~~([^~\n]+)~~/g, '<s>$1</s>');
    s = s.replace(/\u0000C(\d+)\u0000/g, function (_, i) { return codes[Number(i)] || ''; });
    return s;
  }

  function mdToHtml(src) {
    var text = String(src == null ? '' : src).replace(/\r\n/g, '\n');
    if (!text.trim()) return '';
    var lines = text.split('\n');
    var out = [];
    var i = 0;
    function flushPara(buf) {
      if (!buf.length) return;
      out.push('<p>' + buf.map(inlineMd).join('<br>') + '</p>');
      buf.length = 0;
    }
    while (i < lines.length) {
      var line = lines[i];
      if (/^```/.test(line)) {
        i++;
        var code = [];
        while (i < lines.length && !/^```/.test(lines[i])) { code.push(lines[i]); i++; }
        if (i < lines.length) i++;
        out.push('<pre><code>' + esc(code.join('\n')) + '</code></pre>');
        continue;
      }
      if (/^\s*---+\s*$/.test(line)) {
        out.push('<hr>');
        i++;
        continue;
      }
      var hm = line.match(/^(#{1,3})\s+(.+)$/);
      if (hm) {
        var lvl = hm[1].length;
        out.push('<h' + lvl + '>' + inlineMd(hm[2]) + '</h' + lvl + '>');
        i++;
        continue;
      }
      if (/^>\s?/.test(line)) {
        var q = [];
        while (i < lines.length && /^>\s?/.test(lines[i])) {
          q.push(lines[i].replace(/^>\s?/, ''));
          i++;
        }
        out.push('<blockquote>' + q.map(inlineMd).join('<br>') + '</blockquote>');
        continue;
      }
      var chk = line.match(/^\s*[-*]\s+\[([ xX])\]\s+(.*)$/);
      if (chk) {
        out.push('<ul class="jb-ed-tasks">');
        while (i < lines.length) {
          var cm = lines[i].match(/^\s*[-*]\s+\[([ xX])\]\s+(.*)$/);
          if (!cm) break;
          var on = /x/i.test(cm[1]);
          out.push('<li class="' + (on ? 'on' : '') + '">' + inlineMd(cm[2]) + '</li>');
          i++;
        }
        out.push('</ul>');
        continue;
      }
      if (/^\s*[-*]\s+/.test(line)) {
        out.push('<ul>');
        while (i < lines.length && /^\s*[-*]\s+/.test(lines[i]) && !/^\s*[-*]\s+\[[ xX]\]/.test(lines[i])) {
          out.push('<li>' + inlineMd(lines[i].replace(/^\s*[-*]\s+/, '')) + '</li>');
          i++;
        }
        out.push('</ul>');
        continue;
      }
      if (/^\s*\d+\.\s+/.test(line)) {
        out.push('<ol>');
        while (i < lines.length && /^\s*\d+\.\s+/.test(lines[i])) {
          out.push('<li>' + inlineMd(lines[i].replace(/^\s*\d+\.\s+/, '')) + '</li>');
          i++;
        }
        out.push('</ol>');
        continue;
      }
      if (!line.trim()) { i++; continue; }
      var para = [];
      while (i < lines.length && lines[i].trim() && !/^(#{1,3}\s|```|>\s?|\s*[-*]\s|\s*\d+\.\s|\s*---+)/.test(lines[i])) {
        para.push(lines[i]);
        i++;
      }
      flushPara(para);
    }
    return out.join('');
  }

  function looksLikeHtml(v) {
    return /^\s*</.test(String(v || '')) && /<\/?[a-z][\s\S]*>/i.test(String(v || ''));
  }

  function sanitizeHtml(html) {
    if (typeof document === 'undefined') return String(html || '');
    var box = document.createElement('div');
    box.innerHTML = String(html || '');
    function walk(node) {
      var kids = Array.prototype.slice.call(node.childNodes || []);
      kids.forEach(function (child) {
        if (child.nodeType === 8) { node.removeChild(child); return; }
        if (child.nodeType !== 1) return;
        var tag = child.tagName;
        if (tag === 'IMG') {
          var fid = safeDriveFileId(child.getAttribute('data-jb-file'));
          var alt = String(child.getAttribute('alt') || '').slice(0, 200);
          while (child.attributes.length) child.removeAttribute(child.attributes[0].name);
          if (!fid) { node.removeChild(child); return; }
          child.setAttribute('data-jb-file', fid);
          if (alt) child.setAttribute('alt', alt);
          return;
        }
        if (tag === 'FONT' || tag === 'MARK') {
          var fontPx = tag === 'FONT' ? (FONT_TAG_SIZE[String(child.getAttribute('size') || '')] || '') : '';
          var fromStyle = cssFontSizeFromStyle(child.getAttribute('style'));
          var bg = cssHighlightFromStyle(child.getAttribute('style')) || (tag === 'MARK' ? '#fff59d' : '');
          var span = document.createElement('span');
          if (fromStyle || fontPx) span.style.fontSize = fromStyle || fontPx;
          if (bg) span.style.backgroundColor = bg;
          while (child.firstChild) span.appendChild(child.firstChild);
          node.replaceChild(span, child);
          walk(span);
          return;
        }
        if (!ALLOWED[tag]) {
          while (child.firstChild) node.insertBefore(child.firstChild, child);
          node.removeChild(child);
          return;
        }
        Array.prototype.slice.call(child.attributes || []).forEach(function (attr) {
          var n = attr.name.toLowerCase();
          var keep = n === 'class' || n === 'href' || n === 'rel' || n === 'target' || n === 'style';
          if (n === 'href') {
            var url = safeHref(child.getAttribute('href'));
            if (url) child.setAttribute('href', url);
            else child.removeAttribute('href');
          } else if (n === 'style') {
            var st = child.getAttribute('style');
            var px = cssFontSizeFromStyle(st);
            var bg = cssHighlightFromStyle(st);
            child.removeAttribute('style');
            if (px) child.style.fontSize = px;
            if (bg) child.style.backgroundColor = bg;
          } else if (!keep || n.indexOf('on') === 0) {
            child.removeAttribute(attr.name);
          }
        });
        if (tag === 'A') {
          child.setAttribute('target', '_blank');
          child.setAttribute('rel', 'noopener');
        }
        walk(child);
      });
    }
    walk(box);
    return box.innerHTML;
  }

  function valueToHtml(v) {
    v = String(v == null ? '' : v);
    if (!v.trim()) return '';
    if (looksLikeHtml(v)) return sanitizeHtml(v);
    return mdToHtml(v);
  }

  function isEmptyHtml(html) {
    var s = String(html || '');
    if (/<img\b[^>]*\bdata-jb-file=/i.test(s)) return false;
    var t = s.replace(/&nbsp;/g, ' ').replace(/<br\s*\/?>/gi, '').replace(/<[^>]+>/g, '').trim();
    return !t;
  }

  function wrapSelection(value, start, end, spec) {
    value = String(value == null ? '' : value);
    start = Math.max(0, Number(start) || 0);
    end = Math.max(start, Number(end) || 0);
    spec = spec || {};
    var sel = value.slice(start, end);

    if (spec.kind === 'line') {
      var lineStart = value.lastIndexOf('\n', start - 1) + 1;
      var lineEnd = value.indexOf('\n', end);
      if (lineEnd < 0) lineEnd = value.length;
      var block = value.slice(lineStart, lineEnd);
      var prefix = spec.prefix || '';
      var numbered = !!spec.numbered;
      var n = 1;
      var lines = block.split('\n').map(function (ln) {
        if (numbered) {
          if (/^\s*\d+\.\s/.test(ln)) return ln.replace(/^\s*\d+\.\s/, '');
          return (n++) + '. ' + ln;
        }
        if (prefix && ln.indexOf(prefix) === 0) return ln.slice(prefix.length);
        return prefix + ln;
      });
      var joined = lines.join('\n');
      return { value: value.slice(0, lineStart) + joined + value.slice(lineEnd), start: lineStart, end: lineStart + joined.length };
    }

    if (spec.kind === 'fence') {
      if (/^```\n[\s\S]*\n```$/.test(sel)) {
        var innerF = sel.replace(/^```\n/, '').replace(/\n```$/, '');
        return { value: value.slice(0, start) + innerF + value.slice(end), start: start, end: start + innerF.length };
      }
      var body = sel || spec.placeholder || 'código';
      var ins = '```\n' + body + '\n```';
      return { value: value.slice(0, start) + ins + value.slice(end), start: start + 4, end: start + 4 + body.length };
    }

    if (spec.kind === 'link') {
      var text = sel || spec.placeholder || 'texto';
      var insL = '[' + text + '](https://)';
      var hrefStart = start + text.length + 3;
      return { value: value.slice(0, start) + insL + value.slice(end), start: hrefStart, end: hrefStart + 8 };
    }

    var left = spec.left || '';
    var right = spec.right != null ? spec.right : left;
    if (left && right) {
      if (sel.length >= left.length + right.length && sel.slice(0, left.length) === left && sel.slice(sel.length - right.length) === right) {
        var un = sel.slice(left.length, sel.length - right.length);
        return { value: value.slice(0, start) + un + value.slice(end), start: start, end: start + un.length };
      }
      if (start >= left.length && end + right.length <= value.length
          && value.slice(start - left.length, start) === left
          && value.slice(end, end + right.length) === right) {
        return { value: value.slice(0, start - left.length) + sel + value.slice(end + right.length), start: start - left.length, end: end - left.length };
      }
    }
    var inner = sel || spec.placeholder || '';
    var next = value.slice(0, start) + left + inner + right + value.slice(end);
    var ns = start + left.length;
    return { value: next, start: ns, end: ns + inner.length };
  }

  function btn(label, title, cls) {
    var b = document.createElement('button');
    b.type = 'button';
    b.className = 'jb-ed-btn' + (cls ? ' ' + cls : '');
    b.title = title;
    b.textContent = label;
    b.addEventListener('mousedown', function (ev) { ev.preventDefault(); });
    return b;
  }

  function mount(host, opts) {
    if (!host) return { getValue: function () { return ''; }, setValue: function () {}, save: function () {}, destroy: function () {} };
    opts = opts || {};
    var onSave = typeof opts.onSave === 'function' ? opts.onSave : (typeof opts.onChange === 'function' ? opts.onChange : null);
    var compact = !!opts.compact;
    var interval = opts.autosaveMs != null ? opts.autosaveMs : (compact ? 0 : AUTOSAVE_MS);
    var placeholder = opts.placeholder || 'Escreva suas anotações…';
    var imgOpts = opts.images || null;
    var uploadImage = imgOpts && typeof imgOpts.upload === 'function' ? imgOpts.upload : null;
    var loadImage = imgOpts && typeof imgOpts.load === 'function' ? imgOpts.load : null;
    var dirty = false;
    var destroyed = false;
    var lastSaved = valueToHtml(opts.value);
    var autoTimer = null;
    var remain = interval > 0 ? Math.max(1, Math.round(interval / 1000)) : 0;
    var cycle = remain;
    var status = null;
    var timerEl = null;
    var fsInput = null;
    var fsCombo = null;
    var fsMenu = null;
    var savedRange = null;
    var hlWrap = null;
    var hlMenu = null;
    var hlSwatch = null;
    var lastHighlight = HIGHLIGHTS[0].color;

    host.innerHTML = '';
    var root = document.createElement('div');
    root.className = 'jb-ed jb-ed-live' + (compact ? ' jb-ed-compact' : '');

    var bar = document.createElement('div');
    bar.className = 'jb-ed-bar';

    var surface = document.createElement('div');
    surface.className = 'jb-ed-surface';
    surface.contentEditable = 'true';
    surface.setAttribute('role', 'textbox');
    surface.setAttribute('data-placeholder', placeholder);
    surface.spellcheck = true;
    surface.innerHTML = lastSaved;

    function currentHtml() {
      var html = sanitizeHtml(surface.innerHTML);
      if (isEmptyHtml(html)) return '';
      if (html.length > CELL_LIMIT) {
        html = html.slice(0, CELL_LIMIT);
        if (window.JB && JB.toast) JB.toast('Nota limitada a 50 mil caracteres');
      }
      return html;
    }
    function setEmptyClass() {
      surface.classList.toggle('is-empty', isEmptyHtml(surface.innerHTML));
    }
    function setStatus(kind, text) {
      if (!status) return;
      status.className = 'jb-ed-status ' + (kind || '');
      status.textContent = text;
    }
    function paintTimer() {
      if (timerEl) timerEl.textContent = remain + 's';
      if (dirty) setStatus('dirty', interval > 0 ? ('Salva em ' + remain + 's') : 'Não salvo');
    }
    function resetTimer() {
      remain = cycle;
      paintTimer();
    }
    function markDirty() {
      dirty = true;
      setEmptyClass();
      syncBar();
      paintTimer();
    }
    function persist(manual) {
      if (destroyed || !onSave) { dirty = false; return; }
      var html = currentHtml();
      if (html === lastSaved && !manual) {
        dirty = false;
        setStatus('ok', 'Salvo');
        resetTimer();
        return;
      }
      lastSaved = html;
      dirty = false;
      setStatus('ok', manual ? 'Salvo' : 'Salvo automaticamente');
      resetTimer();
      onSave(html, { manual: !!manual });
    }
    function cmd(name, val) {
      surface.focus();
      try { document.execCommand(name, false, val); } catch (_) {}
      markDirty();
    }
    function block(tag) {
      surface.focus();
      var cur = '';
      try { cur = String(document.queryCommandValue('formatBlock') || '').replace(/[<>]/g, '').toLowerCase(); } catch (_) {}
      cmd('formatBlock', cur === tag ? 'p' : tag);
    }
    function rangeInSurface(range) {
      if (!range) return false;
      var n = range.commonAncestorContainer;
      return n === surface || surface.contains(n);
    }
    function expandRangeToWord(range) {
      if (!range || !range.collapsed) return;
      var node = range.startContainer;
      if (node.nodeType !== 3) return;
      var text = node.nodeValue || '';
      var a = range.startOffset;
      var b = range.startOffset;
      while (a > 0 && /[0-9A-Za-zÀ-ÿ]/.test(text.charAt(a - 1))) a--;
      while (b < text.length && /[0-9A-Za-zÀ-ÿ]/.test(text.charAt(b))) b++;
      if (b > a) {
        range.setStart(node, a);
        range.setEnd(node, b);
      }
    }
    function clearDescendantFontSize(el) {
      if (!el || !el.querySelectorAll) return;
      var nodes = el.querySelectorAll('span, font');
      var i;
      for (i = 0; i < nodes.length; i++) {
        nodes[i].style.fontSize = '';
        nodes[i].removeAttribute('size');
        var st = nodes[i].getAttribute('style');
        if (st != null && !String(st).replace(/\s|;/g, '')) nodes[i].removeAttribute('style');
      }
    }
    function applyPxToMarker(el, css) {
      clearDescendantFontSize(el);
      el.removeAttribute('size');
      el.style.fontSize = css;
      if (el.tagName !== 'FONT') return;
      var span = document.createElement('span');
      span.style.fontSize = css;
      while (el.firstChild) span.appendChild(el.firstChild);
      if (el.parentNode) el.parentNode.replaceChild(span, el);
    }
    function saveSelection() {
      var sel = window.getSelection();
      if (!sel || !sel.rangeCount) return;
      var r = sel.getRangeAt(0);
      if (rangeInSurface(r)) savedRange = r.cloneRange();
    }
    function restoreSelection() {
      if (!savedRange) return;
      surface.focus();
      var sel = window.getSelection();
      if (!sel) return;
      sel.removeAllRanges();
      try { sel.addRange(savedRange); } catch (_) {}
    }
    function wrapSelectionWithSize(css) {
      var sel = window.getSelection();
      if (!sel) return;
      if (!sel.rangeCount) {
        var r0 = document.createRange();
        r0.selectNodeContents(surface);
        r0.collapse(false);
        sel.addRange(r0);
      }
      var range = sel.getRangeAt(0);
      if (!rangeInSurface(range)) return;
      if (range.collapsed) {
        var hold = document.createElement('span');
        hold.style.fontSize = css;
        hold.appendChild(document.createTextNode('\u200b'));
        range.insertNode(hold);
        var caret = document.createRange();
        caret.selectNodeContents(hold);
        caret.collapse(false);
        sel.removeAllRanges();
        sel.addRange(caret);
        return;
      }
      try {
        var span = document.createElement('span');
        span.style.fontSize = css;
        range.surroundContents(span);
        sel.removeAllRanges();
        var after = document.createRange();
        after.selectNodeContents(span);
        sel.addRange(after);
      } catch (_) {
        var wrap = document.createElement('span');
        wrap.style.fontSize = css;
        wrap.appendChild(range.extractContents());
        range.insertNode(wrap);
      }
    }
    function applySize(px) {
      var size = parseFontSizeInput(px);
      if (!size) return;
      var css = size + 'px';
      var sel = window.getSelection();
      var inEditor = sel && sel.rangeCount && rangeInSurface(sel.getRangeAt(0));
      if (!inEditor) restoreSelection();
      surface.focus();
      sel = window.getSelection();
      if (sel && sel.rangeCount) {
        var live = sel.getRangeAt(0);
        if (rangeInSurface(live) && live.collapsed) {
          expandRangeToWord(live);
          sel.removeAllRanges();
          sel.addRange(live);
        }
      }
      try { document.execCommand('styleWithCSS', false, true); } catch (_) {}
      try { document.execCommand('fontSize', false, '7'); } catch (_) {}
      var markers = [];
      Array.prototype.forEach.call(surface.querySelectorAll('font, span'), function (el) {
        if (isExecFontSizeMarker(el)) markers.push(el);
      });
      if (markers.length) {
        markers.forEach(function (el) { applyPxToMarker(el, css); });
      } else {
        wrapSelectionWithSize(css);
      }
      if (fsInput) fsInput.value = String(size);
      markDirty();
    }
    function wrapSelectionHighlight(bg) {
      var sel = window.getSelection();
      if (!sel) return;
      if (!sel.rangeCount) {
        var r0 = document.createRange();
        r0.selectNodeContents(surface);
        r0.collapse(false);
        sel.addRange(r0);
      }
      var range = sel.getRangeAt(0);
      if (!rangeInSurface(range)) return;
      if (range.collapsed) {
        expandRangeToWord(range);
        sel.removeAllRanges();
        sel.addRange(range);
      }
      if (range.collapsed) return;
      try {
        var span = document.createElement('span');
        if (bg) span.style.backgroundColor = bg;
        range.surroundContents(span);
        sel.removeAllRanges();
        var after = document.createRange();
        after.selectNodeContents(span);
        sel.addRange(after);
      } catch (_) {
        var wrap = document.createElement('span');
        if (bg) wrap.style.backgroundColor = bg;
        wrap.appendChild(range.extractContents());
        range.insertNode(wrap);
      }
    }
    function clearTransparentHighlights() {
      Array.prototype.forEach.call(surface.querySelectorAll('span, mark'), function (el) {
        var bg = String((el.style && el.style.backgroundColor) || '');
        if (!bg) return;
        if (bg === 'transparent' || bg === 'inherit' || bg === 'rgba(0, 0, 0, 0)') {
          el.style.backgroundColor = '';
          var st = el.getAttribute('style');
          if (st != null && !String(st).replace(/\s|;/g, '')) el.removeAttribute('style');
        }
      });
    }
    function paintHlBtn() {
      if (hlSwatch) hlSwatch.style.background = lastHighlight || 'transparent';
    }
    function applyHighlight(color) {
      var bg = color ? cssHighlightFromStyle('background-color:' + color) : '';
      var sel = window.getSelection();
      var inEditor = sel && sel.rangeCount && rangeInSurface(sel.getRangeAt(0));
      if (!inEditor) restoreSelection();
      surface.focus();
      sel = window.getSelection();
      if (sel && sel.rangeCount) {
        var live = sel.getRangeAt(0);
        if (rangeInSurface(live) && live.collapsed) {
          expandRangeToWord(live);
          sel.removeAllRanges();
          sel.addRange(live);
        }
      }
      try { document.execCommand('styleWithCSS', false, true); } catch (_) {}
      var ok = false;
      try { ok = document.execCommand('hiliteColor', false, bg || 'transparent'); } catch (_) {}
      if (!ok) {
        try { ok = document.execCommand('backColor', false, bg || 'transparent'); } catch (_) {}
      }
      if (!ok) wrapSelectionHighlight(bg);
      clearTransparentHighlights();
      if (bg) lastHighlight = bg;
      paintHlBtn();
      markDirty();
    }
    function addLink() {
      var sel = '';
      try { sel = String(window.getSelection() || ''); } catch (_) {}
      var raw = window.prompt('Link (https://…)', sel.indexOf('http') === 0 ? sel : 'https://');
      if (raw == null) return;
      var url = safeHref(raw);
      if (!url) return;
      cmd('createLink', url);
    }
    function insertNode(node) {
      surface.focus();
      var sel = window.getSelection();
      if (sel && sel.rangeCount) {
        var range = sel.getRangeAt(0);
        range.deleteContents();
        range.insertNode(node);
        range.setStartAfter(node);
        range.collapse(true);
        sel.removeAllRanges();
        sel.addRange(range);
      } else {
        surface.appendChild(node);
      }
    }
    function hydrateImages() {
      if (!loadImage || destroyed) return;
      var imgs = surface.querySelectorAll('img[data-jb-file]');
      Array.prototype.forEach.call(imgs, function (img) {
        var id = safeDriveFileId(img.getAttribute('data-jb-file'));
        if (!id || img.getAttribute('data-jb-hydrated') === id) return;
        img.classList.add('jb-ed-img-loading');
        Promise.resolve(loadImage(id)).then(function (url) {
          if (destroyed || !url) return;
          img.src = url;
          img.setAttribute('data-jb-hydrated', id);
          img.classList.remove('jb-ed-img-loading');
        }).catch(function () {
          img.classList.remove('jb-ed-img-loading');
          img.classList.add('jb-ed-img-err');
        });
      });
    }
    function insertUploadedImage(info) {
      var id = safeDriveFileId(info && info.id);
      if (!id) return;
      var img = document.createElement('img');
      img.setAttribute('data-jb-file', id);
      if (info.name) img.setAttribute('alt', String(info.name).slice(0, 200));
      insertNode(img);
      var br = document.createElement('p');
      br.appendChild(document.createElement('br'));
      insertNode(br);
      hydrateImages();
      markDirty();
    }
    function pasteImages(ev) {
      if (!uploadImage) return;
      var files = pasteImageFiles(ev.clipboardData || (ev.originalEvent && ev.originalEvent.clipboardData));
      if (!files.length) return;
      ev.preventDefault();
      var text = '';
      try { text = String((ev.clipboardData && ev.clipboardData.getData('text/plain')) || ''); } catch (_) {}
      var i = 0;
      function next() {
        if (destroyed) return;
        if (i >= files.length) {
          if (text && text.trim()) {
            try { document.execCommand('insertText', false, text); } catch (_) {}
            markDirty();
          }
          return;
        }
        var file = files[i++];
        if (file.size > IMAGE_MAX_BYTES) {
          if (window.JB && JB.toast) JB.toast('Imagem grande demais (máx. 10 MB)');
          next();
          return;
        }
        if (window.JB && JB.toast) JB.toast('Enviando imagem…');
        Promise.resolve(uploadImage(file)).then(function (info) {
          insertUploadedImage(info);
          next();
        }).catch(function () {
          if (window.JB && JB.toast) JB.toast('Não foi possível colar a imagem');
          next();
        });
      }
      next();
    }
    function currentFontSizePx() {
      var sel = window.getSelection();
      if (!sel || !sel.rangeCount) return 0;
      var node = sel.anchorNode;
      if (node && node.nodeType === 3) node = node.parentElement;
      if (!node || !surface.contains(node)) return 0;
      try {
        var cs = window.getComputedStyle(node);
        return parseFontSizeInput(cs && cs.fontSize);
      } catch (_) { return 0; }
    }
    function syncBar() {
      var map = { bold: 'bold', italic: 'italic', underline: 'underline', strikeThrough: 'strike' };
      Object.keys(map).forEach(function (command) {
        var el = bar.querySelector('[data-cmd="' + map[command] + '"]');
        if (!el) return;
        var on = false;
        try { on = document.queryCommandState(command); } catch (_) {}
        el.classList.toggle('on', !!on);
      });
      if (fsInput && document.activeElement !== fsInput) {
        var n = currentFontSizePx();
        if (n) fsInput.value = String(n);
      }
    }
    function setHlMenuOpen(open) {
      if (!hlMenu || !hlWrap) return;
      hlMenu.hidden = !open;
      hlWrap.classList.toggle('open', !!open);
    }
    function setFsMenuOpen(open) {
      if (!fsMenu || !fsCombo) return;
      fsMenu.hidden = !open;
      fsCombo.classList.toggle('open', !!open);
      if (!open) return;
      var cur = parseFontSizeInput(fsInput && fsInput.value);
      Array.prototype.forEach.call(fsMenu.querySelectorAll('[data-size]'), function (b) {
        b.classList.toggle('on', Number(b.getAttribute('data-size')) === cur);
      });
    }
    function onDocFsDown(ev) {
      if (fsCombo && fsMenu && !fsMenu.hidden && !fsCombo.contains(ev.target)) setFsMenuOpen(false);
      if (hlWrap && hlMenu && !hlMenu.hidden && !hlWrap.contains(ev.target)) setHlMenuOpen(false);
    }
    function onSelChange() { saveSelection(); }

    [
      { label: 'B', title: 'Negrito', cmd: 'bold', key: 'bold' },
      { label: 'I', title: 'Itálico', cmd: 'italic', key: 'italic' },
      { label: 'U', title: 'Sublinhado', cmd: 'underline', key: 'underline' },
      { label: 'S', title: 'Riscado', cmd: 'strikeThrough', key: 'strike' }
    ].forEach(function (t) {
      var b = btn(t.label, t.title);
      b.setAttribute('data-cmd', t.key);
      b.addEventListener('click', function () { cmd(t.cmd); });
      bar.appendChild(b);
    });

    hlWrap = document.createElement('div');
    hlWrap.className = 'jb-ed-hl';
    var hlApply = btn('A', 'Realçar');
    hlApply.className += ' jb-ed-hl-apply';
    hlSwatch = document.createElement('span');
    hlSwatch.className = 'jb-ed-hl-swatch';
    hlApply.appendChild(hlSwatch);
    hlApply.addEventListener('click', function () { applyHighlight(lastHighlight); });
    var hlCaret = document.createElement('button');
    hlCaret.type = 'button';
    hlCaret.className = 'jb-ed-hl-caret';
    hlCaret.setAttribute('aria-label', 'Cor do realce');
    hlCaret.title = 'Cor do realce';
    hlCaret.textContent = '▾';
    hlCaret.addEventListener('mousedown', function (ev) { ev.preventDefault(); });
    hlCaret.addEventListener('click', function () { setHlMenuOpen(hlMenu.hidden); });
    hlMenu = document.createElement('div');
    hlMenu.className = 'jb-ed-hl-menu';
    hlMenu.hidden = true;
    HIGHLIGHTS.forEach(function (h) {
      var o = document.createElement('button');
      o.type = 'button';
      o.className = 'jb-ed-hl-chip';
      o.title = h.label;
      o.setAttribute('aria-label', h.label);
      o.style.background = h.color;
      o.addEventListener('mousedown', function (ev) { ev.preventDefault(); });
      o.addEventListener('click', function () {
        lastHighlight = h.color;
        paintHlBtn();
        applyHighlight(h.color);
        setHlMenuOpen(false);
        surface.focus();
      });
      hlMenu.appendChild(o);
    });
    var hlNone = document.createElement('button');
    hlNone.type = 'button';
    hlNone.className = 'jb-ed-hl-chip none';
    hlNone.title = 'Sem realce';
    hlNone.setAttribute('aria-label', 'Sem realce');
    hlNone.textContent = '×';
    hlNone.addEventListener('mousedown', function (ev) { ev.preventDefault(); });
    hlNone.addEventListener('click', function () {
      applyHighlight('');
      setHlMenuOpen(false);
      surface.focus();
    });
    hlMenu.appendChild(hlNone);
    hlWrap.appendChild(hlApply);
    hlWrap.appendChild(hlCaret);
    hlWrap.appendChild(hlMenu);
    bar.appendChild(hlWrap);
    paintHlBtn();

    [
      { label: 'H1', title: 'Título', tag: 'h1' },
      { label: 'H2', title: 'Subtítulo', tag: 'h2' },
      { label: 'H3', title: 'Seção', tag: 'h3' }
    ].forEach(function (t) {
      var b = btn(t.label, t.title);
      b.addEventListener('click', function () { block(t.tag); });
      bar.appendChild(b);
    });

    var fsWrap = document.createElement('div');
    fsWrap.className = 'jb-ed-fontsize';
    var fsDec = btn('A−', 'Diminuir fonte');
    fsDec.addEventListener('click', function () { applySize(stepFontSize(fsInput.value, -1)); });
    fsCombo = document.createElement('div');
    fsCombo.className = 'jb-ed-fs-combo';
    fsInput = document.createElement('input');
    fsInput.type = 'text';
    fsInput.inputMode = 'numeric';
    fsInput.className = 'jb-ed-fs-input';
    fsInput.setAttribute('aria-label', 'Tamanho da fonte');
    fsInput.title = 'Tamanho da fonte';
    fsInput.value = '16';
    fsInput.addEventListener('mousedown', saveSelection);
    fsInput.addEventListener('focus', saveSelection);
    fsInput.addEventListener('keydown', function (ev) {
      if (ev.key === 'Enter') {
        ev.preventDefault();
        applySize(fsInput.value);
        setFsMenuOpen(false);
        surface.focus();
      } else if (ev.key === 'ArrowUp') {
        ev.preventDefault();
        applySize(stepFontSize(fsInput.value, 1));
      } else if (ev.key === 'ArrowDown') {
        ev.preventDefault();
        applySize(stepFontSize(fsInput.value, -1));
      } else if (ev.key === 'Escape') {
        setFsMenuOpen(false);
        surface.focus();
      }
    });
    fsInput.addEventListener('change', function () { applySize(fsInput.value); });
    var fsCaret = document.createElement('button');
    fsCaret.type = 'button';
    fsCaret.className = 'jb-ed-fs-caret';
    fsCaret.setAttribute('aria-label', 'Lista de tamanhos');
    fsCaret.title = 'Lista de tamanhos';
    fsCaret.textContent = '▾';
    fsCaret.addEventListener('mousedown', function (ev) { ev.preventDefault(); });
    fsCaret.addEventListener('click', function () { setFsMenuOpen(fsMenu.hidden); });
    fsMenu = document.createElement('div');
    fsMenu.className = 'jb-ed-fs-menu';
    fsMenu.hidden = true;
    fsMenu.setAttribute('role', 'listbox');
    FONT_SIZES.forEach(function (sz) {
      var o = document.createElement('button');
      o.type = 'button';
      o.setAttribute('role', 'option');
      o.setAttribute('data-size', String(sz));
      o.style.fontSize = Math.min(sz, 22) + 'px';
      o.textContent = String(sz);
      o.addEventListener('mousedown', function (ev) { ev.preventDefault(); });
      o.addEventListener('click', function () {
        applySize(sz);
        setFsMenuOpen(false);
        surface.focus();
      });
      fsMenu.appendChild(o);
    });
    fsCombo.appendChild(fsInput);
    fsCombo.appendChild(fsCaret);
    fsCombo.appendChild(fsMenu);
    var fsInc = btn('A+', 'Aumentar fonte');
    fsInc.addEventListener('click', function () { applySize(stepFontSize(fsInput.value, 1)); });
    fsWrap.appendChild(fsDec);
    fsWrap.appendChild(fsCombo);
    fsWrap.appendChild(fsInc);
    bar.appendChild(fsWrap);
    document.addEventListener('mousedown', onDocFsDown);
    document.addEventListener('selectionchange', onSelChange);

    var listBtn = btn('•', 'Lista');
    listBtn.addEventListener('click', function () { cmd('insertUnorderedList'); });
    bar.appendChild(listBtn);
    var numBtn = btn('1.', 'Lista numerada');
    numBtn.addEventListener('click', function () { cmd('insertOrderedList'); });
    bar.appendChild(numBtn);
    var qBtn = btn('“', 'Citação');
    qBtn.addEventListener('click', function () { block('blockquote'); });
    bar.appendChild(qBtn);
    var linkBtn = btn('🔗', 'Link');
    linkBtn.addEventListener('click', addLink);
    bar.appendChild(linkBtn);

    root.appendChild(bar);
    root.appendChild(surface);
    if (!compact) {
      var foot = document.createElement('div');
      foot.className = 'jb-ed-foot';
      status = document.createElement('span');
      status.className = 'jb-ed-status';
      status.textContent = lastSaved ? 'Salvo' : '';
      timerEl = document.createElement('span');
      timerEl.className = 'jb-ed-timer';
      timerEl.title = 'Próximo auto-save';
      timerEl.textContent = remain + 's';
      var saveBtn = btn('Salvar', 'Salvar agora', 'jb-ed-save');
      saveBtn.addEventListener('click', function () { persist(true); });
      foot.appendChild(status);
      foot.appendChild(timerEl);
      foot.appendChild(saveBtn);
      root.appendChild(foot);
    }
    host.appendChild(root);
    setEmptyClass();
    hydrateImages();

    surface.addEventListener('input', markDirty);
    if (uploadImage) surface.addEventListener('paste', pasteImages);
    surface.addEventListener('keyup', syncBar);
    surface.addEventListener('mouseup', syncBar);
    surface.addEventListener('keydown', function (ev) {
      var key = (ev.key || '').toLowerCase();
      if ((ev.ctrlKey || ev.metaKey) && key === 's') {
        ev.preventDefault();
        persist(true);
      }
    });
    surface.addEventListener('click', function (ev) {
      var li = ev.target && ev.target.closest ? ev.target.closest('ul.jb-ed-tasks li') : null;
      if (!li || !surface.contains(li)) return;
      var rect = li.getBoundingClientRect();
      if (ev.clientX - rect.left > 22) return;
      ev.preventDefault();
      li.classList.toggle('on');
      markDirty();
    });

    if (interval > 0) {
      autoTimer = setInterval(function () {
        remain -= 1;
        if (remain <= 0) {
          remain = cycle;
          if (dirty) persist(false);
          else paintTimer();
        } else {
          paintTimer();
        }
      }, 1000);
    }

    return {
      getValue: currentHtml,
      setValue: function (v) {
        lastSaved = valueToHtml(v);
        surface.innerHTML = lastSaved;
        dirty = false;
        setEmptyClass();
        setStatus('', lastSaved ? 'Salvo' : '');
        resetTimer();
        hydrateImages();
      },
      save: function () { persist(true); },
      destroy: function () {
        if (destroyed) return;
        destroyed = true;
        document.removeEventListener('mousedown', onDocFsDown);
        document.removeEventListener('selectionchange', onSelChange);
        if (autoTimer) { clearInterval(autoTimer); autoTimer = null; }
        if (dirty) persist(false);
        if (root.parentNode) root.parentNode.removeChild(root);
        host.innerHTML = '';
      },
      focus: function () { surface.focus(); }
    };
  }

  var api = {
    CELL_LIMIT: CELL_LIMIT,
    AUTOSAVE_MS: AUTOSAVE_MS,
    esc: esc,
    mdToHtml: mdToHtml,
    looksLikeHtml: looksLikeHtml,
    valueToHtml: valueToHtml,
    wrapSelection: wrapSelection,
    mount: mount,
    sanitizeHtml: sanitizeHtml,
    isEmptyHtml: isEmptyHtml,
    safeDriveFileId: safeDriveFileId,
    pasteImageFiles: pasteImageFiles,
    IMAGE_MAX_BYTES: IMAGE_MAX_BYTES,
    FONT_SIZES: FONT_SIZES,
    parseFontSizeInput: parseFontSizeInput,
    stepFontSize: stepFontSize,
    cssFontSizeFromStyle: cssFontSizeFromStyle,
    cssHighlightFromStyle: cssHighlightFromStyle,
    HIGHLIGHTS: HIGHLIGHTS
  };

  if (typeof window !== 'undefined') {
    window.JB_EDITOR = api;
    if (window.JB) window.JB.editor = api;
  } else if (typeof globalThis !== 'undefined') {
    globalThis.JB_EDITOR = api;
  }
})();
