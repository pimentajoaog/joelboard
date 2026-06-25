import { defineConfig } from 'vite';

export default defineConfig({
  appType: 'mpa',
  build: {
    rollupOptions: {
      input: {
        main: 'index.html',
        finance: 'finance/index.html',
        fit: 'fit/index.html'
      }
    }
  }
});
