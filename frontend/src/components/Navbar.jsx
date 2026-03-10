import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import "../styles/Navbar.css";
import i18n from "../i18n";

const Navbar = ({ language }) => {
  const [userType, setUserType] = useState(null);
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [showIosInstallHint, setShowIosInstallHint] = useState(false);
  const [isIosSafari, setIsIosSafari] = useState(false);

  useEffect(() => {
    const type = localStorage.getItem("usertype");
    setUserType(type);
  }, []);

  useEffect(() => {
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      window.navigator.standalone === true;
    setIsInstalled(standalone);

    const ua = window.navigator.userAgent || "";
    const isIosDevice = /iPad|iPhone|iPod/.test(ua);
    const isSafari = /^((?!chrome|android).)*safari/i.test(ua);
    setIsIosSafari(isIosDevice && isSafari);

    const handleBeforeInstallPrompt = (event) => {
      event.preventDefault();
      setDeferredPrompt(event);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
      setShowIosInstallHint(false);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    try {
      await deferredPrompt.userChoice;
    } finally {
      setDeferredPrompt(null);
    }
  };

  const installLabel = language === "en" ? "Install App" : "앱 설치";
  const iosInstallLabel = language === "en" ? "Install Guide" : "설치 안내";

  const iosSteps =
    language === "en"
      ? [
          'Tap the "···" button at the bottom',
          "Tap Share",
          'Tap "More"',
          '"Add to Home Screen"',
        ]
      : [
          "하단의 ··· 버튼 클릭",
          "공유하기 클릭",
          "더보기 클릭",
          "홈 화면에 추가",
        ];

  return (
    <>
      <nav className="navbar">
        <div className="navbar-logo">Hanssup!</div>
        <ul className="navbar-menu">
          {userType === "leader" ? (
            <>
              <li><Link to="/leaderpage">{i18n[language]?.leaderPage || "Leader Page"}</Link></li>
              <li><Link to="/settings">{i18n[language]?.settings || "Settings"}</Link></li>
            </>
          ) : (
            <>
              <li><Link to="/userpage">{i18n[language]?.userPage || "User Page"}</Link></li>
              <li><Link to="/settings">{i18n[language]?.settings || "Settings"}</Link></li>
            </>
          )}

          {!isInstalled && deferredPrompt && (
            <li>
              <button type="button" className="navbar-install-btn" onClick={handleInstallClick}>
                {installLabel}
              </button>
            </li>
          )}

          {!isInstalled && !deferredPrompt && isIosSafari && (
            <li>
              <button
                type="button"
                className="navbar-install-btn"
                onClick={() => setShowIosInstallHint((prev) => !prev)}
              >
                {iosInstallLabel}
              </button>
            </li>
          )}
        </ul>
      </nav>

      {showIosInstallHint && (
        <div className="ios-install-overlay" onClick={() => setShowIosInstallHint(false)}>
          <div className="ios-install-modal" onClick={(e) => e.stopPropagation()}>
            <p className="ios-install-modal-title">
              {language === "en" ? "How to install" : "앱 설치 방법"}
            </p>
            <ol className="ios-install-steps">
              {iosSteps.map((step, i) => (
                <li key={i} className="ios-install-step">
                  <span className="ios-step-num">{i + 1}</span>
                  <span className="ios-step-text">{step}</span>
                </li>
              ))}
            </ol>
            <button
              type="button"
              className="ios-install-close-btn"
              onClick={() => setShowIosInstallHint(false)}
            >
              {language === "en" ? "Close" : "닫기"}
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default Navbar;
