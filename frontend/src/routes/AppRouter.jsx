import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import Login from "../pages/Login";
import SignUp from "../pages/SignUp";
import UserPage from "../pages/UserPage";
import LeaderPage from "../pages/LeaderPage";
import Settings from "../pages/Settings";
import Navbar from "../components/Navbar";
import QRAttendancePage from "../pages/QRAttendancePage";

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
    <Route path="/userpage" element={<UserPage theme={theme} setTheme={setTheme} language={language} setLanguage={setLanguage} />} />
    <Route path="/leaderpage" element={<LeaderPage theme={theme} setTheme={setTheme} language={language} setLanguage={setLanguage} />} />
    <Route path="/settings" element={<Settings theme={theme} setTheme={setTheme} language={language} setLanguage={setLanguage} />} />
    <Route path="/qr-attendance" element={<QRAttendancePage theme={theme} setTheme={setTheme} language={language} setLanguage={setLanguage} />} />
  </Routes>
  </>);
};

export default AppRouter;
