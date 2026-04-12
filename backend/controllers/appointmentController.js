const Appointment = require('../models/Appointment');
const PatientProfile = require('../models/PatientProfile');

// Fixed list of 12 available time slots
const ALL_TIME_SLOTS = [
  '09:00 AM',
  '09:30 AM',
  '10:00 AM',
  '10:30 AM',
  '11:00 AM',
  '11:30 AM',
  '12:00 PM',
  '02:00 PM',
  '02:30 PM',
  '03:00 PM',
  '03:30 PM',
  '04:00 PM',
];

// Helper — normalize date to start of day (UTC midnight)
const toDateOnly = (dateStr) => {
  const d = new Date(dateStr);
  d.setUTCHours(0, 0, 0, 0);
  return d;
};

// ────────────────────────────────────────────────────────────
// @desc    Book an appointment (patient only)
// @route   POST /api/appointments
// @access  Patient
// ────────────────────────────────────────────────────────────
exports.createAppointment = async (req, res) => {
  try {
    const { appointmentDate, timeSlot, reason } = req.body;

    if (!appointmentDate || !timeSlot) {
      return res
        .status(400)
        .json({ success: false, error: 'Appointment date and time slot are required' });
    }

    // Validate timeSlot is from the allowed list
    if (!ALL_TIME_SLOTS.includes(timeSlot)) {
      return res
        .status(400)
        .json({ success: false, error: `Invalid time slot. Choose from: ${ALL_TIME_SLOTS.join(', ')}` });
    }

    // Auto-read assigned doctor from patient profile
    const profile = await PatientProfile.findOne({ user: req.user._id });
    if (!profile || !profile.assignedDoctor) {
      return res.status(400).json({
        success: false,
        error: 'You do not have an assigned doctor. Please contact admin to assign a doctor first.',
      });
    }

    const doctorId = profile.assignedDoctor;
    const dateOnly = toDateOnly(appointmentDate);

    // Check for slot conflict — no pending or confirmed appointment at same doctor+date+slot
    const conflict = await Appointment.findOne({
      doctor: doctorId,
      appointmentDate: dateOnly,
      timeSlot,
      status: { $in: ['pending', 'confirmed'] },
    });

    if (conflict) {
      return res.status(409).json({
        success: false,
        error: `The ${timeSlot} slot on ${dateOnly.toISOString().split('T')[0]} is already booked. Please choose a different time.`,
      });
    }

    const appointment = await Appointment.create({
      patient: req.user._id,
      doctor: doctorId,
      appointmentDate: dateOnly,
      timeSlot,
      reason,
    });

    const populated = await appointment.populate([
      { path: 'patient', select: 'name phone' },
      { path: 'doctor', select: 'name phone' },
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
// @desc    Get appointments (role-scoped + optional ?status= filter)
// @route   GET /api/appointments
// @access  Private
// ────────────────────────────────────────────────────────────
exports.getAppointments = async (req, res) => {
  try {
    let query = {};

    // Role-based scoping
    if (req.user.role === 'patient') {
      query.patient = req.user._id;
    } else if (req.user.role === 'doctor') {
      query.doctor = req.user._id;
    }
    // admin → no filter, sees all

    // Optional status filter
    if (req.query.status && ['pending', 'confirmed', 'completed', 'cancelled'].includes(req.query.status)) {
      query.status = req.query.status;
    }

    const appointments = await Appointment.find(query)
      .populate('patient', 'name phone language')
      .populate('doctor', 'name phone')
      .populate('linkedRecord', 'title recordType')
      .sort({ appointmentDate: -1, timeSlot: 1 });

    res.status(200).json({ success: true, count: appointments.length, data: appointments });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'Server Error' });
  }
};

// ────────────────────────────────────────────────────────────
// @desc    Get available slots for a doctor on a given date
// @route   GET /api/appointments/slots/:doctorId?date=YYYY-MM-DD
// @access  Private
// ────────────────────────────────────────────────────────────
exports.getAvailableSlots = async (req, res) => {
  try {
    const { doctorId } = req.params;
    const { date } = req.query;

    if (!date) {
      return res.status(400).json({ success: false, error: 'Query parameter "date" is required (YYYY-MM-DD)' });
    }

    const dateOnly = toDateOnly(date);

    // Find all booked (pending/confirmed) slots for the doctor on this date
    const bookedAppointments = await Appointment.find({
      doctor: doctorId,
      appointmentDate: dateOnly,
      status: { $in: ['pending', 'confirmed'] },
    }).select('timeSlot');

    const bookedSlots = bookedAppointments.map((a) => a.timeSlot);

    const availableSlots = ALL_TIME_SLOTS.filter((slot) => !bookedSlots.includes(slot));

    res.status(200).json({
      success: true,
      date: dateOnly.toISOString().split('T')[0],
      totalSlots: ALL_TIME_SLOTS.length,
      bookedCount: bookedSlots.length,
      availableCount: availableSlots.length,
      data: availableSlots,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'Server Error' });
  }
};

// ────────────────────────────────────────────────────────────
// @desc    Get single appointment
// @route   GET /api/appointments/:id
// @access  Private — ownership check
// ────────────────────────────────────────────────────────────
exports.getAppointment = async (req, res) => {
  try {
    const appointment = await Appointment.findById(req.params.id)
      .populate('patient', 'name phone language')
      .populate('doctor', 'name phone')
      .populate('linkedRecord', 'title recordType');

    if (!appointment) {
      return res.status(404).json({ success: false, error: 'Appointment not found' });
    }

    // Ownership check
    if (
      req.user.role === 'patient' &&
      appointment.patient._id.toString() !== req.user._id.toString()
    ) {
      return res.status(403).json({ success: false, error: 'Not authorized to view this appointment' });
    }

    if (
      req.user.role === 'doctor' &&
      appointment.doctor._id.toString() !== req.user._id.toString()
    ) {
      return res.status(403).json({ success: false, error: 'Not authorized to view this appointment' });
    }

    res.status(200).json({ success: true, data: appointment });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'Server Error' });
  }
};

