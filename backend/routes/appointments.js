const express = require('express');
const router = express.Router();

const {
  createAppointment,
  getAppointments,
  getAvailableSlots,
  getAppointment,
  updateAppointmentStatus,
} = require('../controllers/appointmentController');

const { protect, authorize } = require('../middleware/auth');

// All routes require authentication
router.use(protect);

// Book appointment — patient only
router.post('/', authorize('patient'), createAppointment);

// List appointments — all roles (scoped)
router.get('/', authorize('patient', 'doctor', 'admin'), getAppointments);

// Available slots — any authenticated user
router.get('/slots/:doctorId', getAvailableSlots);

// Single appointment — ownership check inside controller
router.get('/:id', authorize('patient', 'doctor', 'admin'), getAppointment);

// Status transitions — role checks inside controller
router.patch('/:id/status', authorize('patient', 'doctor', 'admin'), updateAppointmentStatus);

module.exports = router;
