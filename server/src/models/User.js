const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    role: {
      type: String,
      enum: ['fishpond_owner', 'agriculture_staff', 'admin'],
      default: 'fishpond_owner',
    },
    phone: { type: String, trim: true },
    barangay: { type: String, trim: true },
    status: { type: String, enum: ['active', 'inactive'], default: 'active' },
    // Self-registered owners must confirm their email with an OTP. Accounts
    // created before this field existed have it unset and count as verified.
    emailVerified: { type: Boolean, default: true },
    otpHash: { type: String },
    otpExpiresAt: { type: Date },
    otpSentAt: { type: Date },
    otpAttempts: { type: Number, default: 0 },
    // Set for admin-created accounts and admin password resets: the user must
    // replace the emailed temporary password before using the system.
    mustChangePassword: { type: Boolean, default: false },
  },
  { timestamps: true }
);

userSchema.methods.comparePassword = function comparePassword(candidate) {
  return bcrypt.compare(candidate, this.passwordHash);
};

userSchema.methods.toSafeObject = function toSafeObject() {
  const obj = this.toObject();
  delete obj.passwordHash;
  delete obj.otpHash;
  delete obj.otpExpiresAt;
  delete obj.otpSentAt;
  delete obj.otpAttempts;
  return obj;
};

module.exports = mongoose.model('User', userSchema);
