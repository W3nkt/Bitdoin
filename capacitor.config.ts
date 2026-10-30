import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  // Placeholder. The bundle ID is permanent once registered in App Store
  // Connect and Play Console, so confirm it before creating either app record.
  appId: 'store.bitdoin.app',
  appName: 'Bitdoin',
  // Output of `npm run build:native` (vite --mode native).
  webDir: 'dist-native',
  plugins: {
    SplashScreen: {
      // Same navy as the PWA theme_color.
      backgroundColor: '#1e3a5f',
    },
  },
}

export default config
