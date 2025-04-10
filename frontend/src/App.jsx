import React from 'react';
import Navbar from './components/Navbar';
import AppRouter from './routes/AppRouter';

function App() {
  return (
      <div className="page-content">
        <AppRouter />
      </div>
  );
}

export default App;
