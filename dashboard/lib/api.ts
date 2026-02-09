import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.slyos.world';

const api = axios.create({
  baseURL: `${API_URL}/api`,
  timeout: 30000,
});

api.interceptors.request.use((config) => {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 401 responses globally
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && typeof window !== 'undefined') {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      if (window.location.pathname !== '/') {
        window.location.href = '/';
      }
    }
    return Promise.reject(error);
  }
);

export const login = async (email: string, password: string) => {
  const res = await api.post('/auth/login', { email, password });
  if (typeof window !== 'undefined') {
    localStorage.setItem('token', res.data.token);
    localStorage.setItem('user', JSON.stringify(res.data.user));
  }
  return res.data;
};

export const register = async (name: string, email: string, password: string, organizationName?: string) => {
  const res = await api.post('/auth/register', { name, email, password, organizationName });
  if (typeof window !== 'undefined') {
    localStorage.setItem('token', res.data.token);
    localStorage.setItem('user', JSON.stringify(res.data.user));
  }
  return res.data;
};

export const getProfile = async () => {
  const res = await api.get('/auth/me');
  return res.data;
};

export const updateProfile = async (data: { name?: string; email?: string }) => {
  const res = await api.put('/auth/profile', data);
  return res.data;
};

export const changePassword = async (currentPassword: string, newPassword: string) => {
  const res = await api.put('/auth/password', { currentPassword, newPassword });
  return res.data;
};

export const updateOrganization = async (data: { name: string }) => {
  const res = await api.put('/auth/organization', data);
  return res.data;
};

export const getDevices = async () => {
  const res = await api.get('/devices');
  return res.data;
};

export const getModels = async () => {
  const res = await api.get('/models');
  return res.data;
};

export const getAnalytics = async () => {
  const res = await api.get('/analytics/overview');
  return res.data;
};

export const forgotPassword = async (email: string) => {
  const res = await api.post('/auth/forgot-password', { email });
  return res.data;
};

export const resetPassword = async (token: string, newPassword: string) => {
  const res = await api.post('/auth/reset-password', { token, newPassword });
  return res.data;
};

export default api;
