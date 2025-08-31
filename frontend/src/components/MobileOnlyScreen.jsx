import React from 'react';
import '../styles/MobileOnlyScreen.css';

const MobileOnlyScreen = () => {
  return (
    <div className="mobile-only-container">
      <div className="mobile-only-content">
        <h1 className="mobile-title">모바일 전용 서비스</h1>
        <p className="mobile-description">
          이 서비스는 모바일 기기에서만 이용할 수 있습니다.
        </p>
        <p className="mobile-instruction">
          스마트폰으로 접속해 주세요.
        </p>
      </div>
    </div>
  );
};

export default MobileOnlyScreen;