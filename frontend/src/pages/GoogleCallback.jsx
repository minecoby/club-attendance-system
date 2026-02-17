import { useEffect } from "react";
import axios from "axios";
import { useNavigate, useSearchParams } from "react-router-dom";

function GoogleCallback() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const API = import.meta.env.VITE_BASE_URL;

  useEffect(() => {
    const authCode = searchParams.get("auth_code");
    const error = searchParams.get("error");

    const handleExchange = async () => {
      if (error || !authCode) {
        navigate("/login", { replace: true });
        return;
      }

      try {
        const response = await axios.post(`${API}/users/oauth/exchange`, {
          auth_code: authCode,
        });
        const { access_token, refresh_token, usertype } = response.data;

        if (!access_token || !refresh_token || !usertype) {
          navigate("/login", { replace: true });
          return;
        }

        localStorage.setItem("token", access_token);
        localStorage.setItem("refresh_token", refresh_token);
        localStorage.setItem("usertype", usertype);

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
          <h1 className="brand-title">HANSSUP!</h1>
          <p className="brand-subtitle">간편한 동아리 출석체크 플랫폼</p>
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
