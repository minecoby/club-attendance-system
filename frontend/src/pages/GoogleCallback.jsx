import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import axios from 'axios';

function GoogleCallback() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const handleCallback = () => {
      const access_token = searchParams.get('access_token');
      const refresh_token = searchParams.get('refresh_token');
      const usertype = searchParams.get('usertype');
      const error = searchParams.get('error');

      if (error) {
        console.error('OAuth 오류:', error);
        navigate('/login');
        return;
      }

      if (!access_token || !refresh_token || !usertype) {
        console.error('필요한 토큰 정보가 없습니다.');
        navigate('/login');
        return;
      }

      localStorage.setItem("token", access_token);
      localStorage.setItem("refresh_token", refresh_token);
      localStorage.setItem("usertype", usertype);

      // QR 출석 대기 중인 정보가 있는지 확인
      const pendingAttendance = localStorage.getItem('pendingAttendance');
      if (pendingAttendance) {
        try {
          const {code, club} = JSON.parse(pendingAttendance);
          localStorage.removeItem('pendingAttendance');
          
          // 출석 처리 페이지로 리다이렉트
          navigate(`/attend?code=${code}&club=${club}`, { replace: true });
          return;
        } catch (error) {
          console.error('pending attendance 파싱 오류:', error);
          localStorage.removeItem('pendingAttendance');
        }
      }

      // 일반 로그인 후 페이지 이동
      if (usertype === "leader") {
        navigate("/leaderpage", { replace: true });
      } else if (usertype === "user") {
        navigate("/userpage", { replace: true });
      } else {
        navigate('/login');
      }
    };

    handleCallback();
  }, [searchParams, navigate]);

  return (
    <div className="login-page">
      <div className="login-brand-section">
        <div className="brand-content">
          <h1 className="brand-title">HANSSUP!</h1>
          <p className="brand-subtitle">간편한 동아리 출석체크 플랫폼</p>
        </div>
      </div>
      <div className="login-container">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>로그인 처리 중...</p>
        </div>
      </div>
    </div>
  );
}

export default GoogleCallback;