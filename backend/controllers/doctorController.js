const PatientProfile = require('../models/PatientProfile');
const Appointment = require('../models/Appointment');
const Immunization = require('../models/Immunization');
const HealthRecord = require('../models/HealthRecord');
const User = require('../models/User');

// Helper for dates
const toDateOnly = (dateInput) => {
  const d = new Date(dateInput);
  d.setUTCHours(0, 0, 0, 0);
  return d;
};

// ────────────────────────────────────────────────────────────
// @desc    Get dashboard stats for a doctor
// @route   GET /api/doctor/stats
// @access  Doctor
// ────────────────────────────────────────────────────────────
exports.getStats = async (req, res) => {
  try {
    const doctorId = req.user._id;

    // Get assigned patients
    const patientProfiles = await PatientProfile.find({ assignedDoctor: doctorId }).select('user');
    const patientIds = patientProfiles.map(p => p.user);

    const today = toDateOnly(new Date());
    const tomorrow = new Date(today);
    tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);

    const thirtyDaysFromNow = new Date(today);
    thirtyDaysFromNow.setUTCDate(thirtyDaysFromNow.getUTCDate() + 30);

    const [
      totalPatients,
      pendingAppointments,
      todayAppointments,
      upcomingVaccines,
      totalRecords
    ] = await Promise.all([
      PatientProfile.countDocuments({ assignedDoctor: doctorId }),
      Appointment.countDocuments({ doctor: doctorId, status: 'pending' }),
      Appointment.countDocuments({
        doctor: doctorId,
        appointmentDate: { $gte: today, $lt: tomorrow }
      }),
      Immunization.countDocuments({
        patient: { $in: patientIds },
        nextDueDate: { $ne: null, $lte: thirtyDaysFromNow }
      }),
      HealthRecord.countDocuments({ patient: { $in: patientIds } })
    ]);

    res.status(200).json({
      success: true,
      data: {
        totalPatients,
        pendingAppointments,
        todayAppointments,
        upcomingVaccines,
        totalRecords
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'Server Error' });
  }
};

// ────────────────────────────────────────────────────────────
// @desc    Get assigned patients list with their latest appointment
// @route   GET /api/doctor/patients
// @access  Doctor
// ────────────────────────────────────────────────────────────
exports.getPatients = async (req, res) => {
  try {
    const doctorId = req.user._id;

    const patientProfiles = await PatientProfile.find({ assignedDoctor: doctorId })
      .populate('user', 'name phone homeState language email');

    // Fetch latest appointment for each patient
    const patientsWithLatest = await Promise.all(
      patientProfiles.map(async (profile) => {
        const latestAppt = await Appointment.findOne({ patient: profile.user._id, doctor: doctorId })
          .sort({ appointmentDate: -1, createdAt: -1 })
          .select('appointmentDate status timeSlot');

        return {
          profile: profile,
          user: profile.user,
          latestAppointment: latestAppt
        };
      })
    );

    res.status(200).json({
      success: true,
      count: patientsWithLatest.length,
      data: patientsWithLatest
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'Server Error' });
  }
};

// ────────────────────────────────────────────────────────────
// @desc    Get detailed compound payload for a specific assigned patient
// @route   GET /api/doctor/patients/:patientId
// @access  Doctor
// ────────────────────────────────────────────────────────────
exports.getPatientData = async (req, res) => {
  try {
    const doctorId = req.user._id;
    const { patientId } = req.params;

    // Security check
    const profile = await PatientProfile.findOne({ user: patientId, assignedDoctor: doctorId })
      .populate('user', 'name phone homeState language email');

    if (!profile) {
      return res.status(403).json({ success: false, error: 'Not authorized for this patient' });
    }

    const [healthRecords, immunizations, appointments] = await Promise.all([
      HealthRecord.find({ patient: patientId })
        .populate('doctor', 'name')
        .sort({ visitDate: -1 }),
      Immunization.find({ patient: patientId })
        .populate('vaccineType', 'name disease')
        .populate('administeredBy', 'name')
        .sort({ administeredAt: -1 }),
      Appointment.find({ patient: patientId })
        .populate('doctor', 'name')
        .sort({ appointmentDate: -1 })
    ]);

    res.status(200).json({
      success: true,
      data: {
        profile,
        user: profile.user,
        healthRecords,
        immunizations,
        appointments
      }
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'Server Error' });
  }
};

// ────────────────────────────────────────────────────────────
// @desc    Create a new health record for an assigned patient automatically verified
// @route   POST /api/doctor/patients/:patientId/records
// @access  Doctor
// ────────────────────────────────────────────────────────────
exports.createPatientRecord = async (req, res) => {
  try {
    const doctorId = req.user._id;
    const { patientId } = req.params;

    // Security check
    const profile = await PatientProfile.findOne({ user: patientId, assignedDoctor: doctorId });
    if (!profile) {
      return res.status(403).json({ success: false, error: 'Not authorized for this patient' });
    }

    const newRecord = {
      ...req.body,
      patient: patientId,
      doctor: doctorId,
      isVerified: true // Auto verified since doctor creates it
    };

    const record = await HealthRecord.create(newRecord);
    res.status(201).json({ success: true, data: record });

  } catch (err) {
    if (err.name === 'ValidationError') {
      const messages = Object.values(err.errors).map((e) => e.message);
      return res.status(400).json({ success: false, error: messages.join(', ') });
    }
    console.error(err);
    res.status(500).json({ success: false, error: 'Server Error' });
  }
};
