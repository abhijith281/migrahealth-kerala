const express = require('express');
const router = express.Router();

const {
  createVaccineType,
  getVaccineTypes,
  updateVaccineType,
  deactivateVaccineType,
} = require('../controllers/vaccineTypeController');

const { protect, authorize } = require('../middleware/auth');


// ======================
// PUBLIC ROUTE
// ======================

// Anyone can access this
router.get('/', getVaccineTypes);


// ======================
// PROTECTED ADMIN ROUTES
// ======================

// Only admin can create
router.post('/', protect, authorize('admin'), createVaccineType);

// Only admin can update
router.put('/:id', protect, authorize('admin'), updateVaccineType);

// Only admin can deactivate
router.patch('/:id/deactivate', protect, authorize('admin'), deactivateVaccineType);


module.exports = router;