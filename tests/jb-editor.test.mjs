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

test('safeDriveFileId accepts Drive ids only', function () {
  assert.equal(ED.safeDriveFileId('1aB-C_defghijklmnopqr'), '1aB-C_defghijklmnopqr');
  assert.equal(ED.safeDriveFileId('javascript:alert(1)'), '');
  assert.equal(ED.safeDriveFileId('short'), '');
});

test('isEmptyHtml treats a Drive image as content', function () {
  assert.equal(ED.isEmptyHtml('<p><br></p>'), true);
  assert.equal(ED.isEmptyHtml('<img data-jb-file="1AbCdEfGhIjKlMnOpQrSt" alt="snip">'), false);
});

test('pasteImageFiles picks clipboard images and skips svg', function () {
  var png = { type: 'image/png', name: 'snip.png', size: 12, lastModified: 1 };
  var svg = { type: 'image/svg+xml', name: 'x.svg', size: 12, lastModified: 2 };
  var files = ED.pasteImageFiles({
    files: [png, svg],
    items: [{ kind: 'file', type: 'image/png', getAsFile: function () { return png; } }]
  });
  assert.equal(files.length, 1);
  assert.equal(files[0].name, 'snip.png');
});

test('parseFontSizeInput clamps Word-like sizes', function () {
  assert.equal(ED.parseFontSizeInput('13'), 13);
  assert.equal(ED.parseFontSizeInput('13px'), 13);
  assert.equal(ED.parseFontSizeInput('7'), 8);
  assert.equal(ED.parseFontSizeInput('200'), 72);
  assert.equal(ED.parseFontSizeInput('abc'), 0);
});

test('stepFontSize walks the preset list', function () {
  assert.equal(ED.stepFontSize(16, 1), 18);
  assert.equal(ED.stepFontSize(16, -1), 14);
  assert.equal(ED.stepFontSize(13, 1), 14);
  assert.equal(ED.stepFontSize(8, -1), 8);
  assert.equal(ED.stepFontSize(72, 1), 72);
});

test('cssFontSizeFromStyle keeps px and maps named sizes', function () {
  assert.equal(ED.cssFontSizeFromStyle('font-size: 13px'), '13px');
  assert.equal(ED.cssFontSizeFromStyle('font-size: xxx-large'), '48px');
  assert.equal(ED.cssFontSizeFromStyle('font-size: -webkit-xxx-large'), '48px');
  assert.equal(ED.cssFontSizeFromStyle('color: red'), '');
});
