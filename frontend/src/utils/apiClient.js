import axios from "axios";

const API_BASE_URL = import.meta.env.VITE_BASE_URL;

const clearClientAuthState = () => {
  localStorage.removeItem("usertype");
};

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
});

let isRefreshing = false;
let failedQueue = [];
const PUBLIC_PATHS = new Set(["/", "/login", "/register", "/auth/callback", "/privacy-policy", "/terms"]);

const isPublicPath = () => {
  const pathname = window.location?.pathname || "";
  return PUBLIC_PATHS.has(pathname);
};

const processQueue = (error) => {
  failedQueue.forEach(({ resolve, reject }) => {
    if (error) {
      reject(error);
    } else {
      resolve();
    }
  });
  failedQueue = [];
};

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (!originalRequest) {
      return Promise.reject(error);
    }

    const isUnauthorized = error.response?.status === 401;
    const isRefreshRequest = originalRequest.url?.includes("/users/refresh");

    if (isUnauthorized && !originalRequest._retry && !isRefreshRequest) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then(() => apiClient(originalRequest));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        await apiClient.post("/users/refresh", {});
        processQueue(null);
        return apiClient(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError);
        clearClientAuthState();
        if (!isPublicPath()) {
          window.location.href = "/login";
        }
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export { clearClientAuthState };
export default apiClient;
