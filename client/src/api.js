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
| VITE_API_URL can override both when needed.
|--------------------------------------------------------------------------
*/

const API_BASE_URL =
  import.meta.env.VITE_API_URL ||
  (window.location.hostname === 'localhost' ||
  window.location.hostname === '127.0.0.1'
    ? 'http://localhost:5000/api'
    : 'https://internship-portal-vprotech1.onrender.com/api');

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
    |----------------------------------------------------------------------
    | Network / Server Unavailable
    |----------------------------------------------------------------------
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
  | Backend message
  */
  if (error.response?.data?.message) {
    return error.response.data.message;
  }

  /*
  | Backend error
  */
  if (error.response?.data?.error) {
    return error.response.data.error;
  }

  /*
  | Axios/network error
  */
  if (error.message) {
    return error.message;
  }

  return 'Something went wrong';
};

/*
|--------------------------------------------------------------------------
| Export Axios Instance
|--------------------------------------------------------------------------
*/

export default api;