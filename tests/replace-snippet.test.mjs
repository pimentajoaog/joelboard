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
