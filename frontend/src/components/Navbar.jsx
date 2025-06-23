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
      <div className="navbar-logo">Untoc Attendance</div>
      <ul className="navbar-menu">
        {userType === 'leader' && (
          <>
            <li><Link to="/leaderpage">{i18n[language].leaderPage || 'Leader Page'}</Link></li>
            <li><Link to="/settings">{i18n[language].settings || 'Settings'}</Link></li>
          </>
        )}
        {!(userType === 'leader') && (
          <>
            <li><Link to="/userpage">{i18n[language].userPage || 'User Page'}</Link></li>
            <li><Link to="/settings">{i18n[language].settings || 'Settings'}</Link></li>
          </>
        )}
      </ul>
    </nav>
  );
};

export default Navbar;
