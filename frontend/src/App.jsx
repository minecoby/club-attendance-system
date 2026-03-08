import React, { useEffect, useState } from 'react';
import AppRouter from './routes/AppRouter';
import PwaExperience from './components/PwaExperience';

function App() {
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('theme') || 'light';
  });

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
      <AppRouter theme={theme} setTheme={setTheme} language={language} setLanguage={setLanguage} />
      <PwaExperience language={language} />
    </div>
  );
}

export default App;
