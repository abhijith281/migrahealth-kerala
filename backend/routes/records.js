const express = require('express');
const router = express.Router();

const {
  createRecord,
  getRecords,
  getRecord,
  updateRecord,
  deleteRecord,
} = require('../controllers/recordController');

const { protect, authorize } = require('../middleware/auth');

// All routes require authentication
router.use(protect);

router.route('/')
  .post(authorize('patient', 'doctor', 'admin'), createRecord)
  .get(authorize('patient', 'doctor', 'admin'), getRecords);

router.route('/:id')
  .get(authorize('patient', 'doctor', 'admin'), getRecord)
  .put(authorize('doctor', 'admin'), updateRecord)
  .delete(authorize('admin'), deleteRecord);

module.exports = router;
