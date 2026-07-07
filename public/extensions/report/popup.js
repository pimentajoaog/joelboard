/* Joelboard Report — popup logic. © 2026 Joel Soluções LTDA. */
var DATA = null;
var editingId = null;

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
  return new Promise(function (resolve) {
    JB_REPORT.save(DATA, resolve);
  });
}

function switchTab(name) {
  document.querySelectorAll('.tab').forEach(function (b) {
    b.classList.toggle('on', b.getAttribute('data-tab') === name);
  });
  document.querySelectorAll('.pane').forEach(function (p) {
    p.classList.toggle('on', p.id === 'pane-' + name);
  });
}

function updatePreview() {
  $('preview').textContent = JB_REPORT.renderReport(DATA);
}

function renderReportTab() {
  var fields = JB_REPORT.fieldBlocks(DATA.blocks);
  var el = $('fieldForm');
  if (!fields.length) {
    el.innerHTML = '<p class="hint">Nenhum campo numérico. Adicione campos na aba Template.</p>';
    updatePreview();
    return;
  }
  el.innerHTML = fields.map(function (b) {
    return '<div class="field-row" data-id="' + esc(b.id) + '">'
      + '<label for="inp-' + esc(b.id) + '">' + esc(b.label || 'Campo') + '</label>'
      + '<input class="field num" id="inp-' + esc(b.id) + '" type="number" min="0" step="1" inputmode="numeric" value="' + esc(b.value) + '">'
      + '</div>';
  }).join('');
  fields.forEach(function (b) {
    var inp = $('inp-' + b.id);
    if (!inp) return;
    inp.oninput = function () {
      var block = DATA.blocks.find(function (x) { return x.id === b.id; });
      if (block) block.value = inp.value;
      updatePreview();
      persist();
    };
  });
  updatePreview();
}

function renderTemplateTab() {
  var el = $('blockList');
  el.innerHTML = (DATA.blocks || []).map(function (b, idx) {
    var kind = b.kind === 'field' ? 'Campo' : (b.kind === 'text' ? 'Texto' : 'Vazio');
    return '<div class="block-card" data-id="' + esc(b.id) + '">'
      + '<button type="button" class="block-move" data-dir="up" title="Subir"' + (idx === 0 ? ' disabled' : '') + '>▲</button>'
      + '<button type="button" class="block-move" data-dir="down" title="Descer"' + (idx === DATA.blocks.length - 1 ? ' disabled' : '') + '>▼</button>'
      + '<span class="block-kind">' + kind + '</span>'
      + '<span class="block-sum">' + esc(JB_REPORT.blockSummary(b)) + '</span>'
      + '</div>';
  }).join('');
  el.querySelectorAll('.block-card').forEach(function (card) {
    card.onclick = function (e) {
      if (e.target.classList.contains('block-move')) return;
      openEditor(card.getAttribute('data-id'));
    };
    card.querySelectorAll('.block-move').forEach(function (btn) {
      btn.onclick = function (e) {
        e.stopPropagation();
        if (btn.disabled) return;
        moveBlock(card.getAttribute('data-id'), btn.getAttribute('data-dir'));
      };
    });
  });
}

function moveBlock(id, dir) {
  var idx = DATA.blocks.findIndex(function (b) { return b.id === id; });
  if (idx < 0) return;
  var next = dir === 'up' ? idx - 1 : idx + 1;
  if (next < 0 || next >= DATA.blocks.length) return;
  var tmp = DATA.blocks[idx];
  DATA.blocks[idx] = DATA.blocks[next];
  DATA.blocks[next] = tmp;
  persist().then(function () {
    renderTemplateTab();
    renderReportTab();
  });
}

