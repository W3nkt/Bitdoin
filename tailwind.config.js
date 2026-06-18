/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          50:  '#f0f4ff',
          100: '#e0e9ff',
          200: '#c0d0ff',
          300: '#9ab3ff',
          400: '#6b8aff',
          500: '#3b5ff0',
          600: '#2346d9',
          700: '#1e3a5f',
          800: '#162d4a',
          900: '#0f1f35',
          950: '#070f1c',
        },
        accent: {
          50:  '#fff7ed',
          100: '#ffedd5',
          200: '#fed7aa',
          300: '#fdba74',
          400: '#fb923c',
          500: '#f97316',
          600: '#ea580c',
          700: '#c2410c',
        },
        lao: {
          red:   '#CE1126',
          blue:  '#002868',
          white: '#FFFFFF',
        }
      },
      fontFamily: {
        sans: ['Inter', 'Noto Sans Thai', 'Noto Sans Lao', 'sans-serif'],
        lao:  ['Noto Sans Lao', 'sans-serif'],
        thai: ['Noto Sans Thai', 'sans-serif'],
      },
      boxShadow: {
        'book':       '0 20px 60px -8px rgba(0,0,0,0.4), 0 6px 20px -4px rgba(0,0,0,0.25)',
        'card':       '0 2px 12px rgba(0,0,0,0.06), 0 1px 3px rgba(0,0,0,0.04)',
        'card-hover': '0 10px 36px rgba(0,0,0,0.13), 0 2px 8px rgba(0,0,0,0.07)',
        'up':         '0 -2px 12px -2px rgba(0,0,0,0.08)',
        'action-bar': '0 -4px 24px rgba(0,0,0,0.10)',
      },
      animation: {
        'fade-in':  'fadeIn 0.25s ease-out',
        'slide-up': 'slideUp 0.3s ease-out',
      },
      keyframes: {
        fadeIn:  { from: { opacity: '0' },                                  to: { opacity: '1' } },
        slideUp: { from: { transform: 'translateY(12px)', opacity: '0' },   to: { transform: 'translateY(0)', opacity: '1' } },
      }
    },
  },
  plugins: [],
}
