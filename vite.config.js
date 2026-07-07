import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const tmdbKey = JSON.stringify(env.VITE_TMDB_API_KEY || '');

  return {
    appType: 'mpa',
    build: {
      rollupOptions: {
        input: {
          main: 'index.html',
          finance: 'finance/index.html',
          fit: 'fit/index.html',
          study: 'study/index.html',
          notas: 'notas/index.html',
          prateleira: 'prateleira/index.html',
          movies: 'movies/index.html',
          mini: 'mini/index.html'
        }
      }
    },
    plugins: [{
      name: 'inject-tmdb-key',
      transformIndexHtml: {
        order: 'pre',
        handler(html, ctx) {
          if (!ctx.filename || ctx.filename.indexOf('prateleira') < 0) return html;
          var tag = '<script>window.JB_TMDB_KEY=' + tmdbKey + ';</script>';
          return html.replace('<script src="/joelboard.js"></script>', tag + '\n<script src="/joelboard.js"></script>');
        }
      }
    }]
  };
});
