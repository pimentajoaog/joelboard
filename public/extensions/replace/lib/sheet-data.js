/* Joelboard Replace — sheet serialize/deserialize. © 2026 Joel Soluções LTDA. */
var JB_REPLACE_SHEET = (function () {
  var SETTING_KEYS = ['expandOnSpace', 'expandOnTab', 'expandOnEnter', 'expandOnType', 'caseSensitive'];

  function body(rows) {
    return (rows || []).slice(1);
  }

  function rowsFromData(data) {
    data = data || {};
    var snippets = (data.snippets || []).map(function (s) {
      return [
        s.label || '',
        s.trigger || '',
        s.body || '',
        s.enabled !== false ? '1' : '0',
        s.id || JB_REPLACE.uuid()
      ];
    });
    var vars = [];
    Object.keys(data.vars || {}).sort().forEach(function (k) {
      vars.push([k, data.vars[k] == null ? '' : String(data.vars[k])]);
    });
    var settings = [];
    var s = data.settings || {};
    SETTING_KEYS.forEach(function (k) {
      if (s[k] != null) settings.push([k, s[k] ? '1' : '0']);
    });
    return { snippets: snippets, vars: vars, settings: settings };
  }

  function dataFromRows(snippetRows, varRows, settingRows) {
    var snippets = body(snippetRows).filter(function (r) { return r && (r[1] || r[2]); }).map(function (r) {
      return {
        id: String(r[4] || JB_REPLACE.uuid()),
        label: String(r[0] || ''),
        trigger: String(r[1] || ''),
        body: String(r[2] != null ? r[2] : ''),
        enabled: String(r[3]) !== '0'
      };
    });
    var vars = {};
    body(varRows).forEach(function (r) {
      if (r && r[0]) vars[String(r[0])] = r[1] == null ? '' : String(r[1]);
    });
    var settings = Object.assign({}, JB_REPLACE.defaultData().settings);
    body(settingRows).forEach(function (r) {
      if (!r || !r[0]) return;
      var k = String(r[0]);
      if (SETTING_KEYS.indexOf(k) > -1) settings[k] = String(r[1]) === '1';
    });
    return { snippets: snippets, vars: vars, settings: settings };
  }

  function mergeRemote(local, remote) {
    local = local || JB_REPLACE.defaultData();
    remote = remote || {};
    var merged = {
      snippets: JB_REPLACE.mergeSnippets(local.snippets || [], remote.snippets || []),
      vars: Object.assign({}, remote.vars || {}, local.vars || {}),
      settings: Object.assign({}, JB_REPLACE.defaultData().settings, remote.settings || {}, local.settings || {})
    };
    return merged;
  }

  function push(data) {
    return JB_SHEETS.ensureSheet().then(function (ctx) {
      var rows = rowsFromData(data);
      return JB_SHEETS.writeTab(ctx.id, JB_SHEETS.TAB_SNIPPETS, rows.snippets)
        .then(function () { return JB_SHEETS.writeTab(ctx.id, JB_SHEETS.TAB_VARS, rows.vars); })
        .then(function () { return JB_SHEETS.writeTab(ctx.id, JB_SHEETS.TAB_SETTINGS, rows.settings); })
        .then(function () { return JB_SHEETS.markSynced(); });
    });
  }

  function pull(merge) {
    return JB_SHEETS.ensureSheet().then(function (ctx) {
      return JB_SHEETS.batchGet(ctx.id, [
        JB_SHEETS.TAB_SNIPPETS,
        JB_SHEETS.TAB_VARS,
        JB_SHEETS.TAB_SETTINGS
      ]).then(function (res) {
        var vrs = res.valueRanges || [];
        var remote = dataFromRows(
          (vrs[0] && vrs[0].values) || [],
          (vrs[1] && vrs[1].values) || [],
          (vrs[2] && vrs[2].values) || []
        );
        if (!merge) return remote;
        return JB_REPLACE.load().then(function (local) {
          return mergeRemote(local, remote);
        });
      });
    });
  }

  function sync(merge) {
    merge = merge !== false;
    return pull(merge).then(function (merged) {
      return JB_REPLACE.save(merged).then(function () {
        return push(merged).then(function () { return merged; });
      });
    });
  }

  return {
    rowsFromData: rowsFromData,
    dataFromRows: dataFromRows,
    mergeRemote: mergeRemote,
    push: push,
    pull: pull,
    sync: sync
  };
})();
