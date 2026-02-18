import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import "../styles/Login.css";
import "../styles/Register.css";
import axios from "axios";
import AlertModal from "../components/AlertModal";

function RegisterPage() {
  const navigate = useNavigate();

  const [alert, setAlert] = useState({ show: false, type: "error", message: "" });
  const [isLoading, setIsLoading] = useState(false);

  const [formData, setFormData] = useState({
    username: "",
    password: "",
    passwordConfirm: "",
    name: "",
    email: "",
    clubName: "",
    clubCode: "",
    agreedToTerms: false,
    agreedToPrivacy: false,
  });

  const API = import.meta.env.VITE_BASE_URL;

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const generateRandomCode = () => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let code = "";
    for (let i = 0; i < 8; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setFormData((prev) => ({ ...prev, clubCode: code }));
  };

  const validateForm = () => {
    if (
      !formData.username ||
      !formData.password ||
      !formData.passwordConfirm ||
      !formData.name ||
      !formData.email ||
      !formData.clubName ||
      !formData.clubCode
    ) {
      setAlert({ show: true, type: "error", message: "모든 필드를 입력해주세요." });
      return false;
    }

    if (formData.username.length < 4) {
      setAlert({ show: true, type: "error", message: "아이디는 4자 이상이어야 합니다." });
      return false;
    }

    if (formData.password.length < 6) {
      setAlert({ show: true, type: "error", message: "비밀번호는 6자 이상이어야 합니다." });
      return false;
    }

    if (formData.password !== formData.passwordConfirm) {
      setAlert({ show: true, type: "error", message: "비밀번호가 일치하지 않습니다." });
      return false;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      setAlert({ show: true, type: "error", message: "올바른 이메일 형식을 입력해주세요." });
      return false;
    }

    if (formData.clubCode.length < 4) {
      setAlert({ show: true, type: "error", message: "동아리 코드는 4자 이상이어야 합니다." });
      return false;
    }

    if (!formData.agreedToTerms || !formData.agreedToPrivacy) {
      setAlert({
        show: true,
        type: "error",
        message: "이용약관 및 개인정보처리방침에 모두 동의해야 가입할 수 있습니다.",
      });
      return false;
    }

    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) return;

    try {
      setIsLoading(true);
      await axios.post(
        `${API}/users/register`,
        {
          username: formData.username,
          password: formData.password,
          name: formData.name,
          email: formData.email,
          club_name: formData.clubName,
          club_code: formData.clubCode,
          agreed_to_terms: formData.agreedToTerms,
          agreed_to_privacy: formData.agreedToPrivacy,
        },
        { withCredentials: true }
      );

      localStorage.setItem("usertype", "leader");
      setAlert({ show: true, type: "success", message: "회원가입이 완료되었습니다." });

      setTimeout(() => {
        navigate("/leaderpage");
      }, 1200);
    } catch (error) {
      const message = error.response?.data?.detail || "회원가입에 실패했습니다.";
      setAlert({ show: true, type: "error", message });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCloseAlert = () => {
    setAlert((prev) => ({ ...prev, show: false }));
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
        <div className="login-form register-form">
          <h2 className="login-title">관리자 가입</h2>

          <form onSubmit={handleSubmit} className="login-form-inputs">
            <div className="register-section">
              <h3 className="register-section-title">계정 정보</h3>
              <input
                type="text"
                name="username"
                placeholder="아이디 (4자 이상)"
                value={formData.username}
                onChange={handleChange}
                className="login-input"
                disabled={isLoading}
                maxLength={20}
              />
              <input
                type="password"
                name="password"
                placeholder="비밀번호 (6자 이상)"
                value={formData.password}
                onChange={handleChange}
                className="login-input"
                disabled={isLoading}
              />
              <input
                type="password"
                name="passwordConfirm"
                placeholder="비밀번호 확인"
                value={formData.passwordConfirm}
                onChange={handleChange}
                className="login-input"
                disabled={isLoading}
              />
              <input
                type="text"
                name="name"
                placeholder="이름"
                value={formData.name}
                onChange={handleChange}
                className="login-input"
                disabled={isLoading}
                maxLength={20}
              />
              <input
                type="email"
                name="email"
                placeholder="이메일"
                value={formData.email}
                onChange={handleChange}
                className="login-input"
                disabled={isLoading}
              />
            </div>

            <div className="register-section">
              <h3 className="register-section-title">동아리 정보</h3>
              <input
                type="text"
                name="clubName"
                placeholder="동아리 이름"
                value={formData.clubName}
                onChange={handleChange}
                className="login-input"
                disabled={isLoading}
                maxLength={50}
              />
              <div className="club-code-input-wrapper">
                <input
                  type="text"
                  name="clubCode"
                  placeholder="동아리 코드 (4자 이상)"
                  value={formData.clubCode}
                  onChange={handleChange}
                  className="login-input club-code-input"
                  disabled={isLoading}
                  maxLength={20}
                />
                <button
                  type="button"
                  className="random-code-button"
                  onClick={generateRandomCode}
                  disabled={isLoading}
                >
                  랜덤
                </button>
              </div>
            </div>

            <div className="consent-section">
              <label className="consent-item">
                <input
                  type="checkbox"
                  name="agreedToTerms"
                  checked={formData.agreedToTerms}
                  onChange={handleChange}
                  disabled={isLoading}
                />
                <span>
                  <Link to="/terms">이용약관</Link> 동의 (필수)
                </span>
              </label>
              <label className="consent-item">
                <input
                  type="checkbox"
                  name="agreedToPrivacy"
                  checked={formData.agreedToPrivacy}
                  onChange={handleChange}
                  disabled={isLoading}
                />
                <span>
                  <Link to="/privacy-policy">개인정보처리방침</Link> 동의 (필수)
                </span>
              </label>
            </div>

            <button type="submit" className="login-button" disabled={isLoading}>
              {isLoading ? <span className="loading-spinner"></span> : "가입하기"}
            </button>
          </form>

          <div className="register-login-link">
            <span>이미 계정이 있으신가요? </span>
            <Link to="/login">로그인</Link>
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

export default RegisterPage;
