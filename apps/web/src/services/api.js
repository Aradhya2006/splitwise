import axios from 'axios';

const api = axios.create({
  baseURL: 'http://10.39.60.206:5000',
  timeout: 10000,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;