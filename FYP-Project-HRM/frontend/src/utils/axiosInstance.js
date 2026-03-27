import axios from 'axios';

const axiosInstance = axios.create({
  // ✅ Change from 3000 to 5000
  baseURL: 'http://localhost:5000/api', // This is your backend
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

axiosInstance.interceptors.request.use((config) => {
  const token = localStorage.getItem('authToken') || localStorage.getItem('token');
  console.log('🔑 Axios Interceptor - Token:', token ? `Found (${token.substring(0, 20)}...)` : 'Not found');
  console.log('🌐 Request to:', config.baseURL + config.url); // Debug
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('authToken');
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      if (window.location.pathname !== '/login') window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default axiosInstance;