import { Routes, Route, useLocation } from "react-router-dom";
import Login from "../pages/Login";
import Register from "../pages/Register";
import LeaderPage from "../pages/LeaderPage";
import Settings from "../pages/Settings";
import Navbar from "../components/Navbar";
import CodeAttendancePage from "../pages/CodeAttendancePage";
import AttendRedirectPage from "../pages/AttendRedirectPage";
import AuthGuard from "../components/AuthGuard";

const AppRouter = ({ theme, setTheme, language, setLanguage }) => {
  const location = useLocation();
  const hideNavOnPaths = ["/", "/login", "/register"];
  const showNav = !hideNavOnPaths.includes(location.pathname);

  return (<>
  {showNav && <Navbar language={language} />}
  <Routes>
    <Route path="/" element={<Login />} />
    <Route path="/login" element={<Login />} />
    <Route path="/register" element={<Register />} />
    <Route path="/leaderpage" element={
      <AuthGuard>
        <LeaderPage theme={theme} setTheme={setTheme} language={language} setLanguage={setLanguage} />
      </AuthGuard>
    } />
    <Route path="/settings" element={
      <AuthGuard>
        <Settings theme={theme} setTheme={setTheme} language={language} setLanguage={setLanguage} />
      </AuthGuard>
    } />
    <Route path="/code-attendance" element={
      <AuthGuard>
        <CodeAttendancePage theme={theme} setTheme={setTheme} language={language} setLanguage={setLanguage} />
      </AuthGuard>
    } />
    <Route path="/attend" element={
      <AttendRedirectPage theme={theme} setTheme={setTheme} language={language} setLanguage={setLanguage} />
    } />
    <Route path="/attend/:token" element={
      <AttendRedirectPage theme={theme} setTheme={setTheme} language={language} setLanguage={setLanguage} />
    } />
  </Routes>
  </>);
};

export default AppRouter;
