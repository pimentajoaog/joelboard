/* Tests for Joelboard Recipes shared cookbooks. © 2026 Joel Soluções LTDA. */
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';

const collab = readFileSync(new URL('../public/recipes-collab.js', import.meta.url), 'utf8');
const recipes = readFileSync(new URL('../public/recipes.js', import.meta.url), 'utf8');
const jb = readFileSync(new URL('../public/joelboard.js', import.meta.url), 'utf8');
const calSrc = readFileSync(new URL('../public/jb-cal.js', import.meta.url), 'utf8');
const html = readFileSync(new URL('../recipes/index.html', import.meta.url), 'utf8');

const ctx = { console, JB: { onProfileChange: function () {} } };
vm.createContext(ctx);
vm.runInContext(
  collab
  + '\nthis.rcParseJoinSheetId=rcParseJoinSheetId;'
  + 'this.rcIsCollabSpreadsheetGrid=rcIsCollabSpreadsheetGrid;'
  + 'this.rcJoinErrMessage=rcJoinErrMessage;',
  ctx
);

test('rcParseJoinSheetId accepts a raw id, join URL, or Drive URL', function () {
  var id = '1AbCdEfGhIjKlMnOpQrStUvWxYz0123456789';
  assert.equal(ctx.rcParseJoinSheetId(id), id);
  assert.equal(ctx.rcParseJoinSheetId('https://joelboard.vercel.app/recipes/?join=' + id), id);
  assert.equal(ctx.rcParseJoinSheetId('https://docs.google.com/spreadsheets/d/' + id + '/edit#gid=0'), id);
  assert.equal(ctx.rcParseJoinSheetId(''), '');
  assert.equal(ctx.rcParseJoinSheetId('not-a-sheet'), '');
});

test('collab sheets are not treated as the personal Recipes workbook', function () {
  assert.equal(ctx.rcIsCollabSpreadsheetGrid({ Meta: 1, Membros: 2, Recipes: 3 }), true);
  assert.equal(ctx.rcIsCollabSpreadsheetGrid({ Cookbooks: 1, Recipes: 2, Plans: 3 }), false);
  assert.equal(ctx.rcIsCollabSpreadsheetGrid({ Meta: 1, Membros: 2, Cookbooks: 3 }), false);
  assert.match(ctx.rcJoinErrMessage({ message: 'HTTP 403' }), /Editor no Drive/);
});

test('rcSidForBook uses the collab sheet, Plans stay on the personal sid', function () {
  assert.match(recipes, /function rcSidForBook/);
  assert.match(recipes, /book && book\.collabSheetId/);
  assert.match(recipes, /function personalSsUrl/);
  assert.match(recipes, /personalSsUrl\('\/values\/Plans!A:G:append/);
  assert.match(recipes, /ensurePlanSnapshotHeaders/);
  assert.match(recipes, /applyRoute\._retried/);
  assert.match(recipes, /JB\.qsGet\('r'\)/);
  assert.match(recipes, /JB\.qsGet\('b'\)/);
  assert.match(recipes, /JB\.routeBack\(\{ b: null, r: null, i: null \}\)/);
  assert.match(recipes, /JB\.routeBack\(\{ r: null \}\)/);
  assert.match(recipes, /replace: samePlace \|\| goingHome \|\| dropping/);
  assert.match(collab, /!JB\.qsGet\('r'\) && !JB\.qsGet\('b'\)/);
  assert.match(recipes, /function planRowVals/);
  assert.doesNotMatch(recipes, /sheetUrl\(sid, '\/values\/Plans/);
  function rcSidForBook(book, personal) {
    if (book && book.collabSheetId) return book.collabSheetId;
    return personal;
  }
  assert.equal(rcSidForBook({ collabSheetId: 'sid-shared' }, 'sid-mine'), 'sid-shared');
  assert.equal(rcSidForBook({ id: 'cb1' }, 'sid-mine'), 'sid-mine');
});

test('sharing one book keeps the other personal cookbooks', function () {
  vm.runInContext(
    'this.rcOtherPersonalBooks=rcOtherPersonalBooks;'
    + 'DATA={cookbooks:['
    + '{id:"saguados",name:"Saguados"},'
    + '{id:"docinhos",name:"Docinhos"},'
    + '{id:"casa",name:"Casa",collabSheetId:"sid"}'
    + ']};',
    ctx
  );
  var others = ctx.rcOtherPersonalBooks('docinhos');
  assert.equal(others.map(function (b) { return b.id; }).join(','), 'saguados');
  assert.match(collab, /function rcReattachPersonalBooks/);
  assert.match(collab, /rcOtherPersonalBooks\(b\.id\)/);
  assert.match(collab, /bookRow > 1\) pushDeletes\(cookGid, \[bookRow\]\)/);
  assert.match(collab, /cookGid !== recGid/);
  assert.match(recipes, /function setShelfTab/);
  assert.match(recipes, /function paintShelfTabs/);
  assert.match(recipes, /shelf-pill/);
  assert.doesNotMatch(recipes, /recipes-shelf-split/);
  assert.match(html, /id="shelfTabs"/);
  assert.match(recipes, /rcCollabSyncBlocked/);
});

test('join URL, registry, and Recipes/Compartilhados folder are wired', function () {
  assert.match(collab, /\/recipes\/\?join=/);
  assert.match(collab, /Compartilhadas/);
  assert.match(collab, /function rcShareFromPrivate/);
  assert.match(collab, /ensureRecipesSharedFolder/);
  assert.match(recipes, /\['Compartilhadas'/);
  assert.match(jb, /function ensureRecipesSharedFolder/);
  assert.match(jb, /name: 'Compartilhados', parentId: recipesId/);
  assert.match(html, /recipes-collab\.js/);
  assert.match(html, /id="shareOverlay"/);
});
