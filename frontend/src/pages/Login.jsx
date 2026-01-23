import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import "../styles/Login.css";
import axios from 'axios';
import apiClient from '../utils/apiClient';
import AlertModal from '../components/AlertModal';

function LoginPage() {
  const navigate = useNavigate();

  const [alert, setAlert] = useState({ show: false, type: 'error', message: '' });
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  // 아이디/비밀번호 로그인 폼 상태
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoginLoading, setIsLoginLoading] = useState(false);

  const API = import.meta.env.VITE_BASE_URL;

  useEffect(() => {
    const token = localStorage.getItem("token");
    const refreshToken = localStorage.getItem("refresh_token");

    if (token && refreshToken) {
      apiClient.get(`/users/validate_token`)
      .then(response => {
        navigate("/leaderpage");
      })
      .catch(error => {
        setIsCheckingAuth(false);
      });
    } else {
      setIsCheckingAuth(false);
    }
  }, [navigate]);

  // 아이디/비밀번호 로그인
  const handleLogin = async (e) => {
    e.preventDefault();
    if (!username || !password) {
      setAlert({ show: true, type: 'error', message: '아이디와 비밀번호를 입력해주세요.' });
      return;
    }

    try {
      setIsLoginLoading(true);
      const response = await axios.post(`${API}/users/login`, {
        username,
        password
      });

      const { access_token, refresh_token } = response.data;

      localStorage.setItem("token", access_token);
      localStorage.setItem("refresh_token", refresh_token);

      navigate("/leaderpage");
    } catch (error) {
      console.error("로그인 실패", error);
      const message = error.response?.data?.detail || "로그인에 실패했습니다.";
      setAlert({ show: true, type: 'error', message });
    } finally {
      setIsLoginLoading(false);
    }
  };

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
          <h2 className="login-title">관리자 로그인</h2>

          {/* 아이디/비밀번호 로그인 폼 */}
          <form onSubmit={handleLogin} className="login-form-inputs">
            <input
              type="text"
              placeholder="아이디"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="login-input"
              disabled={isLoginLoading}
            />
            <input
              type="password"
              placeholder="비밀번호"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="login-input"
              disabled={isLoginLoading}
            />
            <button
              type="submit"
              className="login-button"
              disabled={isLoginLoading}
            >
              {isLoginLoading ? (
                <span className="loading-spinner"></span>
              ) : (
                '로그인'
              )}
            </button>
          </form>

          <div className="register-login-link">
            <span>계정이 없으신가요? </span>
            <Link to="/register">회원가입</Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default LoginPage;
