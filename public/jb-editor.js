/* Joelboard shared rich-text editor. © 2026 Joel Soluções LTDA.
   Classic global script (NOT a module). Loads after /joelboard.js. */
(function () {
  var CELL_LIMIT = 50000;
  var AUTOSAVE_MS = 20000;
  var IMAGE_MAX_BYTES = 10 * 1024 * 1024;
  var IMAGE_OK = { 'image/png': 1, 'image/jpeg': 1, 'image/jpg': 1, 'image/webp': 1, 'image/gif': 1 };
  var SIZES = [
    { label: '13', px: '13px' },
    { label: '16', px: '16px' },
    { label: '20', px: '20px' },
    { label: '24', px: '24px' },
    { label: '32', px: '32px' }
  ];
  var ALLOWED = { P:1, H1:1, H2:1, H3:1, DIV:1, BR:1, SPAN:1, STRONG:1, B:1, EM:1, I:1, U:1, S:1, STRIKE:1, A:1, UL:1, OL:1, LI:1, BLOCKQUOTE:1, PRE:1, CODE:1, HR:1, FONT:1, IMG:1 };

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
            var st = String(child.getAttribute('style') || '');
            var fs = st.match(/font-size\s*:\s*([0-9.]+px)/i);
            child.removeAttribute('style');
            if (fs) child.style.fontSize = fs[1];
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
    function applySize(px) {
      surface.focus();
      try { document.execCommand('styleWithCSS', false, true); } catch (_) {}
      try { document.execCommand('fontSize', false, '7'); } catch (_) {}
      var fonts = surface.querySelectorAll('font[size="7"]');
      Array.prototype.forEach.call(fonts, function (f) {
        var span = document.createElement('span');
        if (px) span.style.fontSize = px;
        while (f.firstChild) span.appendChild(f.firstChild);
        if (f.parentNode) f.parentNode.replaceChild(span, f);
      });
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
    function syncBar() {
      var map = { bold: 'bold', italic: 'italic', underline: 'underline', strikeThrough: 'strike' };
      Object.keys(map).forEach(function (command) {
        var el = bar.querySelector('[data-cmd="' + map[command] + '"]');
        if (!el) return;
        var on = false;
        try { on = document.queryCommandState(command); } catch (_) {}
        el.classList.toggle('on', !!on);
      });
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

    [
      { label: 'H1', title: 'Título', tag: 'h1' },
      { label: 'H2', title: 'Subtítulo', tag: 'h2' },
      { label: 'H3', title: 'Seção', tag: 'h3' }
    ].forEach(function (t) {
      var b = btn(t.label, t.title);
      b.addEventListener('click', function () { block(t.tag); });
      bar.appendChild(b);
    });

    var sizeSel = document.createElement('select');
    sizeSel.className = 'jb-ed-size';
    sizeSel.title = 'Tamanho do texto';
    var opt0 = document.createElement('option');
    opt0.value = '';
    opt0.textContent = 'Aa';
    sizeSel.appendChild(opt0);
    SIZES.forEach(function (sz) {
      var o = document.createElement('option');
      o.value = sz.px;
      o.textContent = sz.label;
      sizeSel.appendChild(o);
    });
    sizeSel.addEventListener('mousedown', function (ev) { ev.stopPropagation(); });
    sizeSel.addEventListener('change', function () {
      applySize(sizeSel.value);
      sizeSel.value = '';
    });
    bar.appendChild(sizeSel);

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
    IMAGE_MAX_BYTES: IMAGE_MAX_BYTES
  };

  if (typeof window !== 'undefined') {
    window.JB_EDITOR = api;
    if (window.JB) window.JB.editor = api;
  } else if (typeof globalThis !== 'undefined') {
    globalThis.JB_EDITOR = api;
  }
})();
