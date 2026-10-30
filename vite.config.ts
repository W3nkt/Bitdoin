import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import path from 'path'

// `vite build --mode native` builds the bundle that Capacitor ships inside the
// iOS / Android apps: no service worker (the app updates through the stores)
// and its own output folder so it never overwrites the web `dist`.
export default defineConfig(({ mode }) => {
  const native = mode === 'native'
  return {
  base: '/',
  define: {
    // Reported with My Scores usage events (src/lib/academic/usageEvents.ts).
    __APP_BUILD__: JSON.stringify(new Date().toISOString().slice(0, 10).replace(/-/g, '.')),
    __NATIVE_BUILD__: JSON.stringify(native),
  },
  plugins: [
    react(),
    // The apps bundle their fonts (src/lib/nativeFonts.ts); the Google Fonts
    // links would only delay the first paint on a slow or offline connection.
    ...(native ? [{
      name: 'native-index-html',
      transformIndexHtml: (html: string) => html.replace(/<link[^>]+fonts\.(?:googleapis|gstatic)\.com[^>]*>\s*/g, ''),
    }] : []),
    ...(native ? [] : [VitePWA({
      registerType: 'autoUpdate',
      // Register the service worker in `vite dev` too, so push notifications
      // can be turned on and tested on localhost.
      devOptions: { enabled: true },
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'masked-icon.svg'],
      manifest: {
        name: 'Bitdoin',
        short_name: 'Bitdoin',
        description: 'Book marketplace for Lao PDR',
        theme_color: '#1e3a5f',
        background_color: '#ffffff',
        display: 'standalone',
        start_url: '/',
        icons: [
          { src: 'icons/icon-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512x512.png', sizes: '512x512', type: 'image/png' }
        ]
      },
      workbox: {
        // Web Push 'push' / 'notificationclick' handlers (public/push-sw.js).
        importScripts: ['push-sw.js'],
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        skipWaiting: true,
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/.*\.supabase\.co\/storage\/v1\/object\/public\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'supabase-public-assets',
              networkTimeoutSeconds: 10,
              expiration: {
                maxEntries: 120,
                maxAgeSeconds: 60 * 60 * 24 * 7,
              },
            },
          }
        ]
      }
    })]),
  ],
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') }
  },
  build: {
    outDir: native ? 'dist-native' : 'dist',
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined
          // clsx is used by every page (cn) and by recharts; left unassigned,
          // Rollup puts it in 'charts' and every page then loads the charts
          // chunk (DASH-006, checked by scripts/bundle-budget.mjs).
          if (id.includes('react') || id.includes('react-dom') || id.includes('react-router-dom') || id.includes('/clsx/')) return 'react-vendor'
          if (id.includes('recharts') || id.includes('d3-')) return 'charts'
          if (id.includes('html2canvas')) return 'html2canvas'
          if (id.includes('@supabase')) return 'supabase'
          if (id.includes('dompurify')) return 'dompurify'
          return undefined
        },
      },
    },
  }
  }
})
