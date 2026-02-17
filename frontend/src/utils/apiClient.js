import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_BASE_URL;

// API 클라이언트 생성
const apiClient = axios.create({
  baseURL: API_BASE_URL,
});

// 토큰 갱신 중인지 추적
let isRefreshing = false;
let failedQueue = [];

// 대기열에 있는 요청들을 처리하는 함수
const processQueue = (error, token = null) => {
  failedQueue.forEach(({ resolve, reject }) => {
    if (error) {
      reject(error);
    } else {
      resolve(token);
    }
  });
  
  failedQueue = [];
};

// 요청 인터셉터: 모든 요청에 토큰 추가
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// 응답 인터셉터: 토큰 만료 시 자동 갱신
apiClient.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error) => {
    const originalRequest = error.config;

    // 401 오류이고 아직 재시도하지 않은 경우
    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        // 이미 토큰 갱신 중이면 대기열에 추가
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then((token) => {
          originalRequest.headers.Authorization = `Bearer ${token}`;
          return apiClient(originalRequest);
        }).catch((err) => {
          return Promise.reject(err);
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      const refreshToken = localStorage.getItem('refresh_token');
      
      if (!refreshToken) {
        // 리프레시 토큰이 없으면 로그인 페이지로
        localStorage.removeItem('token');
        localStorage.removeItem('refresh_token');
        localStorage.removeItem('usertype');
        window.location.href = '/login';
        return Promise.reject(error);
      }

      try {
        // 토큰 갱신 요청
        const response = await axios.post(`${API_BASE_URL}/users/refresh`, {
          refresh_token: refreshToken
        });

        const { access_token, refresh_token: newRefreshToken } = response.data;
        
        // 새로운 토큰들 저장
        localStorage.setItem('token', access_token);
        localStorage.setItem('refresh_token', newRefreshToken);

        // 대기열의 모든 요청에 새 토큰 적용
        processQueue(null, access_token);

        // 원래 요청 재시도
        originalRequest.headers.Authorization = `Bearer ${access_token}`;
        return apiClient(originalRequest);

      } catch (refreshError) {
        // 리프레시 토큰도 만료된 경우
        processQueue(refreshError, null);
        localStorage.removeItem('token');
        localStorage.removeItem('refresh_token');
        localStorage.removeItem('usertype');
        window.location.href = '/login';
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export default apiClient; 