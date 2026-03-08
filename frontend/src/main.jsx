import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { registerSW } from 'virtual:pwa-register'
import './index.css'
import App from './App.jsx'

if (import.meta.env.DEV && 'serviceWorker' in navigator) {
  window.addEventListener('load', async () => {
    const registrations = await navigator.serviceWorker.getRegistrations()
    await Promise.all(registrations.map((registration) => registration.unregister()))

    if ('caches' in window) {
      const cacheKeys = await caches.keys()
      await Promise.all(cacheKeys.map((cacheKey) => caches.delete(cacheKey)))
    }
  })
}

if (import.meta.env.PROD) {
  const updateSW = registerSW({
    immediate: true,
    onNeedRefresh() {
      window.dispatchEvent(
        new CustomEvent('pwa-update-ready', {
          detail: { updateSW },
        })
      )
    },
    onOfflineReady() {
      window.dispatchEvent(new Event('pwa-offline-ready'))
    },
  })
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
)
