import axios from 'axios';

const axiosInstance = axios.create({
  baseURL: 'http://localhost:5000/api',
  timeout: 30000, // 30 seconds timeout
});

// Request interceptor
axiosInstance.interceptors.request.use(
  (config) => {
    console.log('📤 Sending request to:', config.url);
    
    // Get token from localStorage - FIXED KEY NAME
    const token = localStorage.getItem('authToken') || localStorage.getItem('token');
    
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
      console.log('🔐 Token attached:', token.substring(0, 20) + '...');
    } else {
      console.warn('⚠️ No auth token found in localStorage');
    }
    
    return config;
  },
  (error) => {
    console.error('❌ Request error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor
axiosInstance.interceptors.response.use(
  (response) => {
    console.log('✅ Response from:', response.config.url, 'Status:', response.status);
    return response;
  },
  (error) => {
    console.error('❌ Response error from:', error.config?.url);
    console.error('Status:', error.response?.status);
    console.error('Error message:', error.response?.data?.error || error.message);
    
    if (error.response?.status === 401) {
      console.log('🔓 Unauthorized - redirecting to login');
      localStorage.removeItem('authToken');
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    
    return Promise.reject(error);
  }
);

export default axiosInstance;