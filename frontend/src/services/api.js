// Centralized Axios API service
import axios from 'axios';
import toast from 'react-hot-toast';

const API = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:5000/api',
  timeout: 30000,
});

// Attach JWT token to every request
API.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Handle errors globally
API.interceptors.response.use(
  (response) => response.data,
  (error) => {
    const message = error.response?.data?.message || 'Something went wrong';
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    } else if (error.response?.status !== 404) {
      toast.error(message);
    }
    return Promise.reject(error);
  }
);

// ─── Auth ───────────────────────────────────────────────
export const authAPI = {
  login: (data) => API.post('/auth/login', data),
  register: (data) => API.post('/auth/register', data),
  getMe: () => API.get('/auth/me'),
  changePassword: (data) => API.put('/auth/change-password', data),
};

// ─── Colleges ───────────────────────────────────────────
export const collegeAPI = {
  getAll: () => API.get('/colleges'),
  create: (data) => API.post('/colleges', data),
  update: (id, data) => API.put(`/colleges/${id}`, data),
  delete: (id) => API.delete(`/colleges/${id}`),
};

// ─── Users ──────────────────────────────────────────────
export const userAPI = {
  getAll: (params) => API.get('/users', { params }),
  getById: (id) => API.get(`/users/${id}`),
  update: (id, data) => API.put(`/users/${id}`, data),
  delete: (id) => API.delete(`/users/${id}`),
  getResults: (id) => API.get(`/users/${id}/results`),
  getViolations: (id) => API.get(`/users/${id}/violations`),
  getDashboardStats: () => API.get('/users/dashboard/stats'),
};

// ─── Exams ──────────────────────────────────────────────
export const examAPI = {
  getAll: () => API.get('/exams'),
  getById: (id) => API.get(`/exams/${id}`),
  create: (data) => API.post('/exams', data),
  update: (id, data) => API.put(`/exams/${id}`, data),
  delete: (id) => API.delete(`/exams/${id}`),
  enroll: (id, data) => API.post(`/exams/${id}/enroll`, data),
  getResults: (id) => API.get(`/exams/${id}/results`),
  addQuestion: (examId, data) => API.post(`/exams/${examId}/questions`, data),
  bulkAddQuestions: (examId, data) => API.post(`/exams/${examId}/questions/bulk`, data),
};

// ─── Questions ──────────────────────────────────────────
export const questionAPI = {
  update: (id, data) => API.put(`/questions/${id}`, data),
  delete: (id) => API.delete(`/questions/${id}`),
};

// ─── Sessions ───────────────────────────────────────────
export const sessionAPI = {
  start: (data) => API.post('/sessions/start', data),
  saveAnswer: (sessionId, data) => API.post(`/sessions/${sessionId}/answer`, data),
  submit: (sessionId, data) => API.post(`/sessions/${sessionId}/submit`, data),
  getAnswers: (sessionId) => API.get(`/sessions/${sessionId}/answers`),
  logViolation:   (sessionId, data)  => API.post(`/sessions/${sessionId}/violation`, data),
  terminate:      (sessionId, data)  => API.post(`/sessions/${sessionId}/terminate`, data || {}),
  getViolations:  (sessionId)        => API.get(`/sessions/${sessionId}/violations`),
};

export default API;
