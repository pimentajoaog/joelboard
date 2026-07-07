import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import vm from 'node:vm';
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

const root = path.dirname(fileURLToPath(import.meta.url));
const sharedPath = path.join(root, '..', 'public', 'extensions', 'replace', 'lib', 'shared.js');

const context = {
  chrome: {
    storage: {
      local: {
        get: (_keys, cb) => cb({}),
        set: (_patch, cb) => cb && cb()
      }
    }
  }
};
vm.createContext(context);
vm.runInContext(readFileSync(sharedPath, 'utf8'), context);
const { JB_REPLACE } = context;

const snippets = [
  { id: '1', trigger: '/test', body: 'EXPANDED', enabled: true },
  { id: '2', trigger: '//oi', body: 'Olá', enabled: true }
];

describe('findSnippetMatch', () => {
  it('matches when trigger is the only text', () => {
    const m = JB_REPLACE.findSnippetMatch(snippets, '/test', false);
    assert.equal(m.snippet.trigger, '/test');
    assert.equal(m.start, 0);
  });

  it('matches trigger embedded in other text (no word boundary)', () => {
    const m = JB_REPLACE.findSnippetMatch(snippets, 'test/test', false);
    assert.equal(m.snippet.trigger, '/test');
    assert.equal(m.start, 4);
  });

  it('matches trigger after punctuation', () => {
    const m = JB_REPLACE.findSnippetMatch(snippets, 'test/testtest,/test', false);
    assert.equal(m.snippet.trigger, '/test');
    assert.equal(m.start, 14);
  });

  it('prefers longest trigger at cursor', () => {
    const m = JB_REPLACE.findSnippetMatch(snippets, 'foo //oi', false);
    assert.equal(m.snippet.trigger, '//oi');
  });

  it('returns null when trigger is not at cursor', () => {
    assert.equal(JB_REPLACE.findSnippetMatch(snippets, 'test/testtest,', false), null);
  });
});

describe('template variables', () => {
  it('collects user vars from snippet bodies', () => {
    const list = [
      { body: 'Hi {{name}}, from {{empresa}} on {{date}}' },
      { body: 'Again {{name}} and {{clipboard}}' }
    ];
    assert.equal(JSON.stringify(JB_REPLACE.collectVarKeys(list)), JSON.stringify(['empresa', 'name']));
  });

  it('merges stored vars with template vars', () => {
    const keys = JB_REPLACE.mergedVarKeys(
      [{ body: '{{foo}}' }],
      { bar: 'x', foo: '' }
    );
    assert.equal(JSON.stringify(keys), JSON.stringify(['bar', 'foo']));
  });

  it('tokenizes template into text and variable slots', () => {
    const parts = JB_REPLACE.tokenizeTemplate(
      'Olá {{nome}}, hoje {{date}} — {{empresa}}',
      { nome: '', empresa: 'Joel' },
      { date: '07/07/2026' }
    );
    assert.equal(parts.length, 6);
    assert.equal(parts[0].type, 'text');
    assert.equal(parts[1].type, 'var');
    assert.equal(parts[1].key, 'nome');
    assert.equal(parts[1].missing, true);
    assert.equal(parts[2].type, 'var');
    assert.equal(parts[2].key, 'date');
    assert.equal(parts[2].missing, false);
    assert.equal(parts[2].value, '07/07/2026');
    assert.equal(parts[4].value, 'Joel');
  });
});
