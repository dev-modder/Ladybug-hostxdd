/**
 * Transaction Model - Coin Transactions
 * LADYBUGNODES V(5.1)
 */

const mongoose = require('mongoose');
const { Schema } = mongoose;

const TransactionSchema = new Schema({
  // Transaction ID
  transactionId: {
    type: String,
    required: true,
    unique: true
  },
  
  // Users
  fromUserId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    index: true
  },
  fromUsername: {
    type: String,
    default: 'System'
  },
  toUserId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    index: true
  },
  toUsername: {
    type: String,
    default: ''
  },
  
  // Amount
  amount: {
    type: Number,
    required: true
  },
  type: {
    type: String,
    required: true,
    enum: [
      'earn', 'spend', 'purchase', 'gift', 'refund', 'bonus', 
      'referral', 'penalty', 'adjustment', 'transfer', 'daily'
    ]
  },
  
  // Reason
  reason: {
    type: String,
    default: ''
  },
  description: {
    type: String,
    default: ''
  },
  
  // Related entity
  relatedType: {
    type: String,
    enum: ['session', 'bot', 'user', 'system', 'purchase', 'other'],
    default: 'other'
  },
  relatedId: {
    type: String,
    default: null
  },
  
  // Balance after transaction
  balanceAfter: {
    type: Number,
    default: 0
  },
  
  // Payment info (for purchases)
  payment: {
    method: { type: String, enum: ['stripe', 'paypal', 'manual', 'other'] },
    externalId: { type: String },
    amountCurrency: { type: Number }, // Amount in real currency
    currency: { type: String, default: 'USD' }
  },
  
  // Status
  status: {
    type: String,
    enum: ['pending', 'completed', 'failed', 'cancelled', 'refunded'],
    default: 'completed'
  }
}, {
  timestamps: true
});

// Indexes
TransactionSchema.index({ fromUserId: 1, createdAt: -1 });
TransactionSchema.index({ toUserId: 1, createdAt: -1 });
TransactionSchema.index({ type: 1 });
TransactionSchema.index({ createdAt: -1 });

// Static methods
TransactionSchema.statics.getUserBalance = async function(userId) {
  const result = await this.aggregate([
    { $match: { toUserId: mongoose.Types.ObjectId(userId), status: 'completed' } },
    { $group: { _id: null, total: { $sum: '$amount' } } }
  ]);
  
  const spent = await this.aggregate([
    { $match: { fromUserId: mongoose.Types.ObjectId(userId), status: 'completed' } },
    { $group: { _id: null, total: { $sum: '$amount' } } }
  ]);
  
  const earned = result[0]?.total || 0;
  const deductions = spent[0]?.total || 0;
  
  return earned - deductions;
};

TransactionSchema.statics.getHistory = function(userId, limit = 50) {
  return this.find({
    $or: [{ fromUserId: userId }, { toUserId: userId }]
  })
  .sort({ createdAt: -1 })
  .limit(limit);
};

TransactionSchema.statics.getStats = async function(userId, days = 30) {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  
  return this.aggregate([
    { 
      $match: { 
        toUserId: mongoose.Types.ObjectId(userId), 
        createdAt: { $gte: since },
        status: 'completed'
      } 
    },
    { $group: {
      _id: '$type',
      count: { $sum: 1 },
      total: { $sum: '$amount' }
    }},
    { $sort: { total: -1 } }
  ]);
};

module.exports = mongoose.model('Transaction', TransactionSchema);