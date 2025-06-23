import React, { useEffect, useState } from 'react';
import Navbar from './components/Navbar';
import AppRouter from './routes/AppRouter';

function App() {
  // 다크모드 상태 전역 관리
  const [theme, setTheme] = useState(() => {
    // 로컬스토리지에 저장된 테마 우선 적용
    return localStorage.getItem('theme') || 'light';
  });
  // 언어 상태 전역 관리
  const [language, setLanguage] = useState(() => {
    return localStorage.getItem('language') || 'ko';
  });

  useEffect(() => {
    document.body.classList.toggle('dark', theme === 'dark');
    localStorage.setItem('theme', theme);
  }, [theme]);

  useEffect(() => {
    localStorage.setItem('language', language);
  }, [language]);

  return (
    <div className="page-content">
      {/* AppRouter에 theme, setTheme, language, setLanguage 전달 */}
      <AppRouter theme={theme} setTheme={setTheme} language={language} setLanguage={setLanguage} />
    </div>
  );
}

export default App;
