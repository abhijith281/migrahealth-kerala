const User = require('../models/User');
const PatientProfile = require('../models/PatientProfile');
const DoctorProfile = require('../models/DoctorProfile');
const HealthRecord = require('../models/HealthRecord');
const Appointment = require('../models/Appointment');
const Immunization = require('../models/Immunization');
const mongoose = require('mongoose');

// ────────────────────────────────────────────────────────────
// @desc    Get dashboard stats
// @route   GET /api/admin/stats
// @access  Admin
// ────────────────────────────────────────────────────────────
exports.getStats = async (req, res) => {
  try {
    const [
      totalUsers,
      totalPatients,
      totalDoctors,
      totalRecords,
      totalAppointments,
      totalImmunizations,
      pendingAppointments
    ] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ role: 'patient' }),
      User.countDocuments({ role: 'doctor' }),
      HealthRecord.countDocuments(),
      Appointment.countDocuments(),
      Immunization.countDocuments(),
      Appointment.countDocuments({ status: 'pending' })
    ]);

    res.status(200).json({
      success: true,
      data: {
        totalUsers, totalPatients, totalDoctors,
        totalRecords, totalAppointments, totalImmunizations, pendingAppointments
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: 'Server Error' });
  }
};

// ────────────────────────────────────────────────────────────
// @desc    Get records per month for the last 6 months
// @route   GET /api/admin/analytics/records-per-month
// @access  Admin
// ────────────────────────────────────────────────────────────
exports.getRecordsAnalytics = async (req, res) => {
  try {
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
    sixMonthsAgo.setDate(1);
    sixMonthsAgo.setHours(0, 0, 0, 0);

    const analytics = await HealthRecord.aggregate([
      {
        $match: {
          createdAt: { $gte: sixMonthsAgo }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: "$createdAt" },
            month: { $month: "$createdAt" }
          },
          count: { $sum: 1 }
        }
      },
      {
        $sort: { "_id.year": 1, "_id.month": 1 }
      }
    ]);

    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    
    // Format to { label: "Nov 2025", count: 3 }
    const formatted = analytics.map(item => ({
      label: `${monthNames[item._id.month - 1]} ${item._id.year}`,
      count: item.count
    }));

    res.status(200).json({ success: true, data: formatted });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: 'Server Error' });
  }
};

// ────────────────────────────────────────────────────────────
// @desc    Get all users with optional search and role filter
// @route   GET /api/admin/users
// @access  Admin
// ────────────────────────────────────────────────────────────
exports.getUsers = async (req, res) => {
  try {
    const { role, search } = req.query;
    let query = {};

    if (role) {
      query.role = role;
    }

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } }
      ];
    }

    const users = await User.find(query).select('-password').sort({ createdAt: -1 });

    res.status(200).json({ success: true, count: users.length, data: users });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: 'Server Error' });
  }
};

// ────────────────────────────────────────────────────────────
// @desc    Change user role
// @route   PATCH /api/admin/users/:id/role
// @access  Admin
// ────────────────────────────────────────────────────────────
exports.changeUserRole = async (req, res) => {
  try {
    const { role } = req.body;
    const { id } = req.params;

    if (req.user._id.toString() === id) {
      return res.status(400).json({ success: false, error: 'Cannot change your own role' });
    }

    if (!['patient', 'doctor', 'admin'].includes(role)) {
      return res.status(400).json({ success: false, error: 'Invalid role' });
    }

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    user.role = role;
    await user.save();

    if (role === 'doctor') {
      await DoctorProfile.findOneAndUpdate(
        { user: id },
        { user: id },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
    }

    res.status(200).json({ success: true, data: user });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: 'Server Error' });
  }
};

// ────────────────────────────────────────────────────────────
// @desc    Delete user
// @route   DELETE /api/admin/users/:id
// @access  Admin
// ────────────────────────────────────────────────────────────
exports.deleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    if (req.user._id.toString() === id) {
      return res.status(400).json({ success: false, error: 'Cannot delete yourself' });
    }

    const user = await User.findByIdAndDelete(id);
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    // Clean up profiles
    await PatientProfile.findOneAndDelete({ user: id });
    await DoctorProfile.findOneAndDelete({ user: id });

    res.status(200).json({ success: true, data: {} });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: 'Server Error' });
  }
};

// ────────────────────────────────────────────────────────────
// @desc    Get all patients
// @route   GET /api/admin/patients
// @access  Admin
// ────────────────────────────────────────────────────────────
exports.getPatients = async (req, res) => {
  try {
    const profiles = await PatientProfile.find()
      .populate('user', 'name phone language')
      .populate('assignedDoctor', 'name phone');

    // Filter out profiles where user was deleted (orphaned)
    const validProfiles = profiles.filter(p => p.user != null);

    res.status(200).json({ success: true, count: validProfiles.length, data: validProfiles });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: 'Server Error' });
  }
};

// ────────────────────────────────────────────────────────────
// @desc    Assign doctor to patient
// @route   PATCH /api/admin/patients/:patientId/assign-doctor
// @access  Admin
// ────────────────────────────────────────────────────────────
exports.assignDoctor = async (req, res) => {
  try {
    const { doctorId } = req.body;
    const { patientId } = req.params; // Profile user ID or Object ID

    const profile = await PatientProfile.findById(patientId);
    if (!profile) {
      return res.status(404).json({ success: false, error: 'Patient profile not found' });
    }

    const oldDoctorId = profile.assignedDoctor;
    const newDoctorObjId = doctorId ? doctorId : null;

    profile.assignedDoctor = newDoctorObjId;
    await profile.save();

    if (oldDoctorId) {
      await DoctorProfile.findOneAndUpdate(
        { user: oldDoctorId },
        { $pull: { patients: profile.user } }
      );
    }

    if (newDoctorObjId) {
      await DoctorProfile.findOneAndUpdate(
        { user: newDoctorObjId },
        { $addToSet: { patients: profile.user } },
        { upsert: true }
      );
    }

    res.status(200).json({ success: true, data: profile });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: 'Server Error' });
  }
};

// ────────────────────────────────────────────────────────────
// @desc    Get all doctors
// @route   GET /api/admin/doctors
// @access  Admin
// ────────────────────────────────────────────────────────────
exports.getDoctors = async (req, res) => {
  try {
    // Some users migrated to doctors may not have a DoctorProfile if manually changed in DB somehow, 
    // but changeUserRole manages it. Still good to protect against orphans.
    const profiles = await DoctorProfile.find()
      .populate('user', 'name phone')
      .populate('patients', 'name phone');

    const validProfiles = profiles
      .filter(p => p.user != null)
      .map(p => {
        return {
          ...p.toObject(),
          patientCount: p.patients ? p.patients.length : 0
        };
      });

    res.status(200).json({ success: true, count: validProfiles.length, data: validProfiles });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: 'Server Error' });
  }
};
