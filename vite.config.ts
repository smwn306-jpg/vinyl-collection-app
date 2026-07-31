import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: false, // רושמים ידנית ב-main.tsx, כדי לא לרשום פעמיים
      // מטמינים את קבצי ה-build עצמם (ה-shell של האפליקציה) —
      // כך שהיא נטענת בכלל גם בלי רשת, לא רק שהנתונים זמינים.
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico}'],
        // בקשות ל-Discogs Worker לא נשמרות במטמון של ה-service worker —
        // Firestore כבר מטפל בעצמו ב-offline caching שלו (persistentLocalCache),
        // ולתוצאות חיפוש Discogs יש caching נפרד בצד ה-Worker עצמו.
        navigateFallbackDenylist: [/^\/api/],
      },
      manifest: {
        name: 'Crate — ניהול אוסף תקליטים',
        short_name: 'Crate',
        description: 'ניהול אוסף תקליטים אישי, עם חיבור ל-Discogs',
        start_url: '/',
        display: 'standalone',
        background_color: '#15181C',
        theme_color: '#C9A227',
        icons: [
          { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
        ],
      },
    }),
  ],
})
