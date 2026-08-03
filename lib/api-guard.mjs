/** Shared guard for /api catalog proxies — allowed origins + per-IP rate limit. */
export const RATE_LIMIT = 100;
export const RATE_WINDOW_MS = 60000;

const buckets = new Map();

function headerGet(headers, name) {
  if (!headers) return '';
  if (typeof headers.get === 'function') return headers.get(name) || '';
  var key = name.toLowerCase();
  return String(headers[name] || headers[key] || '');
}

export function isAllowedHost(host) {
  host = String(host || '').split(':')[0].toLowerCase();
  if (!host) return false;
  if (host === 'localhost' || host === '127.0.0.1') return true;
  if (host === 'joelboard.vercel.app') return true;
  if (host.startsWith('joelboard') && host.endsWith('.vercel.app')) return true;
  return false;
}

export function isAllowedOrigin(origin) {
  origin = String(origin || '').trim();
  if (!origin) return false;
  try { return isAllowedHost(new URL(origin).host); } catch (_) { return false; }
}

export function isAllowedReferer(referer) {
  referer = String(referer || '').trim();
  if (!referer) return false;
  try { return isAllowedHost(new URL(referer).host); } catch (_) { return false; }
}

export function clientIp(headers) {
  var fwd = headerGet(headers, 'x-forwarded-for');
  if (fwd) return fwd.split(',')[0].trim();
  return headerGet(headers, 'x-real-ip') || 'unknown';
}

export function checkApiAccess(headers) {
  var origin = headerGet(headers, 'origin');
  var referer = headerGet(headers, 'referer');
  var host = headerGet(headers, 'host');
  if (isAllowedOrigin(origin)) return { ok: true, origin: origin, reason: 'origin' };
  if (isAllowedReferer(referer)) return { ok: true, origin: origin || null, reason: 'referer' };
  if (isAllowedHost(host)) return { ok: true, origin: origin || null, reason: 'host' };
  return { ok: false, origin: null, reason: 'forbidden' };
}

export function rateLimitOk(ip) {
  var now = Date.now();
  var b = buckets.get(ip);
  if (!b || now >= b.resetAt) {
    b = { count: 0, resetAt: now + RATE_WINDOW_MS };
    buckets.set(ip, b);
  }
  b.count++;
  if (buckets.size > 5000) {
    buckets.forEach(function (v, k) { if (now >= v.resetAt) buckets.delete(k); });
  }
  return b.count <= RATE_LIMIT;
}

export function corsOriginHeader(access) {
  if (access.origin && isAllowedOrigin(access.origin)) return access.origin;
  return 'https://joelboard.vercel.app';
}

export function applyApiCors(res, access) {
  var allow = corsOriginHeader(access);
  res.setHeader('Access-Control-Allow-Origin', allow);
  res.setHeader('Vary', 'Origin');
  res.setHeader('Cache-Control', 'public, max-age=300');
}

export function sendApiJson(res, status, body, extraHeaders) {
  if (typeof res.status === 'function' && typeof res.json === 'function') {
    if (extraHeaders) Object.keys(extraHeaders).forEach(function (k) { res.setHeader(k, extraHeaders[k]); });
    res.status(status).json(body);
    return;
  }
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  if (extraHeaders) Object.keys(extraHeaders).forEach(function (k) { res.setHeader(k, extraHeaders[k]); });
  res.end(JSON.stringify(body));
}

export function guardNodeApi(req, res, opts) {
  opts = opts || {};
  var access = checkApiAccess(req.headers);
  if (!access.ok) {
    sendApiJson(res, 403, { error: 'Forbidden' });
    return null;
  }
  if (opts.rateLimit !== false) {
    var ip = clientIp(req.headers);
    if (!rateLimitOk(ip)) {
      sendApiJson(res, 429, { error: 'Too many requests' }, { 'Retry-After': '60' });
      return null;
    }
  }
  return access;
}
