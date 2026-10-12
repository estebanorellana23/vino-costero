import axios from 'axios';

// Cliente HTTP apuntando a la API de Node/Express.
export const api = axios.create({
  // Local: '/api' (proxy de Vite). En línea: VITE_API_URL=https://servidor/api al compilar.
  baseURL: import.meta.env.VITE_API_URL || '/api',
  timeout: 15000,
});

// Adjunta el token de sesión (si existe) a cada petición.
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Si el token venció, saca al usuario al login.
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401 && localStorage.getItem('token')) {
      localStorage.removeItem('token');
      localStorage.removeItem('usuario');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);
