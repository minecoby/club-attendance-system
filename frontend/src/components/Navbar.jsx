import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import '../styles/Navbar.css'; 

const Navbar = () => {
  const [userType, setUserType] = useState(null);

  useEffect(() => {
    const type = localStorage.getItem('usertype');
    setUserType(type);
  }, []);

  return (
    <nav className="navbar">
      <ul className="navbar-menu">
        {userType === 'leader' && (
          <>
            <li><Link to="/leaderpage">Leader Page</Link></li>
            <li><Link to="/settings">Settings</Link></li>
          </>
        )}
        {!(userType === 'leader') && (
          <>
            <li><Link to="/userpage">user Page</Link></li>
            <li><Link to="/settings">Settings</Link></li>
          </>
        )}
      </ul>
    </nav>
  );
};

export default Navbar;
