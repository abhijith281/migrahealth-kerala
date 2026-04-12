const HealthRecord = require('../models/HealthRecord');
const PatientProfile = require('../models/PatientProfile');

// @desc    Create a health record
// @route   POST /api/records
// @access  Patient (self_report only, isVerified=false) | Doctor (any type, isVerified=true) | Admin
exports.createRecord = async (req, res) => {
  try {
    const { recordType, title, description, diagnosis, medications, visitDate, facility } =
      req.body;

    // Patients can only create self_report records
    if (req.user.role === 'patient') {
      if (recordType && recordType !== 'self_report') {
        return res.status(403).json({
          success: false,
          error: 'Patients can only submit self_report records',
        });
      }

      const record = await HealthRecord.create({
        patient: req.user._id,
        doctor: null,
        recordType: 'self_report',
        title,
        description,
        diagnosis,
        medications,
        visitDate,
        facility,
        isVerified: false,
      });

      return res.status(201).json({ success: true, data: record });
    }

    // Doctor or Admin — can create any record type, isVerified=true automatically
    const patientId = req.body.patient;
    if (!patientId) {
      return res.status(400).json({ success: false, error: 'Patient ID is required' });
    }

    const record = await HealthRecord.create({
      patient: patientId,
      doctor: req.user.role === 'doctor' ? req.user._id : req.body.doctor || null,
      recordType,
      title,
      description,
      diagnosis,
      medications,
      visitDate,
      facility,
      isVerified: true,
    });

    const populated = await record.populate([
      { path: 'patient', select: 'name phone' },
      { path: 'doctor', select: 'name phone' },
    ]);

    return res.status(201).json({ success: true, data: populated });
  } catch (err) {
    if (err.name === 'ValidationError') {
      const messages = Object.values(err.errors).map((e) => e.message);
      return res.status(400).json({ success: false, error: messages.join(', ') });
    }
    console.error(err);
    res.status(500).json({ success: false, error: 'Server Error' });
  }
};

// @desc    Get health records (role-scoped)
// @route   GET /api/records
// @access  Private
exports.getRecords = async (req, res) => {
  try {
    let query = {};

    if (req.user.role === 'patient') {
      // Patient sees only their own records
      query = { patient: req.user._id };
    } else if (req.user.role === 'doctor') {
      // Doctor sees records of their assigned patients
      const assignedProfiles = await PatientProfile.find({
        assignedDoctor: req.user._id,
      }).select('user');
      const patientIds = assignedProfiles.map((p) => p.user);
      query = { patient: { $in: patientIds } };
    }
    // Admin — query stays {} → sees all records

    const records = await HealthRecord.find(query)
      .populate('patient', 'name phone')
      .populate('doctor', 'name phone')
      .sort({ visitDate: -1 });

    res.status(200).json({ success: true, count: records.length, data: records });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'Server Error' });
  }
};

// @desc    Get single health record
// @route   GET /api/records/:id
// @access  Private — ownership check for patients
exports.getRecord = async (req, res) => {
  try {
    const record = await HealthRecord.findById(req.params.id)
      .populate('patient', 'name phone language')
      .populate('doctor', 'name phone');

    if (!record) {
      return res.status(404).json({ success: false, error: 'Record not found' });
    }

    // Patients can only view their own records
    if (
      req.user.role === 'patient' &&
      record.patient._id.toString() !== req.user._id.toString()
    ) {
      return res.status(403).json({ success: false, error: 'Not authorized to view this record' });
    }

    // Doctors can only view records of their assigned patients
    if (req.user.role === 'doctor') {
      const profile = await PatientProfile.findOne({
        user: record.patient._id,
        assignedDoctor: req.user._id,
      });
      if (!profile) {
        return res
          .status(403)
          .json({ success: false, error: 'Not authorized to view this record' });
      }
    }

    res.status(200).json({ success: true, data: record });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'Server Error' });
  }
};

// @desc    Update a health record
// @route   PUT /api/records/:id
// @access  Doctor | Admin only
exports.updateRecord = async (req, res) => {
  try {
    let record = await HealthRecord.findById(req.params.id);

    if (!record) {
      return res.status(404).json({ success: false, error: 'Record not found' });
    }

    // Doctors can only update records for their assigned patients
    if (req.user.role === 'doctor') {
      const profile = await PatientProfile.findOne({
        user: record.patient,
        assignedDoctor: req.user._id,
      });
      if (!profile) {
        return res.status(403).json({ success: false, error: 'Not authorized to update this record' });
      }
    }

    const allowedUpdates = [
      'recordType',
      'title',
      'description',
      'diagnosis',
      'medications',
      'visitDate',
      'facility',
      'isVerified',
    ];

    const updates = {};
    allowedUpdates.forEach((field) => {
      if (req.body[field] !== undefined) updates[field] = req.body[field];
    });

    record = await HealthRecord.findByIdAndUpdate(
      req.params.id,
      { $set: updates },
      { new: true, runValidators: true }
    )
      .populate('patient', 'name phone')
      .populate('doctor', 'name phone');

    res.status(200).json({ success: true, data: record });
  } catch (err) {
    if (err.name === 'ValidationError') {
      const messages = Object.values(err.errors).map((e) => e.message);
      return res.status(400).json({ success: false, error: messages.join(', ') });
    }
    console.error(err);
    res.status(500).json({ success: false, error: 'Server Error' });
  }
};

// @desc    Delete a health record
// @route   DELETE /api/records/:id
// @access  Admin only
exports.deleteRecord = async (req, res) => {
  try {
    const record = await HealthRecord.findById(req.params.id);

    if (!record) {
      return res.status(404).json({ success: false, error: 'Record not found' });
    }

    await record.deleteOne();

    res.status(200).json({ success: true, data: {} });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'Server Error' });
  }
};
