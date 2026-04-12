import API from './api';

export const getDoctorStats = () => API.get('/doctor/stats');

export const getDoctorPatients = () => API.get('/doctor/patients');

export const getDoctorPatientDetail = (patientId) => API.get(`/doctor/patients/${patientId}`);

export const createDoctorPatientRecord = (patientId, data) => API.post(`/doctor/patients/${patientId}/records`, data);
