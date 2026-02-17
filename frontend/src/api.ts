import axios from 'axios';

export const getApiBaseUrl = () => {
    const envUrl = import.meta.env.VITE_API_URL || import.meta.env.VITE_BACKEND_URL;
    if (envUrl) {
        return envUrl.endsWith('/api') ? envUrl : `${envUrl}/api`;
    }
    return 'http://localhost:5000/api';
};

export const getBackendBaseUrl = () => {
    const envUrl = import.meta.env.VITE_API_URL || import.meta.env.VITE_BACKEND_URL;
    if (envUrl) {
        return envUrl.endsWith('/api') ? envUrl.slice(0, -4) : envUrl;
    }
    return 'http://localhost:5000';
};

const api = axios.create({
    baseURL: getApiBaseUrl(),
});

// Add a request interceptor to include the token in all requests
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

export default api;
