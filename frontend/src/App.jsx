// App.jsx ✅ 수정 후
import React from 'react';
import Navbar from './components/Navbar';
import AppRouter from './routes/AppRouter';

function App() {
  return (
    <div className="app-container">
      <Navbar />
      <div className="page-content">
        <AppRouter />
      </div>
    </div>
  );
}

export default App;
