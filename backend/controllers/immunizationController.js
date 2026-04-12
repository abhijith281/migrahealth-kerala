const Immunization = require('../models/Immunization');
const VaccineType = require('../models/VaccineType');
const PatientProfile = require('../models/PatientProfile');

// Helper to normalize dates to the start of the day (Midnight UTC)
const toDateOnly = (dateInput) => {
  const d = new Date(dateInput);
  d.setUTCHours(0, 0, 0, 0);
  return d;
};

// ────────────────────────────────────────────────────────────
// @desc    Record a new immunization
// @route   POST /api/immunizations
// @access  Doctor
// ────────────────────────────────────────────────────────────
exports.createImmunization = async (req, res) => {
  try {
    let { patient, vaccineType, administeredAt, batchNumber, facility, sideEffects, linkedAppointment, notes } = req.body;

    if (!patient || !vaccineType) {
      return res.status(400).json({ success: false, error: 'Patient and Vaccine Type are required' });
    }

    // Default to today if not provided
    administeredAt = administeredAt ? toDateOnly(administeredAt) : toDateOnly(new Date());

    // Prevent duplicates for the same patient, vaccine, and date
    const existing = await Immunization.findOne({
      patient,
      vaccineType,
      administeredAt
    });

    if (existing) {
      return res.status(400).json({ success: false, error: 'An immunization record for this vaccine on this date already exists for the patient' });
    }

    // Fetch the vaccine type to Auto-calculate nextDueDate based on intervalDays
    const vType = await VaccineType.findById(vaccineType);
    if (!vType) {
      return res.status(404).json({ success: false, error: 'Vaccine Type not found' });
    }

    let nextDueDate = null;
    if (vType.intervalDays) {
      nextDueDate = new Date(administeredAt);
      nextDueDate.setUTCDate(nextDueDate.getUTCDate() + vType.intervalDays);
    }

    const immunization = await Immunization.create({
      patient,
      vaccineType,
      administeredBy: req.user._id,
      administeredAt,
      nextDueDate,
      batchNumber,
      facility,
      sideEffects,
      linkedAppointment,
      notes
    });

    const populated = await immunization.populate([
      { path: 'patient', select: 'name phone' },
      { path: 'vaccineType', select: 'name disease intervalDays' },
      { path: 'administeredBy', select: 'name phone' }
    ]);

    res.status(201).json({ success: true, data: populated });
  } catch (err) {
    if (err.name === 'ValidationError') {
      const messages = Object.values(err.errors).map((e) => e.message);
      return res.status(400).json({ success: false, error: messages.join(', ') });
    }
    console.error(err);
    res.status(500).json({ success: false, error: 'Server Error' });
  }
};

// ────────────────────────────────────────────────────────────
// @desc    Get all immunizations (Scoped)
// @route   GET /api/immunizations
// @access  Private (Scoped roles)
// ────────────────────────────────────────────────────────────
exports.getImmunizations = async (req, res) => {
  try {
    let query = {};

    if (req.user.role === 'patient') {
      // Patient sees only their own
      query.patient = req.user._id;
    } else if (req.user.role === 'doctor') {
      // Doctor sees patients assigned to them
      // Subquery: find all patients assigned to this doctor
      const profiles = await PatientProfile.find({ assignedDoctor: req.user._id }).select('user');
      const patientIds = profiles.map(p => p.user);
      query.patient = { $in: patientIds };
    }
    // Admin sees all, no filter applied

    const immunizations = await Immunization.find(query)
      .populate('patient', 'name phone')
      .populate('vaccineType', 'name disease')
      .populate('administeredBy', 'name phone')
      .sort({ administeredAt: -1 });

    res.status(200).json({ success: true, count: immunizations.length, data: immunizations });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'Server Error' });
  }
};

// ────────────────────────────────────────────────────────────
// @desc    Get upcoming immunizations for the current user/scope (Due between today and +30 days, or overdue)
// @route   GET /api/immunizations/upcoming
// @access  Private
// ────────────────────────────────────────────────────────────
exports.getUpcomingImmunizations = async (req, res) => {
  try {
    const today = toDateOnly(new Date());
    const thirtyDaysFromNow = new Date(today);
    thirtyDaysFromNow.setUTCDate(thirtyDaysFromNow.getUTCDate() + 30);

    let query = {
      nextDueDate: { $ne: null, $lte: thirtyDaysFromNow } 
      // Includes overdue (past due dates) and upcoming within 30 days
    };

    if (req.user.role === 'patient') {
      query.patient = req.user._id;
    } else if (req.user.role === 'doctor') {
      const profiles = await PatientProfile.find({ assignedDoctor: req.user._id }).select('user');
      const patientIds = profiles.map(p => p.user);
      query.patient = { $in: patientIds };
    }

    const upcoming = await Immunization.find(query)
      .populate('patient', 'name phone')
      .populate('vaccineType', 'name disease')
      .sort({ nextDueDate: 1 });

    res.status(200).json({ success: true, count: upcoming.length, data: upcoming });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'Server Error' });
  }
};

// ────────────────────────────────────────────────────────────
// @desc    Get a specific patient's immunization history
// @route   GET /api/immunizations/patient/:patientId
// @access  Doctor/Admin Only
// ────────────────────────────────────────────────────────────
exports.getPatientImmunizations = async (req, res) => {
  try {
    const { patientId } = req.params;

    if (req.user.role === 'doctor') {
      // Ensure doctor is assigned to this patient
      const profile = await PatientProfile.findOne({ user: patientId });
      if (!profile || String(profile.assignedDoctor) !== String(req.user._id)) {
        return res.status(403).json({ success: false, error: 'Not authorized to view this patient\'s records' });
      }
    }

    const immunizations = await Immunization.find({ patient: patientId })
      .populate('vaccineType', 'name disease intervalDays recommendedAgeMonths')
      .populate('administeredBy', 'name phone')
      .sort({ administeredAt: -1 });

    res.status(200).json({ success: true, count: immunizations.length, data: immunizations });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'Server Error' });
  }
};
