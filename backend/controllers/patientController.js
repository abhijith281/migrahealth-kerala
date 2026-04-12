const PatientProfile = require('../models/PatientProfile');
const DoctorProfile = require('../models/DoctorProfile');
const User = require('../models/User');

// Whitelisted fields a patient can update on their own profile
const PATIENT_ALLOWED_FIELDS = [
  'bloodGroup',
  'dateOfBirth',
  'gender',
  'allergies',
  'chronicConditions',
  'emergencyContact',
  'currentAddress',
];

// @desc    Get own patient profile (auto-create if not exists)
// @route   GET /api/patients/profile
// @access  Patient only
exports.getMyProfile = async (req, res) => {
  try {
    let profile = await PatientProfile.findOne({ user: req.user._id })
      .populate('user', 'name phone role language homeState aadhaarLast4 email')
      .populate('assignedDoctor', 'name phone');

    // Auto-create profile if first visit
    if (!profile) {
      profile = await PatientProfile.create({ user: req.user._id });
      await profile.populate('user', 'name phone role language homeState aadhaarLast4 email');
      await profile.populate('assignedDoctor', 'name phone');
    }

    res.status(200).json({ success: true, data: profile });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'Server Error' });
  }
};

// @desc    Update own patient profile (upsert)
// @route   PUT /api/patients/profile
// @access  Patient only
exports.updateMyProfile = async (req, res) => {
  try {
    // Build update object — only allow whitelisted fields
    const updates = {};
    PATIENT_ALLOWED_FIELDS.forEach((field) => {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    });

    const profile = await PatientProfile.findOneAndUpdate(
      { user: req.user._id },
      { $set: updates },
      { new: true, upsert: true, runValidators: true }
    )
      .populate('user', 'name phone role language homeState aadhaarLast4 email')
      .populate('assignedDoctor', 'name phone');

    res.status(200).json({ success: true, data: profile });
  } catch (err) {
    if (err.name === 'ValidationError') {
      const messages = Object.values(err.errors).map((e) => e.message);
      return res.status(400).json({ success: false, error: messages.join(', ') });
    }
    console.error(err);
    res.status(500).json({ success: false, error: 'Server Error' });
  }
};

// @desc    Get all patients assigned to the logged-in doctor
// @route   GET /api/patients/my-patients
// @access  Doctor only
exports.getMyPatients = async (req, res) => {
  try {
    // Find all patient profiles where assignedDoctor = req.user._id
    const profiles = await PatientProfile.find({ assignedDoctor: req.user._id })
      .populate('user', 'name phone language homeState')
      .populate('assignedDoctor', 'name phone');

    res.status(200).json({ success: true, count: profiles.length, data: profiles });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'Server Error' });
  }
};
