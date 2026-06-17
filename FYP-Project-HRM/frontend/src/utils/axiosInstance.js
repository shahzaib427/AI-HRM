import axios from 'axios';

const axiosInstance = axios.create({
  baseURL: 'http://localhost:5000/api',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

axiosInstance.interceptors.request.use((config) => {
  const token = localStorage.getItem('authToken') || localStorage.getItem('token');
  console.log('🔑 Axios Interceptor - Token:', token ? `Found (${token.substring(0, 20)}...)` : 'Not found');
  console.log('🌐 Request to:', config.baseURL + config.url);
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    // ✅ Don't redirect to login for AI attendance routes —
    // face mismatch / GPS errors can return 401 or 403 and should
    // be handled inside the component, not treated as auth failures.
    const isAttendanceRoute = error.config?.url?.includes('/attendance/ai');

    const shouldRedirect =
      (error.response?.status === 401 || error.response?.status === 403) &&
      !isAttendanceRoute;

    if (shouldRedirect) {
      localStorage.removeItem('authToken');
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      if (window.location.pathname !== '/login') window.location.href = '/login';
    }

    return Promise.reject(error);
  }
);

export default axiosInstance;