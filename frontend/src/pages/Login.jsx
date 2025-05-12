import { useState } from "react";
import {Link, useNavigate} from "react-router-dom";
import "../styles/Login.css";
import kungya from '../assets/kungya.jpg';
import axios from 'axios';

function LoginPage() {
  const navigate = useNavigate();

  const [user_id, setUserId] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();

    try{
      const response = await axios.post("http://localhost:8000/users/login",{
        user_id: user_id,
        password: password,
      });

      const {access_token, usertype} = response.data;

      localStorage.setItem("token", access_token);
      localStorage.setItem("usertype", usertype);

      if (usertype === "leader") {
        navigate("/leaderpage");
      } else if (usertype === "user") {
        navigate("/userpage");
      }
    } catch (error) {
      console.error("로그인 실패", error);
      alert("로그인 실패: 아이디 또는 비밀번호를 확인하세요.");
    }
  }

  return (
    <div className="login-page">
      <div className="login-image-section">
        <img src={kungya} alt = "쿵야" className="login-image" />
      </div>
      <div className="login-container">
      <form onSubmit={handleSubmit} className="login-form">
        <h2 className="login-title">로그인</h2>

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
