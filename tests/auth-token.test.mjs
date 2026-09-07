import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  tokenExpiryMs,
  isTokenFresh,
  shouldRefreshSoon,
  shouldAdoptSharedToken,
  REFRESH_LEAD_MS,
  VISIBLE_REFRESH_MS,
} from '../lib/auth-token.mjs';

describe('tokenExpiryMs', () => {
  it('subtracts 2 minute safety margin', () => {
    const now = 1_000_000_000_000;
    assert.equal(tokenExpiryMs(3600, now), now + 3600 * 1000 - 120000);
  });
});

describe('isTokenFresh', () => {
  it('true when expiry is in the future', () => {
    assert.equal(isTokenFresh(Date.now() + 5000, Date.now()), true);
  });
  it('false when expiry passed', () => {
    assert.equal(isTokenFresh(Date.now() - 1, Date.now()), false);
  });
});

describe('shouldRefreshSoon', () => {
  it('true when remaining time is inside the 13-minute lead', () => {
    const now = 1_000_000_000_000;
    assert.equal(shouldRefreshSoon(now + REFRESH_LEAD_MS, now), true);
    assert.equal(shouldRefreshSoon(now + REFRESH_LEAD_MS - 1, now), true);
  });
  it('false when more than the lead remains', () => {
    const now = 1_000_000_000_000;
    assert.equal(shouldRefreshSoon(now + REFRESH_LEAD_MS + 1, now), false);
  });
  it('visible path uses a 15-minute window', () => {
    const now = 1_000_000_000_000;
    assert.equal(shouldRefreshSoon(now + VISIBLE_REFRESH_MS, now, VISIBLE_REFRESH_MS), true);
    assert.equal(shouldRefreshSoon(now + VISIBLE_REFRESH_MS + 1, now, VISIBLE_REFRESH_MS), false);
  });
});

describe('shouldAdoptSharedToken', () => {
  it('adopts a newer unexpired token from another tab', () => {
    const now = 1_000_000_000_000;
    assert.equal(shouldAdoptSharedToken(now + 60_000, now + 120_000, now), true);
  });
  it('does not overwrite a newer local token with an older tab', () => {
    const now = 1_000_000_000_000;
    assert.equal(shouldAdoptSharedToken(now + 120_000, now + 60_000, now), false);
  });
  it('ignores an already expired incoming token', () => {
    const now = 1_000_000_000_000;
    assert.equal(shouldAdoptSharedToken(0, now - 1, now), false);
  });
});
