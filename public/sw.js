const C = 'joelboard-8dfb4e8';
const SHELL = ['/', '/icon-192.png', '/icon-512.png', '/favicon-32.png', '/apple-touch-icon.png'];
const CORE = /\/(joelboard|themes|finance|finance-math|finance-sheets|fit|fit-macros|study|hub|notas|mini|prateleira|movies)\.(js|css)$/;
const CORE_JSON = /^\/fit-foods\.json$/;
self.addEventListener('install', e => { e.waitUntil(caches.open(C).then(c => c.addAll(SHELL)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== C).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  const u = new URL(e.request.url);
  if (e.request.method !== 'GET' || u.origin !== location.origin) return;
  const mustRevalidate = (u.pathname === '/') || u.pathname.endsWith('.html') || CORE.test(u.pathname) || CORE_JSON.test(u.pathname);
  const req = mustRevalidate ? new Request(e.request, { cache: 'reload' }) : e.request;
  e.respondWith(
    fetch(req).then(r => { const cp = r.clone(); caches.open(C).then(c => c.put(e.request, cp)); return r; })
      .catch(() => caches.match(e.request).then(m => m || caches.match('/')))
  );
});
