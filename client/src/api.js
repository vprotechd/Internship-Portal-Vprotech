import axios from 'axios';

/*
|--------------------------------------------------------------------------
| API Base URL
|--------------------------------------------------------------------------
| Local development:
|   http://localhost:5000/api
|
| Production:
|   https://internship-portal-vprotech1.onrender.com/api
|
| VITE_API_URL can override the default URL when required.
|--------------------------------------------------------------------------
*/

const getApiBaseUrl = () => {
  // If VITE_API_URL is defined, always use it.
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL.replace(/\/+$/, '');
  }

  // Local development
  if (
    window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1'
  ) {
    return 'http://localhost:5000/api';
  }

  // Production
  return 'https://internship-portal-vprotech1.onrender.com/api';
};

const API_BASE_URL = getApiBaseUrl();

/*
|--------------------------------------------------------------------------
| Axios Instance
|--------------------------------------------------------------------------
*/

const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000,
});

/*
|--------------------------------------------------------------------------
| Request Interceptor
|--------------------------------------------------------------------------
*/

api.interceptors.request.use(
  (config) => {
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

/*
|--------------------------------------------------------------------------
| Response Interceptor
|--------------------------------------------------------------------------
*/

api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    /*
    |--------------------------------------------------------------------------
    | Network / Server Unavailable
    |--------------------------------------------------------------------------
    */

    if (!error.response) {
      error.message =
        'Unable to connect to the server. Please check your internet connection or try again.';
    }

    return Promise.reject(error);
  }
);

/*
|--------------------------------------------------------------------------
| Error Message Helper
|--------------------------------------------------------------------------
*/

export const msg = (error) => {
  if (!error) {
    return 'Something went wrong';
  }

  /*
  |--------------------------------------------------------------------------
  | Backend response message
  |--------------------------------------------------------------------------
  */

  if (error.response?.data?.message) {
    return error.response.data.message;
  }

  /*
  |--------------------------------------------------------------------------
  | Backend error
  |--------------------------------------------------------------------------
  */

  if (error.response?.data?.error) {
    return error.response.data.error;
  }

  /*
  |--------------------------------------------------------------------------
  | Validation errors
  |--------------------------------------------------------------------------
  */

  if (Array.isArray(error.response?.data?.errors)) {
    return error.response.data.errors
      .map((item) => item.message || item)
      .join(', ');
  }

  /*
  |--------------------------------------------------------------------------
  | Axios / Network error
  |--------------------------------------------------------------------------
  */

  if (error.message) {
    return error.message;
  }

  return 'Something went wrong';
};

/*
|--------------------------------------------------------------------------
| Export
|--------------------------------------------------------------------------
*/

export default api;