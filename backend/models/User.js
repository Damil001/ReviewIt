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