// ────────────────────────────────────────────────────────────
// @desc    Update appointment status (role-based transitions)
// @route   PATCH /api/appointments/:id/status
// @access  Private
//
//   Doctor can: confirm, complete, cancel
//   Patient can: cancel only
//   Admin can: confirm, complete, cancel
//
//   Cannot change completed or cancelled appointments.
// ────────────────────────────────────────────────────────────
exports.updateAppointmentStatus = async (req, res) => {
  try {
    const { status, cancellationReason, notes, linkedRecord } = req.body;

    if (!status) {
      return res.status(400).json({ success: false, error: 'New status is required' });
    }

    const appointment = await Appointment.findById(req.params.id);

    if (!appointment) {
      return res.status(404).json({ success: false, error: 'Appointment not found' });
    }

    // Guard: cannot change completed or cancelled
    if (['completed', 'cancelled'].includes(appointment.status)) {
      return res.status(400).json({
        success: false,
        error: `Cannot change status of a ${appointment.status} appointment`,
      });
    }

    // Ownership checks
    if (
      req.user.role === 'patient' &&
      appointment.patient.toString() !== req.user._id.toString()
    ) {
      return res.status(403).json({ success: false, error: 'Not authorized' });
    }

    if (
      req.user.role === 'doctor' &&
      appointment.doctor.toString() !== req.user._id.toString()
    ) {
      return res.status(403).json({ success: false, error: 'Not authorized' });
    }

    // Role-based transition rules
    if (req.user.role === 'patient') {
      // Patient can only cancel
      if (status !== 'cancelled') {
        return res.status(403).json({
          success: false,
          error: 'As a patient, you can only cancel appointments',
        });
      }
      appointment.cancelledBy = 'patient';
      appointment.cancellationReason = cancellationReason || '';
    } else if (req.user.role === 'doctor') {
      // Doctor can confirm, complete, cancel
      if (!['confirmed', 'completed', 'cancelled'].includes(status)) {
        return res.status(400).json({ success: false, error: 'Invalid status transition for doctor' });
      }

      if (status === 'cancelled') {
        appointment.cancelledBy = 'doctor';
        appointment.cancellationReason = cancellationReason || '';
      }

      if (status === 'completed') {
        if (notes) appointment.notes = notes;
        if (linkedRecord) appointment.linkedRecord = linkedRecord;
      }
    } else if (req.user.role === 'admin') {
      // Admin can confirm, complete, cancel
      if (!['confirmed', 'completed', 'cancelled'].includes(status)) {
        return res.status(400).json({ success: false, error: 'Invalid status transition' });
      }

      if (status === 'cancelled') {
        appointment.cancelledBy = 'admin';
        appointment.cancellationReason = cancellationReason || '';
      }

      if (status === 'completed') {
        if (notes) appointment.notes = notes;
        if (linkedRecord) appointment.linkedRecord = linkedRecord;
      }
    }

    appointment.status = status;
    await appointment.save();

    const populated = await appointment.populate([
      { path: 'patient', select: 'name phone language' },
      { path: 'doctor', select: 'name phone' },
      { path: 'linkedRecord', select: 'title recordType' },
    ]);

    res.status(200).json({ success: true, data: populated });
  } catch (err) {
    if (err.name === 'ValidationError') {
      const messages = Object.values(err.errors).map((e) => e.message);
      return res.status(400).json({ success: false, error: messages.join(', ') });
    }
    console.error(err);
    res.status(500).json({ success: false, error: 'Server Error' });
  }
};
