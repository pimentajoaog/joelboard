import { defineConfig, loadEnv } from 'vite';
import { proxyGamesRequest } from './lib/games-proxy.mjs';
import { proxyMusicRequest } from './lib/music-proxy.mjs';
import { proxyTmdbRequest } from './lib/tmdb-proxy.mjs';
import { applyApiCors, guardNodeApi } from './lib/api-guard.mjs';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const hubNewsSheetId = JSON.stringify(env.VITE_HUB_NEWS_SHEET_ID || '');

  function preflight(req, res, access) {
    applyApiCors(res, access);
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.statusCode = 204;
    res.end();
  }

  async function handleMusicApi(req, res) {
    if (req.method === 'OPTIONS') {
      var optAccess = guardNodeApi(req, res);
      if (!optAccess) return;
      preflight(req, res, optAccess);
      return;
    }
    if (req.method !== 'GET') {
      res.statusCode = 405;
      res.end(JSON.stringify({ error: 'Method not allowed' }));
      return;
    }
    var access = guardNodeApi(req, res);
    if (!access) return;
    try {
      var musicResult = await proxyMusicRequest(req.url.replace(/^\/api\/music/, '/api/music'), env);
      applyApiCors(res, access);
      res.statusCode = musicResult.status;
      res.setHeader('Content-Type', 'application/json');
      res.end(musicResult.body);
    } catch (_) {
      res.statusCode = 502;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ error: 'Music catalog proxy failed' }));
    }
  }

  async function handleTmdbApi(req, res) {
    if (req.method === 'OPTIONS') {
      var optAccess = guardNodeApi(req, res);
      if (!optAccess) return;
      preflight(req, res, optAccess);
      return;
    }
    if (req.method !== 'GET') {
      res.statusCode = 405;
      res.end(JSON.stringify({ error: 'Method not allowed' }));
      return;
    }
    var access = guardNodeApi(req, res);
    if (!access) return;
    try {
      var tmdbResult = await proxyTmdbRequest(req.url.replace(/^\/api\/tmdb/, '/api/tmdb'), env);
      applyApiCors(res, access);
      res.statusCode = tmdbResult.status;
      res.setHeader('Content-Type', 'application/json');
      res.end(tmdbResult.body);
    } catch (_) {
      res.statusCode = 502;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ error: 'TMDB proxy failed' }));
    }
  }

  async function handleGamesApi(req, res) {
    if (req.method === 'OPTIONS') {
      var optAccess = guardNodeApi(req, res);
      if (!optAccess) return;
      preflight(req, res, optAccess);
      return;
    }
    if (req.method !== 'GET') {
      res.statusCode = 405;
      res.end(JSON.stringify({ error: 'Method not allowed' }));
      return;
    }
    var access = guardNodeApi(req, res);
    if (!access) return;
    try {
      var result = await proxyGamesRequest(req.url.replace(/^\/api\/(games|rawg)/, '/api/games'), env);
      applyApiCors(res, access);
      res.statusCode = result.status;
      res.setHeader('Content-Type', 'application/json');
      res.end(result.body);
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
          mini: 'mini/index.html',
          miniReplaceAuth: 'mini/replace-auth.html'
        }
      }
    },
    plugins: [{
      name: 'inject-hub-news-sheet-id',
      transformIndexHtml: {
        order: 'pre',
        handler(html, ctx) {
          if (!ctx.filename || !ctx.filename.endsWith('index.html')) return html;
          var tag = '<script>window.JB_HUB_NEWS_SHEET_ID=' + hubNewsSheetId + ';</script>';
          return html.replace('<script src="/joelboard.js"></script>', tag + '\n<script src="/joelboard.js"></script>');
        }
      }
    }, {
      name: 'api-dev-proxy',
      configureServer(server) {
        server.middlewares.use(async function (req, res, next) {
          if (!req.url) return next();
          if (req.url.indexOf('/api/tmdb') === 0) {
            await handleTmdbApi(req, res);
            return;
          }
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
