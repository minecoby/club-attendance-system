export const isMobileDevice = () => {
  const userAgent = navigator.userAgent || navigator.vendor || window.opera;
  
  // 모바일 디바이스 패턴 검사
  const mobileRegex = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i;
  const isMobileUserAgent = mobileRegex.test(userAgent.toLowerCase());
  
  // 터치 지원 여부 확인
  const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  
  // 화면 크기 기반 판단 
  const isMobileScreenSize = window.innerWidth <= 768;
  
  return isMobileUserAgent || (isTouchDevice && isMobileScreenSize);
};

export const requireMobileDevice = () => {
  return isMobileDevice();
};