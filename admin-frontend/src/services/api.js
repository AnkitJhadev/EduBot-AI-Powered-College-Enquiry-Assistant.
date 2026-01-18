import axios from 'axios';

// Base URL for backend API
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add request interceptor to include JWT token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('adminToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add response interceptor to handle errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('adminToken');
      localStorage.removeItem('admin');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Admin API functions
export const adminAPI = {
  // Register admin
  register: async (adminData) => {
    const response = await api.post('/admin/register', adminData);
    return response.data;
  },

  // Login
  login: async (credentials) => {
    const response = await api.post('/admin/login', credentials);
    return response.data;
  },

  // Get all students
  getStudents: async () => {
    const response = await api.get('/admin/students');
    return response.data;
  },

  // Approve student
  approveStudent: async (studentId) => {
    const response = await api.patch(`/admin/students/${studentId}/approve`);
    return response.data;
  },

  // Reject student
  rejectStudent: async (studentId) => {
    const response = await api.patch(`/admin/students/${studentId}/reject`);
    return response.data;
  },

  // Get current admin
  getCurrentAdmin: async () => {
    const response = await api.get('/admin/me');
    return response.data;
  },
};

export default api;
