/**
 * User Model
 * LADYBUGNODES V(5.1)
 */

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { Schema } = mongoose;

const UserSchema = new Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    minlength: 3,
    maxlength: 30,
    lowercase: true
  },
  email: {
    type: String,
    trim: true,
    lowercase: true,
    sparse: true,
    default: ''
  },
  phone: {
    type: String,
    trim: true,
    sparse: true,
    default: ''
  },
  password: {
    type: String,
    required: true,
    minlength: 6
  },
  role: {
    type: String,
    enum: ['user', 'moderator', 'admin', 'superadmin'],
    default: 'user'
  },
  coins: {
    type: Number,
    default: 50,
    min: 0
  },
  
  // Profile
  avatar: {
    type: String,
    default: ''
  },
  timezone: {
    type: String,
    default: 'Africa/Harare'
  },
  language: {
    type: String,
    default: 'en'
  },
  
  // Settings
  settings: {
    twoFactorEnabled: { type: Boolean, default: false },
    twoFactorSecret: { type: String, default: '' },
    loginNotifications: { type: Boolean, default: true },
    botStartNotifications: { type: Boolean, default: true },
    botStopNotifications: { type: Boolean, default: true },
    botCrashNotifications: { type: Boolean, default: true },
    lowBalanceNotifications: { type: Boolean, default: true },
    marketingEmails: { type: Boolean, default: false },
    theme: { type: String, enum: ['dark', 'light', 'auto'], default: 'dark' }
  },
  
  // Verification
  isVerified: {
    type: Boolean,
    default: false
  },
  emailVerified: {
    type: Boolean,
    default: false
  },
  phoneVerified: {
    type: Boolean, 
    default: false
  },
  
  // Subscription
  subscription: {
    plan: { type: String, enum: ['free', 'basic', 'pro', 'enterprise'], default: 'free' },
    expiresAt: { type: Date, default: null },
    features: [{ type: String }]
  },
  
  // Referral System
  referral: {
    code: { type: String, unique: true, sparse: true },
    referredBy: { type: String, default: null },
    referrals: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    earnings: { type: Number, default: 0 }
  },
  
  // API Keys
  apiKeys: [{
    id: { type: String, required: true },
    name: { type: String, required: true },
    key: { type: String, required: true },
    permissions: [{ type: String }],
    lastUsed: { type: Date },
    createdAt: { type: Date, default: Date.now },
    expiresAt: { type: Date }
  }],
  
  // Sessions (for multi-device login)
  activeSessions: [{
    id: { type: String, required: true },
    device: { type: String },
    ip: { type: String },
    userAgent: { type: String },
    lastActive: { type: Date, default: Date.now },
    createdAt: { type: Date, default: Date.now }
  }],
  
  // Stats
  stats: {
    totalBots: { type: Number, default: 0 },
    totalSessions: { type: Number, default: 0 },
    totalUptime: { type: Number, default: 0 },
    lastLogin: { type: Date },
    loginCount: { type: Number, default: 0 }
  },
  
  // Flags
  isBanned: {
    type: Boolean,
    default: false
  },
  banReason: {
    type: String,
    default: ''
  },
  isSuspended: {
    type: Boolean,
    default: false
  },
  
  // Timestamps
  lastActive: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
UserSchema.index({ username: 1 });
UserSchema.index({ email: 1 }, { sparse: true });
UserSchema.index({ phone: 1 }, { sparse: true });
UserSchema.index({ 'referral.code': 1 }, { sparse: true });
UserSchema.index({ createdAt: -1 });

// Pre-save middleware to hash password
UserSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Generate referral code
UserSchema.pre('save', function(next) {
  if (!this.referral.code) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 8; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    this.referral.code = code;
  }
  next();
});

// Methods
UserSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

UserSchema.methods.generateAuthToken = function() {
  const jwt = require('jsonwebtoken');
  return jwt.sign(
    { 
      id: this._id, 
      username: this.username, 
      role: this.role 
    },
    process.env.JWT_SECRET || 'ladybugnodes-secret',
    { expiresIn: '7d' }
  );
};

UserSchema.methods.addCoins = function(amount, reason = '') {
  this.coins += amount;
  return this.save();
};

UserSchema.methods.deductCoins = function(amount) {
  if (this.coins < amount) return false;
  this.coins -= amount;
  return this.save();
};

UserSchema.methods.toJSON = function() {
  const user = this.toObject();
  delete user.password;
  delete user.apiKeys;
  delete user.settings.twoFactorSecret;
  delete user.activeSessions;
  return user;
};

// Static methods
UserSchema.statics.findByUsername = function(username) {
  return this.findOne({ username: username.toLowerCase() });
};

UserSchema.statics.findByEmail = function(email) {
  return this.findOne({ email: email.toLowerCase() });
};

UserSchema.statics.findByPhone = function(phone) {
  return this.findOne({ phone });
};

module.exports = mongoose.model('User', UserSchema);