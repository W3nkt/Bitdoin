import React from 'react'
import ReactDOM from 'react-dom/client'
import { App } from './App'
import './index.css'
import { installLocalizedValidation } from '@/lib/formValidation'
// Catch the browser's install prompt early for the "Add to Home Screen" button.
import '@/lib/installPrompt'

installLocalizedValidation()

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
