import API from './api';

// ─── Vaccine Types ─────────────────────────────────────────

export const getVaccineTypes = () => API.get('/vaccine-types');

export const createVaccineType = (data) => API.post('/vaccine-types', data);

export const updateVaccineType = (id, data) => API.put(`/vaccine-types/${id}`, data);

export const deactivateVaccineType = (id) => API.patch(`/vaccine-types/${id}/deactivate`);

// ─── Immunizations ─────────────────────────────────────────

export const createImmunization = (data) => API.post('/immunizations', data);

export const getImmunizations = () => API.get('/immunizations');

export const getUpcomingImmunizations = () => API.get('/immunizations/upcoming');

export const getPatientImmunizations = (patientId) => API.get(`/immunizations/patient/${patientId}`);
