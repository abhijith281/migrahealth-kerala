const express = require('express');
const router = express.Router();

const {
  createVaccineType,
  getVaccineTypes,
  updateVaccineType,
  deactivateVaccineType,
} = require('../controllers/vaccineTypeController');

const { protect, authorize } = require('../middleware/auth');

// All routes require authentication
router.use(protect);

// GET is accessible to all authenticated users
router.get('/', getVaccineTypes);

// Admin only routes
router.post('/', authorize('admin'), createVaccineType);
router.put('/:id', authorize('admin'), updateVaccineType);
router.patch('/:id/deactivate', authorize('admin'), deactivateVaccineType);

module.exports = router;
