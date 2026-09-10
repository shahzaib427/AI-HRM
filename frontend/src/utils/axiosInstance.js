import axios from 'axios';

const axiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
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
  async (error) => {
    const config = error.config;

    // ✅ Retry once on 429 (Too Many Requests) with a short backoff.
    // Handles bursts from React StrictMode double-mounting effects in dev,
    // and genuine rate-limit hiccups on the free-tier backend in prod.
    const isRateLimited = error.response?.status === 429;
    const alreadyRetried = config?._retried429;

    if (isRateLimited && config && !alreadyRetried) {
      config._retried429 = true;
      const retryAfterHeader = Number(error.response.headers?.['retry-after']);
      const delayMs = (retryAfterHeader > 0 ? retryAfterHeader : 2) * 1000;
      console.warn(`⏳ 429 received for ${config.url} — retrying in ${delayMs}ms`);
      await new Promise((resolve) => setTimeout(resolve, delayMs));
      return axiosInstance(config);
    }

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