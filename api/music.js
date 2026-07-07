import { proxyMusicRequest } from '../lib/music-proxy.mjs';

function sendCors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 'public, max-age=300');
}

function requestUrl(req) {
  if (req.url && req.url.indexOf('?') >= 0) return req.url;
  if (req.url && req.query && Object.keys(req.query).length) {
    return req.url.split('?')[0] + '?' + new URLSearchParams(req.query).toString();
  }
  return req.url || '/api/music';
}

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    sendCors(res);
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.status(204).end();
    return;
  }
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }
  try {
    var result = await proxyMusicRequest(requestUrl(req), process.env);
    sendCors(res);
    res.setHeader('Content-Type', 'application/json');
    res.status(result.status).end(result.body);
  } catch (_) {
    res.status(502).json({ error: 'Music catalog proxy failed' });
  }
}
