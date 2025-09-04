import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/Login.css";
import axios from 'axios';
import apiClient from '../utils/apiClient';
import AlertModal from '../components/AlertModal';

function LoginPage() {
  const navigate = useNavigate();

  const [isSignUp, setIsSignUp] = useState(false);
  const [user_id, setUserId] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [clubCode, setClubCode] = useState("");
  const [alert, setAlert] = useState({ show: false, type: 'error', message: '' });

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
        localStorage.removeItem("token");
        localStorage.removeItem("refresh_token");
        localStorage.removeItem("usertype");
      });
    }
  }, [navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (isSignUp) {
      // 회원가입 로직
      try {
        await axios.post(`${API}/users/signup`, {
          user_id: user_id,
          password: password,
          name: name,
          club_code: clubCode,
        });

        setAlert({ 
          show: true, 
          type: 'success', 
          message: "회원가입이 완료되었습니다. 로그인해주세요." 
        });
        
        // 폼 초기화 및 로그인 모드로 전환
        setUserId("");
        setPassword("");
        setName("");
        setClubCode("");
        setIsSignUp(false);
      } catch (error) {
        console.error("회원가입 실패", error);
        setAlert({ 
          show: true, 
          type: 'error', 
          message: "회원가입 실패: 입력 정보를 확인하세요." 
        });
      }
    } else {
      // 로그인 로직
      try {
        const response = await axios.post(`${API}/users/login`, {
          user_id: user_id,
          password: password,
        });

        const { access_token, refresh_token, usertype } = response.data;

        // 액세스 토큰과 리프레시 토큰 모두 저장
        localStorage.setItem("token", access_token);
        localStorage.setItem("refresh_token", refresh_token);
        localStorage.setItem("usertype", usertype);

        if (usertype === "leader") {
          navigate("/leaderpage");
        } else if (usertype === "user") {
          navigate("/userpage");
        }
      } catch (error) {
        console.error("로그인 실패", error);
        setAlert({ show: true, type: 'error', message: "로그인 실패: 아이디 또는 비밀번호를 확인하세요." });
      }
    }
  }

  const handleCloseAlert = () => {
    setAlert({ ...alert, show: false });
  };

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
        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-toggle">
            <button
              type="button"
              className={`toggle-button ${!isSignUp ? 'active' : ''}`}
              onClick={() => setIsSignUp(false)}
            >
              로그인
            </button>
            <button
              type="button"
              className={`toggle-button ${isSignUp ? 'active' : ''}`}
              onClick={() => setIsSignUp(true)}
            >
              회원가입
            </button>
          </div>

          <h2 className="login-title">
            {isSignUp ? '회원가입' : '로그인'}
          </h2>

          <div className="input-group">
            <label htmlFor="user_id" className="input-label">
              아이디
            </label>
            <input
              id="user_id"
              type="text"
              value={user_id}
              onChange={(e) => setUserId(e.target.value)}
              className="input-field"
              required
            />
          </div>

          <div className="input-group">
            <label htmlFor="password" className="input-label">
              비밀번호
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input-field"
              required
            />
          </div>

          {isSignUp && (
            <>
              <div className="input-group">
                <label htmlFor="name" className="input-label">
                  이름(실명)
                </label>
                <input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="input-field"
                  required
                />
              </div>
              <div className="input-group">
                <label htmlFor="clubCode" className="input-label">
                  동아리 가입 코드
                </label>
                <input
                  id="clubCode"
                  type="text"
                  value={clubCode}
                  onChange={(e) => setClubCode(e.target.value)}
                  className="input-field"
                  placeholder="가입 코드를 입력하세요."
                  required
                />
              </div>
            </>
          )}

          <button type="submit" className="login-button">
            {isSignUp ? '회원가입' : '로그인'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default LoginPage;