/**
 * Session Model - WhatsApp Bot Sessions
 * LADYBUGNODES V(5.1)
 */

const mongoose = require('mongoose');
const { Schema } = mongoose;

const SessionSchema = new Schema({
  // Identification
  sessionId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 50
  },
  
  // Owner
  ownerId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  ownerUsername: {
    type: String,
    required: true
  },
  
  // Bot Configuration
  botType: {
    type: String,
    enum: ['ladybug-md', 'baileys', 'custom', 'multi-device'],
    default: 'ladybug-md'
  },
  prefix: {
    type: String,
    default: '!',
    maxlength: 5
  },
  version: {
    type: String,
    default: '1.0.0'
  },
  
  // Session Data
  sessionPath: {
    type: String,
    default: ''
  },
  authState: {
    type: String,
    enum: ['pending', 'qr', 'connected', 'disconnected', 'banned', 'error'],
    default: 'pending'
  },
  qrCode: {
    type: String,
    default: ''
  },
  phoneNumber: {
    type: String,
    default: ''
  },
  jid: {
    type: String, // WhatsApp ID
    default: ''
  },
  
  // Status
  status: {
    type: String,
    enum: ['stopped', 'starting', 'running', 'stopping', 'error', 'crashed'],
    default: 'stopped'
  },
  pid: {
    type: Number,
    default: null
  },
  
  // Process Info
  processInfo: {
    startTime: { type: Date },
    uptime: { type: Number, default: 0 },
    restartCount: { type: Number, default: 0 },
    lastRestart: { type: Date }
  },
  
  // Auto-restart
  autoRestart: {
    type: Boolean,
    default: true
  },
  maxRestarts: {
    type: Number,
    default: 5
  },
  restartDelay: {
    type: Number, // seconds
    default: 30
  },
  
  // Resources
  resources: {
    cpuUsage: { type: Number, default: 0 },
    memoryUsage: { type: Number, default: 0 },
    messagesProcessed: { type: Number, default: 0 },
    commandsExecuted: { type: Number, default: 0 }
  },
  
  // Logs
  logs: [{
    timestamp: { type: Date, default: Date.now },
    level: { type: String, enum: ['info', 'warn', 'error', 'debug'] },
    message: { type: String }
  }],
  
  // Configuration
  config: {
    modr: { type: Boolean, default: false },
    antilink: { type: Boolean, default: false },
    anticall: { type: Boolean, default: false },
    autoread: { type: Boolean, default: false },
    autosview: { type: Boolean, default: false },
    autobio: { type: Boolean, default: false },
    chatbot: { type: Boolean, default: false },
    nsfw: { type: Boolean, default: false },
    debug: { type: Boolean, default: false }
  },
  
  // Environment Variables
  envVars: {
    type: Map,
    of: String,
    default: {}
  },
  
  // Webhook
  webhook: {
    url: { type: String, default: '' },
    events: [{ type: String }],
    secret: { type: String, default: '' }
  },
  
  // Tags
  tags: [{
    type: String,
    maxlength: 20
  }],
  
  // Notes
  notes: {
    type: String,
    maxlength: 500,
    default: ''
  },
  
  // Coin cost tracking
  coinCost: {
    startCost: { type: Number, default: 5 },
    totalSpent: { type: Number, default: 0 }
  },
  
  // Metrics
  metrics: {
    totalUptime: { type: Number, default: 0 },
    totalRestarts: { type: Number, default: 0 },
    totalErrors: { type: Number, default: 0 },
    lastError: { type: String, default: '' },
    lastErrorTime: { type: Date }
  },
  
  // Archive
  isArchived: {
    type: Boolean,
    default: false
  },
  archivedAt: {
    type: Date
  },
  
  // Template (if created from template)
  templateId: {
    type: String,
    default: null
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
SessionSchema.index({ ownerId: 1, status: 1 });
SessionSchema.index({ status: 1 });
SessionSchema.index({ createdAt: -1 });
SessionSchema.index({ 'processInfo.startTime': -1 });

// Virtual for uptime
SessionSchema.virtual('currentUptime').get(function() {
  if (this.processInfo.startTime && this.status === 'running') {
    return Date.now() - this.processInfo.startTime.getTime();
  }
  return this.processInfo.uptime;
});

// Methods
SessionSchema.methods.addLog = function(level, message) {
  this.logs.push({ level, message });
  // Keep only last 100 logs
  if (this.logs.length > 100) {
    this.logs = this.logs.slice(-100);
  }
  return this.save();
};

SessionSchema.methods.startSession = function() {
  this.status = 'starting';
  this.processInfo.startTime = new Date();
  return this.save();
};

SessionSchema.methods.stopSession = function() {
  const uptime = this.processInfo.startTime 
    ? Date.now() - this.processInfo.startTime.getTime() 
    : 0;
  this.status = 'stopped';
  this.processInfo.uptime += uptime;
  this.metrics.totalUptime += uptime;
  this.pid = null;
  return this.save();
};

SessionSchema.methods.crashSession = function(error) {
  this.status = 'crashed';
  this.metrics.totalErrors++;
  this.metrics.lastError = error;
  this.metrics.lastErrorTime = new Date();
  if (this.processInfo.startTime) {
    this.processInfo.uptime += Date.now() - this.processInfo.startTime.getTime();
  }
  return this.save();
};

// Static methods
SessionSchema.statics.findByOwner = function(ownerId) {
  return this.find({ ownerId, isArchived: false }).sort({ createdAt: -1 });
};

SessionSchema.statics.findRunning = function() {
  return this.find({ status: 'running' });
};

SessionSchema.statics.findNeedingRestart = function() {
  return this.find({
    autoRestart: true,
    status: 'crashed',
    'processInfo.restartCount': { $lt: this.maxRestarts }
  });
};

module.exports = mongoose.model('Session', SessionSchema);