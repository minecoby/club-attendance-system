import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import apiClient, { clearClientAuthState } from "../utils/apiClient";

const AuthGuard = ({ children }) => {
  const [status, setStatus] = useState("checking");

  useEffect(() => {
    apiClient
      .get("/users/validate_token")
      .then(() => setStatus("ok"))
      .catch(() => {
        clearClientAuthState();
        setStatus("unauthorized");
      });
  }, []);

  if (status === "checking") {
    return null;
  }

  if (status === "unauthorized") {
    return <Navigate to="/login" replace />;
  }

  return children;
};

export default AuthGuard;
