/* Joelboard shared markdown editor. © 2026 Joel Soluções LTDA.
   Classic global script (NOT a module). Loads after /joelboard.js. */
(function () {
  var CELL_LIMIT = 50000;
  var DEBOUNCE_MS = 600;

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
      var body = sel || spec.placeholder || 'código';
      var ins = '```\n' + body + '\n```';
      return { value: value.slice(0, start) + ins + value.slice(end), start: start + 4, end: start + 4 + body.length };
    }

    if (spec.kind === 'link') {
      var text = sel || spec.placeholder || 'texto';
      var ins = '[' + text + '](https://)';
      var hrefStart = start + text.length + 3;
      return { value: value.slice(0, start) + ins + value.slice(end), start: hrefStart, end: hrefStart + 8 };
    }

    var left = spec.left || '';
    var right = spec.right != null ? spec.right : left;
    var inner = sel || spec.placeholder || '';
    var next = value.slice(0, start) + left + inner + right + value.slice(end);
    var ns = start + left.length;
    return { value: next, start: ns, end: ns + inner.length };
  }

  var TOOLS = [
    { label: 'B', title: 'Negrito', spec: { left: '**', right: '**', placeholder: 'negrito' } },
    { label: 'I', title: 'Itálico', spec: { left: '*', right: '*', placeholder: 'itálico' } },
    { label: 'U', title: 'Sublinhado', spec: { left: '__', right: '__', placeholder: 'texto' } },
    { label: 'S', title: 'Riscado', spec: { left: '~~', right: '~~', placeholder: 'texto' } },
    { label: 'H1', title: 'Título', spec: { kind: 'line', prefix: '# ' } },
    { label: 'H2', title: 'Subtítulo', spec: { kind: 'line', prefix: '## ' } },
    { label: 'H3', title: 'Seção', spec: { kind: 'line', prefix: '### ' } },
    { label: '•', title: 'Lista', spec: { kind: 'line', prefix: '- ' } },
    { label: '1.', title: 'Lista numerada', spec: { kind: 'line', numbered: true } },
    { label: '☑', title: 'Checklist', spec: { kind: 'line', prefix: '- [ ] ' } },
    { label: '“', title: 'Citação', spec: { kind: 'line', prefix: '> ' } },
    { label: '</>', title: 'Código', spec: { kind: 'fence', placeholder: 'código' } },
    { label: '🔗', title: 'Link', spec: { kind: 'link', placeholder: 'texto' } }
  ];

  function mount(host, opts) {
    if (!host) return { getValue: function () { return ''; }, setValue: function () {}, destroy: function () {} };
    opts = opts || {};
    var value = String(opts.value == null ? '' : opts.value);
    var onChange = typeof opts.onChange === 'function' ? opts.onChange : null;
    var delay = opts.debounce != null ? opts.debounce : DEBOUNCE_MS;
    var placeholder = opts.placeholder || 'Escreva em markdown…';
    var timer = null;
    var destroyed = false;
    var showPreview = false;

    host.innerHTML = '';
    var root = document.createElement('div');
    root.className = 'jb-ed';
    var bar = document.createElement('div');
    bar.className = 'jb-ed-bar';
    TOOLS.forEach(function (tool) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'jb-ed-btn';
      b.title = tool.title;
      b.textContent = tool.label;
      b.addEventListener('mousedown', function (ev) { ev.preventDefault(); });
      b.addEventListener('click', function () { applySpec(tool.spec); });
      bar.appendChild(b);
    });
    var tog = document.createElement('button');
    tog.type = 'button';
    tog.className = 'jb-ed-btn jb-ed-tog';
    tog.title = 'Prévia';
    tog.textContent = 'Prévia';
    tog.addEventListener('click', function () {
      showPreview = !showPreview;
      root.classList.toggle('show-preview', showPreview);
      tog.classList.toggle('on', showPreview);
      paintPreview();
    });
    bar.appendChild(tog);

    var panes = document.createElement('div');
    panes.className = 'jb-ed-panes';
    var write = document.createElement('div');
    write.className = 'jb-ed-pane jb-ed-write';
    var ta = document.createElement('textarea');
    ta.className = 'jb-ed-ta';
    ta.placeholder = placeholder;
    ta.value = value;
    ta.setAttribute('spellcheck', 'false');
    write.appendChild(ta);
    var preview = document.createElement('div');
    preview.className = 'jb-ed-pane jb-ed-preview';
    preview.setAttribute('aria-label', 'Prévia');
    panes.appendChild(write);
    panes.appendChild(preview);
    root.appendChild(bar);
    root.appendChild(panes);
    host.appendChild(root);

    function paintPreview() {
      var html = mdToHtml(ta.value);
      preview.innerHTML = html || '<p class="jb-ed-empty">Nada para prévia ainda.</p>';
    }
    function emit() {
      if (destroyed || !onChange) return;
      var v = ta.value;
      if (v.length > CELL_LIMIT) {
        v = v.slice(0, CELL_LIMIT);
        ta.value = v;
        if (window.JB && JB.toast) JB.toast('Nota limitada a 50 mil caracteres');
      }
      onChange(v);
    }
    function schedule() {
      paintPreview();
      if (!onChange) return;
      if (timer) clearTimeout(timer);
      timer = setTimeout(emit, delay);
    }
    function applySpec(spec) {
      var next = wrapSelection(ta.value, ta.selectionStart, ta.selectionEnd, spec);
      ta.value = next.value;
      ta.focus();
      try { ta.setSelectionRange(next.start, next.end); } catch (_) {}
      schedule();
    }

    ta.addEventListener('input', schedule);
    paintPreview();

    return {
      getValue: function () { return ta.value; },
      setValue: function (v) {
        ta.value = String(v == null ? '' : v);
        paintPreview();
      },
      destroy: function () {
        if (destroyed) return;
        destroyed = true;
        if (timer) { clearTimeout(timer); timer = null; emit(); }
        if (root.parentNode) root.parentNode.removeChild(root);
        host.innerHTML = '';
      },
      focus: function () { ta.focus(); }
    };
  }

  var api = {
    CELL_LIMIT: CELL_LIMIT,
    esc: esc,
    mdToHtml: mdToHtml,
    wrapSelection: wrapSelection,
    mount: mount
  };

  if (typeof window !== 'undefined') {
    window.JB_EDITOR = api;
    if (window.JB) window.JB.editor = api;
  } else if (typeof globalThis !== 'undefined') {
    globalThis.JB_EDITOR = api;
  }
})();
