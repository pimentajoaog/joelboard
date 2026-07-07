import { defineConfig } from 'vite';

export default defineConfig({
  appType: 'mpa',
  build: {
    rollupOptions: {
      input: {
        main: 'index.html',
        finance: 'finance/index.html',
        fit: 'fit/index.html',
        study: 'study/index.html',
        notas: 'notas/index.html',
        movies: 'movies/index.html',
        mini: 'mini/index.html'
      }
    }
  }
});
