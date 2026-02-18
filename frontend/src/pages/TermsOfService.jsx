import { useNavigate } from "react-router-dom";
import "../styles/Policy.css";

function TermsOfService() {
  const navigate = useNavigate();

  const handleGoBack = () => {
    navigate(-1);
  };

  return (
    <div className="policy-page">
      <div className="policy-card">
        <h1>이용약관</h1>
        <p className="policy-date">시행일: 2026-02-14</p>

        <h2>1. 목적</h2>
        <p>본 약관은 HANSSUP 서비스 이용과 관련된 권리, 의무 및 책임사항을 규정합니다.</p>

        <h2>2. 서비스 내용</h2>
        <p>동아리 출석체크, 관리자/사용자 인증, 출석 내역 조회 및 관리 기능을 제공합니다.</p>

        <h2>3. 회원의 의무</h2>
        <p>이용자는 정확한 정보를 제공해야 하며 계정 정보를 안전하게 관리해야 합니다.</p>

        <h2>4. 서비스 제한</h2>
        <p>서비스 악용, 비정상 접근, 타인 권리 침해가 확인되면 이용이 제한될 수 있습니다.</p>

        <h2>5. 면책</h2>
        <p>불가항력 또는 이용자 귀책으로 발생한 손해에 대해 회사는 책임을 지지 않습니다.</p>

        <h2>6. 문의처</h2>
        <p>서비스 문의: kimtaewoo2242@gmail.com</p>

        <div className="policy-actions">
          <button type="button" className="policy-back-button" onClick={handleGoBack}>
            이전 화면으로 이동
          </button>
        </div>
      </div>
    </div>
  );
}

export default TermsOfService;
