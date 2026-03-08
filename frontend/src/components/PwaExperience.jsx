import { useEffect, useState } from "react";
import "../styles/PwaExperience.css";

function PwaExperience({ language = "ko" }) {
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [offlineReady, setOfflineReady] = useState(false);
  const [updateAction, setUpdateAction] = useState(null);

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    const handleOfflineReady = () => setOfflineReady(true);
    const handleUpdateReady = (event) => {
      setUpdateAction(() => event.detail?.updateSW || null);
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    window.addEventListener("pwa-offline-ready", handleOfflineReady);
    window.addEventListener("pwa-update-ready", handleUpdateReady);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("pwa-offline-ready", handleOfflineReady);
      window.removeEventListener("pwa-update-ready", handleUpdateReady);
    };
  }, []);

  const handleRefresh = async () => {
    if (!updateAction) return;
    await updateAction(true);
  };

  const networkText = language === "en" ? "You are offline." : "현재 오프라인 상태입니다.";
  const offlineReadyText =
    language === "en"
      ? "Offline mode is ready."
      : "오프라인 사용 준비가 완료되었습니다.";
  const updateText = language === "en" ? "A new version is ready." : "새 버전이 준비되었습니다.";

  return (
    <div className="pwa-experience-stack">
      {isOffline && <div className="pwa-banner pwa-banner-offline">{networkText}</div>}
      {offlineReady && !isOffline && (
        <div className="pwa-banner pwa-banner-ready">{offlineReadyText}</div>
      )}
      {updateAction && (
        <div className="pwa-banner pwa-banner-update">
          <span>{updateText}</span>
          <button type="button" onClick={handleRefresh}>
            {language === "en" ? "Update now" : "지금 업데이트"}
          </button>
        </div>
      )}
    </div>
  );
}

export default PwaExperience;
