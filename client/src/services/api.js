import axios from 'axios';

const api = axios.create({
    baseURL: '/api',
    headers: {
        'Content-Type': 'application/json'
    },
    timeout: 30000
});

// Request interceptor - add auth token
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Response interceptor - handle errors
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            // Token expired or invalid
            localStorage.removeItem('token');

            // Only redirect if not already on login page
            if (window.location.pathname !== '/login') {
                window.location.href = '/login';
            }
        }
        return Promise.reject(error);
    }
);

export default api;

// API service functions
export const ticketService = {
    create: (data) => api.post('/tickets', data),
    getActive: () => api.get('/tickets/active'),
    getMyTickets: () => api.get('/tickets/my-tickets'),
    get: (identifier) => api.get(`/tickets/${identifier}`),
    search: (params) => api.get('/tickets/search', { params }),
    print: (id) => api.post(`/tickets/${id}/print`),
    markLost: (id, data) => api.put(`/tickets/${id}/lost`, data),
    cancel: (id) => api.delete(`/tickets/${id}`)
};

export const paymentService = {
    calculate: (params) => api.get('/payments/calculate', { params }),
    process: (data) => api.post('/payments', data),
    get: (identifier) => api.get(`/payments/${identifier}`),
    getHistory: (params) => api.get('/payments/history', { params })
};

export const adminService = {
    getDashboard: () => api.get('/admin/dashboard'),
    getUsers: () => api.get('/admin/users'),
    updateUser: (id, data) => api.put(`/admin/users/${id}`, data),
    deleteUser: (id) => api.delete(`/admin/users/${id}`),
    getRates: () => api.get('/admin/rates'),
    updateRate: (vehicleType, data) => api.put(`/admin/rates/${vehicleType}`, data),
    getSettings: () => api.get('/admin/settings'),
    updateSettings: (data) => api.put('/admin/settings', data),
    getBlacklist: () => api.get('/admin/blacklist'),
    addToBlacklist: (data) => api.post('/admin/blacklist', data),
    removeFromBlacklist: (id) => api.delete(`/admin/blacklist/${id}`),
    getActivityLogs: (params) => api.get('/admin/activity-logs', { params })
};

export const authService = {
    login: (data) => api.post('/auth/login', data),
    register: (data) => api.post('/auth/register', data),
    getProfile: () => api.get('/auth/profile'),
    updateProfile: (data) => api.put('/auth/profile', data),
    verify: () => api.get('/auth/verify')
};
