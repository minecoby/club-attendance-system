import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App.jsx'
import { markPWAAsInstalled } from './utils/pwaRedirect'

// PWA Service Worker 등록
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then((registration) => {
        console.log('SW registered: ', registration);
      })
      .catch((registrationError) => {
        console.log('SW registration failed: ', registrationError);
      });
  });
}

// PWA 설치 상태 감지
window.addEventListener('beforeinstallprompt', () => {
  markPWAAsInstalled();
});

// PWA로 실행 중인지 확인
if (window.navigator.standalone || window.matchMedia('(display-mode: standalone)').matches) {
  markPWAAsInstalled();
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
)