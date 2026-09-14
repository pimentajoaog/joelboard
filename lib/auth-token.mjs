/* OAuth token expiry helpers (unit-tested; browser uses same math in joelboard.js). */

export const TOKEN_SAFETY_MS = 120000;
export const REFRESH_LEAD_MS = 13 * 60 * 1000;
export const VISIBLE_REFRESH_MS = 15 * 60 * 1000;
export const FOCUS_BOUNCE_MS = 4000;

/** GIS requestAccessToken always opens a popup — never from a hidden tab. */
export function tabIsVisible(visibilityState) {
  if (visibilityState && visibilityState !== 'visible') return false;
  return true;
}

export function tabAllowsSilentGis(visibilityState, hasFocus) {
  if (!tabIsVisible(visibilityState)) return false;
  if (hasFocus === false) return false;
  return true;
}

export function tokenNeedsForcedRefresh(expMs, now, leadMs) {
  now = now == null ? Date.now() : now;
  leadMs = leadMs == null ? REFRESH_LEAD_MS : leadMs;
  return Number(expMs) - now <= leadMs;
}

export function ignoreAuthFocusBounce(lastSilentAt, now, bounceMs) {
  now = now == null ? Date.now() : now;
  bounceMs = bounceMs == null ? FOCUS_BOUNCE_MS : bounceMs;
  return Number(lastSilentAt) > 0 && (now - lastSilentAt) < bounceMs;
}

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
