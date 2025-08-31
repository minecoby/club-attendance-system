import React from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/MobileOnlyScreen.css';

const MobileOnlyScreen = () => {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("refresh_token");
    localStorage.removeItem("usertype");
    navigate("/login");
  };

  return (
    <div className="mobile-only-container">
      <div className="mobile-only-content">
        <h1 className="mobile-title">HANSSUP!</h1>
        <p className="mobile-description">
          HANSSUP은 모바일 전용 출석 체크 서비스입니다.
        </p>
        <p className="mobile-instruction">
          스마트폰으로 접속해 주세요.
        </p>
        <button className="logout-button" onClick={handleLogout}>
          로그아웃
        </button>
      </div>
    </div>
  );
};

export default MobileOnlyScreen;