import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import AlertModal from "../components/AlertModal";
import i18n from "../i18n";
import {
  getCameraCapabilities,
  getCameraStream,
  getCurrentZoom,
  optimizeTrackForQr,
  setCameraZoom,
  stopCameraStream,
} from "../utils/camera";
import "../styles/QRAttendanceCameraPage.css";

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

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

function QRAttendanceCameraPage({ language = "ko" }) {
  const navigate = useNavigate();
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const trackRef = useRef(null);
  const rafRef = useRef(null);
  const detectorRef = useRef(null);
  const scanCanvasRef = useRef(document.createElement("canvas"));
  const scannedRef = useRef(false);

  const [isInitializing, setIsInitializing] = useState(true);
  const [zoomRange, setZoomRange] = useState(null);
  const [zoomValue, setZoomValue] = useState(null);
  const [alert, setAlert] = useState({
    show: false,
    type: "info",
    message: "",
  });

  const stopScanningLoop = useCallback(() => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  }, []);

  const cleanup = useCallback(() => {
    stopScanningLoop();
    stopCameraStream(streamRef.current);
    streamRef.current = null;
    trackRef.current = null;
  }, [stopScanningLoop]);

  const scanFrame = useCallback(() => {
    if (scannedRef.current) return;
    const video = videoRef.current;
    const detector = detectorRef.current;

    if (
      !video ||
      !detector ||
      video.readyState < 2 ||
      !video.videoWidth ||
      !video.videoHeight
    ) {
      rafRef.current = requestAnimationFrame(scanFrame);
      return;
    }

    const canvas = scanCanvasRef.current;
    const context = canvas.getContext("2d", { willReadFrequently: true });
    if (!context) {
      rafRef.current = requestAnimationFrame(scanFrame);
      return;
    }

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    detector
      .detect(canvas)
      .then((barcodes) => {
        if (!barcodes || barcodes.length === 0) return;
        const rawValue = barcodes[0]?.rawValue;
        const attendancePath = extractAttendancePath(rawValue);
        if (!attendancePath) return;

        scannedRef.current = true;
        cleanup();
        navigate(attendancePath);
      })
      .catch(() => {
        // Continue scanning on transient detection failures.
      })
      .finally(() => {
        if (!scannedRef.current) {
          rafRef.current = requestAnimationFrame(scanFrame);
        }
      });
  }, [cleanup, navigate]);

  useEffect(() => {
    let mounted = true;

    const init = async () => {
      try {
        if (!navigator.mediaDevices?.getUserMedia) {
          throw new Error(
            language === "en"
              ? "This browser does not support camera access."
              : "이 브라우저는 카메라 접근을 지원하지 않습니다."
          );
        }

        if (!("BarcodeDetector" in window)) {
          throw new Error(
            language === "en"
              ? "QR scanning is not supported on this browser."
              : "이 브라우저에서는 QR 스캔을 지원하지 않습니다."
          );
        }

        detectorRef.current = new window.BarcodeDetector({ formats: ["qr_code"] });

        const stream = await getCameraStream();
        if (!mounted) {
          stopCameraStream(stream);
          return;
        }

        streamRef.current = stream;
        const [track] = stream.getVideoTracks();
        trackRef.current = track;
        await optimizeTrackForQr(track);

        const capabilities = getCameraCapabilities(track);
        if (capabilities?.zoom) {
          const min = Number(capabilities.zoom.min ?? 1);
          const max = Number(capabilities.zoom.max ?? min);
          const step = Number(capabilities.zoom.step ?? 0.1);
          const current = getCurrentZoom(track) ?? min;
          setZoomRange({ min, max, step });
          setZoomValue(current);
        }

        const video = videoRef.current;
        if (!video) return;
        video.srcObject = stream;
        await video.play();
        if (!mounted) return;

        setIsInitializing(false);
        scannedRef.current = false;
        rafRef.current = requestAnimationFrame(scanFrame);
      } catch (error) {
        const fallbackMessage =
          language === "en"
            ? "Unable to start QR camera."
            : "QR 카메라를 시작할 수 없습니다.";
        setAlert({
          show: true,
          type: "error",
          message: error?.message || fallbackMessage,
        });
        setIsInitializing(false);
      }
    };

    init();

    return () => {
      mounted = false;
      cleanup();
    };
  }, [cleanup, language, scanFrame]);

  const handleZoomChange = async (event) => {
    const track = trackRef.current;
    const range = zoomRange;
    if (!track || !range) return;

    const nextValue = clamp(Number(event.target.value), range.min, range.max);
    try {
      await setCameraZoom(track, nextValue);
      setZoomValue(nextValue);
    } catch {
      setAlert({
        show: true,
        type: "error",
        message:
          language === "en"
            ? "Failed to apply camera zoom."
            : "카메라 줌 적용에 실패했습니다.",
      });
    }
  };

  const handleBack = () => {
    cleanup();
    navigate("/userpage");
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
            ? "Align the QR code inside the camera view."
            : "카메라 화면에 QR 코드를 맞춰주세요."}
        </p>
      </div>

      <div className="qr-camera-frame">
        <video ref={videoRef} playsInline muted autoPlay className="qr-camera-video" />
        <div className="qr-camera-guide" />
        {isInitializing && (
          <div className="qr-camera-loading">
            {i18n[language]?.loading || "로딩 중..."}
          </div>
        )}
      </div>

      {zoomRange && (
        <div className="qr-zoom-control">
          <label htmlFor="hardware-zoom">
            {language === "en" ? "Camera Zoom" : "카메라 줌"}: {zoomValue?.toFixed(1)}x
          </label>
          <input
            id="hardware-zoom"
            type="range"
            min={zoomRange.min}
            max={zoomRange.max}
            step={zoomRange.step}
            value={zoomValue ?? zoomRange.min}
            onChange={handleZoomChange}
          />
        </div>
      )}

      <div className="qr-camera-actions">
        <button type="button" onClick={handleBack}>
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
