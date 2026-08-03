import { checkApiAccess, clientIp, corsOriginHeader, rateLimitOk } from './lib/api-guard.mjs';

export const config = {
  matcher: ['/api/games', '/api/games/:path*', '/api/music', '/api/music/:path*', '/api/tmdb', '/api/tmdb/:path*', '/api/rawg', '/api/rawg/:path*']
};

function json(status, body, extraHeaders) {
  return new Response(JSON.stringify(body), {
    status: status,
    headers: Object.assign({ 'Content-Type': 'application/json' }, extraHeaders || {})
  });
}

export default function middleware(request) {
  if (request.method === 'OPTIONS') {
    var optAccess = checkApiAccess(request.headers);
    if (!optAccess.ok) return json(403, { error: 'Forbidden' });
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': corsOriginHeader(optAccess),
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Vary': 'Origin'
      }
    });
  }
  if (request.method !== 'GET') {
    return json(405, { error: 'Method not allowed' });
  }
  var access = checkApiAccess(request.headers);
  if (!access.ok) return json(403, { error: 'Forbidden' });
  var ip = clientIp(request.headers);
  if (!rateLimitOk(ip)) {
    return json(429, { error: 'Too many requests' }, { 'Retry-After': '60' });
  }
}
