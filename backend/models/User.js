const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const UserSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Please add a name'],
      trim: true,
      maxlength: [50, 'Name cannot be more than 50 characters'],
    },
    phone: {
      type: String,
      required: [true, 'Please add a phone number'],
      unique: true,
      match: [/^[6-9]\d{9}$/, 'Please add a valid 10-digit Indian phone number'],
    },
    password: {
      type: String,
      required: [true, 'Please add a password'],
      minlength: [6, 'Password must be at least 6 characters'],
      select: false,
    },
    role: {
      type: String,
      enum: ['patient', 'doctor', 'admin'],
      default: 'patient',
    },
    language: {
      type: String,
      enum: ['ml', 'hi', 'bn', 'ta', 'or', 'en'],
      default: 'en',
    },
    homeState: {
      type: String,
      trim: true,
    },
    aadhaarLast4: {
      type: String,
      match: [/^\d{4}$/, 'Please enter exactly 4 digits'],
    },
    email: {
      type: String,
      match: [
        /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
        'Please add a valid email',
      ],
    },
  },
  {
    timestamps: true,
  }
);

// Sparse index on email — allows multiple null values but enforces uniqueness on non-null
UserSchema.index({ email: 1 }, { unique: true, sparse: true });

// Encrypt password using bcrypt before saving
UserSchema.pre('save', async function (next) {
  if (!this.isModified('password')) {
    next();
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// Sign JWT and return
UserSchema.methods.getSignedJwtToken = function () {
  return jwt.sign({ id: this._id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE,
  });
};

// Match user entered password to hashed password in database
UserSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('User', UserSchema);
