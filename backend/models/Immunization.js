const mongoose = require('mongoose');

const ImmunizationSchema = new mongoose.Schema(
  {
    patient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Patient is required'],
    },
    vaccineType: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'VaccineType',
      required: [true, 'Vaccine type is required'],
    },
    administeredBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Administering doctor/staff is required'],
    },
    administeredAt: {
      type: Date,
      required: [true, 'Administration date is required'],
      default: Date.now,
    },
    nextDueDate: {
      type: Date,
      default: null, // Auto-calculated in the controller based on VaccineType.intervalDays
    },
    batchNumber: {
      type: String,
      trim: true,
    },
    facility: {
      name: { type: String, trim: true },
      location: { type: String, trim: true },
    },
    sideEffects: {
      type: String,
      trim: true,
      maxlength: [500, 'Side effects cannot exceed 500 characters'],
    },
    linkedAppointment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Appointment',
      default: null,
    },
    notes: {
      type: String,
      trim: true,
      maxlength: [1000, 'Notes cannot exceed 1000 characters'],
    },
  },
  { timestamps: true }
);

// Index 1: Retrieve a patient's immunization history sorted by date
ImmunizationSchema.index({ patient: 1, administeredAt: -1 });

// Index 2: Prevent duplicate entries for the exact same vaccine on the exact same date for the same patient
ImmunizationSchema.index({ patient: 1, vaccineType: 1, administeredAt: 1 }, { unique: true });

module.exports = mongoose.model('Immunization', ImmunizationSchema);
