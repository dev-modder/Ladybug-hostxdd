/**
 * Bot Model - Panel Bots
 * LADYBUGNODES V(5.1)
 */

const mongoose = require('mongoose');
const { Schema } = mongoose;

const BotSchema = new Schema({
  // Identification
  botId: {
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
  description: {
    type: String,
    maxlength: 500,
    default: ''
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
  
  // Source
  source: {
    type: String,
    enum: ['upload', 'github', 'template', 'marketplace'],
    default: 'upload'
  },
  sourceUrl: {
    type: String,
    default: ''
  },
  branch: {
    type: String,
    default: 'main'
  },
  templateId: {
    type: String,
    default: null
  },
  
  // Configuration
  entryPoint: {
    type: String,
    default: 'index.js'
  },
  
  // Status
  status: {
    type: String,
    enum: ['stopped', 'starting', 'running', 'stopping', 'error', 'crashed', 'building'],
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
    default: false
  },
  maxRestarts: {
    type: Number,
    default: 5
  },
  
  // Environment Variables
  envVars: {
    type: Map,
    of: String,
    default: {}
  },
  
  // Resources
  resources: {
    cpuUsage: { type: Number, default: 0 },
    memoryUsage: { type: Number, default: 0 },
    diskUsage: { type: Number, default: 0 }
  },
  
  // Network
  port: {
    type: Number,
    default: null
  },
  publicUrl: {
    type: String,
    default: ''
  },
  
  // Build Info
  build: {
    status: { type: String, enum: ['pending', 'building', 'success', 'failed'], default: 'pending' },
    startedAt: { type: Date },
    completedAt: { type: Date },
    logs: [{ timestamp: Date, message: String }],
    error: { type: String, default: '' }
  },
  
  // Package Info
  package: {
    name: { type: String },
    version: { type: String },
    main: { type: String },
    dependencies: { type: Map, of: String }
  },
  
  // Logs
  logs: [{
    timestamp: { type: Date, default: Date.now },
    level: { type: String, enum: ['info', 'warn', 'error', 'debug', 'stdout', 'stderr'] },
    message: { type: String }
  }],
  
  // Webhooks
  webhooks: [{
    id: { type: String, required: true },
    url: { type: String, required: true },
    events: [{ type: String }],
    secret: { type: String },
    active: { type: Boolean, default: true },
    lastTriggered: { type: Date },
    failureCount: { type: Number, default: 0 }
  }],
  
  // Backups
  backups: [{
    id: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
    size: { type: Number },
    createdBy: { type: String }
  }],
  
  // Metrics
  metrics: {
    totalUptime: { type: Number, default: 0 },
    totalRestarts: { type: Number, default: 0 },
    totalRequests: { type: Number, default: 0 },
    totalErrors: { type: Number, default: 0 },
    lastError: { type: String },
    lastErrorTime: { type: Date }
  },
  
  // Scheduling
  schedule: {
    enabled: { type: Boolean, default: false },
    startAt: { type: String }, // cron expression
    stopAt: { type: String } // cron expression
  },
  
  // Access Control
  visibility: {
    type: String,
    enum: ['private', 'team', 'public'],
    default: 'private'
  },
  teamMembers: [{
    userId: { type: Schema.Types.ObjectId, ref: 'User' },
    role: { type: String, enum: ['viewer', 'editor', 'admin'] }
  }],
  
  // Archive
  isArchived: {
    type: Boolean,
    default: false
  },
  archivedAt: {
    type: Date
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
BotSchema.index({ ownerId: 1, status: 1 });
BotSchema.index({ status: 1 });
BotSchema.index({ source: 1 });
BotSchema.index({ createdAt: -1 });

// Methods
BotSchema.methods.addLog = function(level, message) {
  this.logs.push({ level, message });
  if (this.logs.length > 500) {
    this.logs = this.logs.slice(-500);
  }
  return this.save();
};

BotSchema.methods.startBot = function() {
  this.status = 'starting';
  this.processInfo.startTime = new Date();
  return this.save();
};

BotSchema.methods.stopBot = function() {
  const uptime = this.processInfo.startTime 
    ? Date.now() - this.processInfo.startTime.getTime() 
    : 0;
  this.status = 'stopped';
  this.processInfo.uptime += uptime;
  this.metrics.totalUptime += uptime;
  this.pid = null;
  return this.save();
};

// Statics
BotSchema.statics.findByOwner = function(ownerId) {
  return this.find({ ownerId, isArchived: false }).sort({ createdAt: -1 });
};

BotSchema.statics.findRunning = function() {
  return this.find({ status: 'running' });
};

module.exports = mongoose.model('Bot', BotSchema);