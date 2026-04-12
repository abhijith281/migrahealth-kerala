const mongoose = require('mongoose');

const DoctorProfileSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    specialization: {
      type: String,
      trim: true,
    },
    licenseNumber: {
      type: String,
      trim: true,
    },
    hospital: {
      name: { type: String, trim: true },
      district: { type: String, trim: true },
    },
    patients: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
  },
  { timestamps: true }
);

// Sparse unique index: multiple null licenseNumbers allowed but non-null must be unique
DoctorProfileSchema.index({ licenseNumber: 1 }, { unique: true, sparse: true });

module.exports = mongoose.model('DoctorProfile', DoctorProfileSchema);
