import { Link } from "react-router-dom";
import "./AlertModal.css";

function LocationPermissionModal({ show, onConfirm, onCancel, language }) {
  if (!show) return null;

  const isEn = language === "en";

  return (
    <div className="alert-modal-bg">
      <div className="alert-modal-card">
        <div className="alert-modal-title" style={{ color: "var(--primary)" }}>
          {isEn ? "Location Permission Required" : "위치 권한 필요"}
        </div>
        <div className="alert-modal-message" style={{ textAlign: "left" }}>
          {isEn ? (
            <>
              <p>Location access is required to verify attendance within the allowed range.</p>
              <ul style={{ margin: "10px 0", paddingLeft: "18px", lineHeight: "1.8" }}>
                <li>Collected only during attendance check</li>
                <li>Deleted immediately after processing</li>
                <li>Not stored on the server</li>
              </ul>
              <p style={{ fontSize: "0.82rem", color: "var(--text-muted)", marginTop: "10px" }}>
                If the permission dialog does not appear, please allow location access for your browser in your phone settings.
              </p>
              <p style={{ fontSize: "0.82rem", color: "var(--text-muted)", marginTop: "6px" }}>
                You can revoke this permission anytime in your browser settings. &nbsp;
                <Link to="/privacy-policy">Privacy Policy</Link>
              </p>
            </>
          ) : (
            <>
              <p>출석 확인을 위해 위치 정보 접근이 필요합니다.</p>
              <ul style={{ margin: "10px 0", paddingLeft: "18px", lineHeight: "1.8" }}>
                <li>출석 체크 시에만 수집됩니다</li>
                <li>지정된 출석 지역 내 정상 출석 여부를 확인합니다</li>
                <li>처리 즉시 삭제되며 서버에 저장되지 않습니다</li>
              </ul>
              <p style={{ fontSize: "0.82rem", color: "var(--text-muted)", marginTop: "10px" }}>
                권한 요청이 표시되지 않는 경우, 휴대폰 설정에서 브라우저의 위치 권한을 허용해주세요.
              </p>
              <p style={{ fontSize: "0.82rem", color: "var(--text-muted)", marginTop: "6px" }}>
                위치 권한은 언제든지 브라우저 설정에서 거부하실 수 있습니다.
              </p>
              <p style={{ fontSize: "0.82rem", color: "var(--text-muted)", marginTop: "6px" }}>
                자세한 내용은 <Link to="/privacy-policy">개인정보처리방침</Link>을 확인해주세요.
              </p>
            </>
          )}
        </div>
        <div className="alert-modal-actions" style={{ marginTop: "16px" }}>
          <button className="alert-modal-close" onClick={onConfirm}>
            {isEn ? "Confirm" : "확인"}
          </button>
          <button className="alert-modal-close alert-modal-close-secondary" onClick={onCancel}>
            {isEn ? "Cancel" : "취소"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default LocationPermissionModal;
