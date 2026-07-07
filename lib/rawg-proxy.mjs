/** Proxy RAWG API — key stays server-side (no browser CORS). */
export function rawgApiKey(env) {
  return String(env?.RAWG_API_KEY || env?.VITE_RAWG_API_KEY || '').trim();
}

export async function proxyRawgRequest(url, key) {
  if (!key) {
    return { status: 503, body: JSON.stringify({ error: 'RAWG key not configured' }) };
  }
  const params = new URL(url, 'http://localhost').searchParams;
  const gameId = params.get('game');
  const endpoint = gameId ? ('games/' + encodeURIComponent(gameId)) : (params.get('endpoint') || 'games');
  params.delete('game');
  params.delete('endpoint');
  params.set('key', key);
  const rawgUrl = 'https://api.rawg.io/api/' + endpoint + '?' + params.toString();
  const res = await fetch(rawgUrl);
  return { status: res.status, body: await res.text() };
}

export function rawgJsonResponse({ status, body }) {
  return new Response(body, {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'public, max-age=300'
    }
  });
}
