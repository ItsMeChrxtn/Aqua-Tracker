import axios from 'axios';
import { startLoading, finishLoading } from '../components/feedback/feedbackStore';

const API_URL = import.meta.env.VITE_API_URL || '/api';

const client = axios.create({ baseURL: API_URL });

// Uploaded files are served by the API server at /uploads, so in production
// (client and API on different domains) they need the API's origin prefixed.
export function assetUrl(path) {
  if (!path || /^https?:\/\//.test(path)) return path;
  return API_URL.replace(/\/api\/?$/, '') + path;
}

// Every create/update/delete shows the centered loading modal. Requests can
// opt out with `{ silent: true }` or set their own text with `{ loadingText }`.
const SILENT_URLS = [/^\/notifications/];

const LOADING_TEXT = {
  post: 'Creating…',
  put: 'Updating…',
  patch: 'Updating…',
  delete: 'Deleting…',
};

const SUCCESS_TEXT = {
  post: 'Created successfully.',
  put: 'Updated successfully.',
  patch: 'Updated successfully.',
  delete: 'Deleted successfully.',
};

const URL_LOADING_TEXT = [
  [/^\/auth\/login/, 'Signing in…'],
  [/^\/auth\/register/, 'Creating your account…'],
  [/^\/auth\/verify-email/, 'Verifying…'],
  [/^\/users$/, 'Creating account & sending email…'],
  [/^\/auth\/change-password/, 'Changing password…'],
  [/\/approve$/, 'Approving…'],
  [/\/reject$/, 'Rejecting…'],
];

function isTracked(config) {
  const method = config.method?.toLowerCase();
  if (config.silent || !LOADING_TEXT[method]) return false;
  return !SILENT_URLS.some((re) => re.test(config.url || ''));
}

function loadingTextFor(config) {
  if (config.loadingText) return config.loadingText;
  const match = URL_LOADING_TEXT.find(([re]) => re.test(config.url || ''));
  return match ? match[1] : LOADING_TEXT[config.method.toLowerCase()];
}

export function apiErrorMessage(error, fallback = 'Something went wrong') {
  return error?.response?.data?.message || error?.message || fallback;
}

client.interceptors.request.use((config) => {
  const token = localStorage.getItem('aquatrack_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  if (isTracked(config)) {
    config.tracked = true;
    startLoading(loadingTextFor(config));
  }
  return config;
});

client.interceptors.response.use(
  (res) => {
    if (res.config.tracked) {
      finishLoading({ type: 'success', message: SUCCESS_TEXT[res.config.method.toLowerCase()] });
    }
    return res;
  },
  (error) => {
    if (error.config?.tracked) {
      finishLoading({ type: 'error', message: apiErrorMessage(error) });
    }
    if (error.response?.status === 401) {
      localStorage.removeItem('aquatrack_token');
      localStorage.removeItem('aquatrack_user');
      if (!window.location.pathname.startsWith('/login')) {
        window.location.href = '/login';
      }
    }
    if (error.response?.data?.code === 'PASSWORD_CHANGE_REQUIRED' && window.location.pathname !== '/change-password') {
      window.location.href = '/change-password';
    }
    return Promise.reject(error);
  }
);

export default client;
