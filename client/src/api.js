import axios from 'axios';
const api = axios.create({ baseURL: '/api', withCredentials: true });
export const msg = (e) => e.response?.data?.message || 'Something went wrong';
export default api;
