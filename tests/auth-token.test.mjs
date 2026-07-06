import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { tokenExpiryMs, isTokenFresh } from '../lib/auth-token.mjs';

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
