import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { buscasRowsToWatch, formatPrecosWatchJson } from '../lib/precos-watch.mjs';

describe('buscasRowsToWatch', () => {
  it('skips header and archived rows', () => {
    const rows = [
      ['ID', 'Termo', 'Teto', 'Obrigatorias', 'Proibidas', 'Arquivada', 'Criado'],
      ['rx-9070-xt', 'RX 9070 XT', '', '', '', false, 1],
      ['old-gpu', 'GTX 1080', '', '', '', true, 2],
      ['', 'empty id', '', '', '', false, 3]
    ];
    const w = buscasRowsToWatch(rows);
    assert.equal(w.length, 1);
    assert.deepEqual(w[0], { id: 'rx-9070-xt', termo: 'RX 9070 XT' });
  });

  it('dedupes by id keeping the last row', () => {
    const rows = [
      ['ID', 'Termo'],
      ['a', 'First term'],
      ['a', 'Updated term']
    ];
    const w = buscasRowsToWatch(rows);
    assert.equal(w.length, 1);
    assert.equal(w[0].termo, 'Updated term');
  });

  it('formats stable JSON', () => {
    const s = formatPrecosWatchJson([{ id: 'x', termo: 'Y' }]);
    assert.match(s, /"id": "x"/);
    assert.ok(s.endsWith('\n'));
  });
});
