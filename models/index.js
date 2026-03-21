/**
 * Models Index
 * LADYBUGNODES V(5.1)
 */

const mongoose = require('mongoose');

// Import all models
const User = require('./User');
const Session = require('./Session');
const Bot = require('./Bot');
const Activity = require('./Activity');
const Transaction = require('./Transaction');
const Notification = require('./Notification');
const Webhook = require('./Webhook');

module.exports = {
  mongoose,
  User,
  Session,
  Bot,
  Activity,
  Transaction,
  Notification,
  Webhook
};