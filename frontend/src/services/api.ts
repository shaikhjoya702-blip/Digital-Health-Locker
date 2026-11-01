import axios from 'axios';

const rawBase = (import.meta.env.VITE_API_BASE_URL || '/api').trim().replace(/\/+$/, '');
// Ensure the base ends with /api if it is a host without a path
export const API_BASE_URL = rawBase.endsWith('/api') ? rawBase : (rawBase === '' ? '/api' : `${rawBase}/api`);

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to attach JWT token
api.interceptors.request.use(
  (config) => {
    // Do not overwrite an Authorization header if already explicitly provided (e.g. Doctor token)
    if (!config.headers.Authorization) {
      const token = localStorage.getItem('dhl_auth_token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor to handle session expirations
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // Clear token if user is unauthorized on protected routes
      if (!window.location.pathname.startsWith('/signin') && 
          !window.location.pathname.startsWith('/doctor')) {
        localStorage.removeItem('dhl_auth_token');
      }
    }
    return Promise.reject(error);
  }
);
