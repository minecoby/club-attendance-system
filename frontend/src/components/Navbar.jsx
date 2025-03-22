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
      {userType === 'user' && (
        <>
          <Link to="/userpage">UserPage</Link>
          <Link to="/settings">Settings</Link>
        </>
      )}

      {userType === 'leader' && (
        <>
          <Link to="/leaderpage">LeaderPage</Link>
          <Link to="/settings">Settings</Link>
        </>
      )}

      {!userType && (
        <>
          <Link to="/login">Login</Link>
          <Link to="/signup">SignUp</Link>
        </>
      )}
    </nav>
  );
};

export default Navbar;
