import { useRef, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { prefetchLocation } from "../utils/geolocation";
import imageCompression from "browser-image-compression";
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

/**
 * iOS Safari용 이미지 전처리
 */
async function preprocessImage(file, maxSize = 1200) {
  const compressed = await imageCompression(file, {
    maxWidthOrHeight: maxSize,
    useWebWorker: true,
    fileType: "image/jpeg",
    initialQuality: 0.9,
  });
  return compressed;
}

async function fileToImageData(file, grayscale = false) {
  const bitmap = await createImageBitmap(file);
  const canvas = document.createElement("canvas");
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;

  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) {
    bitmap.close();
    return null;
  }

  ctx.drawImage(bitmap, 0, 0);
  bitmap.close();

  if (grayscale) {
    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const d = imgData.data;
    for (let i = 0; i < d.length; i += 4) {
      const avg = d[i] * 0.299 + d[i + 1] * 0.587 + d[i + 2] * 0.114;
      d[i] = d[i + 1] = d[i + 2] = avg;
    }
    ctx.putImageData(imgData, 0, 0);
  }

  return ctx.getImageData(0, 0, canvas.width, canvas.height);
}

/**
 * BarcodeDetector API (Android Chrome 등 지원 브라우저)
 */
async function decodeWithBarcodeDetector(file) {
  if (!("BarcodeDetector" in window)) return null;

  const bitmap = await createImageBitmap(file);
  try {
    const detector = new window.BarcodeDetector({ formats: ["qr_code"] });
    const results = await detector.detect(bitmap);
    return results?.[0]?.rawValue || null;
  } finally {
    bitmap.close();
  }
}

/**
 * jsQR 디코딩 (grayscale + inversionAttempts)
 */
async function decodeWithJsQr(file, grayscale = false) {
  const imageData = await fileToImageData(file, grayscale);
  if (!imageData) return null;

  const result = jsQR(imageData.data, imageData.width, imageData.height, {
    inversionAttempts: "attemptBoth",
  });
  return result?.data || null;
}


async function decodeQR(originalFile) {
  const processed = await preprocessImage(originalFile, 1200);

  let value = await decodeWithBarcodeDetector(processed);
  if (value) return value;

  value = await decodeWithJsQr(processed, false);
  if (value) return value;

  value = await decodeWithJsQr(processed, true);
  if (value) return value;

  const smaller = await preprocessImage(originalFile, 800);
  value = await decodeWithJsQr(smaller, true);
  if (value) return value;

  return null;
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
      const decodedValue = await decodeQR(file);

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
