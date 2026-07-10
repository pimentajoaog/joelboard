/* Joelboard Replace — popup logic. © 2026 Joel Soluções LTDA. */
var DATA = null;
var editingId = null;
var pendingImport = null;

function $(id) { return document.getElementById(id); }

function toast(msg) {
  var t = $('toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(t._t);
  t._t = setTimeout(function () { t.classList.remove('show'); }, 2200);
}

function esc(s) {
  return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function persist() {
  return JB_REPLACE.save(DATA);
}

function switchTab(name) {
  document.querySelectorAll('.tab').forEach(function (b) {
    b.classList.toggle('on', b.getAttribute('data-tab') === name);
  });
  document.querySelectorAll('.pane').forEach(function (p) {
    p.classList.toggle('on', p.id === 'pane-' + name);
  });
}

function renderSnippets() {
  var q = ($('search').value || '').trim().toLowerCase();
  var list = (DATA.snippets || []).slice();
  if (q) {
    list = list.filter(function (s) {
      return (s.label || '').toLowerCase().indexOf(q) > -1
        || (s.trigger || '').toLowerCase().indexOf(q) > -1
        || (s.body || '').toLowerCase().indexOf(q) > -1;
    });
  }
  var el = $('snippetList');
  if (!list.length) { el.innerHTML = q ? '<div class="hint" style="text-align:center;padding:20px">Nada encontrado.</div>' : ''; return; }
  el.innerHTML = list.map(function (s) {
    var prev = (s.body || '').replace(/\n/g, ' ').slice(0, 72);
    return '<div class="card' + (s.enabled === false ? ' off' : '') + '" data-id="' + s.id + '">'
      + '<div class="card-top"><div class="card-name">' + esc(s.label || '(sem nome)') + '</div>'
      + '<span class="card-trig">' + esc(s.trigger) + '</span></div>'
      + '<div class="card-prev">' + esc(prev) + '</div></div>';
  }).join('');
  el.querySelectorAll('.card').forEach(function (card) {
    card.onclick = function () { openEditor(card.getAttribute('data-id')); };
  });
}

function renderVars() {
  if (!DATA.vars) DATA.vars = {};
  var vars = DATA.vars;
  var keys = JB_REPLACE.mergedVarKeys(DATA.snippets, vars);
  var el = $('varList');
  el.innerHTML = keys.map(function (k) {
    return '<div class="var-row" data-key="' + esc(k) + '">'
      + '<input class="field key" value="' + esc(k) + '" data-role="key" readonly>'
      + '<input class="field" value="' + esc(vars[k]) + '" data-role="val" placeholder="valor">'
      + '<button class="icon-btn" data-del title="Remover">✕</button></div>';
  }).join('');
  el.querySelectorAll('.var-row').forEach(function (row) {
    row.querySelector('[data-role="val"]').onchange = function () {
      var key = row.getAttribute('data-key');
      DATA.vars[key] = this.value;
      persist();
    };
    row.querySelector('[data-del]').onclick = function () {
      delete DATA.vars[row.getAttribute('data-key')];
      persist().then(renderVars);
    };
  });
}

function renderSettings() {
  var s = DATA.settings || {};
  $('optSpace').checked = s.expandOnSpace !== false;
  $('optTab').checked = s.expandOnTab !== false;
  $('optEnter').checked = !!s.expandOnEnter;
  $('optType').checked = !!s.expandOnType;
  $('optCase').checked = !!s.caseSensitive;
}

function openEditor(id) {
  editingId = id || null;
  var s = id ? (DATA.snippets || []).find(function (x) { return x.id === id; }) : null;
  $('edTitle').textContent = s ? 'Editar template' : 'Novo template';
  $('edLabel').value = s ? (s.label || '') : '';
  $('edTrigger').value = s ? (s.trigger || '') : '';
  $('edBody').value = s ? (s.body || '') : '';
  $('edEnabled').checked = s ? s.enabled !== false : true;
  $('edDelete').style.display = s ? '' : 'none';
  $('editor').classList.add('open');
}

function closeEditor() {
  $('editor').classList.remove('open');
  editingId = null;
}

function saveEditor() {
  var label = ($('edLabel').value || '').trim();
  var trigger = ($('edTrigger').value || '').trim();
  var body = $('edBody').value || '';
  if (!trigger) { toast('Gatilho obrigatório'); return; }
  if (!body.trim()) { toast('Texto expandido obrigatório'); return; }
  var dup = (DATA.snippets || []).find(function (s) {
    return s.trigger === trigger && s.id !== editingId;
  });
  if (dup) { toast('Gatilho já em uso'); return; }
  if (editingId) {
    var ex = DATA.snippets.find(function (s) { return s.id === editingId; });
    if (ex) {
      ex.label = label || trigger;
      ex.trigger = trigger;
      ex.body = body;
      ex.enabled = $('edEnabled').checked;
    }
  } else {
    DATA.snippets.unshift({
      id: JB_REPLACE.uuid(),
      label: label || trigger,
      trigger: trigger,
      body: body,
      enabled: $('edEnabled').checked
    });
  }
  persist().then(function () {
    closeEditor();
    renderSnippets();
    renderVars();
    toast('✓ Salvo');
  });
}

function deleteEditor() {
  if (!editingId) return;
  DATA.snippets = (DATA.snippets || []).filter(function (s) { return s.id !== editingId; });
  persist().then(function () {
    closeEditor();
    renderSnippets();
    toast('✓ Excluído');
  });
}

function addVar() {
  var key = ($('newVarKey').value || '').trim().replace(/\s+/g, '_');
  var val = $('newVarVal').value || '';
  if (!key) { toast('Nome da variável obrigatório'); return; }
  if (!DATA.vars) DATA.vars = {};
  if (DATA.vars[key] != null) { toast('Variável já existe'); return; }
  DATA.vars[key] = val;
  $('newVarKey').value = '';
  $('newVarVal').value = '';
  persist().then(renderVars);
}

function wrapEdSelection(before, after, placeholder) {
  var ta = $('edBody');
  var start = ta.selectionStart;
  var end = ta.selectionEnd;
  var val = ta.value;
  var sel = val.slice(start, end);
  var inner = sel || placeholder || 'texto';
  var insert = before + inner + after;
  ta.value = val.slice(0, start) + insert + val.slice(end);
  var cStart = start + before.length;
  var cEnd = cStart + inner.length;
  ta.focus();
  ta.setSelectionRange(cStart, cEnd);
}

function prefixEdLines(prefix) {
  var ta = $('edBody');
  var start = ta.selectionStart;
  var end = ta.selectionEnd;
  var val = ta.value;
  var lineStart = val.lastIndexOf('\n', start - 1) + 1;
  var lineEnd = val.indexOf('\n', end);
  if (lineEnd < 0) lineEnd = val.length;
  var block = val.slice(lineStart, lineEnd);
  var lines = block.split('\n');
  var prefixed = lines.map(function (line) {
    if (!line.trim()) return line;
    if (/^[-*•]\s/.test(line)) return line;
    return prefix + line;
  }).join('\n');
  ta.value = val.slice(0, lineStart) + prefixed + val.slice(lineEnd);
  ta.focus();
  ta.setSelectionRange(lineStart, lineStart + prefixed.length);
}

function bindFmtToolbar() {
  var bar = $('edFmt');
  if (!bar) return;
  bar.addEventListener('click', function (e) {
    var btn = e.target.closest('[data-wrap], [data-fmt]');
    if (!btn) return;
    e.preventDefault();
    if (btn.getAttribute('data-fmt') === 'bullet') {
      prefixEdLines('- ');
      return;
    }
    var wrap = btn.getAttribute('data-wrap');
    if (wrap) wrapEdSelection(wrap, wrap, 'texto');
  });
  $('edBody').addEventListener('keydown', function (e) {
    if (!(e.ctrlKey || e.metaKey)) return;
    if (e.key.toLowerCase() === 'b') {
      e.preventDefault();
      wrapEdSelection('**', '**', 'texto');
    } else if (e.key.toLowerCase() === 'i') {
      e.preventDefault();
      wrapEdSelection('*', '*', 'texto');
    }
  });
}

function bindSettings() {
  function upd() {
    DATA.settings = {
      expandOnSpace: $('optSpace').checked,
      expandOnTab: $('optTab').checked,
      expandOnEnter: $('optEnter').checked,
      expandOnType: $('optType').checked,
      caseSensitive: $('optCase').checked
    };
    persist();
  }
  ['optSpace', 'optTab', 'optEnter', 'optType', 'optCase'].forEach(function (id) {
    $(id).onchange = upd;
  });
}

function exportCsv() {
  var blob = new Blob([JB_REPLACE.exportCsv(DATA)], { type: 'text/csv;charset=utf-8' });
  var url = URL.createObjectURL(blob);
  var a = document.createElement('a');
  a.href = url;
  a.download = 'joelboard-replace-' + new Date().toISOString().slice(0, 10) + '.csv';
  a.click();
  URL.revokeObjectURL(url);
  toast('✓ CSV exportado');
}

function exportJson() {
  var blob = new Blob([JB_REPLACE.exportJson(DATA)], { type: 'application/json' });
  var url = URL.createObjectURL(blob);
  var a = document.createElement('a');
  a.href = url;
  a.download = 'joelboard-replace-' + new Date().toISOString().slice(0, 10) + '.json';
  a.click();
  URL.revokeObjectURL(url);
  toast('✓ Backup exportado');
}

function importData(file) {
  var reader = new FileReader();
  reader.onload = function () {
    try {
      pendingImport = JB_REPLACE.importFile(reader.result, file.name);
      var n = pendingImport.snippets.length;
      if (pendingImport.mode === 'merge') {
        $('confirmTitle').textContent = 'Importar planilha?';
        $('confirmMsg').textContent = n + ' template' + (n === 1 ? '' : 's') + ' encontrado' + (n === 1 ? '' : 's') + '. Novos serão adicionados; gatilhos iguais serão atualizados.';
      } else {
        $('confirmTitle').textContent = 'Importar templates?';
        $('confirmMsg').textContent = 'Isso substitui todos os ' + (DATA.snippets || []).length + ' templates atuais pelos ' + n + ' do arquivo JSON.';
      }
      $('confirmOv').classList.add('open');
    } catch (e) {
      toast('Erro: ' + (e.message || 'arquivo inválido'));
    }
  };
  reader.readAsText(file);
}

function applyImport() {
  if (!pendingImport) return;
  if (pendingImport.mode === 'merge') {
    DATA.snippets = JB_REPLACE.mergeSnippets(DATA.snippets, pendingImport.snippets);
  } else {
    DATA.snippets = pendingImport.snippets;
    DATA.vars = Object.assign({}, pendingImport.vars);
    if (pendingImport.settings) DATA.settings = pendingImport.settings;
  }
  pendingImport = null;
  $('confirmOv').classList.remove('open');
  persist().then(function () {
    renderSnippets();
    renderVars();
    renderSettings();
    toast('✓ Importado');
  });
}

document.querySelectorAll('.tab').forEach(function (b) {
  b.onclick = function () { switchTab(b.getAttribute('data-tab')); };
});

$('search').oninput = renderSnippets;
$('btnAdd').onclick = function () { openEditor(null); };
$('btnNew').onclick = function () { openEditor(null); };
$('edClose').onclick = closeEditor;
$('edSave').onclick = saveEditor;
$('edDelete').onclick = deleteEditor;
$('btnAddVar').onclick = addVar;
$('newVarKey').onkeydown = $('newVarVal').onkeydown = function (e) {
  if (e.key === 'Enter') addVar();
};
$('btnExportCsv').onclick = exportCsv;
$('btnExportJson').onclick = exportJson;
$('btnImport').onclick = function () { $('importFile').click(); };
$('importFile').onchange = function () {
  if (this.files && this.files[0]) importData(this.files[0]);
  this.value = '';
};
$('confirmNo').onclick = function () { pendingImport = null; $('confirmOv').classList.remove('open'); };
$('confirmYes').onclick = applyImport;
$('confirmOv').onclick = function (e) { if (e.target === $('confirmOv')) { pendingImport = null; $('confirmOv').classList.remove('open'); } };
$('editor').onclick = function (e) { if (e.target === $('editor')) closeEditor(); };

JB_REPLACE.load().then(function (d) {
  DATA = d;
  renderSnippets();
  renderVars();
  renderSettings();
  bindSettings();
  bindFmtToolbar();
  initSitesUI();
});

function initSitesUI() {
  var sitesList = $('sitesList');
  var siteInput = $('siteInput');
  var btnAddSite = $('btnAddSite');
  if (!sitesList || !siteInput || !btnAddSite) return;

  async function ensureHostPermission(host) {
    host = JB_SITES.normalizeHost(host);
    if (!host) return false;
    var patterns = JB_SITES.patternForHost(host);
    return new Promise(function (resolve) {
      chrome.permissions.contains({ origins: patterns }, function (has) {
        if (has) { resolve(true); return; }
        chrome.permissions.request({ origins: patterns }, resolve);
      });
    });
  }

  function renderSites(sites) {
    sitesList.innerHTML = (sites || []).map(function (host) {
      return '<div class="site-chip"><span>' + esc(host) + '</span>'
        + '<button type="button" class="site-rm" data-host="' + esc(host) + '" title="Remover">✕</button></div>';
    }).join('');
    sitesList.querySelectorAll('.site-rm').forEach(function (btn) {
      btn.onclick = function () {
        chrome.runtime.sendMessage({ type: 'removeSite', host: btn.getAttribute('data-host') }, function (res) {
          if (res && res.sites) renderSites(res.sites);
        });
      };
    });
  }

  chrome.runtime.sendMessage({ type: 'getSites' }, function (sites) {
    renderSites(sites || JB_SITES.DEFAULT_SITES);
  });

  btnAddSite.onclick = async function () {
    var host = JB_SITES.normalizeHost(siteInput.value.trim());
    if (!host) {
      toast('Site inválido.');
      return;
    }
    chrome.runtime.sendMessage({ type: 'addSite', host: host }, async function (res) {
      if (!res || !res.ok) {
        toast('Não foi possível salvar o site.');
        return;
      }
      siteInput.value = '';
      renderSites(res.sites);
      await ensureHostPermission(host);
      toast('Site adicionado.');
    });
  };

  siteInput.onkeydown = function (e) {
    if (e.key === 'Enter') btnAddSite.click();
  };
}
