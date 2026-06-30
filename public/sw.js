const C = 'joelboard-v3';
const SHELL = ['/', '/icon-192.png', '/icon-512.png', '/favicon-32.png', '/apple-touch-icon.png'];
const CORE = /\/(joelboard|themes|finance|fit|study|hub|notas)\.(js|css)$/;
self.addEventListener('install', e => { e.waitUntil(caches.open(C).then(c => c.addAll(SHELL)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== C).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  const u = new URL(e.request.url);
  if (e.request.method !== 'GET' || u.origin !== location.origin) return;
  const mustRevalidate = (u.pathname === '/') || u.pathname.endsWith('.html') || CORE.test(u.pathname);
  const req = mustRevalidate ? new Request(e.request, { cache: 'reload' }) : e.request;
  e.respondWith(
    fetch(req).then(r => { const cp = r.clone(); caches.open(C).then(c => c.put(e.request, cp)); return r; })
      .catch(() => caches.match(e.request).then(m => m || caches.match('/')))
  );
});
