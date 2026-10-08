import {
  flattenShopping,
  mapSerpOffer,
  saneSerpOffer,
  prevDayMinFromRaw
} from './precos-serp.mjs';

export async function fetchSerpShoppingOffers(q, apiKey, opts) {
  opts = opts || {};
  const term = String(q || '').trim();
  if (!term) throw new Error('Missing search term');
  if (!apiKey) throw new Error('Missing SERPAPI_KEY');

  const url = new URL('https://serpapi.com/search.json');
  url.searchParams.set('engine', 'google_shopping');
  url.searchParams.set('q', term);
  url.searchParams.set('gl', 'br');
  url.searchParams.set('hl', 'pt-br');
  url.searchParams.set('google_domain', 'google.com.br');
  url.searchParams.set('api_key', apiKey);

  const res = await fetch(url);
  const json = await res.json();
  if (!res.ok) {
    throw new Error(json.error || json.error_message || res.statusText || 'SerpApi failed');
  }

  const items = flattenShopping(json);
  const prevMin = opts.prevDayMin != null ? opts.prevDayMin : null;
  const offers = [];
  items.forEach(function (it) {
    const o = mapSerpOffer(it);
    if (o && saneSerpOffer(o, prevMin)) offers.push(o);
  });
  return { offers: offers, rawCount: items.length };
}

export function proxyPrecosRequest(url, env) {
  const u = new URL(url, 'http://local');
  const q = (u.searchParams.get('q') || '').trim();
  if (!q) {
    return Promise.resolve({ status: 400, body: JSON.stringify({ error: 'Missing q' }) });
  }
  const key = env.SERPAPI_KEY;
  if (!key) {
    return Promise.resolve({ status: 503, body: JSON.stringify({ error: 'Preços search not configured' }) });
  }
  return fetchSerpShoppingOffers(q, key).then(function (result) {
    const today = new Date().toISOString().slice(0, 10);
    return {
      status: 200,
      body: JSON.stringify({
        q: q,
        date: today,
        offers: result.offers,
        rawCount: result.rawCount
      })
    };
  }).catch(function (e) {
    return { status: 502, body: JSON.stringify({ error: e.message || 'Search failed' }) };
  });
}
