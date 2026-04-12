import API from './api';

// ─── Appointments ──────────────────────────────────────────
export const getAppointments = (status) => {
  const params = status ? `?status=${status}` : '';
  return API.get(`/appointments${params}`);
};

export const getAppointment = (id) => API.get(`/appointments/${id}`);

export const createAppointment = (data) => API.post('/appointments', data);

export const getAvailableSlots = (doctorId, date) =>
  API.get(`/appointments/slots/${doctorId}?date=${date}`);

export const updateAppointmentStatus = (id, data) =>
  API.patch(`/appointments/${id}/status`, data);
