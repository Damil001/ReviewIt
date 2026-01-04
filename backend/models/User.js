import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
  },
  password: {
    type: String,
    required: function() {
      return !this.googleId; // Password required only if not OAuth user
    },
    minlength: 6,
  },
  googleId: {
    type: String,
    sparse: true, // Allows multiple nulls but unique when set
  },
  avatar: {
    type: String,
    default: '',
  },
  provider: {
    type: String,
    enum: ['local', 'google'],
    default: 'local',
  },
  // Subscription fields
  subscriptionStatus: {
    type: String,
    enum: ['trial', 'active', 'past_due', 'canceled', 'expired'],
    default: 'trial',
  },
  trialStartDate: {
    type: Date,
    default: Date.now,
  },
  trialEndDate: {
    type: Date,
  },
  subscriptionStartDate: {
    type: Date,
  },
  subscriptionEndDate: {
    type: Date,
  },
  seats: {
    type: Number,
    default: 1,
    min: 1,
  },
  stripeCustomerId: {
    type: String,
    sparse: true,
  },
  stripeSubscriptionId: {
    type: String,
    sparse: true,
  },
  stripePriceId: {
    type: String,
    sparse: true,
  },
  paddleCustomerId: {
    type: String,
    sparse: true,
  },
  paddleSubscriptionId: {
    type: String,
    sparse: true,
  },
  // Manual payment fields
  paymentMethod: {
    type: String,
    enum: ['stripe', 'paddle', 'paypal', 'bank_transfer', 'manual'],
    default: null,
  },
  paymentReference: {
    type: String, // Transaction ID, receipt number, etc.
    sparse: true,
  },
  paymentNotes: {
    type: String, // Admin notes about payment
    sparse: true,
  },
  isAdmin: {
    type: Boolean,
    default: false,
  },
}, {
  timestamps: true,
});

// Hash password before saving (only if password exists and is modified)
userSchema.pre('save', async function(next) {
  if (!this.isModified('password') || !this.password) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

// Compare password method
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

export default mongoose.model('User', userSchema);

