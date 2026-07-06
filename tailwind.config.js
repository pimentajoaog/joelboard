/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './finance/index.html', './fit/index.html', './study/index.html', './notas/index.html', './src/**/*.css'],
  // Apps keep their own resets; disable preflight so adopting utilities never changes existing looks.
  corePlugins: { preflight: false },
  theme: {
    extend: {
      // Tokens point at CSS variables — each app's :root (and each Finance skin) supplies the value.
      colors: {
        bg: 'var(--bg)',
        surface: 'var(--surface)',
        surface2: 'var(--surface2)',
        border: 'var(--border)',
        accent2: 'var(--accent2)',
        ink: 'var(--text)',
        muted: 'var(--muted)',
        primary: 'var(--primary)',
        income: 'var(--income)',
        success: 'var(--success)',
        fit: 'var(--fit)'
      },
      fontFamily: {
        sans: ['Hanken Grotesk', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif']
      }
    }
  },
  plugins: []
};
