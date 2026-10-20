/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  // Toggled per platform by useApplyTheme() (src/lib/theme.ts).
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Read from CSS variables (src/index.css) so a page can swap the whole scale; the defaults are the blues.
        primary: {
          50: 'rgb(var(--primary-50) / <alpha-value>)',
          100: 'rgb(var(--primary-100) / <alpha-value>)',
          200: 'rgb(var(--primary-200) / <alpha-value>)',
          300: 'rgb(var(--primary-300) / <alpha-value>)',
          400: 'rgb(var(--primary-400) / <alpha-value>)',
          500: 'rgb(var(--primary-500) / <alpha-value>)',
          600: 'rgb(var(--primary-600) / <alpha-value>)',
          700: 'rgb(var(--primary-700) / <alpha-value>)',
          800: 'rgb(var(--primary-800) / <alpha-value>)',
          900: 'rgb(var(--primary-900) / <alpha-value>)',
          950: 'rgb(var(--primary-950) / <alpha-value>)',
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
        // Tailwind's default monospace stack, with Noto Sans Lao so Lao text in mono labels uses the app's Lao font.
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', '"Liberation Mono"', '"Courier New"', 'Noto Sans Lao', 'monospace'],
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
        // Academy landing page
        'marquee':  'marquee 50s linear infinite',
        'orbit':    'orbit 48s linear infinite',
        'float':    'float 7s ease-in-out infinite',
        'cube':     'cube 20s linear infinite',
      },
      keyframes: {
        fadeIn:  { from: { opacity: '0' },                                  to: { opacity: '1' } },
        slideUp: { from: { transform: 'translateY(12px)', opacity: '0' },   to: { transform: 'translateY(0)', opacity: '1' } },
        marquee: { from: { transform: 'translateX(0)' },                    to: { transform: 'translateX(-50%)' } },
        orbit:   { to: { transform: 'rotate(360deg)' } },
        float:   { '0%, 100%': { transform: 'translateY(0)' },              '50%': { transform: 'translateY(-10px)' } },
        cube:    { from: { transform: 'rotateX(-24deg) rotateY(0deg)' },    to: { transform: 'rotateX(-24deg) rotateY(360deg)' } },
      }
    },
  },
  plugins: [],
}
