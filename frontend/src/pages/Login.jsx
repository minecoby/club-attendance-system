import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/Login.css";
import axios from 'axios';
import apiClient from '../utils/apiClient';
import AlertModal from '../components/AlertModal';

function LoginPage() {
  const navigate = useNavigate();

  const [alert, setAlert] = useState({ show: false, type: 'error', message: '' });
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [isLoading, setIsLoading] = useState(false);

  const API = import.meta.env.VITE_BASE_URL;

  useEffect(() => {
    const token = localStorage.getItem("token");
    const refreshToken = localStorage.getItem("refresh_token");
    const usertype = localStorage.getItem("usertype");
    
    if (token && refreshToken && usertype) {
      apiClient.get(`/users/validate_token`)
      .then(response => {
        if (usertype === "leader") {
          navigate("/leaderpage");
        } else if (usertype === "user") {
          navigate("/userpage");
        }
      })
      .catch(error => {
        setIsCheckingAuth(false);
      });
    } else {
      setIsCheckingAuth(false);
    }
  }, [navigate]);

  const handleGoogleLogin = async () => {
    try {
      setIsLoading(true);
      const response = await axios.get(`${API}/users/google/login`);
      const { auth_url } = response.data;
      
      window.location.href = auth_url;
    } catch (error) {
      console.error("구글 로그인 URL 요청 실패", error);
      setAlert({ 
        show: true, 
        type: 'error', 
        message: "구글 로그인을 시작할 수 없습니다." 
      });
      setIsLoading(false);
    }
  }

  const handleCloseAlert = () => {
    setAlert({ ...alert, show: false });
  };
  if (isCheckingAuth) {
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
            <p>로그인 중...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="login-page">
      <AlertModal show={alert.show} type={alert.type} message={alert.message} onClose={handleCloseAlert} />
      <div className="login-brand-section">
        <div className="brand-content">
          <h1 className="brand-title">HANSSUP!</h1>
          <p className="brand-subtitle">간편한 동아리 출석체크 플랫폼</p>
        </div>
      </div>
      <div className="login-container">
        <div className="login-form">
          <h2 className="login-title">로그인</h2>
          
          <button 
            onClick={handleGoogleLogin} 
            className="google-login-button"
            disabled={isLoading}
          >
            {isLoading ? (
              <span className="loading-spinner"></span>
            ) : (
              <>
                <img src="/src/assets/google.png" alt="Google" className="google-icon" />
                Google로 로그인
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

export default LoginPage;