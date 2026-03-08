import { useRef, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { prefetchLocation } from "../utils/geolocation";
import jsQR from "jsqr";
import AlertModal from "../components/AlertModal";
import i18n from "../i18n";
import "../styles/QRAttendanceCameraPage.css";

function extractAttendancePath(rawValue) {
  if (!rawValue) return null;
  const value = String(rawValue).trim();
  if (!value) return null;

  if (value.startsWith("/attend")) {
    return value;
  }

  if (/^https?:\/\//i.test(value)) {
    try {
      const parsed = new URL(value);
      if (parsed.pathname.startsWith("/attend")) {
        return `${parsed.pathname}${parsed.search || ""}`;
      }
    } catch {
      return null;
    }
  }

  return `/attend/${encodeURIComponent(value)}`;
}

async function decodeWithBarcodeDetector(file) {
  if (!("BarcodeDetector" in window)) return null;

  const imageBitmap = await createImageBitmap(file);
  try {
    const detector = new window.BarcodeDetector({ formats: ["qr_code"] });
    const results = await detector.detect(imageBitmap);
    return results?.[0]?.rawValue || null;
  } finally {
    imageBitmap.close();
  }
}

async function decodeWithJsQr(file) {
  const imageBitmap = await createImageBitmap(file);
  const canvas = document.createElement("canvas");
  canvas.width = imageBitmap.width;
  canvas.height = imageBitmap.height;

  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) {
    imageBitmap.close();
    return null;
  }

  context.drawImage(imageBitmap, 0, 0, imageBitmap.width, imageBitmap.height);
  imageBitmap.close();

  const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
  const result = jsQR(imageData.data, imageData.width, imageData.height, {
    inversionAttempts: "attemptBoth",
  });
  return result?.data || null;
}

function QRAttendanceCameraPage({ language = "ko" }) {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  useEffect(() => {
    prefetchLocation();
  }, []);

  const [isProcessing, setIsProcessing] = useState(false);
  const [capturedName, setCapturedName] = useState("");
  const [alert, setAlert] = useState({
    show: false,
    type: "info",
    message: "",
  });

  const handleCaptureClick = () => {
    fileInputRef.current?.click();
  };

  const handleImageChange = async (event) => {
    const [file] = event.target.files || [];
    event.target.value = "";
    if (!file) return;

    setCapturedName(file.name || "");
    setIsProcessing(true);

    try {
      let decodedValue = await decodeWithBarcodeDetector(file);
      if (!decodedValue) {
        decodedValue = await decodeWithJsQr(file);
      }

      if (!decodedValue) {
        setAlert({
          show: true,
          type: "error",
          message:
            language === "en"
              ? "No QR code was found in the captured image."
              : "촬영한 이미지에서 QR 코드를 찾지 못했습니다.",
        });
        return;
      }

      const attendancePath = extractAttendancePath(decodedValue);
      if (!attendancePath) {
        setAlert({
          show: true,
          type: "error",
          message:
            language === "en"
              ? "The QR value is not a valid attendance link."
              : "QR 값이 유효한 출석 링크 형식이 아닙니다.",
        });
        return;
      }

      navigate(attendancePath);
    } catch (error) {
      setAlert({
        show: true,
        type: "error",
        message:
          language === "en"
            ? "Failed to decode the captured image."
            : "촬영한 이미지 디코딩에 실패했습니다.",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="qr-camera-page">
      <AlertModal
        show={alert.show}
        type={alert.type}
        message={alert.message}
        onClose={() => setAlert((prev) => ({ ...prev, show: false }))}
      />

      <div className="qr-camera-header">
        <h2>{i18n[language]?.attendWithQR || "QR코드로 출석하기"}</h2>
        <p>
          {language === "en"
            ? "Capture a photo with your device camera, then decode the QR."
            : "기기 카메라 앱으로 촬영 후 QR 코드를 인식합니다."}
        </p>
      </div>

      <div className="qr-capture-card">
        <input
          ref={fileInputRef}
          id="qr-capture-input"
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleImageChange}
          className="qr-capture-input"
        />
        <button
          type="button"
          className="qr-capture-btn"
          onClick={handleCaptureClick}
          disabled={isProcessing}
        >
          {isProcessing
            ? language === "en"
              ? "Processing..."
              : "처리 중..."
            : language === "en"
            ? "Scan QR"
            : "QR 촬영하기"}
        </button>
        <p className="qr-capture-hint">
          {language === "en"
            ? "The device camera app opens. Use hardware zoom and autofocus before capturing."
            : "기기 기본 카메라 앱이 열립니다. 촬영 전에 하드웨어 줌과 자동초점을 사용하세요."}
        </p>
        {capturedName && <p className="qr-captured-name">{capturedName}</p>}
      </div>

      <div className="qr-camera-actions">
        <button type="button" onClick={() => navigate("/userpage")}>
          {i18n[language]?.back || "뒤로가기"}
        </button>
        <button type="button" onClick={() => navigate("/code-attendance")}>
          {i18n[language]?.attendWithCode || "코드로 출석하기"}
        </button>
      </div>
    </div>
  );
}

export default QRAttendanceCameraPage;
