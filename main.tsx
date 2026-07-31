import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { registerSW } from 'virtual:pwa-register'
import App from './App'
import { LanguageProvider } from './lib/i18n'
import './index.css'

// autoUpdate: כשגרסה חדשה עולה, ה-service worker מתעדכן בשקט ברקע
// ומחליף את עצמו בטעינה הבאה — בלי לדרוש מהמשתמש כלום.
registerSW({ immediate: true })

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <LanguageProvider>
        <App />
      </LanguageProvider>
    </BrowserRouter>
  </React.StrictMode>,
)
