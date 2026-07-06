/* OAuth token expiry helpers (unit-tested; browser uses same math in joelboard.js). */

export function tokenExpiryMs(expiresInSec, now) {
  now = now == null ? Date.now() : now;
  return now + (Number(expiresInSec) || 3600) * 1000 - 120000;
}

export function isTokenFresh(expMs, now) {
  now = now == null ? Date.now() : now;
  return Number(expMs) > now;
}
