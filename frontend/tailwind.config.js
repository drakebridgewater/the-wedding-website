/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './src/**/*.{ts,tsx}',
    '../templates/**/*.html',
    '../**/templates/**/*.html',
  ],
  theme: {
    extend: {
      fontFamily: {
        'script': ['Great Vibes', 'cursive'],
        'display': ['Cormorant Garamond', 'Georgia', 'serif'],
      },
      colors: {
        rose: {
          50: '#fff1f2',
          100: '#ffe4e6',
          200: '#fecdd3',
          300: '#fda4af',
          400: '#fb7185',
          500: '#f43f5e',
          600: '#e11d48',
          700: '#be123c',
          800: '#9f1239',
          900: '#881337',
        },
      },
    },
  },
  plugins: [],
}
