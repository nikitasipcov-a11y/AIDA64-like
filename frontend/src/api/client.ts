import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';

const client = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
});

client.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

client.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      if (!window.location.pathname.includes('/login')) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default client;

// Auth
export const authApi = {
  register: (data: { email: string; password: string; full_name?: string }) =>
    client.post('/auth/register', data),
  login: (data: { email: string; password: string; totp_code?: string }) =>
    client.post('/auth/login', data),
  me: () => client.get('/auth/me'),
  setup2fa: () => client.post('/auth/2fa/setup'),
  enable2fa: (totp_code: string) => client.post('/auth/2fa/enable', { totp_code }),
  disable2fa: (data: { totp_code: string; password: string }) =>
    client.post('/auth/2fa/disable', data),
};

// Devices
export const devicesApi = {
  list: () => client.get('/devices'),
  get: (id: number) => client.get(`/devices/${id}`),
  create: (data: { name: string; device_type?: string; group_name?: string; notes?: string }) =>
    client.post('/devices', data),
  update: (id: number, data: any) => client.patch(`/devices/${id}`, data),
  delete: (id: number) => client.delete(`/devices/${id}`),
  latestMetrics: (id: number) => client.get(`/devices/${id}/metrics/latest`),
  metricsHistory: (id: number, limit = 100) =>
    client.get(`/devices/${id}/metrics`, { params: { limit } }),
};
