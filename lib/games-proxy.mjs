/** Unified game catalog proxy — IGDB primary, RAWG fallback. */
import { getIgdbGame, igdbConfigured, searchIgdb } from './igdb-proxy.mjs';
import { proxyRawgRequest, rawgApiKey } from './rawg-proxy.mjs';

export function gamesJsonResponse({ status, body }) {
  return new Response(body, {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'public, max-age=300'
    }
  });
}

function normalizeRawgResults(data) {
  return (data.results || []).map(function (item) {
    return {
      id: item.id,
      name: item.name || '',
      released: String(item.released || '').slice(0, 10),
      background_image: item.background_image || ''
    };
  });
}

function normalizeRawgGame(item) {
  return {
    id: item.id,
    name: item.name || '',
    released: String(item.released || '').slice(0, 10),
    background_image: item.background_image || ''
  };
}

export async function proxyGamesRequest(url, env) {
  var params = new URL(url, 'http://localhost').searchParams;
  var gameId = params.get('game');
  var search = params.get('search');
  var rawgKey = rawgApiKey(env);
  var hasIgdb = igdbConfigured(env);

  if (gameId) {
    if (hasIgdb) {
      try {
        var igdbGame = await getIgdbGame(gameId, env);
        if (igdbGame) return { status: 200, body: JSON.stringify(igdbGame) };
      } catch (_) {}
    }
    if (rawgKey) {
      try {
        var rawgOne = await proxyRawgRequest(url, rawgKey);
        if (rawgOne.status === 200) {
          var item = JSON.parse(rawgOne.body);
          return { status: 200, body: JSON.stringify(normalizeRawgGame(item)) };
        }
      } catch (_) {}
    }
    return { status: 404, body: JSON.stringify({ error: 'Game not found' }) };
  }

  if (search) {
    if (hasIgdb) {
      try {
        var igdbResults = await searchIgdb(search, env);
        if (igdbResults) return { status: 200, body: JSON.stringify(igdbResults) };
      } catch (_) {}
    }
    if (rawgKey) {
      try {
        var rawgSearch = await proxyRawgRequest(url, rawgKey);
        if (rawgSearch.status === 200) {
          var data = JSON.parse(rawgSearch.body);
          return {
            status: 200,
            body: JSON.stringify({ results: normalizeRawgResults(data), source: 'rawg' })
          };
        }
      } catch (_) {}
    }
    if (!hasIgdb && !rawgKey) {
      return { status: 503, body: JSON.stringify({ error: 'No game catalog configured' }) };
    }
    return { status: 502, body: JSON.stringify({ error: 'Game catalog unavailable' }) };
  }

  return { status: 400, body: JSON.stringify({ error: 'Missing search or game param' }) };
}
