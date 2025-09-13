export const initPWARedirect = () => {
    // iOS Safari에서만 동작
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    const isInStandaloneMode = window.navigator.standalone === true || 
                              window.matchMedia('(display-mode: standalone)').matches;
    const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
    if (isIOS && isSafari && !isInStandaloneMode) {
        // PWA가 설치되어 있는지 확인 
        const pwaInstalled = localStorage.getItem('pwa-installed') === 'true';
        
        if (pwaInstalled) {
            showPWARedirectPrompt();
        }
    }
};

const showPWARedirectPrompt = () => {
    if (sessionStorage.getItem('pwa-redirect-shown')) {
        return;
    }
    
    sessionStorage.setItem('pwa-redirect-shown', 'true');
    
    // 자동 리다이렉트 시도
    setTimeout(() => {
        const currentUrl = window.location.href;
        const pwaUrl = `https://hanssup.minecoby.com${window.location.pathname}${window.location.search}`;
        
        // PWA로 리다이렉트 시도 (iOS 16.4+에서 작동)
        window.location.href = pwaUrl;
        setTimeout(() => {
            showManualRedirectPrompt();
        }, 2000);
    }, 500);
};

const showManualRedirectPrompt = () => {
    // 이미 PWA로 이동했다면 실행되지 않음
    if (window.navigator.standalone) {
        return;
    }
    
    const overlay = document.createElement('div');
    overlay.id = 'pwa-redirect-overlay';
    overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.8);
        z-index: 10000;
        display: flex;
        align-items: center;
        justify-content: center;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    `;
    
    const modal = document.createElement('div');
    modal.style.cssText = `
        background: white;
        margin: 20px;
        padding: 24px;
        border-radius: 12px;
        text-align: center;
        max-width: 320px;
        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
    `;
    
    modal.innerHTML = `
        <div style="font-size: 1.2rem; font-weight: bold; margin-bottom: 12px; color: #007AFF;">
            HANSSUP 앱에서 열기
        </div>
        <div style="font-size: 0.9rem; color: #666; margin-bottom: 20px; line-height: 1.4;">
            더 나은 경험을 위해 HANSSUP 앱에서 열어주세요.
        </div>
        <div style="display: flex; gap: 12px;">
            <button id="open-in-app" style="
                flex: 1;
                background: #007AFF;
                color: white;
                border: none;
                padding: 12px;
                border-radius: 8px;
                font-size: 0.9rem;
                font-weight: bold;
                cursor: pointer;
            ">앱에서 열기</button>
            <button id="continue-safari" style="
                flex: 1;
                background: transparent;
                color: #007AFF;
                border: 1px solid #007AFF;
                padding: 12px;
                border-radius: 8px;
                font-size: 0.9rem;
                cursor: pointer;
            ">Safari에서 계속</button>
        </div>
    `;
    
    overlay.appendChild(modal);
    document.body.appendChild(overlay);
    
    // 앱에서 열기 버튼
    document.getElementById('open-in-app').onclick = () => {
        const currentUrl = window.location.href;
        window.location.href = currentUrl.replace('https://', 'https://');
        overlay.remove();
    };
    
    // Safari에서 계속 버튼
    document.getElementById('continue-safari').onclick = () => {
        overlay.remove();
    };
    
    // 오버레이 클릭으로 닫기
    overlay.onclick = (e) => {
        if (e.target === overlay) {
            overlay.remove();
        }
    };
};

// PWA 설치 상태 추적
export const markPWAAsInstalled = () => {
    localStorage.setItem('pwa-installed', 'true');
};

// PWA 설치 상태 확인
export const isPWAInstalled = () => {
    return localStorage.getItem('pwa-installed') === 'true';
};