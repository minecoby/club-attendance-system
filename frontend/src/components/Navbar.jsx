import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import '../styles/Navbar.css'; 
import i18n from '../i18n';

const Navbar = ({ language }) => {
  const [userType, setUserType] = useState(null);

  useEffect(() => {
    const type = localStorage.getItem('usertype');
    setUserType(type);
  }, []);

  return (
    <nav className="navbar">
      <div className="navbar-logo">Hanssup!</div>
      <ul className="navbar-menu">
        {userType === 'leader' && (
          <>
            <li><Link to="/leaderpage">홈</Link></li>
            <li><Link to="/settings">{i18n[language].settings || 'Settings'}</Link></li>
          </>
        )}
        {!(userType === 'leader') && (
          <>
            <li><Link to="/userpage">홈</Link></li>
            <li><Link to="/settings">{i18n[language].settings || 'Settings'}</Link></li>
          </>
        )}
      </ul>
    </nav>
  );
};

export default Navbar;
