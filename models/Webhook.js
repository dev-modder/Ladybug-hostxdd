/**
 * Webhook Model
 * LADYBUGNODES V(5.1)
 */

const mongoose = require('mongoose');
const { Schema } = mongoose;

const WebhookSchema = new Schema({
  // Owner
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  
  // Configuration
  name: {
    type: String,
    required: true,
    maxlength: 50
  },
  url: {
    type: String,
    required: true
  },
  secret: {
    type: String,
    default: ''
  },
  
  // Events
  events: [{
    type: String,
    enum: [
      'bot.started', 'bot.stopped', 'bot.crashed', 'bot.error',
      'session.created', 'session.started', 'session.stopped', 'session.expired',
      'user.registered', 'user.login', 'user.logout',
      'coins.earned', 'coins.spent', 'coins.low',
      'webhook.test'
    ]
  }],
  
  // Filters
  filters: {
    botIds: [{ type: String }],
    sessionIds: [{ type: String }],
    minAmount: { type: Number }
  },
  
  // Status
  active: {
    type: Boolean,
    default: true
  },
  
  // Stats
  stats: {
    totalCalls: { type: Number, default: 0 },
    successfulCalls: { type: Number, default: 0 },
    failedCalls: { type: Number, default: 0 },
    lastCall: { type: Date },
    lastSuccess: { type: Date },
    lastFailure: { type: Date },
    lastError: { type: String }
  },
  
  // Retry configuration
  retry: {
    enabled: { type: Boolean, default: true },
    maxRetries: { type: Number, default: 3 },
    backoffMultiplier: { type: Number, default: 2 }
  },
  
  // Recent deliveries
  deliveries: [{
    id: { type: String, required: true },
    timestamp: { type: Date, default: Date.now },
    event: { type: String },
    status: { type: Number }, // HTTP status code
    responseTime: { type: Number }, // ms
    error: { type: String },
    retryCount: { type: Number, default: 0 }
  }]
}, {
  timestamps: true
});

// Indexes
WebhookSchema.index({ userId: 1, active: 1 });
WebhookSchema.index({ events: 1 });

// Methods
WebhookSchema.methods.recordDelivery = function(delivery) {
  this.deliveries.push(delivery);
  if (this.deliveries.length > 50) {
    this.deliveries = this.deliveries.slice(-50);
  }
  this.stats.totalCalls++;
  this.stats.lastCall = new Date();
  
  if (delivery.status >= 200 && delivery.status < 300) {
    this.stats.successfulCalls++;
    this.stats.lastSuccess = new Date();
  } else {
    this.stats.failedCalls++;
    this.stats.lastFailure = new Date();
    this.stats.lastError = delivery.error || `HTTP ${delivery.status}`;
  }
  
  return this.save();
};

// Statics
WebhookSchema.statics.findActiveByEvent = function(event) {
  return this.find({ active: true, events: event });
};

module.exports = mongoose.model('Webhook', WebhookSchema);