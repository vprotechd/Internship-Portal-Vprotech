import axios from 'axios';

/*
| API Base URL
| Local:      http://localhost:5000/api
| Production: /api (Render rewrite) ya VITE_API_URL agar set ho
*/
const getApiBaseUrl = () => {
  const configuredUrl = import.meta.env.VITE_API_URL?.trim();
  if (configuredUrl) return configuredUrl.replace(/\/+$/, '');

  const isLocal =
    typeof window !== 'undefined' &&
    (window.location.hostname === 'localhost' ||
      window.location.hostname === '127.0.0.1');

  if (isLocal) return 'http://localhost:5000/api';
  return '/api';
};

/*
| Token storage (Authorization header ke liye)
*/
let memoryToken = null;
const TOKEN_KEY = 'vpro_token';

export const getStoredToken = () => {
  if (memoryToken) return memoryToken;
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
};

export const setStoredToken = (token) => {
  memoryToken = token || null;
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* private mode: memory token chalega */
  }
};

const api = axios.create({
  baseURL: getApiBaseUrl(),
  withCredentials: true, // cookie bhi chalti rahe
  headers: { 'Content-Type': 'application/json' },
  timeout: 60000,
});

api.interceptors.request.use(
  (config) => {
    const token = getStoredToken();
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (!error.response) {
      error.message =
        'Unable to connect to the server. Please check your internet connection or try again.';
    }
    return Promise.reject(error);
  }
);

export const msg = (error) => {
  if (!error) return 'Something went wrong';
  if (error.response?.data?.message) return error.response.data.message;
  if (error.response?.data?.error) return error.response.data.error;
  if (Array.isArray(error.response?.data?.errors)) {
    return error.response.data.errors
      .map((item) =>
        typeof item === 'object' ? item.message || JSON.stringify(item) : item
      )
      .join(', ');
  }
  if (error.message) return error.message;
  return 'Something went wrong';
};

export default api;