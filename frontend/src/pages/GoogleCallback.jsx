import { useEffect } from "react";
import axios from "axios";
import { useNavigate, useSearchParams } from "react-router-dom";

function GoogleCallback() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const API = import.meta.env.VITE_BASE_URL;

  useEffect(() => {
    const authCode = searchParams.get("auth_code");
    const consentCode = searchParams.get("consent_code");
    const requiresConsent = searchParams.get("requires_consent") === "1";
    const error = searchParams.get("error");

    const handleExchange = async () => {
      if (error || !authCode) {
        if (requiresConsent && consentCode) {
          navigate(`/google-consent?consent_code=${encodeURIComponent(consentCode)}`, { replace: true });
          return;
        }
        navigate("/login", { replace: true });
        return;
      }

      try {
        const response = await axios.post(
          `${API}/users/oauth/exchange`,
          { auth_code: authCode },
          { withCredentials: true }
        );

        const { usertype } = response.data;
        if (!usertype) {
          navigate("/login", { replace: true });
          return;
        }

        localStorage.setItem("usertype", usertype);

        if (usertype === "leader") {
          navigate("/leaderpage", { replace: true });
          return;
        }

        if (usertype === "user") {
          navigate("/userpage", { replace: true });
          return;
        }

        navigate("/login", { replace: true });
      } catch {
        navigate("/login", { replace: true });
      }
    };

    handleExchange();
  }, [API, navigate, searchParams]);

  return (
    <div className="login-page">
      <div className="login-brand-section">
        <div className="brand-content">
          <h1 className="brand-title">HANSSUP</h1>
          <p className="brand-subtitle">동아리 운영과 출석 관리를 한곳에서</p>
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
