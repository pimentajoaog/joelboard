/** TMDB proxy — API key stays server-side. */
const FETCH_TIMEOUT_MS = 8000;

function fetchWithTimeout(url, opts) {
  return fetch(url, Object.assign({}, opts, { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) }));
}

export function tmdbApiKey(env) {
  return String(env?.TMDB_API_KEY || '').trim();
}

export function tmdbJsonResponse({ status, body }) {
  return new Response(body, {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'public, max-age=300'
    }
  });
}

export async function proxyTmdbRequest(url, env) {
  var key = tmdbApiKey(env);
  if (!key) {
    return { status: 503, body: JSON.stringify({ error: 'TMDB key not configured' }) };
  }
  var params = new URL(url, 'http://localhost').searchParams;
  if (params.get('ping') === '1') {
    return { status: 200, body: JSON.stringify({ ok: true }) };
  }
  var search = params.get('search');
  var movie = params.get('movie');
  var tv = params.get('tv');
  var tmdbPath = '';
  if (search) {
    tmdbPath = '/search/multi?query=' + encodeURIComponent(String(search).trim()) + '&language=pt-BR';
  } else if (movie) {
    tmdbPath = '/movie/' + encodeURIComponent(movie) + '?language=pt-BR';
  } else if (tv) {
    tmdbPath = '/tv/' + encodeURIComponent(tv) + '?language=pt-BR';
  } else {
    return { status: 400, body: JSON.stringify({ error: 'Missing search, movie, or tv param' }) };
  }
  var sep = tmdbPath.indexOf('?') >= 0 ? '&' : '?';
  var tmdbUrl = 'https://api.themoviedb.org/3' + tmdbPath + sep + 'api_key=' + encodeURIComponent(key);
  var res = await fetchWithTimeout(tmdbUrl);
  return { status: res.status, body: await res.text() };
}
