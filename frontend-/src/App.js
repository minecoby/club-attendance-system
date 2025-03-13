import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/Login";
import SignUp from "./pages/SignUp";
import UserPage from "./pages/UserPage";
import Settings from "./pages/Settings";
import Navbar from "./components/Navbar";

function App() {
  const isAuthenticated = localStorage.getItem("token"); // 로그인 여부 확인

  return (
    <Router>
      {isAuthenticated && <Navbar />}
      <Routes>
        {/* 로그인 여부에 따라 리다이렉트 */}
        <Route path="/" element={isAuthenticated ? <Navigate to="/userpage" /> : <Navigate to="/login" />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<SignUp />} />
        <Route path="/userpage" element={isAuthenticated ? <UserPage /> : <Navigate to="/login" />} />
        <Route path="/settings" element={isAuthenticated ? <Settings /> : <Navigate to="/login" />} />
      </Routes>
    </Router>
  );

}

export default App;