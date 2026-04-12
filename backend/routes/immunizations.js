const express = require('express');
const router = express.Router();

const {
  createImmunization,
  getImmunizations,
  getUpcomingImmunizations,
  getPatientImmunizations,
} = require('../controllers/immunizationController');

const { protect, authorize } = require('../middleware/auth');

router.use(protect);

// Create an immunization (Doctor only)
router.post('/', authorize('doctor'), createImmunization);

// Get immunizations (Role scoped)
router.get('/', getImmunizations);

// Get upcoming immunizations (Role scoped)
router.get('/upcoming', getUpcomingImmunizations);

// Get a specific patient's immunizations (Doctor / Admin)
router.get('/patient/:patientId', authorize('doctor', 'admin'), getPatientImmunizations);

module.exports = router;
