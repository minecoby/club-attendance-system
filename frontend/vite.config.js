import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon.svg', 'icon-192.png', 'icon-512.png', 'icon-192-maskable.png'],
      manifest: false,
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,webmanifest}'],
        navigateFallback: '/index.html',
        runtimeCaching: [
          {
            urlPattern: ({ url, request }) => {
              if (request.method !== 'GET' || request.destination !== '') return false
              const path = url.pathname
              return (
                path === '/clubs/get_club_info' ||
                /^\/clubs\/[^/]+\/schedules$/.test(path) ||
                /^\/attend\/load_myattend\/[^/]+$/.test(path) ||
                path === '/admin/schedules' ||
                /^\/admin\/show_attendance\/[^/]+$/.test(path)
              )
            },
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-readonly-runtime-cache',
              networkTimeoutSeconds: 5,
              expiration: {
                maxEntries: 30,
                maxAgeSeconds: 60 * 5,
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
          {
            urlPattern: ({ url, request }) => {
              if (request.destination !== '') return false
              const path = url.pathname
              const isBackendPath =
                path.startsWith('/users') ||
                path.startsWith('/attend') ||
                path.startsWith('/clubs') ||
                path.startsWith('/admin')
              return isBackendPath
            },
            handler: 'NetworkOnly',
          },
        ],
      },
      devOptions: {
        enabled: false,
      },
    }),
  ],
  server: {
    host: '0.0.0.0',
    port: 5173,
    watch: {
      usePolling: true,
    },  
  }
})
