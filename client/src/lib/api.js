import axios from 'axios';
export const api = axios.create({ baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000/api/v1', withCredentials: true, timeout: 12000 });
api.interceptors.response.use(r => r, e => { const message = e.response?.data?.message || e.message || 'Something went wrong'; return Promise.reject(new Error(message)); });
