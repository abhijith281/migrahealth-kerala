const express = require('express');
const router = express.Router();

const {
  getMyProfile,
  updateMyProfile,
  getMyPatients,
} = require('../controllers/patientController');

const { protect, authorize } = require('../middleware/auth');

// All routes below require authentication
router.use(protect);

// Patient profile routes
router.get('/profile', authorize('patient'), getMyProfile);
router.put('/profile', authorize('patient'), updateMyProfile);

// Doctor-only route
router.get('/my-patients', authorize('doctor'), getMyPatients);

module.exports = router;
