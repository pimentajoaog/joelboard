import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { mapSerpOffer } from '../lib/precos-serp.mjs';

const samplePath = join(dirname(fileURLToPath(import.meta.url)), '../scripts/samples/serpapi-google-shopping-rx-9070-xt.json');

describe('mapSerpOffer', () => {
  it('maps SerpApi shopping result to app offer shape', () => {
    const raw = JSON.parse(readFileSync(samplePath, 'utf8'));
    const item = raw.shopping_results[0];
    const o = mapSerpOffer(item);
    assert.ok(o);
    assert.equal(o.loja, 'Mercado Livre');
    assert.match(o.titulo, /9070/i);
    assert.ok(o.preco > 1000);
    assert.match(o.precoTexto, /R\$/);
    assert.ok(o.link);
  });

  it("keeps Google's normal price and low-price tag", () => {
    const raw = JSON.parse(readFileSync(samplePath, 'utf8'));
    const tagged = raw.shopping_results.map(mapSerpOffer).filter((o) => o && o.tag);
    assert.ok(tagged.length > 0);
    assert.ok(tagged.every((o) => o.precoNormal > 0));
    assert.match(tagged[0].tag, /pre[cç]o baixo/i);
  });
});
