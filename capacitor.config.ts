import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  // Permanent: registered in App Store Connect and Play Console.
  appId: 'store.bitdoin.app',
  appName: 'Bitdoin',
  // Output of `npm run build:native` (vite --mode native).
  webDir: 'dist-native',
  plugins: {
    SplashScreen: {
      // Navy of the launch image (assets/splash.png).
      backgroundColor: '#12294a',
      // The web app drops the launch image itself once its animated opening screen is
      // painted (src/lib/nativeSplash.ts). This timeout is only the safety net.
      launchAutoHide: true,
      launchShowDuration: 5000,
      launchFadeOutDuration: 0,
      showSpinner: false,
    },
    SystemBars: {
      // The app build sets viewport-fit=cover (vite.config.ts); saying so up front avoids a layout jump on Android.
      initialViewportFitValueHint: 'cover',
    },
  },
}

export default config
