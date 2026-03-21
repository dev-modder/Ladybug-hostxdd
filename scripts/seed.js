'use strict';

/**
 * Seed Script for LADYBUGNODES V5
 * Creates initial admin user and default data
 */

require('dotenv').config();

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const chalk = require('chalk');

// Import models
const User = require('../models/User');
const Session = require('../models/Session');
const Bot = require('../models/Bot');
const Webhook = require('../models/Webhook');

// Configuration
const MONGODB_URI = process.env.MONGODB_URI;
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'devntando';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'ntando';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@ladybugnodes.com';

console.log(chalk.cyan('════════════════════════════════════════════════════════════'));
console.log(chalk.cyan('  LADYBUGNODES V5 - Database Seed Script'));
console.log(chalk.cyan('════════════════════════════════════════════════════════════'));

async function connectDB() {
    if (!MONGODB_URI) {
        console.log(chalk.yellow('⚠ No MONGODB_URI provided - skipping seed'));
        process.exit(0);
    }

    try {
        await mongoose.connect(MONGODB_URI, {
            maxPoolSize: 10
        });
        console.log(chalk.green('✓ Connected to MongoDB'));
        return true;
    } catch (error) {
        console.log(chalk.red('✗ Failed to connect to MongoDB:'), error.message);
        process.exit(1);
    }
}

async function seedAdmin() {
    console.log(chalk.blue('\n→ Seeding admin user...'));

    const existingAdmin = await User.findOne({ username: ADMIN_USERNAME });

    if (existingAdmin) {
        console.log(chalk.yellow(`  ⚠ Admin user "${ADMIN_USERNAME}" already exists`));
        
        // Update admin with latest schema fields
        existingAdmin.role = 'superadmin';
        existingAdmin.subscription.plan = 'enterprise';
        existingAdmin.subscription.expiresAt = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000); // 1 year
        existingAdmin.coins = 999999999;
        existingAdmin.settings = {
            notifications: { email: true, push: true, whatsapp: true },
            theme: 'dark',
            language: 'en'
        };
        
        await existingAdmin.save();
        console.log(chalk.green('  ✓ Updated existing admin with latest settings'));
        return existingAdmin;
    }

    const hashedPassword = await bcrypt.hash(ADMIN_PASSWORD, 12);

    const admin = new User({
        username: ADMIN_USERNAME,
        email: ADMIN_EMAIL,
        password: hashedPassword,
        role: 'superadmin',
        coins: 999999999,
        subscription: {
            plan: 'enterprise',
            status: 'active',
            expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
            features: {
                maxBots: 1000,
                maxSessions: 1000,
                apiAccess: true,
                priority: true,
                customBranding: true
            }
        },
        settings: {
            notifications: { email: true, push: true, whatsapp: true },
            theme: 'dark',
            language: 'en'
        },
        isVerified: true,
        isActive: true
    });

    await admin.save();
    console.log(chalk.green(`  ✓ Created admin user: ${ADMIN_USERNAME}`));
    return admin;
}

async function seedDemoUsers() {
    console.log(chalk.blue('\n→ Seeding demo users...'));

    const demoUsers = [
        {
            username: 'demo_user',
            email: 'demo@example.com',
            password: await bcrypt.hash('demo123', 12),
            role: 'user',
            coins: 1000,
            subscription: {
                plan: 'free',
                status: 'active'
            },
            isVerified: true
        },
        {
            username: 'demo_pro',
            email: 'pro@example.com',
            password: await bcrypt.hash('pro123', 12),
            role: 'user',
            coins: 5000,
            subscription: {
                plan: 'pro',
                status: 'active',
                expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
                features: {
                    maxBots: 50,
                    maxSessions: 25,
                    apiAccess: true,
                    priority: false
                }
            },
            isVerified: true
        },
        {
            username: 'demo_moderator',
            email: 'mod@example.com',
            password: await bcrypt.hash('mod123', 12),
            role: 'moderator',
            coins: 10000,
            subscription: {
                plan: 'basic',
                status: 'active'
            },
            isVerified: true
        }
    ];

    for (const userData of demoUsers) {
        const existing = await User.findOne({ username: userData.username });
        if (!existing) {
            await new User(userData).save();
            console.log(chalk.green(`  ✓ Created demo user: ${userData.username}`));
        } else {
            console.log(chalk.yellow(`  ⚠ Demo user "${userData.username}" already exists`));
        }
    }
}

async function seedWebhooks() {
    console.log(chalk.blue('\n→ Seeding default webhooks...'));

    // Check if any webhooks exist
    const existingWebhooks = await Webhook.countDocuments();
    if (existingWebhooks > 0) {
        console.log(chalk.yellow('  ⚠ Webhooks already exist - skipping'));
        return;
    }

    console.log(chalk.green('  ✓ No default webhooks to seed'));
}

async function cleanupOldData() {
    console.log(chalk.blue('\n→ Cleaning up old data...'));

    // Remove expired sessions older than 30 days
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const expiredSessions = await Session.deleteMany({
        status: 'disconnected',
        updatedAt: { $lt: thirtyDaysAgo }
    });

    if (expiredSessions.deletedCount > 0) {
        console.log(chalk.green(`  ✓ Removed ${expiredSessions.deletedCount} expired sessions`));
    } else {
        console.log(chalk.gray('  • No expired sessions to remove'));
    }
}

async function showStats() {
    console.log(chalk.blue('\n→ Database Statistics:'));

    const stats = {
        Users: await User.countDocuments(),
        Sessions: await Session.countDocuments(),
        Bots: await Bot.countDocuments(),
        Webhooks: await Webhook.countDocuments()
    };

    for (const [name, count] of Object.entries(stats)) {
        console.log(chalk.white(`  ${name}: ${count}`));
    }
}

async function main() {
    try {
        await connectDB();

        console.log(chalk.blue('\n→ Starting seed process...'));

        await seedAdmin();
        await seedDemoUsers();
        await seedWebhooks();
        await cleanupOldData();
        await showStats();

        console.log(chalk.green('\n✓ Seed completed successfully!'));
        console.log(chalk.cyan('════════════════════════════════════════════════════════════'));

    } catch (error) {
        console.log(chalk.red('\n✗ Seed failed:'), error);
    } finally {
        await mongoose.connection.close();
        console.log(chalk.gray('\n→ Database connection closed'));
    }
}

// Run seed
main();