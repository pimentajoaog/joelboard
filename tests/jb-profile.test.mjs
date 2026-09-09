/* Tests for Joelboard core profile helpers. © 2026 Joel Soluções LTDA. */
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';

const src = readFileSync(new URL('../public/joelboard.js', import.meta.url), 'utf8');
const start = src.indexOf('function jbNormProfileIcon');
const end = src.indexOf('function profileStoreKey');
assert.ok(start > 0 && end > start, 'profile helpers in joelboard.js');
const ctx = { console };
vm.createContext(ctx);
vm.runInContext(src.slice(start, end) + '\nthis.jbNormProfileIcon=jbNormProfileIcon;this.jbProfileFromJSON=jbProfileFromJSON;this.jbAdoptLegacyProfile=jbAdoptLegacyProfile;this.jbMergeProfileCandidates=jbMergeProfileCandidates;this.jbAcctLabel=jbAcctLabel;', ctx);

test('jbNormProfileIcon keeps the first one or two glyphs', function () {
  assert.equal(ctx.jbNormProfileIcon(''), '');
  assert.equal(ctx.jbNormProfileIcon('  🐻  '), '🐻');
  assert.equal(ctx.jbNormProfileIcon('🐶🐱'), '🐶🐱');
});

test('jbProfileFromJSON reads a stored Joelboard profile', function () {
  var empty = ctx.jbProfileFromJSON('');
  assert.equal(empty.nome, '');
  assert.equal(empty.icone, '');
  var p = ctx.jbProfileFromJSON('{"nome":"Joel","icone":"🐻"}');
  assert.equal(p.nome, 'Joel');
  assert.equal(p.icone, '🐻');
  assert.equal(ctx.jbProfileFromJSON('not-json').nome, '');
});

test('jbAdoptLegacyProfile fills an empty core profile from an app Config', function () {
  var adopted = ctx.jbAdoptLegacyProfile({ nome: '', icone: '' }, 'Joel', '🐻');
  assert.equal(adopted.nome, 'Joel');
  assert.equal(adopted.icone, '🐻');
  var keep = ctx.jbAdoptLegacyProfile({ nome: 'Joel', icone: '🐻' }, 'Outro', '🦊');
  assert.equal(keep.nome, 'Joel');
  assert.equal(keep.icone, '🐻');
});

test('jbMergeProfileCandidates keeps unique name+icon and stacks sources', function () {
  var merged = ctx.jbMergeProfileCandidates([
    { nome: 'Joel', icone: '🐻', source: 'Notes' },
    { nome: 'Joel', icone: '🐻', source: 'Planner' },
    { nome: '  ', icone: '🦊', source: 'Notes' },
    { nome: 'Ana', icone: '🦊', source: 'Planner' }
  ]);
  assert.equal(merged.length, 2);
  assert.equal(merged[0].nome, 'Joel');
  assert.equal(merged[0].sources.join(','), 'Notes,Planner');
  assert.equal(merged[1].nome, 'Ana');
  assert.equal(merged[1].icone, '🦊');
});

test('jbAcctLabel uses icon and nickname, not the email', function () {
  assert.equal(ctx.jbAcctLabel('Joel', '🐻', 'joel@example.com'), '🐻 Joel');
  assert.equal(ctx.jbAcctLabel('', '🐻', 'joel@example.com'), 'joel@example.com');
  assert.equal(ctx.jbAcctLabel('  ', '', ''), '');
});

test('core profile is what Notes and Planner call', function () {
  assert.match(src, /function ensureProfile/);
  assert.match(src, /function writeCollabMemberProfile/);
  const planner = readFileSync(new URL('../public/planner-collab.js', import.meta.url), 'utf8');
  const notas = readFileSync(new URL('../public/notas-collab.js', import.meta.url), 'utf8');
  assert.match(planner, /JB\.profileName/);
  assert.match(planner, /JB\.ensureProfile/);
  assert.match(notas, /JB\.profileName/);
  assert.match(notas, /JB\.openProfile/);
  assert.match(src, /Encontramos alguns perfis que você já usou/);
  assert.match(src, /function gatherProfileCandidates/);
  assert.match(src, /function chooseProfile/);
  const notasApp = readFileSync(new URL('../public/notas.js', import.meta.url), 'utf8');
  const plannerApp = readFileSync(new URL('../public/planner.js', import.meta.url), 'utf8');
  assert.match(notasApp, /JB\.adoptLegacyProfile\(DATA\.config\.perfil_nome, DATA\.config\.perfil_icone, 'Notes'\)/);
  assert.match(plannerApp, /JB\.adoptLegacyProfile\(DATA\.config\.perfil_nome, DATA\.config\.perfil_icone, 'Planner'\)/);
  const hub = readFileSync(new URL('../public/hub.js', import.meta.url), 'utf8');
  const hubHtml = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  assert.match(hub, /function hubSaveProfile/);
  assert.match(hubHtml, /id="hubProfileNameIn"/);
  assert.match(hubHtml, /id="hubAcct"/);
});
