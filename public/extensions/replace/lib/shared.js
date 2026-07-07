/* Joelboard Replace — shared helpers. © 2026 Joel Soluções LTDA. */
var JB_REPLACE = (function () {
  var STORAGE_KEY = 'jb_replace_data';
  var LEGACY_KEY = 'jb_refresh_data';
  var EXPORT_VERSION = 1;

  var BUILTIN = {
    date: function () {
      var d = new Date();
      return pad(d.getDate()) + '/' + pad(d.getMonth() + 1) + '/' + d.getFullYear();
    },
    time: function () {
      var d = new Date();
      return pad(d.getHours()) + ':' + pad(d.getMinutes());
    },
    datetime: function () {
      return BUILTIN.date() + ' ' + BUILTIN.time();
    },
    ano: function () { return String(new Date().getFullYear()); },
    clipboard: null
  };

  function pad(n) { return (n < 10 ? '0' : '') + n; }

  function uuid() {
    return 'xxxxxxxxxxxx4xxxyxxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
      var r = Math.random() * 16 | 0;
      return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
    });
  }

  function defaultData() {
    return {
      snippets: [
        {
          id: uuid(),
          label: 'Saudação rápida',
          trigger: '//oi',
          body: 'Olá {{nome}},\n\nEspero que esteja bem!\n\nAbraços,\n{{nome}}',
          enabled: true
        },
        {
          id: uuid(),
          label: 'Assinatura',
          trigger: ';sig',
          body: '—\n{{nome}}\n{{empresa}}\n{{date}}',
          enabled: true
        }
      ],
      vars: { nome: '', empresa: 'Joel Soluções LTDA' },
      settings: {
        expandOnSpace: true,
        expandOnTab: true,
        expandOnEnter: false,
        caseSensitive: false
      }
    };
  }

  function load() {
    return new Promise(function (resolve) {
      chrome.storage.local.get([STORAGE_KEY, LEGACY_KEY], function (res) {
        var data = res[STORAGE_KEY] || res[LEGACY_KEY];
        if (!data || !data.snippets) {
          data = defaultData();
          var patch = {};
          patch[STORAGE_KEY] = data;
          chrome.storage.local.set(patch, function () { resolve(data); });
          return;
        }
        if (!data.vars) data.vars = {};
        if (!data.settings) data.settings = defaultData().settings;
        if (!res[STORAGE_KEY] && res[LEGACY_KEY]) {
          var migrate = {};
          migrate[STORAGE_KEY] = data;
          chrome.storage.local.set(migrate);
        }
        resolve(data);
      });
    });
  }

  function save(data) {
    return new Promise(function (resolve) {
      var patch = {};
      patch[STORAGE_KEY] = data;
      chrome.storage.local.set(patch, resolve);
    });
  }

  /** Match trigger ending at cursor — no word-boundary requirement (e.g. /test in test/test). */
  function findSnippetMatch(snippets, textBefore, caseSensitive) {
    var list = (snippets || []).filter(function (s) { return s.enabled !== false; });
    list.sort(function (a, b) { return (b.trigger || '').length - (a.trigger || '').length; });
    var hay = caseSensitive ? textBefore : textBefore.toLowerCase();
    for (var i = 0; i < list.length; i++) {
      var trig = list[i].trigger || '';
      if (!trig) continue;
      var needle = caseSensitive ? trig : trig.toLowerCase();
      if (hay.length < needle.length) continue;
      if (hay.slice(-needle.length) !== needle) continue;
      var start = hay.length - needle.length;
      return { snippet: list[i], start: start, end: hay.length };
    }
    return null;
  }

  function findSnippet(snippets, textBefore, caseSensitive) {
    var match = findSnippetMatch(snippets, textBefore, caseSensitive);
    return match ? match.snippet : null;
  }

  function expandVars(body, vars, builtins) {
    builtins = builtins || {};
    return String(body || '').replace(/\{\{([a-zA-Z0-9_]+)\}\}/g, function (_, key) {
      var k = key.toLowerCase();
      if (builtins[k] != null && builtins[k] !== '') return String(builtins[k]);
      if (vars && vars[key] != null && vars[key] !== '') return String(vars[key]);
      if (vars && vars[k] != null && vars[k] !== '') return String(vars[k]);
      return '{{' + key + '}}';
    });
  }

  function needsClipboard(body) {
    return /\{\{clipboard\}\}/i.test(body) || /%clip%/i.test(body);
  }

  function applyClipboard(body, clip) {
    var c = clip == null ? '' : String(clip);
    return String(body || '').replace(/\{\{clipboard\}\}/gi, c).replace(/%clip%/gi, c);
  }

  var BUILTIN_NAMES = { date: 1, time: 1, datetime: 1, ano: 1, clipboard: 1 };

  function isUserVar(key) {
    return !BUILTIN_NAMES[String(key || '').toLowerCase()];
  }

  function collectVarKeys(snippets) {
    var keys = {};
    var re = /\{\{([a-zA-Z0-9_]+)\}\}/g;
    (snippets || []).forEach(function (s) {
      var m;
      while ((m = re.exec(String(s.body || '')))) {
        if (isUserVar(m[1])) keys[m[1]] = true;
      }
    });
    return Object.keys(keys).sort(function (a, b) {
      return a.toLowerCase().localeCompare(b.toLowerCase());
    });
  }

  function mergedVarKeys(snippets, vars) {
    var map = {};
    collectVarKeys(snippets).forEach(function (k) { map[k] = true; });
    Object.keys(vars || {}).forEach(function (k) { map[k] = true; });
    return Object.keys(map).sort(function (a, b) {
      return a.toLowerCase().localeCompare(b.toLowerCase());
    });
  }

  function missingVars(body, vars, builtins) {
    builtins = builtins || {};
    var missing = [];
    var re = /\{\{([a-zA-Z0-9_]+)\}\}/g;
    var m;
    while ((m = re.exec(body))) {
      var key = m[1];
      var k = key.toLowerCase();
      if (BUILTIN[k] && k !== 'clipboard') continue;
      if (builtins[k]) continue;
      if (vars && (vars[key] || vars[k])) continue;
      if (missing.indexOf(key) < 0) missing.push(key);
    }
    return missing;
  }

  function exportJson(data) {
    return JSON.stringify({
      version: EXPORT_VERSION,
      app: 'Joelboard Replace',
      exportedAt: new Date().toISOString(),
      snippets: data.snippets,
      vars: data.vars,
      settings: data.settings
    }, null, 2);
  }

  function csvCell(v) {
    v = v == null ? '' : String(v);
    if (/[",\n\r]/.test(v)) return '"' + v.replace(/"/g, '""') + '"';
    return v;
  }

  /** Planilha: Nome, Trigger, Text — compatível com importação. */
  function exportCsv(data) {
    var lines = ['Nome,Trigger,Text'];
    (data.snippets || []).forEach(function (s) {
      lines.push([
        csvCell(s.label || s.trigger || ''),
        csvCell(s.trigger || ''),
        csvCell(s.body || '')
      ].join(','));
    });
    return '\uFEFF' + lines.join('\r\n');
  }

  function importJson(text) {
    var obj = JSON.parse(text);
    if (!obj || !Array.isArray(obj.snippets)) throw new Error('Arquivo inválido — falta a lista de templates.');
    obj.snippets.forEach(function (s) {
      if (!s.id) s.id = uuid();
      if (s.enabled == null) s.enabled = true;
    });
    return {
      mode: 'replace',
      snippets: obj.snippets,
      vars: obj.vars || {},
      settings: Object.assign(defaultData().settings, obj.settings || {})
    };
  }

  function stripBom(text) {
    return String(text || '').replace(/^\uFEFF/, '');
  }

  /** Parse CSV/TSV (quoted cells, commas or tabs). */
  function parseDelimited(text, delim) {
    text = stripBom(text);
    var rows = [];
    var row = [];
    var cell = '';
    var i = 0;
    var inQuotes = false;
    while (i < text.length) {
      var c = text[i];
      if (inQuotes) {
        if (c === '"') {
          if (text[i + 1] === '"') { cell += '"'; i += 2; continue; }
          inQuotes = false; i++; continue;
        }
        cell += c; i++; continue;
      }
      if (c === '"') { inQuotes = true; i++; continue; }
      if (c === delim) { row.push(cell); cell = ''; i++; continue; }
      if (c === '\r') { i++; continue; }
      if (c === '\n') { row.push(cell); rows.push(row); row = []; cell = ''; i++; continue; }
      cell += c; i++;
    }
    row.push(cell);
    if (row.length > 1 || String(row[0] || '').length) rows.push(row);
    return rows;
  }

  function detectDelim(text) {
    var first = stripBom(text).split(/\r?\n/)[0] || '';
    var tabs = (first.match(/\t/g) || []).length;
    var commas = (first.match(/,/g) || []).length;
    return tabs > commas ? '\t' : ',';
  }

  function isHeaderRow2(row) {
    var a = String(row[0] || '').trim().toLowerCase();
    var b = String(row[1] || '').trim().toLowerCase();
    return (/^(trigger|gatilho|atalho|shortcut)$/.test(a)
      && /^(text|texto|body|conteúdo|conteudo|expansion|mensagem|message)$/.test(b));
  }

  function isHeaderRow3(row) {
    var a = String(row[0] || '').trim().toLowerCase();
    var b = String(row[1] || '').trim().toLowerCase();
    var c = String(row[2] || '').trim().toLowerCase();
    return (/^(nome|name|label|título|titulo)$/.test(a)
      && /^(trigger|gatilho|atalho|shortcut)$/.test(b)
      && /^(text|texto|body|conteúdo|conteudo|expansion|mensagem|message)$/.test(c));
  }

  function detectSheetLayout(rows) {
    if (rows.length && isHeaderRow3(rows[0])) return { cols: 3, start: 1 };
    if (rows.length && isHeaderRow2(rows[0])) return { cols: 2, start: 1 };
    return { cols: 2, start: 0 };
  }

  function labelFromRow(trigger, body) {
    var t = String(body || '').trim();
    if (!t) return trigger;
    var line = t.split('\n')[0].trim();
    if (line.length <= 48) return line || trigger;
    return line.slice(0, 45) + '…';
  }

  function rowsToSnippets(rows) {
    var layout = detectSheetLayout(rows);
    var out = [];
    rows.slice(layout.start).forEach(function (row) {
      var label, trigger, body;
      if (layout.cols === 3) {
        label = String(row[0] || '').trim();
        trigger = String(row[1] || '').trim();
        body = String(row[2] != null ? row[2] : '');
      } else {
        trigger = String(row[0] || '').trim();
        body = String(row[1] != null ? row[1] : '');
        label = labelFromRow(trigger, body);
      }
      if (!trigger && !body.trim()) return;
      if (!trigger) return;
      if (!label) label = labelFromRow(trigger, body);
      out.push({
        id: uuid(),
        label: label,
        trigger: trigger,
        body: body,
        enabled: true
      });
    });
    return out;
  }

  /** Google Sheets: 2 cols (Trigger, Text) or 3 cols (Nome, Trigger, Text). */
  function importSpreadsheet(text) {
    var delim = detectDelim(text);
    var rows = parseDelimited(text, delim);
    if (!rows.length) throw new Error('Planilha vazia.');
    var snippets = rowsToSnippets(rows);
    if (!snippets.length) throw new Error('Nenhum template encontrado — use colunas Trigger + Text, ou Nome + Trigger + Text.');
    return { mode: 'merge', snippets: snippets, vars: {}, settings: null };
  }

  function mergeSnippets(existing, imported) {
    var map = {};
    (existing || []).forEach(function (s) { if (s.trigger) map[s.trigger] = s; });
    (imported || []).forEach(function (s) {
      if (!s.trigger) return;
      if (map[s.trigger]) {
        map[s.trigger].body = s.body;
        map[s.trigger].label = s.label;
        map[s.trigger].enabled = s.enabled !== false;
      } else {
        map[s.trigger] = s;
      }
    });
    return Object.values(map);
  }

  function importFile(text, filename) {
    var name = String(filename || '').toLowerCase();
    var trimmed = stripBom(text).trim();
    if (name.endsWith('.csv') || name.endsWith('.tsv') || name.endsWith('.txt')) {
      return importSpreadsheet(text);
    }
    if (trimmed.charAt(0) === '{') return importJson(text);
    return importSpreadsheet(text);
  }

  return {
    STORAGE_KEY: STORAGE_KEY,
    BUILTIN: BUILTIN,
    uuid: uuid,
    defaultData: defaultData,
    load: load,
    save: save,
    findSnippet: findSnippet,
    findSnippetMatch: findSnippetMatch,
    expandVars: expandVars,
    needsClipboard: needsClipboard,
    applyClipboard: applyClipboard,
    missingVars: missingVars,
    collectVarKeys: collectVarKeys,
    mergedVarKeys: mergedVarKeys,
    exportJson: exportJson,
    exportCsv: exportCsv,
    importJson: importJson,
    importSpreadsheet: importSpreadsheet,
    importFile: importFile,
    mergeSnippets: mergeSnippets
  };
})();
