import React from 'react';
import { Link } from 'react-router-dom';
import '../styles/Navbar.css';
import i18n from '../i18n';

const Navbar = ({ language }) => {
  return (
    <nav className="navbar">
      <div className="navbar-logo">Hanssup!</div>
      <ul className="navbar-menu">
        <li><Link to="/leaderpage">홈</Link></li>
        <li><Link to="/settings">{i18n[language].settings || 'Settings'}</Link></li>
      </ul>
    </nav>
  );
};

export default Navbar;
