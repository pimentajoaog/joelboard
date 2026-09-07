/* Tests for Joelboard shared markdown editor. © 2026 Joel Soluções LTDA. */
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';

const src = readFileSync(new URL('../public/jb-editor.js', import.meta.url), 'utf8');
const ctx = { console };
vm.createContext(ctx);
vm.runInContext(src, ctx);

const ED = ctx.JB_EDITOR;

test('escapes HTML before formatting', function () {
  var html = ED.mdToHtml('<script>alert(1)</script>');
  assert.doesNotMatch(html, /<script>/);
  assert.match(html, /&lt;script&gt;/);
});

test('renders headings, emphasis, and lists', function () {
  var html = ED.mdToHtml('# Título\n\n**bold** e *itálico*\n\n- um\n- dois');
  assert.match(html, /<h1>Título<\/h1>/);
  assert.match(html, /<strong>bold<\/strong>/);
  assert.match(html, /<em>itálico<\/em>/);
  assert.match(html, /<ul>/);
  assert.match(html, /<li>um<\/li>/);
});

test('renders checklists, quotes, code, links and hr', function () {
  var md = '- [ ] pendente\n- [x] feito\n\n> citação\n\n`code`\n\n```\nlinha\n```\n\n[ok](https://example.com)\n\n---';
  var html = ED.mdToHtml(md);
  assert.match(html, /jb-ed-tasks/);
  assert.match(html, /<li class="on">feito<\/li>/);
  assert.match(html, /<blockquote>/);
  assert.match(html, /<code>code<\/code>/);
  assert.match(html, /<pre><code>linha<\/code><\/pre>/);
  assert.match(html, /href="https:\/\/example.com"/);
  assert.match(html, /<hr>/);
});

test('blocks javascript: links', function () {
  var html = ED.mdToHtml('[x](javascript:alert(1))');
  assert.doesNotMatch(html, /javascript:/);
});

test('wrapSelection wraps markers around selection', function () {
  var r = ED.wrapSelection('hello', 0, 5, { left: '**', right: '**' });
  assert.equal(r.value, '**hello**');
  assert.equal(r.start, 2);
  assert.equal(r.end, 7);
});

test('wrapSelection toggles markers off', function () {
  var on = ED.wrapSelection('hello', 0, 5, { left: '**', right: '**' });
  var off = ED.wrapSelection(on.value, on.start, on.end, { left: '**', right: '**' });
  assert.equal(off.value, 'hello');
});

test('looksLikeHtml detects stored notes', function () {
  assert.equal(ED.looksLikeHtml('<p>oi</p>'), true);
  assert.equal(ED.looksLikeHtml('# Título'), false);
});

test('valueToHtml keeps markdown notes readable', function () {
  assert.match(ED.valueToHtml('**oi**'), /<strong>oi<\/strong>/);
});

test('wrapSelection prefixes selected lines and can toggle off', function () {
  var r = ED.wrapSelection('a\nb', 0, 3, { kind: 'line', prefix: '- ' });
  assert.equal(r.value, '- a\n- b');
  var back = ED.wrapSelection(r.value, r.start, r.end, { kind: 'line', prefix: '- ' });
  assert.equal(back.value, 'a\nb');
});

test('wrapSelection builds a markdown link', function () {
  var r = ED.wrapSelection('docs', 0, 4, { kind: 'link' });
  assert.equal(r.value, '[docs](https://)');
});
