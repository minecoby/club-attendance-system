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
  const iosInstallHint =
    language === "en"
      ? "Safari share menu -> Add to Home Screen"
      : "Safari 공유 메뉴 -> 홈 화면에 추가";

  return (
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
          <li className="navbar-install-guide-wrap">
            <button
              type="button"
              className="navbar-install-btn"
              onClick={() => setShowIosInstallHint((prev) => !prev)}
            >
              {iosInstallLabel}
            </button>
            {showIosInstallHint && <div className="navbar-install-hint">{iosInstallHint}</div>}
          </li>
        )}
      </ul>
    </nav>
  );
};

export default Navbar;
