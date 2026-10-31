import { api } from './api';
import { User } from '../types';

export const authService = {
  async register(data: { email: string; password: string; full_name: string }) {
    const res = await api.post('/auth/register', data);
    return res.data;
  },

  async verifyEmail(data: { email?: string; code?: string; token?: string }) {
    const res = await api.post('/auth/verify-email', data);
    if (res.data.token) {
      localStorage.setItem('dhl_auth_token', res.data.token);
    }
    return res.data;
  },

  async login(data: { email: string; password: string }) {
    const res = await api.post('/auth/login', data);
    if (res.data.token) {
      localStorage.setItem('dhl_auth_token', res.data.token);
    }
    return res.data;
  },

  async forgotPassword(email: string) {
    const res = await api.post('/auth/forgot-password', { email });
    return res.data;
  },

  async resetPassword(token: string, new_password: string) {
    const res = await api.post('/auth/reset-password', { token, new_password });
    return res.data;
  },

  async changePassword(current_password: string, new_password: string) {
    const res = await api.post('/auth/change-password', { current_password, new_password });
    return res.data;
  },

  async getCurrentUser(): Promise<User> {
    const res = await api.get('/auth/me');
    return res.data.user;
  },

  async logout() {
    try {
      await api.post('/auth/logout');
    } finally {
      localStorage.removeItem('dhl_auth_token');
    }
  },
};
