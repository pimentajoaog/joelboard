/* Joelboard shared rich-text editor. © 2026 Joel Soluções LTDA.
   Classic global script (NOT a module). Loads after /joelboard.js. */
(function () {
  var CELL_LIMIT = 50000;
  var AUTOSAVE_MS = 20000;
  var IMAGE_MAX_BYTES = 10 * 1024 * 1024;
  var IMAGE_OK = { 'image/png': 1, 'image/jpeg': 1, 'image/jpg': 1, 'image/webp': 1, 'image/gif': 1 };
  var INK_COLORS = [
    { label: 'Preto', color: '#111827' },
    { label: 'Vermelho', color: '#ef4444' },
    { label: 'Amarelo', color: '#facc15' }
  ];
  var INK_WIDTH_FINE = 3;
  var INK_WIDTH_BOLD = 8;
  var INK_SAVE_MS = 700;
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
  function cssTextMarksFromStyle(st) {
    st = String(st || '');
    var out = { fontStyle: '', fontWeight: '', textDecoration: '' };
    if (/\bfont-style\s*:\s*(italic|oblique)\b/i.test(st)) out.fontStyle = 'italic';
    if (/\bfont-weight\s*:\s*(bold|bolder|[5-9]00)\b/i.test(st)) out.fontWeight = 'bold';
    var dec = [];
    if (/\btext-decoration(?:-line)?\s*:[^;}]*underline/i.test(st)) dec.push('underline');
    if (/\btext-decoration(?:-line)?\s*:[^;}]*line-through/i.test(st)) dec.push('line-through');
    if (dec.length) out.textDecoration = dec.join(' ');
    return out;
  }
  function applySafeInlineStyle(el, st) {
    if (!el) return;
    var px = cssFontSizeFromStyle(st);
    var bg = cssHighlightFromStyle(st);
    var marks = cssTextMarksFromStyle(st);
    el.removeAttribute('style');
    if (px) el.style.fontSize = px;
    if (bg) el.style.backgroundColor = bg;
    if (marks.fontStyle) el.style.fontStyle = marks.fontStyle;
    if (marks.fontWeight) el.style.fontWeight = marks.fontWeight;
    if (marks.textDecoration) el.style.textDecoration = marks.textDecoration;
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
      var key = String(f.type || '') + ':' + String(f.size || 0);
      if (seen[key]) return;
      seen[key] = 1;
      out.push(f);
    }
    var files = dt.files || [];
    var i;
    for (i = 0; i < files.length; i++) add(files[i]);
    if (out.length) return out;
    var items = dt.items || [];
    for (i = 0; i < items.length; i++) {
      var it = items[i];
      if (!it || it.kind !== 'file') continue;
      if (it.type && !IMAGE_OK[String(it.type || '').toLowerCase()]) continue;
      add(it.getAsFile ? it.getAsFile() : null);
    }
    return out;
  }

  function cssImgWidthPx(st, widthAttr) {
    var w = 0;
    var m = String(st || '').match(/(?:^|;)\s*width\s*:\s*(\d+(?:\.\d+)?)px/i);
    if (m) w = Math.round(Number(m[1]));
    if (!w) w = parseInt(widthAttr, 10) || 0;
    if (w < 48 || w > 4000) return 0;
    return w;
  }

  function dumpInkStrokes(strokes) {
    if (!strokes || !strokes.length) return '';
    var parts = [];
    var i, j, s, p, pts, col, w, last, dx, dy;
    for (i = 0; i < strokes.length; i++) {
      s = strokes[i];
      if (!s || !s.pts || !s.pts.length) continue;
      pts = [];
      last = null;
      for (j = 0; j < s.pts.length; j++) {
        p = s.pts[j];
        dx = last ? p.x - last.x : 99;
        dy = last ? p.y - last.y : 99;
        if (last && j < s.pts.length - 1 && dx * dx + dy * dy < 4) continue;
        pts.push(Math.round(Number(p.x) || 0) + ' ' + Math.round(Number(p.y) || 0));
        last = p;
      }
      col = String(s.color || '#111827').replace(/[^0-9a-fA-F]/g, '');
      if (!col) col = '111827';
      w = Math.max(1, Math.min(24, Math.round(Number(s.width) || 3)));
      parts.push(col + ',' + w + ',' + pts.join(' '));
    }
    var dump = parts.join('|');
    return dump.length > 40000 ? '' : dump;
  }

  function parseInkStrokes(raw) {
    var s = String(raw || '');
    if (!s || s.length > 40000) return [];
    if (!/^[0-9a-fA-F#.,| \-]+$/.test(s)) return [];
    var out = [];
    var chunks = s.split('|');
    var i, m, ptsRaw, pts, j, x, y;
    for (i = 0; i < chunks.length; i++) {
      m = chunks[i].match(/^#?([0-9a-fA-F]{3,8}),(\d{1,2}),(.+)$/);
      if (!m) continue;
      ptsRaw = m[3].trim().split(/\s+/);
      if (ptsRaw.length < 2 || ptsRaw.length % 2) continue;
      pts = [];
      for (j = 0; j < ptsRaw.length; j += 2) {
        x = Number(ptsRaw[j]);
        y = Number(ptsRaw[j + 1]);
        if (!isFinite(x) || !isFinite(y)) { pts = []; break; }
        pts.push({ x: x, y: y });
      }
      if (!pts.length) continue;
      out.push({ color: '#' + m[1], width: Math.max(1, Math.min(24, Number(m[2]) || 3)), pts: pts });
    }
    return out;
  }

  function pullInkStrokes(html) {
    var s = String(html || '');
    if (typeof document !== 'undefined') {
      try {
        var box = document.createElement('div');
        box.innerHTML = s;
        var el = box.querySelector('[data-jb-ink-d]');
        if (el) return parseInkStrokes(el.getAttribute('data-jb-ink-d'));
      } catch (_) {}
    }
    var m = s.match(/data-jb-ink-d\s*=\s*"([^"]*)"/i) || s.match(/data-jb-ink-d\s*=\s*'([^']*)'/i);
    return parseInkStrokes(m ? m[1] : '');
  }

  function distToSeg(px, py, ax, ay, bx, by) {
    var dx = bx - ax, dy = by - ay;
    var len2 = dx * dx + dy * dy;
    var t = len2 ? Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / len2)) : 0;
    var x = ax + t * dx, y = ay + t * dy;
    return Math.sqrt((px - x) * (px - x) + (py - y) * (py - y));
  }

  function hitInkStroke(strokes, pos) {
    if (!strokes || !pos) return -1;
    var i, j, s, d, thresh, a, b;
    for (i = strokes.length - 1; i >= 0; i--) {
      s = strokes[i];
      if (!s || !s.pts || !s.pts.length) continue;
      thresh = Math.max(12, (Number(s.width) || 3) * 0.8 + 8);
      if (s.pts.length === 1) {
        d = Math.sqrt((pos.x - s.pts[0].x) * (pos.x - s.pts[0].x) + (pos.y - s.pts[0].y) * (pos.y - s.pts[0].y));
        if (d <= thresh) return i;
        continue;
      }
      for (j = 1; j < s.pts.length; j++) {
        a = s.pts[j - 1];
        b = s.pts[j];
        d = distToSeg(pos.x, pos.y, a.x, a.y, b.x, b.y);
        if (d <= thresh) return i;
      }
    }
    return -1;
  }

  function blobToUploadFile(blob, name) {
    name = String(name || 'sharpie.png');
    var type = (blob && blob.type) || 'image/png';
    if (typeof File === 'function') {
      try { return new File([blob], name, { type: type }); } catch (_) {}
    }
    return blob;
  }

  function dataUrlToBlob(dataUrl) {
    var s = String(dataUrl || '');
    var m = s.match(/^data:([^;]+);base64,(.*)$/i);
    if (!m) return null;
    try {
      var bin = atob(m[2]);
      var arr = new Uint8Array(bin.length);
      var i;
      for (i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
      return new Blob([arr], { type: m[1] || 'image/png' });
    } catch (_) { return null; }
  }

  function pullInkFileId(html) {
    var s = String(html || '');
    var m = s.match(/data-jb-ink\s*=\s*"1"[^>]*data-jb-file\s*=\s*"([^"]+)"/i)
      || s.match(/data-jb-file\s*=\s*"([^"]+)"[^>]*data-jb-ink\s*=\s*"1"/i);
    return m ? safeDriveFileId(m[1]) : '';
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

  function decodeHtmlEntities(s) {
    return String(s == null ? '' : s)
      .replace(/&nbsp;/gi, ' ')
      .replace(/&lt;/gi, '<')
      .replace(/&gt;/gi, '>')
      .replace(/&quot;/gi, '"')
      .replace(/&#39;/g, "'")
      .replace(/&amp;/gi, '&');
  }

  var HTML_HINT = /<(?:div|span|p|br|h[1-3]|ul|ol|li|blockquote|img|strong|em|b|i|u|s|pre|code|hr|font|mark)\b/i;
  var HTML_HINT_ESC = /&lt;(?:div|span|p|br|h[1-3]|ul|ol|li|blockquote|img|strong|em|b|i|u|s|pre|code|hr|font|mark)\b/i;

  function recoverStoredHtml(s) {
    s = String(s == null ? '' : s);
    var hasEscapedBlock = HTML_HINT_ESC.test(s);
    var hasRealBlock = /<(?:div|span|h[1-3]|ul|ol|li|blockquote|img)\b/i.test(s);
    if (hasEscapedBlock && !hasRealBlock) return decodeHtmlEntities(s);
    return s;
  }

  function looksLikeHtml(v) {
    var s = recoverStoredHtml(v);
    if (HTML_HINT.test(s)) return true;
    return /^\s*</.test(s) && /<\/?[a-z][\s\S]*>/i.test(s);
  }

  function sanitizeHtml(html) {
    if (typeof document === 'undefined') return String(html || '');
    var box = document.createElement('div');
    box.innerHTML = recoverStoredHtml(html);
    function walk(node) {
      var kids = Array.prototype.slice.call(node.childNodes || []);
      kids.forEach(function (child) {
        if (child.nodeType === 8) { node.removeChild(child); return; }
        if (child.nodeType !== 1) return;
        var tag = child.tagName;
        if (tag === 'IMG') {
          var fid = safeDriveFileId(child.getAttribute('data-jb-file'));
          var alt = String(child.getAttribute('alt') || '').slice(0, 200);
          var ink = child.getAttribute('data-jb-ink') === '1' || alt === '__jb-ink__';
          var inkD = ink ? String(child.getAttribute('data-jb-ink-d') || '') : '';
          var imgW = ink ? 0 : cssImgWidthPx(child.getAttribute('style'), child.getAttribute('width'));
          if (inkD && (!/^[0-9a-fA-F#.,| \-]+$/.test(inkD) || inkD.length > 40000)) inkD = '';
          while (child.attributes.length) child.removeAttribute(child.attributes[0].name);
          if (!fid) { node.removeChild(child); return; }
          child.setAttribute('data-jb-file', fid);
          if (ink) {
            child.setAttribute('data-jb-ink', '1');
            child.setAttribute('alt', '__jb-ink__');
            child.className = 'jb-ed-ink-asset';
            if (inkD) child.setAttribute('data-jb-ink-d', inkD);
          } else {
            if (alt) child.setAttribute('alt', alt);
            if (imgW) child.style.width = imgW + 'px';
          }
          return;
        }
        if (tag === 'FONT' || tag === 'MARK') {
          var st0 = child.getAttribute('style');
          var span = document.createElement('span');
          applySafeInlineStyle(span, st0);
          if (tag === 'FONT' && !span.style.fontSize) {
            var fontPx = FONT_TAG_SIZE[String(child.getAttribute('size') || '')] || '';
            if (fontPx) span.style.fontSize = fontPx;
          }
          if (tag === 'MARK' && !span.style.backgroundColor) span.style.backgroundColor = '#fff59d';
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
            applySafeInlineStyle(child, child.getAttribute('style'));
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
    if (box.querySelector('*')) {
      while (box.firstChild && box.firstChild.nodeType === 3) {
        var lead = box.firstChild;
        if (!String(lead.nodeValue || '').trim()) {
          box.removeChild(lead);
          continue;
        }
        var p = document.createElement('p');
        p.appendChild(lead);
        box.insertBefore(p, box.firstChild);
      }
    }
    return box.innerHTML;
  }

  function valueToHtml(v) {
    v = recoverStoredHtml(v);
    if (!String(v || '').trim()) return '';
    if (looksLikeHtml(v)) return sanitizeHtml(v);
    return mdToHtml(v);
  }

  function isEmptyHtml(html) {
    var s = String(html || '');
    if (/<img\b[^>]*\bdata-jb-file=/i.test(s)) return false;
    if (/data-jb-ink\s*=\s*"1"/i.test(s)) return false;
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
    var replaceImage = imgOpts && typeof imgOpts.replace === 'function' ? imgOpts.replace : null;
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
    var typingPlain = false;
    var insertingPlain = false;
    var plainTypingEl = null;
    var linkMouse = null;
    var inkTools = null;
    var inkBtn = null;
    var inkCanvas = null;
    var inkCtx = null;
    var inkStrokes = pullInkStrokes(lastSaved);
    var inkCurrent = null;
    var inkColor = INK_COLORS[0].color;
    var inkWidth = INK_WIDTH_FINE;
    var inkErase = false;
    var inkErasing = false;
    var inkErased = false;
    var inkBusy = false;
    var inkOpen = false;
    var inkToken = 0;
    var inkFileId = pullInkFileId(lastSaved);
    var inkBase = null;
    var inkDirty = false;
    var inkSaveTimer = null;
    var inkRo = null;
    var inkSizeRaf = 0;
    var selectedImg = null;
    var imgFrame = null;
    var imgDrag = null;
    var imgResize = null;
    var imgGhost = null;
    var imgSlot = null;

    host.innerHTML = '';
    var root = document.createElement('div');
    root.className = 'jb-ed jb-ed-live' + (compact ? ' jb-ed-compact' : '');

    var bar = document.createElement('div');
    bar.className = 'jb-ed-bar';

    var stage = document.createElement('div');
    stage.className = 'jb-ed-stage';
    var scroll = document.createElement('div');
    scroll.className = 'jb-ed-scroll';
    var page = document.createElement('div');
    page.className = 'jb-ed-page';
    var surface = document.createElement('div');
    surface.className = 'jb-ed-surface';
    surface.contentEditable = 'true';
    surface.setAttribute('role', 'textbox');
    surface.setAttribute('data-placeholder', placeholder);
    surface.spellcheck = true;
    var box = document.createElement('div');
    box.innerHTML = lastSaved;
    Array.prototype.forEach.call(box.querySelectorAll('img[data-jb-ink], .jb-ed-ink-asset'), function (el) {
      if (el.parentNode) el.parentNode.removeChild(el);
    });
    surface.innerHTML = box.innerHTML;
    page.appendChild(surface);
    if (uploadImage) {
      inkCanvas = document.createElement('canvas');
      inkCanvas.className = 'jb-ed-ink-layer';
      inkCanvas.setAttribute('aria-label', 'Sharpie');
      page.appendChild(inkCanvas);
    }
    scroll.appendChild(page);
    stage.appendChild(scroll);
    imgFrame = document.createElement('div');
    imgFrame.className = 'jb-ed-img-frame';
    imgFrame.hidden = true;
    imgFrame.innerHTML = '<span class="jb-ed-img-handle nw" data-h="nw"></span><span class="jb-ed-img-handle ne" data-h="ne"></span><span class="jb-ed-img-handle sw" data-h="sw"></span><span class="jb-ed-img-handle se" data-h="se"></span>';
    page.appendChild(imgFrame);

    function inkMarkerHtml(id) {
      id = safeDriveFileId(id != null ? id : inkFileId);
      if (!id) return '';
      var dump = (!inkBase && inkStrokes.length) ? dumpInkStrokes(inkStrokes) : '';
      return '<img data-jb-ink="1" data-jb-file="' + id + '"' + (dump ? ' data-jb-ink-d="' + dump + '"' : '') + ' alt="__jb-ink__">';
    }
    function stripInkFromBox(box) {
      if (!box || !box.querySelectorAll) return;
      Array.prototype.forEach.call(box.querySelectorAll('canvas, img[data-jb-ink], .jb-ed-ink-asset, .jb-ed-ink-layer'), function (el) {
        if (el.parentNode) el.parentNode.removeChild(el);
      });
      Array.prototype.forEach.call(box.querySelectorAll('.jb-ed-img-slot, .jb-ed-img-ghost'), function (el) {
        if (el.parentNode) el.parentNode.removeChild(el);
      });
      Array.prototype.forEach.call(box.querySelectorAll('[data-jb-plain], [data-jb-hl-mark]'), function (el) {
        var t = String(el.textContent || '').replace(/\u200b/g, '');
        var tn = document.createTextNode(t);
        if (el.parentNode) {
          el.parentNode.insertBefore(tn, el);
          el.parentNode.removeChild(el);
        }
      });
    }
    function surfaceBodyHtml() {
      var clone = surface.cloneNode(true);
      stripInkFromBox(clone);
      return sanitizeHtml(clone.innerHTML);
    }
    function composeHtml(body, id) {
      var html = inkMarkerHtml(id) + sanitizeHtml(body || '');
      if (isEmptyHtml(html)) return '';
      if (html.length > CELL_LIMIT) {
        html = html.slice(0, CELL_LIMIT);
        if (window.JB && JB.toast) JB.toast('Nota limitada a 50 mil caracteres');
      }
      return html;
    }
    function currentHtml() {
      return composeHtml(surfaceBodyHtml(), inkFileId);
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
      function write() {
        if (destroyed || !onSave) return;
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
      if (inkDirty && uploadImage) {
        saveInkNow().then(write, write);
        return;
      }
      write();
    }
    function cmd(name, val) {
      surface.focus();
      if (name === 'bold' || name === 'italic' || name === 'underline' || name === 'strikeThrough') {
        try { document.execCommand('styleWithCSS', false, false); } catch (_) {}
      }
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
      try { document.execCommand('styleWithCSS', false, false); } catch (_) {}
      markDirty();
    }
    function elHasHighlight(el) {
      if (!el || el === surface || el.nodeType !== 1) return false;
      return !!cssHighlightFromStyle(el.getAttribute('style') || '')
        || !!cssHighlightFromStyle('background-color:' + String((el.style && el.style.backgroundColor) || ''));
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
    function clearElHighlight(el) {
      if (!el || !el.style) return;
      el.style.backgroundColor = '';
      var st = el.getAttribute('style');
      if (st != null && !String(st).replace(/\s|;/g, '')) el.removeAttribute('style');
    }
    function closestBlock(node) {
      var el = node && node.nodeType === 1 ? node : (node && node.parentElement);
      while (el && el !== surface) {
        if (/^(P|DIV|LI|H1|H2|H3|BLOCKQUOTE|PRE)$/.test(el.tagName)) return el;
        el = el.parentElement;
      }
      return surface;
    }
    function highlightNodes() {
      var out = [];
      Array.prototype.forEach.call(surface.querySelectorAll('span, font, mark, p, div, li, h1, h2, h3, blockquote'), function (el) {
        if (elHasHighlight(el)) out.push(el);
      });
      return out;
    }
    function nodeDepth(el) {
      var n = 0;
      while (el && el !== surface) { n++; el = el.parentElement; }
      return n;
    }
    function nodeContainsPoint(el, container, offset) {
      if (!el || !container) return false;
      if (el === container) {
        var max = container.nodeType === 1 ? container.childNodes.length : (container.nodeValue || '').length;
        return offset < max;
      }
      return el.contains(container);
    }
    function highlightAncestors(node) {
      var el = node && node.nodeType === 1 ? node : (node && node.parentElement);
      var stack = [];
      while (el && el !== surface) {
        if (elHasHighlight(el) && !/^(P|DIV|LI|H1|H2|H3|BLOCKQUOTE|PRE)$/.test(el.tagName)) stack.push(el);
        el = el.parentElement;
      }
      return stack;
    }
    function closestPlain(node) {
      var el = node && node.nodeType === 1 ? node : (node && node.parentElement);
      while (el && el !== surface) {
        if (el.getAttribute && el.getAttribute('data-jb-plain') === '1') return el;
        el = el.parentElement;
      }
      return null;
    }
    function rangeHasText(r) {
      try { return !!String(r.toString() || '').replace(/\u200b/g, ''); } catch (_) { return !r.collapsed; }
    }
    function caretAtEndOf(el, container, offset) {
      try {
        var r = document.createRange();
        r.setStart(container, offset);
        r.setEnd(el, el.childNodes.length);
        return !rangeHasText(r);
      } catch (_) { return false; }
    }
    function makePlainSpan() {
      var plain = document.createElement('span');
      plain.setAttribute('data-jb-plain', '1');
      plain.appendChild(document.createTextNode('\u200b'));
      return plain;
    }
    function placeCaretInPlain(plain) {
      if (!plain) return;
      var sel = window.getSelection();
      if (!sel) return;
      var r = document.createRange();
      if (plain.firstChild && plain.firstChild.nodeType === 3) {
        r.setStart(plain.firstChild, 0);
        r.setEnd(plain.firstChild, (plain.firstChild.nodeValue || '').length);
      } else {
        r.selectNodeContents(plain);
      }
      sel.removeAllRanges();
      sel.addRange(r);
      plainTypingEl = plain;
      typingPlain = true;
    }
    function setTransparentTyping() {
      try { document.execCommand('styleWithCSS', false, true); } catch (_) {}
      try { document.execCommand('hiliteColor', false, 'transparent'); } catch (_) {}
      try { document.execCommand('styleWithCSS', false, false); } catch (_) {}
    }
    function exitHighlightForTyping() {
      var sel = window.getSelection();
      if (!sel || !sel.rangeCount) return false;
      var range = sel.getRangeAt(0);
      if (!rangeInSurface(range) || !range.collapsed) return false;
      var sc = range.startContainer;
      var so = range.startOffset;
      var stack = highlightAncestors(sc);
      if (!stack.length) {
        typingPlain = true;
        setTransparentTyping();
        return false;
      }
      var outermost = stack[stack.length - 1];
      var innermost = stack[0];
      if (caretAtEndOf(innermost, sc, so)) {
        var after = makePlainSpan();
        if (outermost.parentNode) outermost.parentNode.insertBefore(after, outermost.nextSibling);
        placeCaretInPlain(after);
        setTransparentTyping();
        return true;
      }
      var i;
      for (i = 0; i < stack.length; i++) {
        var parts = splitHighlightAtPoint(stack[i], sc, so);
        sc = parts.right;
        so = 0;
      }
      var host = sc && sc.nodeType === 1 ? sc : (sc && sc.parentElement);
      var plain = makePlainSpan();
      if (host && host.parentNode) {
        host.parentNode.insertBefore(plain, host);
        if (elHasHighlight(host) && !rangeHasText((function () {
          var r = document.createRange();
          try { r.selectNodeContents(host); } catch (_) {}
          return r;
        })())) {
          if (host.parentNode) host.parentNode.removeChild(host);
        }
      } else {
        range.insertNode(plain);
      }
      placeCaretInPlain(plain);
      setTransparentTyping();
      return true;
    }
    function highlightOverlapsRange(hl, range) {
      try {
        if (!range.intersectsNode(hl)) return false;
      } catch (_) { return false; }
      try {
        var startCmp = range.comparePoint(hl, 0);
        var endCmp = range.comparePoint(hl, hl.childNodes.length);
        if (startCmp === 1) return false;
        if (endCmp === -1) return false;
        var containsStart = nodeContainsPoint(hl, range.startContainer, range.startOffset);
        if (startCmp === -1 && endCmp === 0 && !containsStart) return false;
        if (startCmp === 0 && endCmp === 1 && !containsStart) return false;
      } catch (_) {}
      return true;
    }
    function splitHighlightAtPoint(hl, container, offset) {
      if (!nodeContainsPoint(hl, container, offset)) return { left: null, right: hl };
      var left = document.createRange();
      try {
        left.setStart(hl, 0);
        left.setEnd(container, offset);
      } catch (_) {
        return { left: null, right: hl };
      }
      if (left.collapsed) return { left: null, right: hl };
      var frag = left.extractContents();
      var keep = hl.cloneNode(false);
      keep.appendChild(frag);
      if (hl.parentNode) hl.parentNode.insertBefore(keep, hl);
      return { left: keep, right: hl };
    }
    function unhighlightOverlap(hl, range) {
      if (!hl || !hl.parentNode || !elHasHighlight(hl)) return;
      if (!highlightOverlapsRange(hl, range)) return;
      var sc = range.startContainer;
      var so = range.startOffset;
      var ec = range.endContainer;
      var eo = range.endOffset;
      var startInside = nodeContainsPoint(hl, sc, so);
      var endInside = nodeContainsPoint(hl, ec, eo);
      var target = hl;
      if (startInside) {
        var startParts = splitHighlightAtPoint(hl, sc, so);
        target = startParts.right;
        if (ec === sc) {
          eo = Math.max(0, eo - so);
          ec = sc;
        }
      }
      if (endInside && target && target.parentNode && !range.collapsed) {
        var endParts = splitHighlightAtPoint(target, ec, eo);
        target = endParts.left || target;
      }
      clearElHighlight(target);
      if (target && !target.childNodes.length && target.parentNode) target.parentNode.removeChild(target);
    }
    function insertHlMark(container, offset) {
      var mark = document.createElement('span');
      mark.setAttribute('data-jb-hl-mark', '1');
      try {
        var r = document.createRange();
        r.setStart(container, offset);
        r.collapse(true);
        r.insertNode(mark);
      } catch (_) {
        if (container && container.parentNode) container.parentNode.insertBefore(mark, container.nextSibling);
      }
      return mark;
    }
    function pruneEmptySpans() {
      Array.prototype.forEach.call(surface.querySelectorAll('span'), function (el) {
        if (el.getAttribute('data-jb-hl-mark')) return;
        if (String(el.textContent || '')) return;
        if (el.parentNode) el.parentNode.removeChild(el);
      });
    }
    function clearHighlightFromCaret() {
      var sel = window.getSelection();
      if (!sel || !sel.rangeCount) return false;
      var range = sel.getRangeAt(0);
      if (!rangeInSurface(range)) return false;
      range = range.cloneRange();
      if (range.collapsed) return exitHighlightForTyping();
      var endMark = insertHlMark(range.endContainer, range.endOffset);
      var startMark = insertHlMark(range.startContainer, range.startOffset);
      function liveRange() {
        var r = document.createRange();
        r.setStartAfter(startMark);
        r.setEndBefore(endMark);
        return r;
      }
      var hit = false;
      var guard;
      for (guard = 0; guard < 12; guard++) {
        var live = liveRange();
        var list = highlightNodes().filter(function (el) {
          return el !== startMark && el !== endMark && highlightOverlapsRange(el, live);
        });
        if (!list.length) break;
        list.sort(function (a, b) { return nodeDepth(b) - nodeDepth(a); });
        unhighlightOverlap(list[0], live);
        hit = true;
      }
      try {
        var caret = document.createRange();
        caret.setStartAfter(startMark);
        caret.collapse(true);
        sel.removeAllRanges();
        sel.addRange(caret);
      } catch (_) {}
      if (startMark.parentNode) startMark.parentNode.removeChild(startMark);
      if (endMark.parentNode) endMark.parentNode.removeChild(endMark);
      pruneEmptySpans();
      return hit;
    }
    function paintHlBtn() {
      if (hlSwatch) hlSwatch.style.background = lastHighlight || 'transparent';
    }
    function applyHighlight(color) {
      var bg = color ? cssHighlightFromStyle('background-color:' + color) : '';
      var sel = window.getSelection();
      if (sel && sel.rangeCount && rangeInSurface(sel.getRangeAt(0))) saveSelection();
      else restoreSelection();
      surface.focus();
      restoreSelection();
      if (!bg) {
        sel = window.getSelection();
        if (sel && sel.rangeCount && sel.getRangeAt(0).collapsed) exitHighlightForTyping();
        else {
          clearHighlightFromCaret();
          typingPlain = true;
        }
        paintHlBtn();
        try { document.execCommand('styleWithCSS', false, false); } catch (_) {}
        markDirty();
        return;
      }
      typingPlain = false;
      plainTypingEl = null;
      sel = window.getSelection();
      if (sel && sel.rangeCount) {
        var live2 = sel.getRangeAt(0);
        if (rangeInSurface(live2) && live2.collapsed) {
          expandRangeToWord(live2);
          sel.removeAllRanges();
          sel.addRange(live2);
        }
      }
      try { document.execCommand('styleWithCSS', false, true); } catch (_) {}
      var ok = false;
      try { ok = document.execCommand('hiliteColor', false, bg); } catch (_) {}
      if (!ok) {
        try { ok = document.execCommand('backColor', false, bg); } catch (_) {}
      }
      if (!ok) wrapSelectionHighlight(bg);
      lastHighlight = bg;
      paintHlBtn();
      try { document.execCommand('styleWithCSS', false, false); } catch (_) {}
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
      var imgs = surface.querySelectorAll('img[data-jb-file]:not([data-jb-ink])');
      Array.prototype.forEach.call(imgs, function (img) {
        img.draggable = false;
        img.contentEditable = 'false';
        var id = safeDriveFileId(img.getAttribute('data-jb-file'));
        if (!id || img.getAttribute('data-jb-hydrated') === id) return;
        img.classList.add('jb-ed-img-loading');
        Promise.resolve(loadImage(id)).then(function (url) {
          if (destroyed || !url) return;
          img.src = url;
          img.setAttribute('data-jb-hydrated', id);
          img.classList.remove('jb-ed-img-loading');
          if (selectedImg === img) paintImgFrame();
          if (inkCanvas) scheduleInkSize();
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
      img.draggable = false;
      img.contentEditable = 'false';
      if (info.name) img.setAttribute('alt', String(info.name).slice(0, 200));
      insertNode(img);
      var br = document.createElement('p');
      br.appendChild(document.createElement('br'));
      insertNode(br);
      hydrateImages();
      markDirty();
    }
    function noteImg(el) {
      if (!el || el.tagName !== 'IMG') return null;
      if (!surface.contains(el)) return null;
      if (el.getAttribute('data-jb-ink') === '1' || el.classList.contains('jb-ed-ink-asset')) return null;
      if (!el.getAttribute('data-jb-file')) return null;
      return el;
    }
    function clearImgSelect() {
      endImgDragPreview();
      if (selectedImg) selectedImg.classList.remove('jb-ed-img-on');
      selectedImg = null;
      imgDrag = null;
      imgResize = null;
      if (imgFrame) imgFrame.hidden = true;
    }
    function selectImg(img) {
      img = noteImg(img);
      if (!img || inkOpen) { clearImgSelect(); return; }
      if (selectedImg && selectedImg !== img) selectedImg.classList.remove('jb-ed-img-on');
      selectedImg = img;
      img.classList.add('jb-ed-img-on');
      paintImgFrame();
    }
    function paintImgFrame() {
      if (!imgFrame || !selectedImg || !selectedImg.parentNode || inkOpen || (imgDrag && imgDrag.moved)) {
        if (imgFrame) imgFrame.hidden = true;
        return;
      }
      var pr = page.getBoundingClientRect();
      var ir = selectedImg.getBoundingClientRect();
      imgFrame.hidden = false;
      imgFrame.style.left = (ir.left - pr.left) + 'px';
      imgFrame.style.top = (ir.top - pr.top) + 'px';
      imgFrame.style.width = ir.width + 'px';
      imgFrame.style.height = ir.height + 'px';
    }
    function pruneEmptyBlock(el) {
      if (!el || el === surface || !el.parentNode) return;
      if (el.tagName !== 'P' && el.tagName !== 'DIV') return;
      if (el.querySelector('img')) return;
      if (String(el.textContent || '').replace(/\u200b/g, '').trim()) return;
      el.parentNode.removeChild(el);
    }
    function dropKey(block, after) {
      var i = 0, n = surface.firstChild;
      while (n) {
        if (n === block) break;
        i++;
        n = n.nextSibling;
      }
      return i + (after ? 'a' : 'b');
    }
    function hitElAt(x, y) {
      var hidden = [];
      function hide(el) {
        if (!el || el.hidden) return;
        hidden.push(el);
        el.hidden = true;
      }
      hide(imgGhost);
      hide(imgFrame);
      var el = document.elementFromPoint(x, y);
      var i;
      for (i = 0; i < hidden.length; i++) hidden[i].hidden = false;
      return el;
    }
    function dropRangeAt(x, y, img) {
      if (!img || inkOpen) return null;
      if (imgSlot && imgSlot.parentNode) {
        var sr = imgSlot.getBoundingClientRect();
        if (x >= sr.left && x <= sr.right && y >= sr.top && y <= sr.bottom) return null;
      }
      var el = hitElAt(x, y);
      if (!el) return null;
      if (imgSlot && (el === imgSlot || imgSlot.contains(el))) return null;
      if (el === img || img.contains(el)) return null;
      if (!surface.contains(el) && el !== surface) return null;
      var block = el;
      if (block.nodeType === 3) block = block.parentElement;
      while (block && block.parentElement && block.parentElement !== surface) {
        if (block === imgSlot || block === img) return null;
        block = block.parentElement;
      }
      var r = document.createRange();
      if (!block || block === surface) {
        var kids = surface.childNodes;
        var i, chose = null, cr, after = true;
        for (i = 0; i < kids.length; i++) {
          var kid = kids[i];
          if (kid === img || kid === imgSlot || kid.nodeType !== 1) continue;
          cr = kid.getBoundingClientRect();
          if (y < cr.top + cr.height / 2) {
            chose = kid;
            after = false;
            break;
          }
          chose = kid;
          after = y >= cr.top + cr.height / 2;
          if (y <= cr.bottom) break;
        }
        if (!chose) {
          r.selectNodeContents(surface);
          r.collapse(false);
          return { range: r, key: 'end' };
        }
        if (after) r.setStartAfter(chose);
        else r.setStartBefore(chose);
        r.collapse(true);
        return { range: r, key: dropKey(chose, after) };
      }
      if (block === img || block === imgSlot) return null;
      var br = block.getBoundingClientRect();
      var afterBlk = y > br.top + br.height / 2;
      if (afterBlk) r.setStartAfter(block);
      else r.setStartBefore(block);
      r.collapse(true);
      return { range: r, key: dropKey(block, afterBlk) };
    }
    function ensureImgGhost() {
      if (imgGhost) return;
      imgGhost = document.createElement('div');
      imgGhost.className = 'jb-ed-img-ghost';
      imgGhost.hidden = true;
      imgGhost.setAttribute('aria-hidden', 'true');
      root.appendChild(imgGhost);
    }
    function startImgDragPreview(img) {
      if (!img) return;
      ensureImgGhost();
      imgGhost.innerHTML = '';
      var g = document.createElement('img');
      g.src = img.currentSrc || img.src || '';
      g.alt = '';
      imgGhost.appendChild(g);
      imgGhost.hidden = false;
      img.classList.add('jb-ed-img-dragging');
      if (imgFrame) imgFrame.hidden = true;
      if (!imgSlot) {
        imgSlot = document.createElement('div');
        imgSlot.className = 'jb-ed-img-slot';
        imgSlot.setAttribute('aria-hidden', 'true');
      }
      imgSlot.style.width = Math.round(img.getBoundingClientRect().width || img.offsetWidth || 160) + 'px';
      imgSlot.style.height = Math.round(img.getBoundingClientRect().height || 90) + 'px';
      imgSlot.innerHTML = '';
      var preview = document.createElement('img');
      preview.src = img.currentSrc || img.src || '';
      preview.alt = '';
      imgSlot.appendChild(preview);
    }
    function paintImgGhost(ev) {
      if (!imgGhost || imgGhost.hidden) return;
      imgGhost.style.left = (ev.clientX + 16) + 'px';
      imgGhost.style.top = (ev.clientY + 16) + 'px';
    }
    function placeImgSlot(drop) {
      if (!drop || !drop.range || !imgSlot) return;
      try { drop.range.insertNode(imgSlot); } catch (_) {}
    }
    function endImgDragPreview() {
      if (selectedImg) {
        selectedImg.classList.remove('jb-ed-img-dragging');
        selectedImg.style.opacity = '';
      }
      if (imgGhost) {
        imgGhost.hidden = true;
        imgGhost.innerHTML = '';
      }
      if (imgSlot && imgSlot.parentNode) imgSlot.parentNode.removeChild(imgSlot);
    }
    function applyImgWidth(img, w) {
      if (!noteImg(img)) return;
      var max = Math.max(64, (surface.clientWidth || 320) - 8);
      w = Math.round(w);
      if (w < 64) w = 64;
      if (w > max) w = max;
      img.style.width = w + 'px';
      img.style.height = 'auto';
      img.removeAttribute('height');
      img.removeAttribute('width');
      paintImgFrame();
      markDirty();
      if (inkCanvas) scheduleInkSize();
    }
    function onImgFrameDown(ev) {
      if (inkOpen || ev.button) return;
      var handle = ev.target && ev.target.getAttribute ? ev.target.getAttribute('data-h') : '';
      if (handle && selectedImg) {
        ev.preventDefault();
        ev.stopPropagation();
        try { imgFrame.setPointerCapture(ev.pointerId); } catch (_) {}
        var ir = selectedImg.getBoundingClientRect();
        imgResize = { handle: handle, startX: ev.clientX, startW: ir.width, startL: ir.left };
        imgDrag = null;
        return;
      }
      if (!selectedImg) return;
      ev.preventDefault();
      ev.stopPropagation();
      try { imgFrame.setPointerCapture(ev.pointerId); } catch (_) {}
      imgDrag = { img: selectedImg, x: ev.clientX, y: ev.clientY, moved: false, dropKey: '' };
      imgResize = null;
    }
    function onImgFrameMove(ev) {
      if (imgResize && selectedImg) {
        ev.preventDefault();
        var dx = ev.clientX - imgResize.startX;
        if (imgResize.handle === 'nw' || imgResize.handle === 'sw') dx = -dx;
        applyImgWidth(selectedImg, imgResize.startW + dx);
        return;
      }
      if (!imgDrag) return;
      ev.preventDefault();
      if (!imgDrag.moved && (Math.abs(ev.clientX - imgDrag.x) > 4 || Math.abs(ev.clientY - imgDrag.y) > 4)) {
        imgDrag.moved = true;
        startImgDragPreview(imgDrag.img);
      }
      if (!imgDrag.moved) return;
      paintImgGhost(ev);
      var drop = dropRangeAt(ev.clientX, ev.clientY, imgDrag.img);
      if (drop && drop.key && drop.key !== imgDrag.dropKey) {
        imgDrag.dropKey = drop.key;
        placeImgSlot(drop);
        if (inkCanvas) scheduleInkSize();
      }
    }
    function onImgFrameUp(ev) {
      if (imgResize) {
        imgResize = null;
        return;
      }
      if (!imgDrag) return;
      var drag = imgDrag;
      imgDrag = null;
      var slotParent = imgSlot && imgSlot.parentNode;
      if (drag.moved && drag.img && slotParent) {
        var oldParent = drag.img.parentNode;
        slotParent.insertBefore(drag.img, imgSlot);
        endImgDragPreview();
        pruneEmptyBlock(oldParent);
        selectImg(drag.img);
        markDirty();
        if (inkCanvas) scheduleInkSize();
        return;
      }
      endImgDragPreview();
      if (drag.img) drag.img.style.opacity = '';
      if (drag.moved) {
        var drop = dropRangeAt(ev.clientX, ev.clientY, drag.img);
        if (drop && drop.range) {
          var prev = drag.img.parentNode;
          try { drop.range.insertNode(drag.img); } catch (_) {}
          pruneEmptyBlock(prev);
          selectImg(drag.img);
          markDirty();
          if (inkCanvas) scheduleInkSize();
        }
      } else {
        selectImg(drag.img);
      }
    }
    function inkPos(ev) {
      if (!inkCanvas) return { x: 0, y: 0 };
      var r = inkCanvas.getBoundingClientRect();
      var w = r.width || 1;
      var h = r.height || 1;
      return {
        x: Math.max(0, Math.min(w, ev.clientX - r.left)),
        y: Math.max(0, Math.min(h, ev.clientY - r.top))
      };
    }
    function paintInkStroke(stroke) {
      if (!inkCtx || !stroke || !stroke.pts || !stroke.pts.length) return;
      inkCtx.strokeStyle = stroke.color;
      inkCtx.lineWidth = stroke.width;
      inkCtx.lineCap = 'round';
      inkCtx.lineJoin = 'round';
      inkCtx.beginPath();
      inkCtx.moveTo(stroke.pts[0].x, stroke.pts[0].y);
      var i;
      for (i = 1; i < stroke.pts.length; i++) inkCtx.lineTo(stroke.pts[i].x, stroke.pts[i].y);
      if (stroke.pts.length === 1) inkCtx.lineTo(stroke.pts[0].x + 0.01, stroke.pts[0].y);
      inkCtx.stroke();
    }
    function redrawInk() {
      if (!inkCanvas || !inkCtx) return;
      var r = inkCanvas.getBoundingClientRect();
      var cssW = r.width || 1;
      var cssH = r.height || 1;
      var dpr = inkCanvas.width / cssW;
      if (!isFinite(dpr) || dpr <= 0) dpr = 1;
      inkCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
      inkCtx.clearRect(0, 0, cssW, cssH);
      if (inkBase && inkBase.naturalWidth) {
        inkCtx.drawImage(inkBase, 0, 0, inkBase.naturalWidth / dpr, inkBase.naturalHeight / dpr);
      }
      var i;
      for (i = 0; i < inkStrokes.length; i++) paintInkStroke(inkStrokes[i]);
    }
    function sizeInkCanvas() {
      if (!inkCanvas) return;
      var cssW = Math.max(1, Math.round(page.clientWidth || 1));
      var cssH = Math.max(1, Math.round(page.clientHeight || 1));
      var dpr = Math.min(2, window.devicePixelRatio || 1);
      var pxW = Math.max(1, Math.round(cssW * dpr));
      var pxH = Math.max(1, Math.round(cssH * dpr));
      if (inkCanvas.width !== pxW || inkCanvas.height !== pxH) {
        inkCanvas.width = pxW;
        inkCanvas.height = pxH;
      }
      inkCtx = inkCanvas.getContext('2d');
      redrawInk();
    }
    function scheduleInkSize() {
      if (!inkCanvas) return;
      if (inkSizeRaf) return;
      inkSizeRaf = requestAnimationFrame(function () {
        inkSizeRaf = 0;
        sizeInkCanvas();
      });
    }
    function paintInkTools() {
      if (!inkTools) return;
      Array.prototype.forEach.call(inkTools.querySelectorAll('[data-ink-color]'), function (el) {
        el.classList.toggle('on', !inkErase && el.getAttribute('data-ink-color') === inkColor);
      });
      Array.prototype.forEach.call(inkTools.querySelectorAll('[data-ink-width]'), function (el) {
        el.classList.toggle('on', !inkErase && Number(el.getAttribute('data-ink-width')) === inkWidth);
      });
      var eraseBtn = inkTools.querySelector('[data-ink-erase]');
      if (eraseBtn) eraseBtn.classList.toggle('on', inkErase);
      if (root) root.classList.toggle('ink-erase', inkOpen && inkErase);
    }
    function canvasToUploadFile() {
      if (!inkCanvas) return null;
      try {
        var blob = dataUrlToBlob(inkCanvas.toDataURL('image/png'));
        if (!blob || !blob.size) return null;
        return blobToUploadFile(blob, 'sharpie-overlay.png');
      } catch (_) { return null; }
    }
    function setInkMode(on) {
      if (!uploadImage || !inkCanvas) return;
      inkOpen = !!on;
      root.classList.toggle('ink-on', inkOpen);
      if (inkTools) inkTools.hidden = !inkOpen;
      if (inkBtn) inkBtn.classList.toggle('on', inkOpen);
      if (inkOpen) {
        setHlMenuOpen(false);
        setFsMenuOpen(false);
        clearImgSelect();
        sizeInkCanvas();
      } else {
        inkErase = false;
        inkErasing = false;
        if (root) root.classList.remove('ink-erase');
      }
      paintInkTools();
    }
    function toggleInk() {
      setInkMode(!inkOpen);
    }
    function scheduleInkSave() {
      inkDirty = true;
      markDirty();
      if (inkSaveTimer) clearTimeout(inkSaveTimer);
      inkSaveTimer = setTimeout(function () {
        inkSaveTimer = null;
        saveInkNow().then(function () {
          if (!destroyed && onSave) persist(false);
        });
      }, INK_SAVE_MS);
    }
    function saveInkNow() {
      if (inkSaveTimer) { clearTimeout(inkSaveTimer); inkSaveTimer = null; }
      if (!uploadImage || !inkCanvas) {
        inkDirty = false;
        return Promise.resolve();
      }
      if (!inkBase && !inkStrokes.length) {
        inkFileId = '';
        inkDirty = false;
        return Promise.resolve();
      }
      if (inkBusy) {
        return new Promise(function (resolve) {
          setTimeout(function () {
            if (destroyed) { resolve(); return; }
            resolve(saveInkNow());
          }, 80);
        });
      }
      sizeInkCanvas();
      var file = canvasToUploadFile();
      if (!file || file.size > IMAGE_MAX_BYTES) {
        inkDirty = false;
        return Promise.resolve();
      }
      inkBusy = true;
      var token = ++inkToken;
      var op = (inkFileId && replaceImage)
        ? Promise.resolve(replaceImage(inkFileId, file)).catch(function () { return uploadImage(file); })
        : Promise.resolve(uploadImage(file));
      return op.then(function (info) {
        if (token !== inkToken) return;
        var id = safeDriveFileId(info && info.id);
        if (id) inkFileId = id;
        inkDirty = false;
        if (destroyed) return;
        try {
          var url = (typeof URL !== 'undefined' && URL.createObjectURL) ? URL.createObjectURL(file) : '';
          if (url && !inkStrokes.length) {
            var img = new Image();
            img.onload = function () {
              if (token === inkToken && !destroyed) { inkBase = img; redrawInk(); }
            };
            img.src = url;
          }
        } catch (_) {}
      }).catch(function () {
        if (token === inkToken && window.JB && JB.toast) JB.toast('Não foi possível salvar o desenho');
      }).then(function () {
        if (token === inkToken) inkBusy = false;
        if (!destroyed && inkDirty) return saveInkNow();
      });
    }
    function hydrateInk() {
      if (!inkCanvas) return;
      sizeInkCanvas();
      if (inkStrokes.length) {
        scheduleInkSize();
        return;
      }
      if (!inkFileId || !loadImage) return;
      Promise.resolve(loadImage(inkFileId)).then(function (url) {
        if (destroyed || !url || inkStrokes.length) return;
        var img = new Image();
        img.onload = function () {
          if (destroyed || inkStrokes.length) return;
          inkBase = img;
          sizeInkCanvas();
        };
        img.src = url;
      }).catch(function () {});
    }
    function resetInk() {
      inkStrokes = [];
      inkCurrent = null;
      inkBase = null;
      inkFileId = '';
      redrawInk();
      scheduleInkSave();
    }
    function eraseInkAt(ev) {
      var pos = inkPos(ev);
      var idx = hitInkStroke(inkStrokes, pos);
      if (idx >= 0) {
        inkStrokes.splice(idx, 1);
        redrawInk();
        return true;
      }
      if (!inkBase || !inkCanvas || !inkCtx) return false;
      try {
        var r = inkCanvas.getBoundingClientRect();
        var x = Math.max(0, Math.min(inkCanvas.width - 1, Math.round(pos.x * inkCanvas.width / (r.width || 1))));
        var y = Math.max(0, Math.min(inkCanvas.height - 1, Math.round(pos.y * inkCanvas.height / (r.height || 1))));
        if (inkCtx.getImageData(x, y, 1, 1).data[3] < 20) return false;
      } catch (_) { return false; }
      inkBase = null;
      redrawInk();
      return true;
    }
    function onInkPointerDown(ev) {
      if (!inkOpen || ev.button) return;
      ev.preventDefault();
      try { inkCanvas.setPointerCapture(ev.pointerId); } catch (_) {}
      if (inkErase) {
        inkErasing = true;
        inkErased = eraseInkAt(ev);
        return;
      }
      inkCurrent = { color: inkColor, width: inkWidth, pts: [inkPos(ev)] };
      inkStrokes.push(inkCurrent);
      paintInkStroke(inkCurrent);
    }
    function onInkPointerMove(ev) {
      if (inkErasing) {
        ev.preventDefault();
        if (eraseInkAt(ev)) inkErased = true;
        return;
      }
      if (!inkCurrent) return;
      ev.preventDefault();
      inkCurrent.pts.push(inkPos(ev));
      redrawInk();
    }
    function onInkPointerUp() {
      if (inkErasing) {
        inkErasing = false;
        if (inkErased) scheduleInkSave();
        inkErased = false;
        return;
      }
      if (!inkCurrent) return;
      inkCurrent = null;
      scheduleInkSave();
    }
    function pasteImages(ev) {
      if (!uploadImage) return;
      var files = pasteImageFiles(ev.clipboardData || (ev.originalEvent && ev.originalEvent.clipboardData));
      if (!files.length) return;
      ev.preventDefault();
      if (ev.stopImmediatePropagation) ev.stopImmediatePropagation();
      var i = 0;
      function next() {
        if (destroyed) return;
        if (i >= files.length) return;
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
      if (!selectedImg) return;
      if (imgFrame && imgFrame.contains(ev.target)) return;
      if (noteImg(ev.target) === selectedImg) return;
      clearImgSelect();
    }
    function onSelChange() {
      saveSelection();
      if (!typingPlain) return;
      var sel = window.getSelection();
      if (!sel || !sel.rangeCount || !rangeInSurface(sel.getRangeAt(0))) return;
      var n = sel.getRangeAt(0).startContainer;
      if (closestPlain(n)) return;
      if (highlightAncestors(n).length) typingPlain = false;
    }

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
      if (plainTypingEl && plainTypingEl.parentNode) placeCaretInPlain(plainTypingEl);
    });
    hlMenu.appendChild(hlNone);
    hlWrap.appendChild(hlApply);
    hlWrap.appendChild(hlCaret);
    hlWrap.appendChild(hlMenu);
    bar.appendChild(hlWrap);
    paintHlBtn();

    if (uploadImage) {
      inkBtn = btn('✎', 'Sharpie');
      inkBtn.setAttribute('aria-label', 'Sharpie');
      inkBtn.addEventListener('click', toggleInk);
      bar.appendChild(inkBtn);

      inkTools = document.createElement('div');
      inkTools.className = 'jb-ed-ink-tools';
      inkTools.hidden = true;
      INK_COLORS.forEach(function (c) {
        var chip = document.createElement('button');
        chip.type = 'button';
        chip.className = 'jb-ed-ink-chip';
        chip.title = c.label;
        chip.setAttribute('aria-label', c.label);
        chip.setAttribute('data-ink-color', c.color);
        chip.style.background = c.color;
        chip.addEventListener('click', function () {
          inkColor = c.color;
          inkErase = false;
          paintInkTools();
        });
        inkTools.appendChild(chip);
      });
      var fineBtn = btn('Fino', 'Traço fino');
      fineBtn.setAttribute('data-ink-width', String(INK_WIDTH_FINE));
      fineBtn.addEventListener('click', function () { inkWidth = INK_WIDTH_FINE; inkErase = false; paintInkTools(); });
      var boldBtn = btn('Grosso', 'Traço grosso');
      boldBtn.setAttribute('data-ink-width', String(INK_WIDTH_BOLD));
      boldBtn.addEventListener('click', function () { inkWidth = INK_WIDTH_BOLD; inkErase = false; paintInkTools(); });
      var eraseBtn = btn('Borracha', 'Apagar um traço');
      eraseBtn.setAttribute('data-ink-erase', '1');
      eraseBtn.addEventListener('click', function () { inkErase = !inkErase; paintInkTools(); });
      var undoBtn = btn('Desfazer', 'Desfazer traço');
      undoBtn.addEventListener('click', function () {
        if (!inkStrokes.length) return;
        inkStrokes.pop();
        inkCurrent = null;
        redrawInk();
        scheduleInkSave();
      });
      var clearBtn = btn('Limpar', 'Limpar desenho');
      clearBtn.addEventListener('click', function () { resetInk(); });
      inkTools.appendChild(fineBtn);
      inkTools.appendChild(boldBtn);
      inkTools.appendChild(eraseBtn);
      inkTools.appendChild(undoBtn);
      inkTools.appendChild(clearBtn);
      paintInkTools();
      inkCanvas.addEventListener('pointerdown', onInkPointerDown);
      inkCanvas.addEventListener('pointermove', onInkPointerMove);
      inkCanvas.addEventListener('pointerup', onInkPointerUp);
      inkCanvas.addEventListener('pointercancel', onInkPointerUp);
    }

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
    if (inkTools) root.appendChild(inkTools);
    root.appendChild(stage);
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
    hydrateInk();
    function onWinResize() {
      scheduleInkSize();
      paintImgFrame();
    }
    function onEditorSaveKey(ev) {
      var key = (ev.key || '').toLowerCase();
      if (!(ev.ctrlKey || ev.metaKey) || key !== 's') return;
      if (destroyed) return;
      ev.preventDefault();
      if (ev.stopImmediatePropagation) ev.stopImmediatePropagation();
      else ev.stopPropagation();
      persist(true);
    }
    document.addEventListener('keydown', onEditorSaveKey, true);
    window.addEventListener('resize', onWinResize);
    scroll.addEventListener('scroll', paintImgFrame);
    imgFrame.addEventListener('pointerdown', onImgFrameDown);
    imgFrame.addEventListener('pointermove', onImgFrameMove);
    imgFrame.addEventListener('pointerup', onImgFrameUp);
    imgFrame.addEventListener('pointercancel', onImgFrameUp);
    if (inkCanvas) {
      sizeInkCanvas();
      if (typeof ResizeObserver === 'function') {
        inkRo = new ResizeObserver(function () { scheduleInkSize(); paintImgFrame(); });
        try { inkRo.observe(page); } catch (_) {}
      }
    }

    surface.addEventListener('beforeinput', function (ev) {
      if (uploadImage && ev.inputType === 'insertFromPaste') {
        var dt = ev.dataTransfer;
        if (dt && pasteImageFiles(dt).length) { ev.preventDefault(); return; }
      }
      if (insertingPlain) return;
      if (!typingPlain) return;
      if (ev.inputType !== 'insertText' && ev.inputType !== 'insertCompositionText') return;
      if (!ev.data) return;
      var sel = window.getSelection();
      if (!sel || !sel.rangeCount) return;
      var r = sel.getRangeAt(0);
      if (!rangeInSurface(r) || !r.collapsed) return;
      if (closestPlain(r.startContainer)) return;
      if (!highlightAncestors(r.startContainer).length) return;
      ev.preventDefault();
      insertingPlain = true;
      try {
        exitHighlightForTyping();
        document.execCommand('insertText', false, ev.data);
      } finally {
        insertingPlain = false;
      }
    });
    surface.addEventListener('input', function () {
      Array.prototype.forEach.call(surface.querySelectorAll('[data-jb-plain="1"]'), function (el) {
        var raw = String(el.textContent || '');
        var clean = raw.replace(/\u200b/g, '');
        if (!clean || clean === raw) return;
        el.textContent = clean;
        var sel = window.getSelection();
        if (sel && plainTypingEl === el) {
          var caret = document.createRange();
          caret.selectNodeContents(el);
          caret.collapse(false);
          sel.removeAllRanges();
          sel.addRange(caret);
        }
      });
      markDirty();
      if (inkCanvas) sizeInkCanvas();
      paintImgFrame();
    });
    if (uploadImage) surface.addEventListener('paste', pasteImages, true);
    surface.addEventListener('dragstart', function (ev) {
      if (noteImg(ev.target)) ev.preventDefault();
    });
    surface.addEventListener('keyup', syncBar);
    surface.addEventListener('mouseup', syncBar);
    surface.addEventListener('mousedown', function (ev) {
      if (ev.button !== 0) { linkMouse = null; return; }
      var img = noteImg(ev.target);
      if (img && !inkOpen) {
        ev.preventDefault();
        selectImg(img);
        linkMouse = null;
        return;
      }
      var a = ev.target && ev.target.closest ? ev.target.closest('a[href]') : null;
      linkMouse = (a && surface.contains(a)) ? { x: ev.clientX, y: ev.clientY } : null;
    });
    surface.addEventListener('keydown', function (ev) {
      var key = (ev.key || '').toLowerCase();
      if ((ev.ctrlKey || ev.metaKey) && key === 's') {
        ev.preventDefault();
        persist(true);
        return;
      }
      if (selectedImg && !inkOpen && (key === 'delete' || key === 'backspace') && !ev.ctrlKey && !ev.metaKey && !ev.altKey) {
        ev.preventDefault();
        var gone = selectedImg;
        var parent = gone.parentNode;
        clearImgSelect();
        if (gone.parentNode) gone.parentNode.removeChild(gone);
        pruneEmptyBlock(parent);
        markDirty();
        if (inkCanvas) scheduleInkSize();
      }
    });
    surface.addEventListener('click', function (ev) {
      var a = ev.target && ev.target.closest ? ev.target.closest('a[href]') : null;
      if (a && surface.contains(a) && ev.button === 0) {
        var moved = linkMouse && (Math.abs(ev.clientX - linkMouse.x) > 5 || Math.abs(ev.clientY - linkMouse.y) > 5);
        linkMouse = null;
        if (!moved) {
          var url = safeHref(a.getAttribute('href'));
          if (url) {
            ev.preventDefault();
            ev.stopPropagation();
            window.open(url, '_blank', 'noopener,noreferrer');
            return;
          }
        }
      }
      linkMouse = null;
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
      flushInk: saveInkNow,
      setValue: function (v) {
        lastSaved = valueToHtml(v);
        inkFileId = pullInkFileId(lastSaved);
        inkBase = null;
        inkStrokes = pullInkStrokes(lastSaved);
        inkCurrent = null;
        inkDirty = false;
        clearImgSelect();
        var box2 = document.createElement('div');
        box2.innerHTML = lastSaved;
        stripInkFromBox(box2);
        surface.innerHTML = box2.innerHTML;
        dirty = false;
        setEmptyClass();
        setStatus('', lastSaved ? 'Salvo' : '');
        resetTimer();
        hydrateImages();
        hydrateInk();
        sizeInkCanvas();
      },
      save: function () { persist(true); },
      destroy: function () {
        if (destroyed) return;
        document.removeEventListener('mousedown', onDocFsDown);
        document.removeEventListener('selectionchange', onSelChange);
        document.removeEventListener('keydown', onEditorSaveKey, true);
        window.removeEventListener('resize', onWinResize);
        scroll.removeEventListener('scroll', paintImgFrame);
        clearImgSelect();
        if (inkSizeRaf) { cancelAnimationFrame(inkSizeRaf); inkSizeRaf = 0; }
        if (inkRo) { try { inkRo.disconnect(); } catch (_) {} inkRo = null; }
        if (autoTimer) { clearInterval(autoTimer); autoTimer = null; }
        if (inkSaveTimer) { clearTimeout(inkSaveTimer); inkSaveTimer = null; }
        inkOpen = false;
        var bodyHtml = '';
        try { bodyHtml = surfaceBodyHtml(); } catch (_) {}
        var file = null;
        if (uploadImage && (inkBase || inkStrokes.length)) {
          try { file = canvasToUploadFile(); } catch (_) {}
        }
        var fid = inkFileId;
        var saveCb = onSave;
        var wasDirty = dirty || inkDirty;
        destroyed = true;
        if (root.parentNode) root.parentNode.removeChild(root);
        host.innerHTML = '';
        function htmlWith(id) {
          return composeHtml(bodyHtml, id);
        }
        if (file && uploadImage) {
          var op = (fid && replaceImage)
            ? Promise.resolve(replaceImage(fid, file)).catch(function () { return uploadImage(file); })
            : Promise.resolve(uploadImage(file));
          op.then(function (info) {
            var id = safeDriveFileId(info && info.id) || fid;
            if (saveCb) saveCb(htmlWith(id), { manual: false });
          }).catch(function () {
            if (saveCb && wasDirty) saveCb(htmlWith(fid), { manual: false });
          });
          return;
        }
        if (wasDirty && saveCb) saveCb(htmlWith(fid), { manual: false });
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
    cssTextMarksFromStyle: cssTextMarksFromStyle,
    HIGHLIGHTS: HIGHLIGHTS,
    blobToUploadFile: blobToUploadFile,
    pullInkFileId: pullInkFileId,
    dumpInkStrokes: dumpInkStrokes,
    parseInkStrokes: parseInkStrokes,
    pullInkStrokes: pullInkStrokes,
    hitInkStroke: hitInkStroke,
    cssImgWidthPx: cssImgWidthPx
  };

  if (typeof window !== 'undefined') {
    window.JB_EDITOR = api;
    if (window.JB) window.JB.editor = api;
  } else if (typeof globalThis !== 'undefined') {
    globalThis.JB_EDITOR = api;
  }
})();
