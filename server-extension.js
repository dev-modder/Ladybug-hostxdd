'use strict';

/**
 * LADYBUGNODES V5.1 - MongoDB Extension
 * This file extends the main server with MongoDB capabilities
 * Import this at the top of server.js after all requires
 */

// ─────────────────────────────────────────────────────────────────────────────
// MongoDB Setup
// ─────────────────────────────────────────────────────────────────────────────

const { connectMongoDB, getMongoStatus, mongoose } = require('./utils/mongodb-setup');
const Data = require('./utils/dataLayer');
const { logActivity, ActivityTypes } = require('./utils/activityLogger');

// Check if we should use MongoDB
const USE_MONGODB = process.env.MONGODB_URI ? true : false;

// ─────────────────────────────────────────────────────────────────────────────
// Enhanced Functions (replace file-based operations when MongoDB is available)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Enhanced user lookup - uses MongoDB if connected
 */
async function findUser(identifier) {
    if (mongoose.connection.readyState === 1) {
        // Try to find by ID, username, email, or phone
        let user = await Data.User.findById(identifier);
        if (!user) user = await Data.User.findByUsername(identifier);
        if (!user) user = await Data.User.findByEmail(identifier);
        if (!user) user = await Data.User.findByPhone(identifier);
        return user;
    }
    return null; // Will fallback to file-based
}

/**
 * Enhanced user creation
 */
async function createUser(userData) {
    if (mongoose.connection.readyState === 1) {
        const user = await Data.User.create(userData);
        await logActivity(user.id || user._id, ActivityTypes.USER_REGISTERED, {
            username: user.username
        });
        return user;
    }
    return null; // Will fallback to file-based
}

/**
 * Enhanced session creation
 */
async function createSession(sessionData) {
    if (mongoose.connection.readyState === 1) {
        const session = await Data.Session.create(sessionData);
        await logActivity(sessionData.owner, ActivityTypes.SESSION_CREATED, {
            sessionId: session.sessionId
        });
        return session;
    }
    return null;
}

/**
 * Enhanced bot creation
 */
async function createBot(botData) {
    if (mongoose.connection.readyState === 1) {
        const bot = await Data.Bot.create(botData);
        await logActivity(botData.owner, ActivityTypes.BOT_CREATED, {
            botId: bot.botId || bot.id
        });
        return bot;
    }
    return null;
}

/**
 * Log activity with MongoDB support
 */
async function logUserActivity(userId, action, details = {}) {
    if (mongoose.connection.readyState === 1) {
        await logActivity(userId, action, details);
    }
}

/**
 * Get user balance (coins)
 */
async function getUserBalance(userId) {
    if (mongoose.connection.readyState === 1) {
        return await Data.Transaction.getBalance(userId);
    }
    return null;
}

/**
 * Transfer coins between users
 */
async function transferCoins(fromUserId, toUserId, amount, description = '') {
    if (mongoose.connection.readyState === 1) {
        const transaction = await Data.Transaction.transfer(fromUserId, toUserId, amount, description);
        await logActivity(fromUserId, ActivityTypes.COINS_TRANSFERRED, {
            toUser: toUserId,
            amount
        });
        return transaction;
    }
    return null;
}

/**
 * Create notification
 */
async function createNotification(userId, title, message, type = 'info', channels = ['in-app']) {
    if (mongoose.connection.readyState === 1) {
        return await Data.Notification.create({
            user: userId,
            title,
            message,
            type,
            channels
        });
    }
    return null;
}

/**
 * Trigger webhooks
 */
async function triggerWebhooks(event, data) {
    if (mongoose.connection.readyState === 1) {
        const webhooks = await Data.Webhook.findByEvent(event);
        // Webhook delivery would be handled by a separate service
        return webhooks;
    }
    return [];
}

// ─────────────────────────────────────────────────────────────────────────────
// System Stats with MongoDB
// ─────────────────────────────────────────────────────────────────────────────

async function getSystemStats() {
    const stats = {
        database: getMongoStatus(),
        users: { total: 0, active: 0 },
        sessions: { total: 0, connected: 0 },
        bots: { total: 0, running: 0 }
    };

    if (mongoose.connection.readyState === 1) {
        try {
            stats.users.total = await Data.User.count();
            stats.users.active = await Data.User.count({ isActive: true });
            stats.sessions.total = await Data.Session.count();
            stats.sessions.connected = await Data.Session.count({ status: 'connected' });
            stats.bots.total = await Data.Bot.count();
            stats.bots.running = await Data.Bot.count({ status: 'running' });
        } catch (error) {
            console.error('[Stats Error]', error.message);
        }
    }

    return stats;
}

// ─────────────────────────────────────────────────────────────────────────────
// Initialization
// ─────────────────────────────────────────────────────────────────────────────

async function initializeMongoDB() {
    if (USE_MONGODB) {
        console.log('[MongoDB] Initializing connection...');
        const connected = await connectMongoDB();
        if (connected) {
            console.log('[MongoDB] Connected successfully');
            console.log('[MongoDB] Enhanced features enabled');
        } else {
            console.log('[MongoDB] Connection failed - using file-based storage');
        }
        return connected;
    } else {
        console.log('[Storage] Using file-based storage (no MONGODB_URI set)');
        return false;
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// Export
// ─────────────────────────────────────────────────────────────────────────────

module.exports = {
    // MongoDB status
    USE_MONGODB,
    getMongoStatus,
    initializeMongoDB,

    // Enhanced operations
    findUser,
    createUser,
    createSession,
    createBot,
    logUserActivity,
    getUserBalance,
    transferCoins,
    createNotification,
    triggerWebhooks,
    getSystemStats,

    // Data layer access
    Data,

    // Activity types
    ActivityTypes
};