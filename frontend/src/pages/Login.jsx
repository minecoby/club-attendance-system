import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import apiClient, { clearClientAuthState } from "../utils/apiClient";
import AlertModal from "../components/AlertModal";
import googleIcon from "../assets/google.png";
import "../styles/Login.css";

function LoginPage() {
  const navigate = useNavigate();
  const API = import.meta.env.VITE_BASE_URL;

  const [alert, setAlert] = useState({ show: false, type: "error", message: "" });
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isAdminLoading, setIsAdminLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  useEffect(() => {
    const usertype = localStorage.getItem("usertype");

    apiClient
      .get("/users/validate_token")
      .then((res) => {
        const resolvedUsertype = usertype || res.data?.usertype || "leader";
        localStorage.setItem("usertype", resolvedUsertype);
        if (resolvedUsertype === "user") {
          navigate("/userpage");
          return;
        }
        navigate("/leaderpage");
      })
      .catch(() => {
        clearClientAuthState();
        setIsCheckingAuth(false);
      });
  }, [navigate]);

  const handleAdminLogin = async (e) => {
    e.preventDefault();
    if (!username || !password) {
      setAlert({ show: true, type: "error", message: "아이디와 비밀번호를 입력해주세요." });
      return;
    }

    try {
      setIsAdminLoading(true);
      await axios.post(`${API}/users/login`, { username, password }, { withCredentials: true });
      localStorage.setItem("usertype", "leader");
      navigate("/leaderpage");
    } catch (error) {
      const message = error.response?.data?.detail || "로그인에 실패했습니다.";
      setAlert({ show: true, type: "error", message });
    } finally {
      setIsAdminLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      setIsGoogleLoading(true);
      const response = await axios.get(`${API}/users/google/login`, { withCredentials: true });
      const { auth_url } = response.data;
      window.location.href = auth_url;
    } catch {
      setAlert({ show: true, type: "error", message: "Google 로그인을 시작하지 못했습니다." });
      setIsGoogleLoading(false);
    }
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
      <AlertModal
        show={alert.show}
        type={alert.type}
        message={alert.message}
        onClose={() => setAlert((prev) => ({ ...prev, show: false }))}
      />
      <div className="login-brand-section">
        <div className="brand-content">
          <h1 className="brand-title">HANSSUP!</h1>
          <p className="brand-subtitle">간편한 동아리 출석체크 플랫폼</p>
        </div>
      </div>
      <div className="login-container">
        <div className="login-form">
          <h2 className="login-title">로그인</h2>

          <form onSubmit={handleAdminLogin} className="login-form-inputs">
            <input
              type="text"
              placeholder="관리자 아이디"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="login-input"
              disabled={isAdminLoading || isGoogleLoading}
            />
            <input
              type="password"
              placeholder="비밀번호"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="login-input"
              disabled={isAdminLoading || isGoogleLoading}
            />
            <button type="submit" className="login-button" disabled={isAdminLoading || isGoogleLoading}>
              {isAdminLoading ? <span className="loading-spinner"></span> : "관리자 로그인"}
            </button>
          </form>

          <div className="login-divider">
            <span>또는</span>
          </div>

          <button
            onClick={handleGoogleLogin}
            className="google-login-button"
            disabled={isGoogleLoading || isAdminLoading}
          >
            {isGoogleLoading ? (
              <span className="loading-spinner"></span>
            ) : (
              <>
                <img src={googleIcon} alt="Google" className="google-icon" />
                일반 유저 Google 로그인
              </>
            )}
          </button>

          <div className="register-login-link">
            <span>관리자 계정이 없으신가요? </span>
            <Link to="/register">관리자 가입</Link>
          </div>
          <div className="legal-links">
            <Link to="/privacy-policy">개인정보처리방침</Link>
            <span className="legal-sep">|</span>
            <Link to="/terms">이용약관</Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default LoginPage;
