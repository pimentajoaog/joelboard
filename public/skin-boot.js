/* Apply saved skin/mode on <html> before paint (read by themes.css). © 2026 Joel Soluções LTDA. */
(function () {
  try {
    var path = (location.pathname || '/').replace(/\/index\.html$/i, '').replace(/\/+$/, '') || '/';
    var app = path === '/' ? 'hub' : (path.split('/').filter(Boolean)[0] || 'hub');
    var skin = localStorage.getItem('jb_skin_' + app);
    var mode = localStorage.getItem('jb_mode_' + app);
    var root = document.documentElement;
    if (skin && skin !== 'default') root.setAttribute('data-skin', skin);
    if (mode) root.setAttribute('data-mode', mode);
  } catch (_) {}
})();
