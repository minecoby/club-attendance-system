import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import Login from "../pages/Login";
import SignUp from "../pages/SignUp";
import UserPage from "../pages/UserPage";
import LeaderPage from "../pages/LeaderPage";
import Settings from "../pages/Settings";
import Navbar from "../components/Navbar";

const AppRouter = () => {
  const location = useLocation();
  const hideNavOnPaths = ["/", "/login", "/signup"];
  const showNav = !hideNavOnPaths.includes(location.pathname);

  return (<>

  {showNav && <Navbar/>}
  <Routes>
    <Route path="/" element={<Login />} />
    <Route path="/login" element={<Login />} />
    <Route path="/signup" element={<SignUp />} />
    <Route path="/userpage" element={<UserPage />} />
    <Route path="/leaderpage" element={<LeaderPage />} />
    <Route path="/settings" element={<Settings />} />
  </Routes>
  </>);
};

export default AppRouter;
