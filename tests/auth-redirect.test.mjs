/* Tests for same-tab Google OAuth on phones. © 2026 Joel Soluções LTDA. */
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';

const src = readFileSync(new URL('../public/joelboard.js', import.meta.url), 'utf8');
const start = src.indexOf('function jbAuthPopupUnreliable');
const end = src.indexOf('function migrateTokenStorage');
assert.ok(start > 0 && end > start, 'OAuth redirect helpers in joelboard.js');
const ctx = {};
vm.createContext(ctx);
vm.runInContext(
  src.slice(start, end)
    + '\nthis.jbAuthPopupUnreliable=jbAuthPopupUnreliable;'
    + 'this.jbParseOAuthParams=jbParseOAuthParams;'
    + 'this.jbOAuthReturnPath=jbOAuthReturnPath;'
    + 'this.jbOAuthAuthUrl=jbOAuthAuthUrl;'
    + 'this.takeOAuthReturn=takeOAuthReturn;',
  ctx
);

test('jbAuthPopupUnreliable flags Android, iOS, PWA, and iPadOS', function () {
  assert.equal(ctx.jbAuthPopupUnreliable('Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120', {}), false);
  assert.equal(ctx.jbAuthPopupUnreliable('Mozilla/5.0 (Linux; Android 14; Pixel) Chrome/120', {}), true);
  assert.equal(ctx.jbAuthPopupUnreliable('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0) Safari/604.1', {}), true);
  assert.equal(ctx.jbAuthPopupUnreliable('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15) Safari/605.1', { touchPoints: 5 }), true);
  assert.equal(ctx.jbAuthPopupUnreliable('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15) Safari/605.1', { touchPoints: 0 }), false);
  assert.equal(ctx.jbAuthPopupUnreliable('Mozilla/5.0 (Windows NT 10.0)', { standalone: true }), true);
});

test('jbParseOAuthParams merges hash over query', function () {
  var p = ctx.jbParseOAuthParams('#access_token=tok&expires_in=3600&state=abc', '?error=access_denied&state=old');
  assert.equal(p.access_token, 'tok');
  assert.equal(p.expires_in, '3600');
  assert.equal(p.state, 'abc');
  assert.equal(p.error, 'access_denied');
});

test('jbOAuthReturnPath only allows same-origin relative paths', function () {
  assert.equal(ctx.jbOAuthReturnPath('/planner/?x=1', '/'), '/planner/?x=1');
  assert.equal(ctx.jbOAuthReturnPath('https://evil.example/', '/'), '/');
  assert.equal(ctx.jbOAuthReturnPath('//evil.example/phish', '/'), '/');
  assert.equal(ctx.jbOAuthReturnPath('/oauth.html#tok', '/'), '/');
  assert.equal(ctx.jbOAuthReturnPath('', '/notas/'), '/notas/');
});

test('jbOAuthAuthUrl is implicit token to /oauth.html', function () {
  var url = ctx.jbOAuthAuthUrl({
    clientId: 'id.apps.googleusercontent.com',
    redirectUri: 'https://joelboard.vercel.app/oauth.html',
    scope: 'openid email',
    state: 'jbstate',
    prompt: 'select_account',
    loginHint: 'a@b.com'
  });
  assert.match(url, /^https:\/\/accounts\.google\.com\/o\/oauth2\/v2\/auth\?/);
  assert.match(url, /response_type=token/);
  assert.match(url, /redirect_uri=https%3A%2F%2Fjoelboard\.vercel\.app%2Foauth\.html/);
  assert.match(url, /prompt=select_account/);
  assert.match(url, /login_hint=a%40b\.com/);
  assert.match(url, /state=jbstate/);
});

test('takeOAuthReturn saves the token and rejects a bad state', function () {
  var ok = ctx.takeOAuthReturn('#access_token=tok&expires_in=3599&state=jb1', '', 'jb1', '/notas/');
  assert.equal(ok.token, 'tok');
  assert.equal(ok.expiresIn, '3599');
  assert.equal(ok.next, '/notas/');
  var bad = ctx.takeOAuthReturn('#access_token=tok&state=nope', '', 'jb1', '/');
  assert.equal(bad.error, 'state_mismatch');
  var denied = ctx.takeOAuthReturn('#error=access_denied&state=jb1', '', 'jb1', '/');
  assert.equal(denied.error, 'access_denied');
  assert.equal(ctx.takeOAuthReturn('', '', 'jb1', '/'), null);
});

test('phone login leaves the GIS popup path', function () {
  assert.match(src, /function startOAuthRedirect/);
  assert.match(src, /interactive && authPopupUnreliable\(\)/);
  assert.match(src, /location\.origin \+ '\/oauth\.html'/);
  const html = readFileSync(new URL('../public/oauth.html', import.meta.url), 'utf8');
  assert.match(html, /joelboard\.js/);
  assert.match(html, /Entrando com Google/);
  const sw = readFileSync(new URL('../public/sw.js', import.meta.url), 'utf8');
  assert.match(sw, /pathname === '\/oauth\.html'/);
});
