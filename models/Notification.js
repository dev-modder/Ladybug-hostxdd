/**
 * Notification Model
 * LADYBUGNODES V(5.1)
 */

const mongoose = require('mongoose');
const { Schema } = mongoose;

const NotificationSchema = new Schema({
  // Recipient
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  
  // Content
  type: {
    type: String,
    required: true,
    enum: [
      'system', 'info', 'success', 'warning', 'error',
      'bot_started', 'bot_stopped', 'bot_crashed', 'bot_error',
      'session_created', 'session_expired', 'session_error',
      'coins_low', 'coins_added', 'coins_spent',
      'login_new_device', 'password_changed', '2fa_enabled',
      'announcement', 'promo', 'update'
    ]
  },
  title: {
    type: String,
    required: true,
    maxlength: 100
  },
  message: {
    type: String,
    required: true,
    maxlength: 500
  },
  
  // Action
  action: {
    type: {
      type: String,
      enum: ['link', 'button', 'dismiss']
    },
    label: String,
    url: String
  },
  
  // Priority
  priority: {
    type: String,
    enum: ['low', 'normal', 'high', 'urgent'],
    default: 'normal'
  },
  
  // Related entity
  relatedType: {
    type: String,
    enum: ['session', 'bot', 'transaction', 'user', 'system', 'other']
  },
  relatedId: String,
  
  // Delivery
  channels: {
    inApp: { type: Boolean, default: true },
    email: { type: Boolean, default: false },
    whatsapp: { type: Boolean, default: false },
    push: { type: Boolean, default: false }
  },
  
  // Status
  read: {
    type: Boolean,
    default: false
  },
  readAt: Date,
  
  delivered: {
    inApp: { type: Boolean, default: true },
    email: { type: Boolean, default: false },
    whatsapp: { type: Boolean, default: false },
    push: { type: Boolean, default: false }
  },
  
  // Expiry
  expiresAt: Date,
  
  // Sender (for system notifications)
  senderId: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// Indexes
NotificationSchema.index({ userId: 1, read: 1, createdAt: -1 });
NotificationSchema.index({ userId: 1, type: 1 });
NotificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Static methods
NotificationSchema.statics.getUnread = function(userId) {
  return this.find({ userId, read: false })
    .sort({ createdAt: -1 })
    .limit(50);
};

NotificationSchema.statics.getAll = function(userId, limit = 50) {
  return this.find({ userId })
    .sort({ createdAt: -1 })
    .limit(limit);
};

NotificationSchema.statics.markAsRead = function(notificationId, userId) {
  return this.findOneAndUpdate(
    { _id: notificationId, userId },
    { read: true, readAt: new Date() },
    { new: true }
  );
};

NotificationSchema.statics.markAllAsRead = function(userId) {
  return this.updateMany(
    { userId, read: false },
    { read: true, readAt: new Date() }
  );
};

NotificationSchema.statics.create = async function(data) {
  const notification = new this(data);
  await notification.save();
  return notification;
};

// Create system notification for all users
NotificationSchema.statics.broadcast = async function(data, User) {
  const users = await User.find({}, '_id');
  const notifications = users.map(user => ({
    ...data,
    userId: user._id
  }));
  return this.insertMany(notifications);
};

module.exports = mongoose.model('Notification', NotificationSchema);