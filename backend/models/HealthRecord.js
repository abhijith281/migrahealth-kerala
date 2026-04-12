const mongoose = require('mongoose');

const MedicationSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    dosage: { type: String, trim: true },
    frequency: { type: String, trim: true },
    duration: { type: String, trim: true },
  },
  { _id: false }
);

const HealthRecordSchema = new mongoose.Schema(
  {
    patient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Patient is required'],
    },
    doctor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    recordType: {
      type: String,
      enum: [
        'consultation',
        'prescription',
        'lab_result',
        'immunization',
        'hospitalization',
        'self_report',
      ],
      required: [true, 'Record type is required'],
    },
    title: {
      type: String,
      required: [true, 'Title is required'],
      trim: true,
      maxlength: [200, 'Title cannot exceed 200 characters'],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [2000, 'Description cannot exceed 2000 characters'],
    },
    diagnosis: {
      type: String,
      trim: true,
      maxlength: [500, 'Diagnosis cannot exceed 500 characters'],
    },
    medications: {
      type: [MedicationSchema],
      default: [],
    },
    visitDate: {
      type: Date,
      required: [true, 'Visit date is required'],
    },
    facility: {
      name: { type: String, trim: true },
      location: { type: String, trim: true },
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

// Compound index: patient + visitDate descending for efficient patient timeline queries
HealthRecordSchema.index({ patient: 1, visitDate: -1 });

module.exports = mongoose.model('HealthRecord', HealthRecordSchema);
