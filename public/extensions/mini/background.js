/* Joelboard Mini — service worker (Replace + Refresh). © 2026 Joel Soluções LTDA. */
try {
  importScripts('replace/background.js', 'refresh/background.js');
} catch (err) {
  console.error('[Joelboard Mini] service worker failed to load', err);
}
