/** Account prefs merge helpers (themes, tours, profile) — pure, testable. */

export const PREFS_APPS = ['hub', 'finance', 'notas', 'planner', 'fit', 'study', 'prateleira'];
export const PREFS_TOURS = ['hub', 'finance', 'notas', 'planner', 'fit', 'study', 'julioel'];

export function emptyPrefsBlob() {
  return { v: 1, updatedAt: 0, profile: null, skins: {}, modes: {}, tours: {} };
}

export function normalizePrefsBlob(raw) {
  var p = raw && typeof raw === 'object' ? raw : {};
  return {
    v: 1,
    updatedAt: Number(p.updatedAt) || 0,
    profile: p.profile && typeof p.profile === 'object' ? {
      nome: String(p.profile.nome || '').trim(),
      icone: String(p.profile.icone || '').trim() || '👤',
      at: Number(p.profile.at) || 0
    } : null,
    skins: p.skins && typeof p.skins === 'object' ? Object.assign({}, p.skins) : {},
    modes: p.modes && typeof p.modes === 'object' ? Object.assign({}, p.modes) : {},
    tours: p.tours && typeof p.tours === 'object' ? Object.assign({}, p.tours) : {}
  };
}

/**
 * localSnap:
 *   skins: { app: string|null }  null = key missing
 *   modes: { app: string|null }
 *   tours: { app: boolean }      true = already done locally
 *   profile: { nome, icone, at } | null
 *
 * Returns patch to apply locally (only fields that should be written).
 */
export function planPrefsMerge(localSnap, remoteRaw) {
  var remote = normalizePrefsBlob(remoteRaw);
  var local = localSnap || { skins: {}, modes: {}, tours: {}, profile: null };
  var patch = { skins: {}, modes: {}, tours: {}, profile: null, changed: false };

  PREFS_APPS.forEach(function (app) {
    if (local.skins[app] == null && remote.skins[app]) {
      patch.skins[app] = String(remote.skins[app]);
      patch.changed = true;
    }
    if (local.modes[app] == null && remote.modes[app]) {
      patch.modes[app] = remote.modes[app] === 'light' ? 'light' : 'dark';
      patch.changed = true;
    }
  });

  PREFS_TOURS.forEach(function (app) {
    if (!local.tours[app] && remote.tours[app]) {
      patch.tours[app] = true;
      patch.changed = true;
    }
  });

  var rp = remote.profile;
  var lp = local.profile;
  if (rp && rp.nome) {
    if (!lp || !lp.nome) {
      patch.profile = { nome: rp.nome, icone: rp.icone || '👤', at: rp.at || 0 };
      patch.changed = true;
    } else if ((rp.at || 0) > (lp.at || 0)) {
      patch.profile = { nome: rp.nome, icone: rp.icone || '👤', at: rp.at || 0 };
      patch.changed = true;
    }
  }

  return patch;
}

/** Build Drive blob from a full local snapshot (all keys present as current values). */
export function buildPrefsBlob(localSnap) {
  var snap = localSnap || {};
  var skins = {};
  var modes = {};
  var tours = {};
  PREFS_APPS.forEach(function (app) {
    var s = snap.skins && snap.skins[app];
    skins[app] = s || 'default';
    var m = snap.modes && snap.modes[app];
    if (m === 'light' || m === 'dark') modes[app] = m;
  });
  PREFS_TOURS.forEach(function (app) {
    if (snap.tours && snap.tours[app]) tours[app] = 1;
  });
  var prof = null;
  if (snap.profile && snap.profile.nome) {
    prof = {
      nome: String(snap.profile.nome).trim(),
      icone: String(snap.profile.icone || '').trim() || '👤',
      at: Number(snap.profile.at) || Date.now()
    };
  }
  return {
    v: 1,
    updatedAt: Date.now(),
    profile: prof,
    skins: skins,
    modes: modes,
    tours: tours
  };
}
