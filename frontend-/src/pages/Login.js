import { useNavigate } from "react-router-dom";

function Login() {
  const navigate = useNavigate();

  const handleLogin = () => {
    localStorage.setItem("token", "user_token");
    navigate("/userpage");
  };

  return (
    <div>
      <h2>로그인 페이지</h2>
      <button onClick={handleLogin}>로그인</button>
      <p>계정이 없으신가요? <a href="/signup">회원가입</a></p>
    </div>
  );
}

export default Login;
