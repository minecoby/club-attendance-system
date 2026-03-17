import { useRef, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import imageCompression from "browser-image-compression";
import QrScanner from "qr-scanner";
import apiClient from "../utils/apiClient";
import AlertModal from "../components/AlertModal";
import i18n from "../i18n";
import "../styles/QRAttendanceCameraPage.css";

function decodeAttendanceToken(rawValue) {
  if (!rawValue) return null;
  const value = String(rawValue).trim();
  if (!value) return null;

  try {
    const base64 = value.replace(/-/g, '+').replace(/_/g, '/');
    const padding = '='.repeat((4 - (base64.length % 4)) % 4);
    const jsonString = decodeURIComponent(escape(atob(base64 + padding)));
    const data = JSON.parse(jsonString);
    if (data.code && data.club) {
      return data;
    }
    return null;
  } catch {
    return null;
  }
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

async function applyContrastAndThreshold(file, contrast = 1.5, threshold = null) {
  const bitmap = await createImageBitmap(file);
  const canvas = document.createElement("canvas");
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  ctx.drawImage(bitmap, 0, 0);
  bitmap.close();

  const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const d = imgData.data;

  for (let i = 0; i < d.length; i += 4) {
    // 그레이스케일
    let gray = d[i] * 0.299 + d[i + 1] * 0.587 + d[i + 2] * 0.114;
    // 대비 강화
    gray = ((gray / 255 - 0.5) * contrast + 0.5) * 255;
    gray = Math.max(0, Math.min(255, gray));
    // 이진화
    if (threshold !== null) {
      gray = gray > threshold ? 255 : 0;
    }
    d[i] = d[i + 1] = d[i + 2] = gray;
  }

  ctx.putImageData(imgData, 0, 0);

  return new Promise((resolve) =>
    canvas.toBlob((blob) => resolve(blob), "image/jpeg", 0.95)
  );
}

/**
 * qr-scanner로 디코딩 시도
 */
async function scanImage(blob) {
  try {
    const result = await QrScanner.scanImage(blob, {
      returnDetailedScanResult: true,
    });
    return result?.data || null;
  } catch {
    return null;
  }
}

/**
 * 여러 전처리 전략으로 QR 디코딩 시도
 */
async function decodeQR(originalFile) {
  const processed = await preprocessImage(originalFile, 1200);

  // 2단계: BarcodeDetector (Android Chrome 등)
  if ("BarcodeDetector" in window) {
    try {
      const bitmap = await createImageBitmap(processed);
      const detector = new window.BarcodeDetector({ formats: ["qr_code"] });
      const results = await detector.detect(bitmap);
      bitmap.close();
      if (results?.[0]?.rawValue) return results[0].rawValue;
    } catch {
      // fallthrough
    }
  }

  // 3단계: qr-scanner 기본 시도
  let value = await scanImage(processed);
  if (value) return value;

  // 4단계: 대비 강화 (1.5x)
  const highContrast = await applyContrastAndThreshold(processed, 1.5);
  value = await scanImage(highContrast);
  if (value) return value;

  // 5단계: 이진화 (threshold 128)
  const binarized = await applyContrastAndThreshold(processed, 1.5, 128);
  value = await scanImage(binarized);
  if (value) return value;

  // 6단계: 더 작은 해상도로 재시도
  const smaller = await preprocessImage(originalFile, 800);
  value = await scanImage(smaller);
  if (value) return value;

  // 7단계: 작은 해상도 + 이진화
  const smallBinarized = await applyContrastAndThreshold(smaller, 1.8, 120);
  value = await scanImage(smallBinarized);
  if (value) return value;

  return null;
}

function QRAttendanceCameraPage({ language = "ko" }) {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  const [isProcessing, setIsProcessing] = useState(false);
  const [capturedName, setCapturedName] = useState("");
  const [alert, setAlert] = useState({
    show: false,
    type: "info",
    message: "",
    onClose: null,
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

      const attendanceData = decodeAttendanceToken(decodedValue);
      if (!attendanceData) {
        setAlert({
          show: true,
          type: "error",
          message:
            language === "en"
              ? "The QR value is not a valid attendance code."
              : "QR 값이 유효한 출석 코드가 아닙니다.",
        });
        return;
      }

      await apiClient.post('/attend/check_qr', {
        qr_code: attendanceData.code,
      });

      setAlert({
        show: true,
        type: "success",
        message:
          language === "en"
            ? "Attendance recorded successfully."
            : "출석이 완료되었습니다.",
        onClose: () => navigate("/userpage"),
      });
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
        onClose={() => {
          const cb = alert.onClose;
          setAlert((prev) => ({ ...prev, show: false, onClose: null }));
          if (cb) cb();
        }}
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
