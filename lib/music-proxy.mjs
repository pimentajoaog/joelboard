/** MusicBrainz + Cover Art Archive proxy (no API key — User-Agent required). */
var MB_BASE = 'https://musicbrainz.org/ws/2';
var lastMbAt = 0;

export function musicJsonResponse({ status, body }) {
  return new Response(body, {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'public, max-age=3600'
    }
  });
}

export function musicbrainzContact(env) {
  return String(env.MUSICBRAINZ_CONTACT || env.VITE_MUSICBRAINZ_CONTACT || 'joelboard.vercel.app').trim();
}

export function musicbrainzUserAgent(env) {
  return 'Julioelboard/1.0 (' + musicbrainzContact(env) + ')';
}

function coverArtUrl(mbid) {
  if (!mbid) return '';
  return 'https://coverartarchive.org/release-group/' + encodeURIComponent(mbid) + '/front-500';
}

function artistNames(credits) {
  return (credits || []).map(function (c) {
    return c.name || (c.artist && c.artist.name) || '';
  }).filter(Boolean).join(', ');
}

function normalizeReleaseGroup(rg, withCover) {
  var id = rg.id || '';
  var out = {
    id: id,
    name: rg.title || '',
    artist: artistNames(rg['artist-credit']),
    released: String(rg['first-release-date'] || '').slice(0, 10),
    type: rg['primary-type'] || ''
  };
  if (withCover) out.cover = coverArtUrl(id);
  return out;
}

async function mbThrottle() {
  var now = Date.now();
  var wait = Math.max(0, 1000 - (now - lastMbAt));
  if (wait) await new Promise(function (r) { setTimeout(r, wait); });
  lastMbAt = Date.now();
}

async function mbFetch(path, env) {
  await mbThrottle();
  var res = await fetch(MB_BASE + path, {
    headers: {
      'User-Agent': musicbrainzUserAgent(env),
      Accept: 'application/json'
    }
  });
  var text = await res.text();
  if (!res.ok) {
    var err = new Error('musicbrainz-' + res.status);
    err.status = res.status;
    err.body = text;
    throw err;
  }
  return text ? JSON.parse(text) : {};
}

function isUuid(id) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(id || ''));
}

export async function proxyMusicRequest(url, env) {
  var params = new URL(url, 'http://localhost').searchParams;
  var albumId = params.get('album');
  var search = params.get('search');

  if (params.get('ping') === '1') {
    return {
      status: 200,
      body: JSON.stringify({ ok: true, contact: musicbrainzContact(env) })
    };
  }

  if (albumId) {
    if (!isUuid(albumId)) {
      return { status: 400, body: JSON.stringify({ error: 'Invalid album id' }) };
    }
    try {
      var one = await mbFetch('/release-group/' + encodeURIComponent(albumId) + '?inc=artist-credits&fmt=json', env);
      return { status: 200, body: JSON.stringify(normalizeReleaseGroup(one, true)) };
    } catch (e) {
      if (e.status === 404) {
        return { status: 404, body: JSON.stringify({ error: 'Album not found' }) };
      }
      return { status: 502, body: JSON.stringify({ error: 'MusicBrainz unavailable' }) };
    }
  }

  if (search) {
    var q = String(search).trim();
    if (!q) {
      return { status: 400, body: JSON.stringify({ error: 'Empty search' }) };
    }
    try {
      var data = await mbFetch(
        '/release-group?query=' + encodeURIComponent(q) + '&inc=artist-credits&fmt=json&limit=14',
        env
      );
      var list = (data['release-groups'] || []).map(function (rg) {
        return normalizeReleaseGroup(rg, true);
      });
      return { status: 200, body: JSON.stringify({ results: list, source: 'musicbrainz' }) };
    } catch (_) {
      return { status: 502, body: JSON.stringify({ error: 'MusicBrainz unavailable' }) };
    }
  }

  return { status: 400, body: JSON.stringify({ error: 'Missing search or album param' }) };
}
