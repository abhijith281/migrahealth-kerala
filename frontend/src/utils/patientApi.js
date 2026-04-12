import API from './api';

// ─── Patient Profile ──────────────────────────────────────────
export const getMyProfile = () => API.get('/patients/profile');
export const updateMyProfile = (data) => API.put('/patients/profile', data);
export const getMyPatients = () => API.get('/patients/my-patients');

// ─── Health Records ────────────────────────────────────────────
export const getRecords = () => API.get('/records');
export const getRecord = (id) => API.get(`/records/${id}`);
export const createRecord = (data) => API.post('/records', data);
export const updateRecord = (id, data) => API.put(`/records/${id}`, data);
export const deleteRecord = (id) => API.delete(`/records/${id}`);
