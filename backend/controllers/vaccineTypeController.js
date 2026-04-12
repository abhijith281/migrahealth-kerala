const VaccineType = require('../models/VaccineType');

// ────────────────────────────────────────────────────────────
// @desc    Create a new vaccine type
// @route   POST /api/vaccine-types
// @access  Admin only
// ────────────────────────────────────────────────────────────
exports.createVaccineType = async (req, res) => {
  try {
    const vaccineType = await VaccineType.create(req.body);
    res.status(201).json({ success: true, data: vaccineType });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({ success: false, error: 'Vaccine name already exists' });
    }
    if (err.name === 'ValidationError') {
      const messages = Object.values(err.errors).map((e) => e.message);
      return res.status(400).json({ success: false, error: messages.join(', ') });
    }
    console.error(err);
    res.status(500).json({ success: false, error: 'Server Error' });
  }
};

// ────────────────────────────────────────────────────────────
// @desc    Get active vaccine types
// @route   GET /api/vaccine-types
// @access  Private (all authenticated)
// ────────────────────────────────────────────────────────────
exports.getVaccineTypes = async (req, res) => {
  try {
    // Return only active vaccines ordered by recommended age
    const vaccineTypes = await VaccineType.find({ isActive: true }).sort('recommendedAgeMonths');
    res.status(200).json({ success: true, count: vaccineTypes.length, data: vaccineTypes });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'Server Error' });
  }
};

// ────────────────────────────────────────────────────────────
// @desc    Update a vaccine type
// @route   PUT /api/vaccine-types/:id
// @access  Admin only
// ────────────────────────────────────────────────────────────
exports.updateVaccineType = async (req, res) => {
  try {
    let vaccineType = await VaccineType.findById(req.params.id);

    if (!vaccineType) {
      return res.status(404).json({ success: false, error: 'Vaccine type not found' });
    }

    vaccineType = await VaccineType.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    res.status(200).json({ success: true, data: vaccineType });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({ success: false, error: 'Vaccine name already exists' });
    }
    if (err.name === 'ValidationError') {
      const messages = Object.values(err.errors).map((e) => e.message);
      return res.status(400).json({ success: false, error: messages.join(', ') });
    }
    console.error(err);
    res.status(500).json({ success: false, error: 'Server Error' });
  }
};

// ────────────────────────────────────────────────────────────
// @desc    Deactivate a vaccine type (Soft delete)
// @route   PATCH /api/vaccine-types/:id/deactivate
// @access  Admin only
// ────────────────────────────────────────────────────────────
exports.deactivateVaccineType = async (req, res) => {
  try {
    let vaccineType = await VaccineType.findById(req.params.id);

    if (!vaccineType) {
      return res.status(404).json({ success: false, error: 'Vaccine type not found' });
    }

    vaccineType.isActive = false;
    await vaccineType.save();

    res.status(200).json({ success: true, data: {} });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'Server Error' });
  }
};
