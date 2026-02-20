import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import axios from "axios";
import AlertModal from "../components/AlertModal";
import "../styles/Login.css";
import "../styles/Register.css";
import "../styles/GoogleConsent.css";

function GoogleConsent() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const API = import.meta.env.VITE_BASE_URL;

  const [isLoading, setIsLoading] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [agreedToPrivacy, setAgreedToPrivacy] = useState(false);
  const [alert, setAlert] = useState({ show: false, type: "error", message: "" });

  const consentCode = searchParams.get("consent_code");

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!consentCode) {
      setAlert({ show: true, type: "error", message: "유효하지 않은 접근입니다. 다시 로그인해주세요." });
      return;
    }

    if (!agreedToTerms || !agreedToPrivacy) {
      setAlert({
        show: true,
        type: "error",
        message: "이용약관 및 개인정보처리방침에 모두 동의해야 가입할 수 있습니다.",
      });
      return;
    }

    try {
      setIsLoading(true);
      const response = await axios.post(
        `${API}/users/google/consent`,
        {
          consent_code: consentCode,
          agreed_to_terms: agreedToTerms,
          agreed_to_privacy: agreedToPrivacy,
        },
        { withCredentials: true }
      );

      const { usertype } = response.data;
      localStorage.setItem("usertype", usertype || "user");

      const pendingAttendance = localStorage.getItem("pendingAttendance");
      if (pendingAttendance) {
        try {
          const { code, club } = JSON.parse(pendingAttendance);
          localStorage.removeItem("pendingAttendance");
          navigate(`/attend?code=${code}&club=${club}`, { replace: true });
          return;
        } catch {
          localStorage.removeItem("pendingAttendance");
        }
      }

      if (usertype === "leader") {
        navigate("/leaderpage", { replace: true });
        return;
      }

      navigate("/userpage", { replace: true });
    } catch (error) {
      const message = error.response?.data?.detail || "동의 처리 중 오류가 발생했습니다.";
      setAlert({ show: true, type: "error", message });
      setIsLoading(false);
    }
  };

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
          <p className="brand-subtitle">Google 로그인 약관 동의</p>
        </div>
      </div>
      <div className="login-container">
        <div className="login-form register-form google-consent-form">
          <h2 className="login-title">필수 동의</h2>
          <p className="google-consent-lead">
            Google 계정으로 처음 로그인하셨습니다.
            <br />
            서비스 이용을 위해 아래 필수 항목에 동의해 주세요.
          </p>
          <div className="google-consent-note">
            <strong>동의 내역 기록 항목</strong>
            <ul>
              <li>약관/개인정보처리방침 동의 여부</li>
              <li>동의 시각</li>
              <li>접속 정보(IP, 브라우저 정보)</li>
            </ul>
          </div>
          <form onSubmit={handleSubmit} className="login-form-inputs">
            <div className="consent-section">
              <label className="consent-item">
                <input
                  type="checkbox"
                  checked={agreedToTerms}
                  onChange={(e) => setAgreedToTerms(e.target.checked)}
                  disabled={isLoading}
                />
                <span>
                  <Link to="/terms">이용약관</Link> 동의 (필수)
                </span>
              </label>
              <label className="consent-item">
                <input
                  type="checkbox"
                  checked={agreedToPrivacy}
                  onChange={(e) => setAgreedToPrivacy(e.target.checked)}
                  disabled={isLoading}
                />
                <span>
                  <Link to="/privacy-policy">개인정보처리방침</Link> 동의 (필수)
                </span>
              </label>
            </div>

            <button type="submit" className="login-button" disabled={isLoading}>
              {isLoading ? <span className="loading-spinner"></span> : "동의하고 시작하기"}
            </button>
          </form>
          <div className="legal-links google-consent-links">
            <Link to="/privacy-policy">개인정보처리방침</Link>
            <span className="legal-sep">|</span>
            <Link to="/terms">이용약관</Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default GoogleConsent;
