import API from './api';

export const getAdminStats = () => API.get('/admin/stats');
export const getRecordsAnalytics = () => API.get('/admin/analytics/records-per-month');

export const getAdminUsers = (params) => API.get('/admin/users', { params });
export const changeUserRole = (id, role) => API.patch(`/admin/users/${id}/role`, { role });
export const deleteUser = (id) => API.delete(`/admin/users/${id}`);

export const getAdminPatients = () => API.get('/admin/patients');
export const assignDoctorToPatient = (patientProfileId, doctorId) => 
  API.patch(`/admin/patients/${patientProfileId}/assign-doctor`, { doctorId });

export const getAdminDoctors = () => API.get('/admin/doctors');
