import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  PREFS_APPS, PREFS_TOURS, emptyPrefsBlob, normalizePrefsBlob,
  planPrefsMerge, buildPrefsBlob
} from '../lib/account-prefs.mjs';

describe('account prefs merge', () => {
  it('fills empty local skins modes and tours from remote', () => {
    const local = {
      skins: { hub: null, finance: 'vault' },
      modes: { hub: null, finance: 'dark' },
      tours: { hub: false, finance: true },
      profile: null
    };
    const remote = {
      skins: { hub: 'garden', finance: 'arcade' },
      modes: { hub: 'light', finance: 'light' },
      tours: { hub: 1, finance: 1, notas: 1 },
      profile: null
    };
    const patch = planPrefsMerge(local, remote);
    assert.equal(patch.changed, true);
    assert.equal(patch.skins.hub, 'garden');
    assert.equal(patch.skins.finance, undefined);
    assert.equal(patch.modes.hub, 'light');
    assert.equal(patch.modes.finance, undefined);
    assert.equal(patch.tours.hub, true);
    assert.equal(patch.tours.finance, undefined);
    assert.equal(patch.tours.notas, true);
  });

  it('applies remote profile when local is empty', () => {
    const patch = planPrefsMerge(
      { skins: {}, modes: {}, tours: {}, profile: null },
      { profile: { nome: 'Joel', icone: '🐻', at: 100 } }
    );
    assert.equal(patch.profile.nome, 'Joel');
    assert.equal(patch.profile.icone, '🐻');
  });

  it('prefers newer profile at', () => {
    const patch = planPrefsMerge(
      { skins: {}, modes: {}, tours: {}, profile: { nome: 'Old', icone: '👤', at: 10 } },
      { profile: { nome: 'New', icone: '🦊', at: 50 } }
    );
    assert.equal(patch.profile.nome, 'New');
    const keep = planPrefsMerge(
      { skins: {}, modes: {}, tours: {}, profile: { nome: 'Local', icone: '👤', at: 90 } },
      { profile: { nome: 'Remote', icone: '🦊', at: 50 } }
    );
    assert.equal(keep.profile, null);
    assert.equal(keep.changed, false);
  });

  it('buildPrefsBlob snapshots tours and default skins', () => {
    const blob = buildPrefsBlob({
      skins: { hub: 'garden' },
      modes: { hub: 'light' },
      tours: { hub: true, finance: false },
      profile: { nome: 'Ana', icone: '🦊', at: 1 }
    });
    assert.equal(blob.v, 1);
    assert.equal(blob.skins.hub, 'garden');
    assert.equal(blob.skins.finance, 'default');
    assert.equal(blob.modes.hub, 'light');
    assert.equal(blob.tours.hub, 1);
    assert.equal(blob.tours.finance, undefined);
    assert.equal(blob.profile.nome, 'Ana');
  });

  it('lists known apps and tours', () => {
    assert.ok(PREFS_APPS.includes('hub'));
    assert.ok(PREFS_TOURS.includes('julioel'));
    assert.equal(emptyPrefsBlob().v, 1);
    assert.equal(normalizePrefsBlob(null).profile, null);
  });
});
