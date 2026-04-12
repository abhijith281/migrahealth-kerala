const mongoose = require('mongoose');

const PatientProfileSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    bloodGroup: {
      type: String,
      enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 'Unknown'],
      default: 'Unknown',
    },
    dateOfBirth: {
      type: Date,
    },
    gender: {
      type: String,
      enum: ['male', 'female', 'other', 'prefer_not_to_say'],
    },
    allergies: {
      type: [String],
      default: [],
    },
    chronicConditions: {
      type: [String],
      default: [],
    },
    emergencyContact: {
      name: { type: String, trim: true },
      phone: {
        type: String,
        match: [/^[6-9]\d{9}$/, 'Please enter a valid 10-digit phone number'],
      },
      relation: { type: String, trim: true },
    },
    currentAddress: {
      district: { type: String, trim: true },
      city: { type: String, trim: true },
    },
    assignedDoctor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('PatientProfile', PatientProfileSchema);
