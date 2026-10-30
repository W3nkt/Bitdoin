import React from 'react'
import ReactDOM from 'react-dom/client'
import { App } from './App'
import './index.css'
import { installLocalizedValidation } from '@/lib/formValidation'
// Catch the browser's install prompt early for the "Add to Home Screen" button.
import '@/lib/installPrompt'

installLocalizedValidation()

// App-only setup (opening animation, bundled fonts, finishing sign-in when the browser returns,
// swipe back); the web build drops this branch entirely.
if (__NATIVE_BUILD__) {
  void import('@/lib/nativeSplash').then(module => module.playNativeSplash())
  void import('@/lib/nativeFonts')
  void import('@/lib/nativeOAuth').then(module => module.installNativeOAuthListener())
  void import('@/lib/nativeBackSwipe').then(module => module.installBackSwipe())
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
