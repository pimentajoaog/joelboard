/* Tests for Joelboard shared markdown editor. © 2026 Joel Soluções LTDA. */
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';

const src = readFileSync(new URL('../public/jb-editor.js', import.meta.url), 'utf8');
const css = readFileSync(new URL('../public/joelboard.css', import.meta.url), 'utf8');
const studyHtml = readFileSync(new URL('../study/index.html', import.meta.url), 'utf8');
const ctx = { console, File, Blob, Uint8Array };
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
  assert.equal(ED.looksLikeHtml('plain'), false);
  assert.equal(ED.looksLikeHtml('setds<div>gds</div><div><span style="background-color: rgb(255, 245, 157);">aaaaa</span></div>'), true);
  assert.equal(ED.looksLikeHtml('setds&lt;div&gt;gds&lt;/div&gt;'), true);
});

test('valueToHtml keeps markdown notes readable', function () {
  assert.match(ED.valueToHtml('**oi**'), /<strong>oi<\/strong>/);
});

test('valueToHtml does not escape contenteditable HTML that starts with text', function () {
  var html = ED.valueToHtml('setds<div>gds</div><div><span style="background-color: rgb(255, 245, 157);">aaaaa</span>aaaaa</div>');
  assert.match(html, /<div>gds<\/div>/);
  assert.doesNotMatch(html, /&lt;div/);
  var escaped = ED.valueToHtml('setds&lt;div&gt;gds&lt;/div&gt;');
  assert.match(escaped, /<div>gds<\/div>/);
  assert.doesNotMatch(escaped, /&lt;div/);
  var wrapped = ED.valueToHtml('<p>setds&lt;div&gt;gds&lt;/div&gt;</p>');
  assert.match(wrapped, /<div>gds<\/div>/);
  assert.doesNotMatch(wrapped, /&lt;div/);
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

test('pasteImageFiles does not double files and items of the same image', function () {
  var a = { type: 'image/png', name: 'image.png', size: 99, lastModified: 1 };
  var b = { type: 'image/png', name: 'blob', size: 99, lastModified: 2 };
  var files = ED.pasteImageFiles({
    files: [a],
    items: [{ kind: 'file', type: 'image/png', getAsFile: function () { return b; } }]
  });
  assert.equal(files.length, 1);
  assert.equal(files[0].name, 'image.png');
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

test('cssHighlightFromStyle keeps safe highlight colors', function () {
  assert.equal(ED.cssHighlightFromStyle('background-color: #fff59d'), '#fff59d');
  assert.equal(ED.cssHighlightFromStyle('background-color: #ff0'), '#ffff00');
  assert.equal(ED.cssHighlightFromStyle('background-color: rgb(255, 245, 157)'), '#fff59d');
  assert.equal(ED.cssHighlightFromStyle('background-color: yellow'), '#fff59d');
  assert.equal(ED.cssHighlightFromStyle('background-color: transparent'), '');
  assert.equal(ED.cssHighlightFromStyle('background-color: url(x)'), '');
});

test('cssTextMarksFromStyle keeps italic bold underline strike', function () {
  var italic = ED.cssTextMarksFromStyle('font-style: italic');
  assert.equal(italic.fontStyle, 'italic');
  var bold = ED.cssTextMarksFromStyle('font-weight: 700');
  assert.equal(bold.fontWeight, 'bold');
  var both = ED.cssTextMarksFromStyle('text-decoration: underline line-through');
  assert.equal(both.textDecoration, 'underline line-through');
  var empty = ED.cssTextMarksFromStyle('color: red; font-weight: 400');
  assert.equal(empty.fontStyle, '');
  assert.equal(empty.fontWeight, '');
  assert.equal(empty.textDecoration, '');
});

test('blobToUploadFile names a PNG for Drive upload', function () {
  var blob = new Blob(['png'], { type: 'image/png' });
  var file = ED.blobToUploadFile(blob, 'sharpie.png');
  assert.equal(file.type, 'image/png');
  assert.equal(file.name, 'sharpie.png');
});

test('pullInkFileId reads overlay marker', function () {
  var id = '1AbCdEfGhIjKlMnOpQrSt';
  assert.equal(ED.pullInkFileId('<img data-jb-ink="1" data-jb-file="' + id + '" alt="__jb-ink__">'), id);
  assert.equal(ED.pullInkFileId('<img data-jb-file="' + id + '" data-jb-ink="1">'), id);
  assert.equal(ED.pullInkFileId('<p>oi</p>'), '');
  assert.equal(ED.pullInkFileId('<img data-jb-file="' + id + '" alt="snip">'), '');
});

test('isEmptyHtml treats ink overlay as content', function () {
  assert.equal(ED.isEmptyHtml('<img data-jb-ink="1" data-jb-file="1AbCdEfGhIjKlMnOpQrSt" alt="__jb-ink__">'), false);
});

test('colsHtml builds a two-column layout', function () {
  var html = ED.colsHtml('<p>esq</p>', '<p>dir</p>');
  assert.match(html, /class="jb-ed-cols"/);
  assert.match(html, /class="jb-ed-col"><p>esq<\/p>/);
  assert.match(html, /class="jb-ed-col"><p>dir<\/p>/);
  assert.match(html, /<\/div><p><br><\/p>$/);
  assert.equal(ED.isEmptyHtml(ED.colsHtml()), false);
  assert.match(ED.colsHtml(), /<p><br><\/p>.*<p><br><\/p>/);
});

test('editor exposes two-column toolbar insert', function () {
  assert.match(src, /function colsHtml/);
  assert.match(src, /function insertColumns/);
  assert.match(src, /function normalizeCols/);
  assert.match(src, /Duas colunas/);
  assert.match(src, /jb-ed-cols/);
  assert.match(css, /\.jb-ed-surface \.jb-ed-cols/);
  assert.match(css, /width: fit-content/);
  assert.match(css, /min-width: 140px/);
  assert.match(css, /min-height: 88px/);
  assert.match(css, /:not\(:focus-within\) > p:last-child:has\(> br:only-child\)/);
  assert.match(css, /@media \(max-width: 640px\)[\s\S]*\.jb-ed-surface \.jb-ed-col/);
});

test('editor shortcut map covers toolbar actions with HR default', function () {
  var map = ED.getShortcutMap();
  assert.equal(map.hr, 'Mod+Shift+Enter');
  assert.equal(map.columns, 'Mod+Shift+C');
  assert.equal(map.bold, 'Mod+B');
  assert.equal(map.link, 'Mod+K');
  assert.equal(ED.formatShortcut('Mod+Shift+Enter').length > 0, true);
  var parsed = ED.parseShortcut('Mod+Shift+Enter');
  assert.equal(parsed.mod, true);
  assert.equal(parsed.shift, true);
  assert.equal(parsed.key, 'enter');
  assert.equal(ED.serializeShortcut(parsed), 'Mod+Shift+Enter');
  assert.match(src, /function tryMarkdownHr/);
  assert.match(src, /function mountShortcutsSettings/);
  assert.match(src, /Mod\+Shift\+Enter/);
  assert.match(css, /\.jb-ed-sc-list/);
  assert.match(studyHtml, /data-st="atalhos"/);
});

test('ink overlay size follows the page box, not scrollHeight', function () {
  assert.match(src, /page\.clientHeight/);
  assert.doesNotMatch(src, /surface\.scrollHeight/);
  assert.match(src, /inkRo\.observe\(page\)/);
  assert.doesNotMatch(src, /inkRo\.observe\(surface\)/);
  assert.doesNotMatch(src, /inkRo\.observe\(scroll\)/);
  assert.match(src, /function tickInkView/);
  assert.match(src, /function ensureInkViewTick/);
  assert.match(src, /function inkStickyCanvas/);
  assert.match(src, /function inkViewportOverlay/);
  assert.match(src, /inkFullSheet\(\) && !inkStickyCanvas/);
  assert.match(src, /document\.body\.appendChild\(inkCanvas\)/);
  assert.match(src, /inkCanvas\.classList\.add\('jb-ed-ink-full'\)/);
  assert.match(src, /c\.width = 8/);
  assert.match(css, /\.jb-ed-scroll \{[\s\S]*scrollbar-gutter: stable/);
  assert.match(css, /\.jb-ed-page \{[\s\S]*overflow: hidden/);
  assert.match(css, /\.jb-ed-ink-layer \{[\s\S]*inset: 0/);
  assert.match(css, /\.jb-ed-ink-layer\.jb-ed-ink-full/);
  assert.match(css, /html\.jb-ink-full/);
  assert.match(css, /html\.jb-ed-sheet \.page\.on/);
  assert.match(src, /jb-ed-sheet/);
  assert.match(css, /html\.jb-ink-full \.jb-ed-bar/);
  assert.match(css, /\.jb-ed-chrome/);
  assert.match(css, /\.jb-ed:not\(\.jb-ed-compact\) \.jb-ed-ink-tools:not\(\.jb-ed-ink-float\) \{[\s\S]*position: absolute/);
  assert.match(src, /jb-ed-chrome/);
  assert.match(css, /\.jb-ed-cluster/);
  assert.match(src, /jb-ed-cluster/);
  assert.match(css, /@keyframes jb-ed-bar-in/);
  assert.match(css, /@keyframes jb-ed-ink-in/);
  assert.match(css, /prefers-reduced-motion/);
  assert.match(css, /html\.jb-ed-sheet \{[\s\S]*overflow-x: hidden/);
  assert.match(css, /html\.jb-ed-sheet\.jb-ed-board-x \{[\s\S]*overflow-x: auto/);
  assert.match(css, /html\.jb-ed-sheet \.jb-ed-scroll \{[\s\S]*touch-action: pan-x pan-y pinch-zoom/);
  assert.match(css, /html\.jb-ed-sheet \{[\s\S]*touch-action: pan-x pan-y pinch-zoom/);
  assert.match(css, /\.jb-ed-ink-layer\.jb-ed-ink-full \{[\s\S]*pan-x pan-y pinch-zoom/);
  assert.match(css, /\.jb-ed-ink-pan \{[\s\S]*pan-x pan-y pinch-zoom/);
  assert.match(css, /\.jb-ed-board-rail/);
  assert.match(src, /jb-ed-board-rail/);
  assert.match(src, /function inkBoardPads/);
  assert.match(src, /function setSheetViewport/);
  assert.match(src, /user-scalable=yes/);
  assert.match(src, /minimum-scale=0\.25/);
  assert.match(src, /function inkAllowsPan/);
  assert.match(src, /function inkBoardGrow/);
  assert.match(src, /function inkEdgeScroll/);
  assert.match(src, /visualViewport/);
  assert.match(src, /jb-ed-board-x/);
  assert.match(css, /margin-top: var\(--jb-ed-pad-top/);
  assert.match(src, /jb-ed-ink-pan/);
});

test('mobile editor delays ink capture so pinch can run', function () {
  assert.match(src, /var INK_TOUCH_SLOP = 8/);
  assert.match(src, /var IMG_TOUCH_SLOP = 14/);
  assert.match(src, /function inkCancelFreshStroke/);
  assert.match(src, /function inkBeginPinch/);
  assert.match(src, /inkPending/);
  assert.match(src, /pointerType === 'touch'/);
  assert.match(src, /passive: false/);
  assert.match(src, /function onInkSwallowClick/);
  assert.match(src, /inkSwallowClick/);
  assert.match(src, /pointerType !== 'touch'/);
  assert.match(src, /viewport-fit=cover/);
  assert.match(src, /imgDrag\.touch \? IMG_TOUCH_SLOP : 4/);
  assert.doesNotMatch(src, /jb-ed-foot-float/);
  assert.doesNotMatch(studyHtml, /user-scalable=no/);
  assert.match(studyHtml, /minimum-scale=0\.25/);
  assert.match(css, /@media \(hover: hover\) and \(pointer: fine\)/);
  assert.match(css, /@media \(max-width: 540px\)/);
  assert.match(css, /\.jb-ed:not\(\.jb-ed-compact\) \.jb-ed-bar \{[\s\S]*overflow-x: auto/);
  assert.match(css, /min-width: 44px/);
  assert.match(css, /\.jb-ed:not\(\.jb-ed-compact\) \.jb-ed-foot \{[\s\S]*border-top: 0/);
  assert.doesNotMatch(css, /jb-ed-foot-float/);
  assert.match(css, /@media \(pointer: coarse\) \{[\s\S]*\.jb-ed-img-handle \{ width: 22px/);
  assert.match(css, /\.jb-ed-compact \.jb-ed-surface \{ font-size: 16px; \}/);
  assert.match(src, /inkStickyCanvas\(\)/);
  assert.match(css, /\.jb-ed\.ink-on \.jb-ed-ink-layer,[\s\S]*touch-action: pan-x pan-y pinch-zoom/);
});

test('dumpInkStrokes round-trips and hitInkStroke finds the top scribble', function () {
  var strokes = [
    { color: '#111827', width: 3, pts: [{ x: 0, y: 0 }, { x: 40, y: 0 }] },
    { color: '#ef4444', width: 8, pts: [{ x: 10, y: 10 }, { x: 10, y: 50 }] }
  ];
  var dump = ED.dumpInkStrokes(strokes);
  var back = ED.parseInkStrokes(dump);
  assert.equal(back.length, 2);
  assert.equal(back[1].color, '#ef4444');
  assert.equal(back[1].pts.length, 2);
  assert.equal(ED.hitInkStroke(back, { x: 10, y: 30 }), 1);
  assert.equal(ED.hitInkStroke(back, { x: 30, y: 0 }), 0);
  assert.equal(ED.hitInkStroke(back, { x: 200, y: 200 }), -1);
  var margin = ED.dumpInkStrokes([{ color: '#111827', width: 3, pts: [{ x: -40, y: 12 }, { x: -8, y: 12 }] }]);
  var marginBack = ED.parseInkStrokes(margin);
  assert.equal(marginBack.length, 1);
  assert.equal(marginBack[0].pts[0].x, -40);
  var id = '1AbCdEfGhIjKlMnOpQrSt';
  assert.deepEqual(ED.pullInkStrokes('<img data-jb-ink="1" data-jb-file="' + id + '" data-jb-ink-d="' + dump + '" alt="__jb-ink__">'), back);
  var legacy = ED.parseInkStrokes('#ef4444,8,10 10 10 50');
  assert.equal(legacy.length, 1);
  assert.equal(legacy[0].color, '#ef4444');
});

test('inkBoardPads grows sideways only when doodles leave the viewport', function () {
  var none = ED.inkBoardPads([], 760, 1200, 220, 40);
  assert.equal(none.left, 0);
  assert.equal(none.right, 0);
  assert.equal(none.top, 0);
  assert.equal(none.bottom, 0);
  var side = ED.inkBoardPads(
    [{ color: '#111827', width: 3, pts: [{ x: -80, y: 12 }, { x: -20, y: 12 }] }],
    360, 390, 18, 40
  );
  assert.ok(side.left >= 100);
  assert.equal(side.right, 0);
  var far = ED.inkBoardPads(
    [{ color: '#111827', width: 3, pts: [{ x: 900, y: 10 }, { x: 940, y: 10 }] }],
    360, 390, 18, 40
  );
  assert.equal(far.left, 0);
  assert.ok(far.right >= 500);
});

test('inkBoardGrow stays put at rest and only grows when the view is zoomed out', function () {
  var rest = ED.inkBoardGrow({ left: 0, right: 0, top: 0, bottom: 0 }, {
    pageLeft: 0, pageTop: 0, width: 1200, height: 800, viewW: 1200, viewH: 800
  }, 0);
  assert.equal(rest.left, 0);
  assert.equal(rest.right, 0);
  assert.equal(rest.top, 0);
  assert.equal(rest.bottom, 0);
  var zoomOut = ED.inkBoardGrow(rest, {
    pageLeft: -600, pageTop: -400, width: 2400, height: 1600, viewW: 1200, viewH: 800
  }, 0);
  assert.ok(zoomOut.left >= 600);
  assert.ok(zoomOut.right >= 600);
  assert.ok(zoomOut.top >= 400);
  assert.ok(zoomOut.bottom >= 400);
  var back = ED.inkBoardGrow(zoomOut, {
    pageLeft: zoomOut.left, pageTop: zoomOut.top, width: 1200, height: 800, viewW: 1200, viewH: 800
  }, 0);
  assert.equal(back.left, 0);
  assert.equal(back.right, 0);
  assert.equal(back.top, 0);
  assert.equal(back.bottom, 0);
});

test('image drag ghost follows the cursor on document.body', function () {
  assert.match(src, /document\.body\.appendChild\(imgGhost\)/);
  assert.match(src, /imgGhost\.style\.left = Math\.round\(ev\.clientX\)/);
  assert.match(src, /imgGhost\.style\.top = Math\.round\(ev\.clientY\)/);
  assert.match(src, /imgSlot = document\.createElement\('span'\)/);
  assert.match(src, /function computeDropRange/);
  assert.match(src, /beginImgPointerDrag\(ev, img\)/);
  assert.doesNotMatch(css, /\.jb-ed-img-ghost \{[^}]*transform:/);
  assert.doesNotMatch(css, /img\.jb-ed-img-dragging \{[^}]*height: 0/);
});

test('note image clipboard round-trips Drive id and width', function () {
  var id = '1aB-C_defghijklmnopqr';
  var img = {
    getAttribute: function (name) {
      if (name === 'data-jb-file') return id;
      if (name === 'alt') return 'gráfico';
      if (name === 'style') return 'width: 320px; height: 180px;';
      if (name === 'data-jb-ink') return null;
      if (name === 'width') return null;
      return null;
    }
  };
  var html = ED.noteImgToClipboardHtml(img);
  assert.match(html, /data-jb-file="1aB-C_defghijklmnopqr"/);
  assert.match(html, /alt="gráfico"/);
  assert.match(html, /width: 320px/);
  assert.match(html, /height: 180px/);
  var parsed = ED.parseNoteImgClipboard('<html><body><!--StartFragment-->' + html + '<!--EndFragment--></body></html>');
  assert.equal(parsed.length, 1);
  assert.equal(parsed[0].id, id);
  assert.equal(parsed[0].alt, 'gráfico');
  assert.equal(parsed[0].width, 320);
  assert.equal(parsed[0].height, 180);
  assert.equal(ED.parseNoteImgClipboard('<img data-jb-ink="1" data-jb-file="' + id + '">').length, 0);
  assert.equal(ED.noteImgToClipboardHtml(null), '');
});

test('editor undo history covers images and ink', function () {
  assert.match(src, /function undoEditor/);
  assert.match(src, /function redoEditor/);
  assert.match(src, /function histBeforeChange/);
  assert.match(src, /id: 'undo'[\s\S]*def: 'Mod\+Z'/);
  assert.match(src, /id: 'redo'[\s\S]*def: 'Mod\+Shift\+Z'/);
  assert.match(src, /action === 'redo'|runShortcutAction\('redo'\)|id === 'redo'/);
  assert.match(src, /historyUndo/);
  assert.match(src, /undoBtn\.addEventListener\('click', function \(\) \{ undoEditor\(\); \}\)/);
  assert.match(src, /function startInkStroke/);
  assert.match(src, /histBeforeChange\(\);/);
  assert.match(src, /inkCurrent = \{ color: inkColor/);
});

test('cssImgWidthPx keeps a sane pixel width', function () {
  assert.equal(ED.cssImgWidthPx('width: 320px', ''), 320);
  assert.equal(ED.cssImgWidthPx('', '240'), 240);
  assert.equal(ED.cssImgWidthPx('width: 12px', ''), 0);
  assert.equal(ED.cssImgWidthPx('color: red', ''), 0);
  assert.equal(ED.cssImgHeightPx('height: 180px', ''), 180);
  assert.equal(ED.cssImgHeightPx('width: 320px; height: 90px', ''), 90);
  assert.equal(ED.cssImgHeightPx('', '120'), 120);
  assert.equal(ED.cssImgHeightPx('height: 10px', ''), 0);
});

test('image resize supports edge handles for axis-only scaling', function () {
  assert.match(src, /data-h="n"/);
  assert.match(src, /data-h="e"/);
  assert.match(src, /function applyImgSize/);
  assert.match(src, /keepAspect/);
  assert.match(css, /\.jb-ed-img-handle\.n/);
  assert.match(css, /\.jb-ed-img-handle\.e/);
});
