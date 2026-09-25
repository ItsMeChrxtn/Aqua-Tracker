import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || '/api';

const client = axios.create({ baseURL: API_URL });

// Uploaded files are served by the API server at /uploads, so in production
// (client and API on different domains) they need the API's origin prefixed.
export function assetUrl(path) {
  if (!path || /^https?:\/\//.test(path)) return path;
  return API_URL.replace(/\/api\/?$/, '') + path;
}

client.interceptors.request.use((config) => {
  const token = localStorage.getItem('aquatrack_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

client.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('aquatrack_token');
      localStorage.removeItem('aquatrack_user');
      if (!window.location.pathname.startsWith('/login')) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export function apiErrorMessage(error, fallback = 'Something went wrong') {
  return error?.response?.data?.message || error?.message || fallback;
}

export default client;
