import { useState } from "react";
import {Link} from "react-router-dom";
import "../styles/Login.css";

function LoginPage() {
  const [userId, setUserId] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();

    console.log("Login attempt:", { userId, password });
  };

  return (
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
  );
}

export default LoginPage;
