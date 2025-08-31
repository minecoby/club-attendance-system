import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import Login from "../pages/Login";
import SignUp from "../pages/SignUp";
import UserPage from "../pages/UserPage";
import LeaderPage from "../pages/LeaderPage";
import Settings from "../pages/Settings";
import Navbar from "../components/Navbar";
import QRAttendancePage from "../pages/QRAttendancePage";
import UserGuard from "../components/MobileGuard";

const AppRouter = ({ theme, setTheme, language, setLanguage }) => {
  const location = useLocation();
  const hideNavOnPaths = ["/", "/login", "/signup"];
  const showNav = !hideNavOnPaths.includes(location.pathname);

  return (<>

  {showNav && <Navbar language={language} />}
  <Routes>
    <Route path="/" element={<Login />} />
    <Route path="/login" element={<Login />} />
    <Route path="/signup" element={<SignUp />} />
    <Route path="/userpage" element={
      <UserGuard>
        <UserPage theme={theme} setTheme={setTheme} language={language} setLanguage={setLanguage} />
      </UserGuard>
    } />
    <Route path="/leaderpage" element={
      <UserGuard>
        <LeaderPage theme={theme} setTheme={setTheme} language={language} setLanguage={setLanguage} />
      </UserGuard>
    } />
    <Route path="/settings" element={
      <UserGuard>
        <Settings theme={theme} setTheme={setTheme} language={language} setLanguage={setLanguage} />
      </UserGuard>
    } />
    <Route path="/qr-attendance" element={
      <UserGuard>
        <QRAttendancePage theme={theme} setTheme={setTheme} language={language} setLanguage={setLanguage} />
      </UserGuard>
    } />
  </Routes>
  </>);
};

export default AppRouter;
