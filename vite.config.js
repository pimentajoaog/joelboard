import { defineConfig, loadEnv } from 'vite';
import { gamesJsonResponse, proxyGamesRequest } from './lib/games-proxy.mjs';
import { musicJsonResponse, proxyMusicRequest } from './lib/music-proxy.mjs';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const tmdbKey = JSON.stringify(env.VITE_TMDB_API_KEY || '');

  async function handleMusicApi(req, res) {
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
      var musicResult = await proxyMusicRequest(req.url.replace(/^\/api\/music/, '/api/music'), env);
      var musicResponse = musicJsonResponse(musicResult);
      res.statusCode = musicResponse.status;
      musicResponse.headers.forEach(function (v, k) { res.setHeader(k, v); });
      res.end(await musicResponse.text());
    } catch (_) {
      res.statusCode = 502;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ error: 'Music catalog proxy failed' }));
    }
  }

  async function handleGamesApi(req, res) {
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
      var result = await proxyGamesRequest(req.url.replace(/^\/api\/(games|rawg)/, '/api/games'), env);
      var response = gamesJsonResponse(result);
      res.statusCode = response.status;
      response.headers.forEach(function (v, k) { res.setHeader(k, v); });
      res.end(await response.text());
    } catch (_) {
      res.statusCode = 502;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ error: 'Game catalog proxy failed' }));
    }
  }

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
      name: 'api-dev-proxy',
      configureServer(server) {
        server.middlewares.use(async function (req, res, next) {
          if (!req.url) return next();
          if (req.url.indexOf('/api/music') === 0) {
            await handleMusicApi(req, res);
            return;
          }
          if (req.url.indexOf('/api/games') === 0 || req.url.indexOf('/api/rawg') === 0) {
            await handleGamesApi(req, res);
            return;
          }
          next();
        });
      }
    }]
  };
});
