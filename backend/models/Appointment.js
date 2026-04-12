const mongoose = require('mongoose');

const AppointmentSchema = new mongoose.Schema(
  {
    patient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Patient is required'],
    },
    doctor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Doctor is required'],
    },
    appointmentDate: {
      type: Date,
      required: [true, 'Appointment date is required'],
    },
    timeSlot: {
      type: String,
      required: [true, 'Time slot is required'],
      trim: true,
    },
    reason: {
      type: String,
      trim: true,
      maxlength: [500, 'Reason cannot exceed 500 characters'],
    },
    status: {
      type: String,
      enum: ['pending', 'confirmed', 'completed', 'cancelled'],
      default: 'pending',
    },
    cancelledBy: {
      type: String,
      enum: ['patient', 'doctor', 'admin', null],
      default: null,
    },
    cancellationReason: {
      type: String,
      trim: true,
      maxlength: [500, 'Cancellation reason cannot exceed 500 characters'],
    },
    notes: {
      type: String,
      trim: true,
      maxlength: [2000, 'Notes cannot exceed 2000 characters'],
    },
    linkedRecord: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'HealthRecord',
      default: null,
    },
  },
  { timestamps: true }
);

// Index 1: Patient's appointment timeline
AppointmentSchema.index({ patient: 1, appointmentDate: -1 });

// Index 2: Doctor's schedule
AppointmentSchema.index({ doctor: 1, appointmentDate: 1 });

// Index 3: Doctor's schedule filtered by status (conflict detection & schedule views)
AppointmentSchema.index({ doctor: 1, appointmentDate: 1, status: 1 });

module.exports = mongoose.model('Appointment', AppointmentSchema);
