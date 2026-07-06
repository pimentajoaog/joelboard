/* Joelboard Mini — allowed-site helpers (shared key across Mini extensions). © 2026 Joel Soluções LTDA. */
var JB_SITES = window.JB_SITES || (function () {
  var STORAGE_KEY = 'jb_mini_sites';
  var DEFAULT_SITES = [
    'joelboard.vercel.app',
    'docs.google.com',
    'sheets.google.com',
    'mail.google.com',
    'github.com',
    'notion.so',
    'localhost'
  ];

  function normalizeHost(raw) {
    var h = String(raw || '').trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, '').replace(/^www\./, '');
    if (!h || /\s/.test(h) || h.indexOf('/') > -1) return '';
    return h;
  }

  function patternForHost(host) {
    if (host === 'localhost') return ['http://localhost/*', 'http://127.0.0.1/*'];
    return ['https://' + host + '/*', 'https://*.' + host + '/*'];
  }

  function matchingSite(url, sites) {
    var host = urlToHost(url);
    if (!host) return '';
    for (var i = 0; i < (sites || []).length; i++) {
      var site = sites[i];
      if (site === 'localhost' && (host === 'localhost' || host === '127.0.0.1')) return site;
      if (host === site || host.slice(-(site.length + 1)) === '.' + site) return site;
    }
    return '';
  }

  function tabOriginPatterns(url) {
    try { return [new URL(url).origin + '/*']; } catch (_) { return []; }
  }

  function originPatterns(sites) {
    var out = [];
    (sites || []).forEach(function (host) {
      patternForHost(host).forEach(function (p) {
        if (out.indexOf(p) < 0) out.push(p);
      });
    });
    return out;
  }

  function urlToHost(url) {
    try { return new URL(url).hostname.replace(/^www\./, '').toLowerCase(); } catch (_) { return ''; }
  }

  function hostAllowed(url, sites) {
    var host = urlToHost(url);
    if (!host) return false;
    return (sites || []).some(function (site) {
      if (site === 'localhost') return host === 'localhost' || host === '127.0.0.1';
      return host === site || host.slice(-(site.length + 1)) === '.' + site;
    });
  }

  function isInjectableUrl(url) {
    return !!(url && !/^(chrome|chrome-extension|edge|devtools|about|file):/.test(url));
  }

  function loadSites(cb) {
    chrome.storage.local.get([STORAGE_KEY], function (res) {
      var sites = res[STORAGE_KEY];
      if (!Array.isArray(sites) || !sites.length) sites = DEFAULT_SITES.slice();
      cb(sites.map(normalizeHost).filter(Boolean));
    });
  }

  function saveSites(sites, cb) {
    var clean = [];
    (sites || []).forEach(function (s) {
      var h = normalizeHost(s);
      if (h && clean.indexOf(h) < 0) clean.push(h);
    });
    if (!clean.length) clean = DEFAULT_SITES.slice();
    var patch = {};
    patch[STORAGE_KEY] = clean;
    chrome.storage.local.set(patch, cb || function () {});
  }

  function checkPermissions(url, cb) {
    loadSites(function (sites) {
      if (!hostAllowed(url, sites)) {
        if (cb) cb({ ok: false, reason: 'not-allowed', sites: sites });
        return;
      }
      var tabPatterns = tabOriginPatterns(url);
      if (!tabPatterns.length) {
        if (cb) cb({ ok: false, reason: 'unsupported', sites: sites });
        return;
      }
      chrome.permissions.contains({ origins: tabPatterns }, function (has) {
        if (cb) cb({ ok: !!has, reason: has ? null : 'needs-permission', sites: sites });
      });
    });
  }

  function addSite(host, cb) {
    var h = normalizeHost(host);
    if (!h) {
      if (cb) cb({ ok: false, error: 'invalid' });
      return;
    }
    loadSites(function (sites) {
      if (sites.indexOf(h) >= 0) {
        if (cb) cb({ ok: true, sites: sites });
        return;
      }
      var next = sites.concat([h]);
      saveSites(next, function () {
        if (cb) cb({ ok: true, sites: next });
      });
    });
  }

  function removeSite(host, cb) {
    var h = normalizeHost(host);
    loadSites(function (sites) {
      var next = sites.filter(function (s) { return s !== h; });
      if (!next.length) next = DEFAULT_SITES.slice();
      saveSites(next, function () {
        if (cb) cb({ ok: true, sites: next });
      });
    });
  }

  return {
    STORAGE_KEY: STORAGE_KEY,
    DEFAULT_SITES: DEFAULT_SITES,
    normalizeHost: normalizeHost,
    matchingSite: matchingSite,
    tabOriginPatterns: tabOriginPatterns,
    originPatterns: originPatterns,
    patternForHost: patternForHost,
    urlToHost: urlToHost,
    hostAllowed: hostAllowed,
    isInjectableUrl: isInjectableUrl,
    loadSites: loadSites,
    saveSites: saveSites,
    checkPermissions: checkPermissions,
    ensurePermissions: checkPermissions,
    addSite: addSite,
    removeSite: removeSite
  };
})();
window.JB_SITES = JB_SITES;
