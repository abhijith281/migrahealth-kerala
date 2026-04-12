const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const {
  getStats,
  getRecordsAnalytics,
  getUsers,
  changeUserRole,
  deleteUser,
  getPatients,
  assignDoctor,
  getDoctors
} = require('../controllers/adminController');

router.use(protect);
router.use(authorize('admin'));

router.get('/stats', getStats);
router.get('/analytics/records-per-month', getRecordsAnalytics);
router.route('/users')
  .get(getUsers);
router.patch('/users/:id/role', changeUserRole);
router.delete('/users/:id', deleteUser);

router.get('/patients', getPatients);
router.patch('/patients/:patientId/assign-doctor', assignDoctor);

router.get('/doctors', getDoctors);

module.exports = router;
