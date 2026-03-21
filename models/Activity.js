/**
 * Activity Model - User Activity Logs
 * LADYBUGNODES V(5.1)
 */

const mongoose = require('mongoose');
const { Schema } = mongoose;

const ActivitySchema = new Schema({
  // User
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  username: {
    type: String,
    required: true
  },
  
  // Action
  action: {
    type: String,
    required: true,
    enum: [
      // Auth
      'login', 'logout', 'register', 'password_change', '2fa_enable', '2fa_disable',
      // Sessions
      'session_create', 'session_start', 'session_stop', 'session_delete', 'session_restart',
      // Bots
      'bot_create', 'bot_start', 'bot_stop', 'bot_delete', 'bot_update', 'bot_backup', 'bot_restore',
      // Coins
      'coins_earned', 'coins_spent', 'coins_purchased', 'coins_gifted',
      // Profile
      'profile_update', 'settings_change', 'api_key_create', 'api_key_delete',
      // Admin
      'user_ban', 'user_unban', 'user_role_change', 'coins_adjust',
      // Other
      'webhook_create', 'webhook_delete', 'export_data', 'import_data'
    ]
  },
  
  // Target
  targetType: {
    type: String,
    enum: ['user', 'session', 'bot', 'system', 'other'],
    default: 'other'
  },
  targetId: {
    type: String,
    default: null
  },
  targetName: {
    type: String,
    default: ''
  },
  
  // Details
  details: {
    type: Map,
    of: mongoose.Schema.Types.Mixed,
    default: {}
  },
  
  // Request Info
  ip: {
    type: String,
    default: ''
  },
  userAgent: {
    type: String,
    default: ''
  },
  device: {
    type: String,
    default: ''
  },
  
  // Location (from IP)
  location: {
    country: { type: String, default: '' },
    city: { type: String, default: '' }
  },
  
  // Status
  status: {
    type: String,
    enum: ['success', 'failed', 'pending'],
    default: 'success'
  },
  errorMessage: {
    type: String,
    default: ''
  }
}, {
  timestamps: true
});

// Indexes
ActivitySchema.index({ userId: 1, createdAt: -1 });
ActivitySchema.index({ action: 1 });
ActivitySchema.index({ targetType: 1, targetId: 1 });
ActivitySchema.index({ createdAt: -1 });

// TTL index - auto-delete after 90 days
ActivitySchema.index({ createdAt: 1 }, { expireAfterSeconds: 90 * 24 * 60 * 60 });

// Static methods
ActivitySchema.statics.log = function(data) {
  return this.create(data);
};

ActivitySchema.statics.findByUser = function(userId, limit = 50) {
  return this.find({ userId })
    .sort({ createdAt: -1 })
    .limit(limit);
};

ActivitySchema.statics.getRecentByAction = function(action, limit = 50) {
  return this.find({ action })
    .sort({ createdAt: -1 })
    .limit(limit);
};

ActivitySchema.statics.getStats = async function(userId, days = 30) {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  
  return this.aggregate([
    { $match: { userId: mongoose.Types.ObjectId(userId), createdAt: { $gte: since } } },
    { $group: {
      _id: '$action',
      count: { $sum: 1 }
    }},
    { $sort: { count: -1 } }
  ]);
};

module.exports = mongoose.model('Activity', ActivitySchema);