function openEditor(id) {
  editingId = id || null;
  var b = id ? DATA.blocks.find(function (x) { return x.id === id; }) : null;
  var isField = !b || b.kind === 'field';
  $('edTitle').textContent = b ? (b.kind === 'field' ? 'Editar campo' : (b.kind === 'text' ? 'Editar linha' : 'Linha em branco')) : 'Novo campo';
  $('edFieldPane').style.display = isField ? '' : 'none';
  $('edTextPane').style.display = b && b.kind === 'text' ? '' : 'none';
  $('edDelete').style.display = b ? '' : 'none';
  if (isField) {
    $('edLabel').value = b ? (b.label || '') : '';
    $('edFormat').value = b && b.format === 'prefix' ? 'prefix' : 'suffix';
    $('edPrefix').value = b ? (b.linePrefix || '') : '';
    syncPrefixField();
  } else if (b && b.kind === 'text') {
    $('edText').value = b.text || '';
  }
  $('editor').classList.add('open');
}

function syncPrefixField() {
  var on = $('edFormat').value === 'prefix';
  $('edPrefixWrap').style.display = on ? '' : 'none';
  $('edPrefix').style.display = on ? '' : 'none';
}

function closeEditor() {
  $('editor').classList.remove('open');
  editingId = null;
}

function saveEditor() {
  var b = editingId ? DATA.blocks.find(function (x) { return x.id === editingId; }) : null;
  if (!b || b.kind === 'field') {
    var label = ($('edLabel').value || '').trim();
    if (!label) { toast('Rótulo obrigatório'); return; }
    var format = $('edFormat').value === 'prefix' ? 'prefix' : 'suffix';
    var linePrefix = format === 'prefix' ? ($('edPrefix').value || '') : '';
    if (b) {
      b.label = label;
      b.format = format;
      b.linePrefix = linePrefix;
    } else {
      DATA.blocks.push({
        kind: 'field', id: JB_REPORT.newId(), label: label, format: format, linePrefix: linePrefix, value: ''
      });
    }
  } else if (b.kind === 'text') {
    b.text = ($('edText').value || '').trim();
  }
  persist().then(function () {
    closeEditor();
    renderTemplateTab();
    renderReportTab();
    toast('Salvo');
  });
}

function deleteBlock() {
  if (!editingId) return;
  DATA.blocks = DATA.blocks.filter(function (b) { return b.id !== editingId; });
  persist().then(function () {
    closeEditor();
    renderTemplateTab();
    renderReportTab();
    toast('Removido');
  });
}

function addBlock(kind) {
  if (kind === 'field') {
    editingId = null;
    openEditor(null);
    return;
  }
  if (kind === 'text') {
    DATA.blocks.push({ kind: 'text', id: JB_REPORT.newId(), text: 'Nova linha' });
  } else {
    DATA.blocks.push({ kind: 'blank', id: JB_REPORT.newId() });
  }
  persist().then(function () {
    renderTemplateTab();
    renderReportTab();
    if (kind === 'text') openEditor(DATA.blocks[DATA.blocks.length - 1].id);
  });
}

function copyReport() {
  var text = JB_REPORT.renderReport(DATA);
  navigator.clipboard.writeText(text).then(function () {
    toast('✓ Copiado — cole no Slack');
  }).catch(function () {
    toast('Erro ao copiar');
  });
}

document.querySelectorAll('.tab').forEach(function (btn) {
  btn.onclick = function () { switchTab(btn.getAttribute('data-tab')); };
});

$('btnCopy').onclick = copyReport;
$('btnAddField').onclick = function () { addBlock('field'); };
$('btnAddText').onclick = function () { addBlock('text'); };
$('btnAddBlank').onclick = function () { addBlock('blank'); };
$('edClose').onclick = closeEditor;
$('edSave').onclick = saveEditor;
$('edDelete').onclick = deleteBlock;
$('edFormat').onchange = syncPrefixField;
$('editor').onclick = function (e) { if (e.target === $('editor')) closeEditor(); };

JB_REPORT.load(function (data) {
  DATA = data;
  renderReportTab();
  renderTemplateTab();
});
