/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './finance/index.html', './fit/index.html'],
  // Fit keeps its own reset; disable Tailwind's preflight so adopting utilities never changes existing looks.
  corePlugins: { preflight: false },
  theme: {
    extend: {
      colors: {
        bg: '#0d0f18',
        surface: '#191d2c',
        surface2: '#232838',
        border: '#2d3346',
        accent: '#fb7185',
        accent2: '#3a2530',
        ink: '#e7eaf3',
        muted: '#7b85a0',
        ok: '#34d399'
      },
      fontFamily: {
        sans: ['Hanken Grotesk', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif']
      }
    }
  },
  plugins: []
};
