import { defineConfig, loadEnv } from 'vite';
import { proxyRawgRequest, rawgApiKey, rawgJsonResponse } from './lib/rawg-proxy.mjs';

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
    }, {
      name: 'rawg-dev-proxy',
      configureServer(server) {
        server.middlewares.use(async function (req, res, next) {
          if (!req.url || req.url.indexOf('/api/rawg') !== 0) return next();
          if (req.method === 'OPTIONS') {
            res.statusCode = 204;
            res.setHeader('Access-Control-Allow-Origin', '*');
            res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
            res.end();
            return;
          }
          if (req.method !== 'GET') {
            res.statusCode = 405;
            res.end(JSON.stringify({ error: 'Method not allowed' }));
            return;
          }
          try {
            var result = await proxyRawgRequest(req.url, rawgApiKey(env));
            var response = rawgJsonResponse(result);
            res.statusCode = response.status;
            response.headers.forEach(function (v, k) { res.setHeader(k, v); });
            res.end(await response.text());
          } catch (err) {
            res.statusCode = 502;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: 'RAWG proxy failed' }));
          }
        });
      }
    }]
  };
});
