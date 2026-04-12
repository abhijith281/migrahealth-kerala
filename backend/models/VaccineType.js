const mongoose = require('mongoose');

const VaccineTypeSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Vaccine name is required'],
      unique: true,
      trim: true,
    },
    disease: {
      type: String,
      required: [true, 'Disease targeted is required'],
      trim: true,
    },
    description: {
      type: String,
      trim: true,
      maxlength: [500, 'Description cannot exceed 500 characters'],
    },
    recommendedAgeMonths: {
      type: Number,
      required: [true, 'Recommended age in months is required (0 for birth)'],
    },
    intervalDays: {
      type: Number,
      default: null, // null means it's a single dose or no next dose required
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('VaccineType', VaccineTypeSchema);
