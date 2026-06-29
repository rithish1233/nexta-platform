// api.js
import axios from 'axios';
const api = axios.create({ baseURL: '/api' });
api.interceptors.request.use(c => {
  const t = localStorage.getItem('nexta_token');
  if (t) c.headers.Authorization = `Bearer ${t}`;
  return c;
});
api.interceptors.response.use(r => r, err => {
  if (err.response?.status === 401) { localStorage.removeItem('nexta_token'); window.location.href = '/login'; }
  return Promise.reject(err);
});
export const authApi = {
  login:    d => api.post('/auth/login', d),
  register: d => api.post('/auth/register', d),
  me:       () => api.get('/auth/me'),
};
export const analysisApi = {
  start:     d  => api.post('/analysis/start', d),
  get:       id => api.get(`/analysis/${id}`),
  getLogs:   id => api.get(`/analysis/${id}/logs`),
  updateRec: (sid, rid, status) => api.patch(`/analysis/${sid}/recommendations/${rid}`, { status }),
  rerun:     (sid, aid, question) => api.post(`/analysis/${sid}/rerun/${aid}`, { question }),
};
export const historyApi = {
  list:      p  => api.get('/history', { params: p }),
  delete:    id => api.delete(`/history/${id}`),
  getMemory: () => api.get('/history/memory'),
};
export const domainApi = {
  list:    () => api.get('/domains'),
  samples: () => api.get('/domains/samples'),
};
export default api;
