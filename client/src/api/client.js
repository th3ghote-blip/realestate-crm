import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (r) => r,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('agent');
      if (!location.pathname.startsWith('/login') && !location.pathname.startsWith('/signup')) {
        location.href = '/login';
      }
    }
    return Promise.reject(err);
  }
);

export const auth = {
  signup: (data) => api.post('/auth/signup', data).then((r) => r.data),
  login: (data) => api.post('/auth/login', data).then((r) => r.data),
  me: () => api.get('/auth/me').then((r) => r.data),
};

export const leads = {
  list: () => api.get('/leads').then((r) => r.data),
  get: (id) => api.get(`/leads/${id}`).then((r) => r.data),
};

export const listings = {
  list: () => api.get('/listings').then((r) => r.data),
  patch: (id, data) => api.patch(`/listings/${id}`, data).then((r) => r.data),
  startImport: (profileUrl) => api.post('/listings/import', { profileUrl }).then((r) => r.data),
  getJob: (jobId) => api.get(`/listings/import/${jobId}`).then((r) => r.data),
  recentJobs: () => api.get('/listings/import').then((r) => r.data),
  uploadCsv: (file) => {
    const fd = new FormData();
    fd.append('file', file);
    return api.post('/listings/import/csv', fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then((r) => r.data);
  },
};

export default api;
