import { useState } from "react";
import {Link, useNavigate} from "react-router-dom";
import "../styles/Login.css";
import kungya from '../assets/kungya.jpg';

function LoginPage() {
  const navigate = useNavigate();

  const [userId, setUserId] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();

    console.log("Login attempt:", { userId, password });
    const userType = localStorage.getItem('usertype');
    if(userType === 'leader'){
        navigate('/leaderpage');
    }
    else if (userType === 'user'){
        navigate('/userpage');
    } else {
        alert('로그인 실패 또는 잘못된 사용자 유형');
    }
  };

  return (
    <div className="login-page">
      <div className="login-image-section">
        <img src={kungya} alt = "쿵야" className="login-image" />
      </div>
      <div className="login-container">
      <form onSubmit={handleSubmit} className="login-form">
        <h2 className="login-title">로그인</h2>

        <div className="input-group">
          <label htmlFor="userid" className="input-label">
            아이디
          </label>
          <input
            id="userid"
            type="text"
            value={userId}
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

        <button type="submit" className="login-button">
          로그인
        </button>
        <div className="link-signup">
            <Link to="/signup" className="signupto">
            회원가입하기
            </Link>
        </div>
      </form>
    </div>
    </div>
  );
}

export default LoginPage;
