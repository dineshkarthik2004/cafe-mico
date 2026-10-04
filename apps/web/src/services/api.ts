import axios from 'axios';

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3001/api',
  withCredentials: true,
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Check if error is 401 and redirect to login if we're in admin/kitchen
    if (error.response?.status === 401) {
      if (window.location.pathname.startsWith('/admin') && window.location.pathname !== '/admin/login') {
        window.location.href = '/admin/login';
      } else if (window.location.pathname.startsWith('/kitchen') && window.location.pathname !== '/kitchen/login') {
        window.location.href = '/kitchen/login';
      }
    }
    return Promise.reject(error);
  }
);
