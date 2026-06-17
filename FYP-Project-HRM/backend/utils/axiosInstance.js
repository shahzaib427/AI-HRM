import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const axiosInstance = axios.create({
  baseURL: API_BASE,
  timeout: 30000,
});

// ─── URLs that are allowed to 401 without logging the user out ────────────
const IGNORE_401_URLS = [
  '/auth/login',
  '/auth/register',
  '/auth/forgot-password',
  '/public',
];

// ─── Face recognition URLs that should NEVER trigger logout ───────────────
const FACE_RECOGNITION_URLS = [
  '/attendance/ai/register-face',
  '/attendance/ai/verify',
  '/attendance/ai/checkin',
  '/attendance/ai/checkout',
  '/attendance/ai/gps-validate',
  '/ai/face/register',
  '/ai/face/verify',
];

let isLoggingOut = false;

const handleLogout = (reason = 'Session expired') => {
  if (isLoggingOut) return;
  isLoggingOut = true;

  console.warn('🔓 Logging out:', reason);

  localStorage.removeItem('authToken');
  localStorage.removeItem('token');
  localStorage.removeItem('user');

  setTimeout(() => {
    window.location.href = '/login';
  }, 100);
};

// ─── Request interceptor ──────────────────────────────────────────────────
axiosInstance.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('authToken');

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    } else {
      const isPublic = IGNORE_401_URLS.some(url => config.url?.includes(url));
      if (!isPublic) {
        console.warn('⚠️ Axios: No authToken for request to', config.url);
      }
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// ─── Response interceptor ─────────────────────────────────────────────────
axiosInstance.interceptors.response.use(
  (response) => response,

  (error) => {
    const status = error.response?.status;
    const url = error.config?.url || '';
    const message = error.response?.data?.error || error.response?.data?.message || error.message;
    const code = error.response?.data?.code;

    // ── CRITICAL: NEVER logout for face recognition endpoints ──────────────
    const isFaceEndpoint = FACE_RECOGNITION_URLS.some(faceUrl => url.includes(faceUrl));
    
    if (isFaceEndpoint) {
      // Log the error but don't logout
      console.log(`🤖 Face recognition error [${status}]:`, message);
      
      // For 422 (face not detected) - enhance error message
      if (status === 422) {
        error.response.data.message = 'No face detected. Please ensure the face is clearly visible, well-lit, and facing the camera.';
      }
      
      // Return the error so frontend can show it
      return Promise.reject(error);
    }

    // ── 401 handling for non-face endpoints ─────────────────────────────────
    if (status === 401) {
      const isIgnored = IGNORE_401_URLS.some(u => url.includes(u));
      if (isIgnored) {
        return Promise.reject(error);
      }

      const isRealAuthFailure =
        code === 'TOKEN_EXPIRED' ||
        code === 'INVALID_TOKEN' ||
        code === 'AUTH_FAILED' ||
        message === 'Access denied. No token provided.' ||
        message === 'User no longer exists.';

      if (isRealAuthFailure) {
        handleLogout(message);
      } else {
        console.warn('⚠️ 401 from', url, '— not logging out. Message:', message);
      }

      return Promise.reject(error);
    }

    // ── 422 handling (face detection failed) - NEVER LOGOUT ─────────────────
    if (status === 422) {
      console.warn('⚠️ Validation error (face not detected):', message);
      // Don't logout - just reject
      return Promise.reject(error);
    }

    // ── 403 — insufficient permissions, NOT a logout ───────────────────────
    if (status === 403) {
      console.warn('🚫 403 Forbidden from', url, ':', message);
      return Promise.reject(error);
    }

    // ── Network errors ────────────────────────────────────────────────────
    if (!error.response) {
      console.error('🌐 Network error — server unreachable:', url);
      return Promise.reject(error);
    }

    // ── Everything else (400, 404, 500, etc.) ─────────────────────────────
    return Promise.reject(error);
  }
);

export default axiosInstance;