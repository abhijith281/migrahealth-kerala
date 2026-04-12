const express = require('express');
const router = express.Router();

const {
  getStats,
  getPatients,
  getPatientData,
  createPatientRecord
} = require('../controllers/doctorController');

const { protect, authorize } = require('../middleware/auth');

// All doctor routes are protected and require the 'doctor' role
router.use(protect);
router.use(authorize('doctor'));

router.get('/stats', getStats);
router.get('/patients', getPatients);
router.get('/patients/:patientId', getPatientData);
router.post('/patients/:patientId/records', createPatientRecord);

module.exports = router;
