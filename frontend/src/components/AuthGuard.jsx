import { Navigate } from 'react-router-dom';

const AuthGuard = ({ children }) => {
  const token = localStorage.getItem("token");
  const refreshToken = localStorage.getItem("refresh_token");

  // 토큰이 없으면 로그인 페이지로 리다이렉트
  if (!token || !refreshToken) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

export default AuthGuard;
