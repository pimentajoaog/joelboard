import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { rawFromCapturaRows } from '../lib/precos-capturas.mjs';

describe('rawFromCapturaRows', () => {
  it('builds day map for one busca', () => {
    const rows = [
      { buscaId: 'gpu', data: '2026-10-07', json: '[{"loja":"L","titulo":"X","preco":1000}]' },
      { buscaId: 'gpu', data: '2026-10-08', json: '[{"loja":"M","titulo":"Y","preco":900}]' },
      { buscaId: 'other', data: '2026-10-08', json: '[{"loja":"Z","titulo":"Z","preco":1}]' }
    ];
    const raw = rawFromCapturaRows(rows, 'gpu');
    assert.equal(Object.keys(raw).length, 2);
    assert.equal(raw['2026-10-08'][0].preco, 900);
  });
});
