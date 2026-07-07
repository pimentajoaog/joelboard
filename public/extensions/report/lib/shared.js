/* Joelboard Report — shared helpers. © 2026 Joel Soluções LTDA. */
var JB_REPORT = (function () {
  var STORAGE_KEY = 'jb_report_data';

  function newId() {
    return 'f' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
  }

  function defaultData() {
    return {
      blocks: [
        { kind: 'text', id: 't1', text: 'Hourly report:' },
        { kind: 'blank', id: 'b1' },
        { kind: 'field', id: 'f1', label: 'agents on queue', format: 'suffix', value: '' },
        { kind: 'field', id: 'f2', label: 'agents in training', format: 'suffix', value: '' },
        { kind: 'field', id: 'f3', label: 'MTO/VTO', format: 'suffix', value: '' },
        { kind: 'field', id: 'f4', label: 'Meal / Breaks', format: 'suffix', value: '' },
        { kind: 'blank', id: 'b2' },
        { kind: 'text', id: 't2', text: 'Queue:' },
        { kind: 'field', id: 'f5', label: 'Tutor', format: 'prefix', linePrefix: 'Tutor: ', value: '' },
        { kind: 'field', id: 'f6', label: 'PS', format: 'prefix', linePrefix: 'PS: ', value: '' }
      ]
    };
  }

  function normalizeData(raw) {
    var data = raw && Array.isArray(raw.blocks) ? raw : defaultData();
    if (!Array.isArray(data.blocks) || !data.blocks.length) data = defaultData();
    data.blocks = data.blocks.map(function (b) {
      if (b.kind === 'field') {
        return {
          kind: 'field',
          id: b.id || newId(),
          label: String(b.label || ''),
          format: b.format === 'prefix' ? 'prefix' : 'suffix',
          linePrefix: String(b.linePrefix || ''),
          value: String(b.value != null ? b.value : '')
        };
      }
      if (b.kind === 'blank') return { kind: 'blank', id: b.id || newId() };
      return { kind: 'text', id: b.id || newId(), text: String(b.text || '') };
    });
    return data;
  }

  function fieldBlocks(blocks) {
    return (blocks || []).filter(function (b) { return b.kind === 'field'; });
  }

  function isFieldBlank(value) {
    return String(value != null ? value : '').trim() === '';
  }

  function displayValue(value) {
    return String(value != null ? value : '').trim();
  }

  function renderLine(block) {
    if (block.kind === 'field') {
      if (isFieldBlank(block.value)) return null;
      if (block.format === 'prefix') return (block.linePrefix || '') + displayValue(block.value);
      return displayValue(block.value) + (block.label ? ' ' + block.label : '');
    }
    if (block.kind === 'blank') return '';
    if (block.kind === 'text') return block.text || '';
    return null;
  }

  function renderReport(data) {
    return (data.blocks || []).map(renderLine).filter(function (line) { return line !== null; }).join('\n');
  }

  function blockSummary(block) {
    if (block.kind === 'blank') return 'Linha em branco';
    if (block.kind === 'text') return block.text || '(vazio)';
    if (block.format === 'prefix') return (block.linePrefix || block.label || 'Campo') + '{n}';
    return '{n} ' + (block.label || 'campo');
  }

  function load(cb) {
    chrome.storage.local.get([STORAGE_KEY], function (res) {
      cb(normalizeData(res[STORAGE_KEY]));
    });
  }

  function save(data, cb) {
    var patch = {};
    patch[STORAGE_KEY] = normalizeData(data);
    chrome.storage.local.set(patch, cb || function () {});
  }

  return {
    STORAGE_KEY: STORAGE_KEY,
    newId: newId,
    defaultData: defaultData,
    normalizeData: normalizeData,
    fieldBlocks: fieldBlocks,
    isFieldBlank: isFieldBlank,
    displayValue: displayValue,
    renderLine: renderLine,
    renderReport: renderReport,
    blockSummary: blockSummary,
    load: load,
    save: save
  };
})();
