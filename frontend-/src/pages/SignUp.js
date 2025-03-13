import { useNavigate } from "react-router-dom";

function SignUp() {
  const navigate = useNavigate();

  const handleSignUp = () => {
    alert("회원가입 성공! 로그인해주세요.");
    navigate("/login");
  };

  return (
    <div>
      <h2>회원가입 페이지</h2>
      <button onClick={handleSignUp}>회원가입</button>
    </div>
  );
}

export default SignUp;
