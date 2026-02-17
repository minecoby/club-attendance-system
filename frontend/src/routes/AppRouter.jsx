import { Routes, Route, useLocation } from "react-router-dom";
import Login from "../pages/Login";
import Register from "../pages/Register";
import GoogleCallback from "../pages/GoogleCallback";
import PrivacyPolicy from "../pages/PrivacyPolicy";
import TermsOfService from "../pages/TermsOfService";
import UserPage from "../pages/UserPage";
import LeaderPage from "../pages/LeaderPage";
import Settings from "../pages/Settings";
import Navbar from "../components/Navbar";
import CodeAttendancePage from "../pages/CodeAttendancePage";
import AttendRedirectPage from "../pages/AttendRedirectPage";
import AuthGuard from "../components/AuthGuard";
import UserGuard from "../components/MobileGuard";

const AppRouter = ({ theme, setTheme, language, setLanguage }) => {
  const location = useLocation();
  const hideNavOnPaths = ["/", "/login", "/register", "/auth/callback", "/privacy-policy", "/terms"];
  const showNav = !hideNavOnPaths.includes(location.pathname);

  return (
    <>
      {showNav && <Navbar language={language} />}
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/auth/callback" element={<GoogleCallback />} />
        <Route path="/privacy-policy" element={<PrivacyPolicy />} />
        <Route path="/terms" element={<TermsOfService />} />

        <Route
          path="/userpage"
          element={
            <AuthGuard>
              <UserGuard>
                <UserPage theme={theme} setTheme={setTheme} language={language} setLanguage={setLanguage} />
              </UserGuard>
            </AuthGuard>
          }
        />
        <Route
          path="/leaderpage"
          element={
            <AuthGuard>
              <UserGuard>
                <LeaderPage theme={theme} setTheme={setTheme} language={language} setLanguage={setLanguage} />
              </UserGuard>
            </AuthGuard>
          }
        />
        <Route
          path="/settings"
          element={
            <AuthGuard>
              <UserGuard>
                <Settings theme={theme} setTheme={setTheme} language={language} setLanguage={setLanguage} />
              </UserGuard>
            </AuthGuard>
          }
        />
        <Route
          path="/code-attendance"
          element={
            <AuthGuard>
              <UserGuard>
                <CodeAttendancePage
                  theme={theme}
                  setTheme={setTheme}
                  language={language}
                  setLanguage={setLanguage}
                />
              </UserGuard>
            </AuthGuard>
          }
        />
        <Route
          path="/attend"
          element={<AttendRedirectPage theme={theme} setTheme={setTheme} language={language} setLanguage={setLanguage} />}
        />
        <Route
          path="/attend/:token"
          element={<AttendRedirectPage theme={theme} setTheme={setTheme} language={language} setLanguage={setLanguage} />}
        />
      </Routes>
    </>
  );
};

export default AppRouter;
