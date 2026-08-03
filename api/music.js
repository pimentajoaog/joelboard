import { proxyMusicRequest } from '../lib/music-proxy.mjs';
import { applyApiCors, checkApiAccess } from '../lib/api-guard.mjs';

function requestUrl(req) {
  if (req.url && req.url.indexOf('?') >= 0) return req.url;
  if (req.url && req.query && Object.keys(req.query).length) {
    return req.url.split('?')[0] + '?' + new URLSearchParams(req.query).toString();
  }
  return req.url || '/api/music';
}

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    var optAccess = checkApiAccess(req.headers);
    if (!optAccess.ok) { res.status(403).json({ error: 'Forbidden' }); return; }
    applyApiCors(res, optAccess);
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.status(204).end();
    return;
  }
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }
  var access = checkApiAccess(req.headers);
  if (!access.ok) { res.status(403).json({ error: 'Forbidden' }); return; }
  try {
    var result = await proxyMusicRequest(requestUrl(req), process.env);
    applyApiCors(res, access);
    res.setHeader('Content-Type', 'application/json');
    res.status(result.status).end(result.body);
  } catch (_) {
    res.status(502).json({ error: 'Music catalog proxy failed' });
  }
}
