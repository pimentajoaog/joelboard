/* OAuth token expiry helpers (unit-tested; browser uses same math in joelboard.js). */

export const TOKEN_SAFETY_MS = 120000;
export const REFRESH_LEAD_MS = 13 * 60 * 1000;
export const VISIBLE_REFRESH_MS = 15 * 60 * 1000;

export function tokenExpiryMs(expiresInSec, now) {
  now = now == null ? Date.now() : now;
  return now + (Number(expiresInSec) || 3600) * 1000 - TOKEN_SAFETY_MS;
}

export function isTokenFresh(expMs, now) {
  now = now == null ? Date.now() : now;
  return Number(expMs) > now;
}

export function shouldRefreshSoon(expMs, now, leadMs) {
  now = now == null ? Date.now() : now;
  leadMs = leadMs == null ? REFRESH_LEAD_MS : leadMs;
  return Number(expMs) - now <= leadMs;
}

export function shouldAdoptSharedToken(currentExp, incomingExp, now) {
  now = now == null ? Date.now() : now;
  incomingExp = Number(incomingExp) || 0;
  currentExp = Number(currentExp) || 0;
  if (incomingExp <= now) return false;
  return incomingExp > currentExp;
}
