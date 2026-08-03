/** TMDB proxy — API key stays server-side. */
const FETCH_TIMEOUT_MS = 8000;
const KEY_NAMES = ['TMDB_API_KEY', 'VITE_TMDB_API_KEY', 'TMDB_KEY', 'THEMOVIEDB_API_KEY'];

function fetchWithTimeout(url, opts) {
  return fetch(url, Object.assign({}, opts, { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) }));
}

export function tmdbKeyPresence(env) {
  var out = {};
  KEY_NAMES.forEach(function (name) {
    out[name] = !!(env && String(env[name] || '').trim());
  });
  return out;
}

export function tmdbApiKey(env) {
  for (var i = 0; i < KEY_NAMES.length; i++) {
    var val = String(env?.[KEY_NAMES[i]] || '').trim();
    if (val) return { key: val, source: KEY_NAMES[i] };
  }
  return { key: '', source: '' };
}

function isBearerToken(key) {
  return String(key || '').indexOf('eyJ') === 0;
}

async function tmdbFetchApi(tmdbPath, key) {
  var url = 'https://api.themoviedb.org/3' + tmdbPath;
  var opts = {};
  if (isBearerToken(key)) {
    opts.headers = { Authorization: 'Bearer ' + key, Accept: 'application/json' };
  } else {
    var sep = tmdbPath.indexOf('?') >= 0 ? '&' : '?';
    url += sep + 'api_key=' + encodeURIComponent(key);
  }
  return fetchWithTimeout(url, opts);
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
  var auth = tmdbApiKey(env);
  if (!auth.key) {
    return {
      status: 503,
      body: JSON.stringify({
        error: 'TMDB key not configured',
        hint: 'Set TMDB_API_KEY on Vercel (Production) and redeploy.',
        env: tmdbKeyPresence(env)
      })
    };
  }
  var params = new URL(url, 'http://localhost').searchParams;
  if (params.get('ping') === '1') {
    return {
      status: 200,
      body: JSON.stringify({ ok: true, source: auth.source, bearer: isBearerToken(auth.key) })
    };
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
  var res = await tmdbFetchApi(tmdbPath, auth.key);
  return { status: res.status, body: await res.text() };
}
