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

  function findSnippet(snippets, textBefore, caseSensitive) {
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
      if (start > 0) {
        var prev = hay.charAt(start - 1);
        if (prev !== ' ' && prev !== '\n' && prev !== '\t' && prev !== '\r') continue;
      }
      return list[i];
    }
    return null;
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

  function importJson(text) {
    var obj = JSON.parse(text);
    if (!obj || !Array.isArray(obj.snippets)) throw new Error('Arquivo inválido — falta a lista de templates.');
    obj.snippets.forEach(function (s) {
      if (!s.id) s.id = uuid();
      if (s.enabled == null) s.enabled = true;
    });
    return {
      snippets: obj.snippets,
      vars: obj.vars || {},
      settings: Object.assign(defaultData().settings, obj.settings || {})
    };
  }

  return {
    STORAGE_KEY: STORAGE_KEY,
    BUILTIN: BUILTIN,
    uuid: uuid,
    defaultData: defaultData,
    load: load,
    save: save,
    findSnippet: findSnippet,
    expandVars: expandVars,
    missingVars: missingVars,
    exportJson: exportJson,
    importJson: importJson
  };
})();
