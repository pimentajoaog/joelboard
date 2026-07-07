/** IGDB (Twitch) game catalog — OAuth client-credentials, server-side only. */
let tokenCache = { value: null, expires: 0 };

export function igdbCredentials(env) {
  return {
    clientId: String(env?.TWITCH_CLIENT_ID || env?.IGDB_CLIENT_ID || '').trim(),
    clientSecret: String(env?.TWITCH_CLIENT_SECRET || env?.IGDB_CLIENT_SECRET || '').trim()
  };
}

export function igdbConfigured(env) {
  var creds = igdbCredentials(env);
  return !!(creds.clientId && creds.clientSecret);
}

async function getIgdbToken(clientId, clientSecret) {
  if (tokenCache.value && Date.now() < tokenCache.expires) return tokenCache.value;
  var qs = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    grant_type: 'client_credentials'
  });
  var res = await fetch('https://id.twitch.tv/oauth2/token?' + qs.toString(), { method: 'POST' });
  if (!res.ok) throw new Error('igdb-auth-' + res.status);
  var data = await res.json();
  tokenCache.value = data.access_token;
  tokenCache.expires = Date.now() + Math.max(0, (data.expires_in || 3600) - 120) * 1000;
  return tokenCache.value;
}

function igdbCoverUrl(imageId) {
  if (!imageId) return '';
  return 'https://images.igdb.com/igdb/image/upload/t_cover_big/' + imageId + '.jpg';
}

function igdbReleaseDate(ts) {
  if (!ts) return '';
  return new Date(ts * 1000).toISOString().slice(0, 10);
}

function escapeIgdbSearch(q) {
  return String(q || '').replace(/\\/g, '\\\\').replace(/"/g, '\\"').trim();
}

export function normalizeIgdbGame(g) {
  var imageId = g?.cover?.image_id || '';
  return {
    id: g.id,
    name: g.name || '',
    released: igdbReleaseDate(g.first_release_date),
    background_image: igdbCoverUrl(imageId)
  };
}

async function igdbQuery(body, clientId, token) {
  var res = await fetch('https://api.igdb.com/v4/games', {
    method: 'POST',
    headers: {
      'Client-ID': clientId,
      Authorization: 'Bearer ' + token,
      'Content-Type': 'text/plain',
      Accept: 'application/json'
    },
    body
  });
  if (!res.ok) throw new Error('igdb-' + res.status);
  return res.json();
}

export async function searchIgdb(query, env) {
  var creds = igdbCredentials(env);
  if (!igdbConfigured(env)) return null;
  var q = escapeIgdbSearch(query);
  if (!q) return { results: [], source: 'igdb' };
  var token = await getIgdbToken(creds.clientId, creds.clientSecret);
  var body = 'fields id,name,first_release_date,cover.image_id; search "' + q + '"; where version_parent = null; limit 14;';
  var games = await igdbQuery(body, creds.clientId, token);
  return { results: games.map(normalizeIgdbGame), source: 'igdb' };
}

export async function getIgdbGame(id, env) {
  var gameId = parseInt(String(id), 10);
  if (!Number.isFinite(gameId)) return null;
  if (!igdbConfigured(env)) return null;
  var creds = igdbCredentials(env);
  var token = await getIgdbToken(creds.clientId, creds.clientSecret);
  var body = 'fields id,name,first_release_date,cover.image_id; where id = ' + gameId + '; limit 1;';
  var games = await igdbQuery(body, creds.clientId, token);
  if (!games.length) return null;
  return normalizeIgdbGame(games[0]);
}
