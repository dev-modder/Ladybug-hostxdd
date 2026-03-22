/**
 * LADYBUG MINI BOT - Lightweight & Fast Bot Template
 * Optimized for quick deployment and minimal resource usage
 * Version: 7.1.0
 */

const express = require('express');
const http = require('http');

// Minimal dependencies for speed
class LadybugMiniBot {
    constructor(config = {}) {
        this.config = {
            name: config.name || 'Ladybug Mini Bot',
            prefix: config.prefix || '!',
            owner: config.owner || '',
            port: config.port || process.env.PORT || 3000,
            webhookUrl: config.webhookUrl || '',
            ...config
        };
        
        this.commands = new Map();
        this.middlewares = [];
        this.startTime = Date.now();
        this.stats = {
            messagesReceived: 0,
            commandsExecuted: 0,
            errors: 0
        };
        
        // Built-in commands
        this.registerDefaultCommands();
    }

    /**
     * Register default commands
     */
    registerDefaultCommands() {
        // Ping command - test responsiveness
        this.command('ping', async (ctx) => {
            const latency = Date.now() - ctx.timestamp;
            return ctx.reply(`🏓 Pong! Latency: ${latency}ms`);
        }, { description: 'Check bot latency' });

        // Help command
        this.command('help', async (ctx) => {
            const cmds = Array.from(this.commands.entries())
                .map(([name, cmd]) => `• ${this.config.prefix}${name} - ${cmd.options.description || 'No description'}`)
                .join('\n');
            return ctx.reply(`📚 *${this.config.name} Commands*\n\n${cmds}`);
        }, { description: 'Show available commands' });

        // Info command
        this.command('info', async (ctx) => {
            const uptime = Math.floor((Date.now() - this.startTime) / 1000);
            const hours = Math.floor(uptime / 3600);
            const minutes = Math.floor((uptime % 3600) / 60);
            return ctx.reply(
                `🤖 *${this.config.name}*\n` +
                `👤 Owner: ${this.config.owner}\n` +
                `⏱️ Uptime: ${hours}h ${minutes}m\n` +
                `📊 Messages: ${this.stats.messagesReceived}\n` +
                `⚡ Commands: ${this.stats.commandsExecuted}`
            );
        }, { description: 'Show bot information' });

        // Status command
        this.command('status', async (ctx) => {
            const memUsage = process.memoryUsage();
            return ctx.reply(
                `📊 *Bot Status*\n` +
                `🟢 Online\n` +
                `💾 Memory: ${Math.round(memUsage.heapUsed / 1024 / 1024)}MB\n` +
                `📍 Platform: ${process.platform}\n` +
                `🚀 Node: ${process.version}`
            );
        }, { description: 'Show bot status' });
    }

    /**
     * Register a command
     */
    command(name, handler, options = {}) {
        this.commands.set(name, { handler, options });
        return this;
    }

    /**
     * Add middleware
     */
    use(middleware) {
        this.middlewares.push(middleware);
        return this;
    }

    /**
     * Process incoming message
     */
    async processMessage(message) {
        this.stats.messagesReceived++;
        
        const ctx = this.createContext(message);
        
        // Run middlewares
        for (const middleware of this.middlewares) {
            await middleware(ctx);
        }

        // Check if message starts with prefix
        if (!message.text || !message.text.startsWith(this.config.prefix)) {
            return null;
        }

        // Parse command
        const args = message.text.slice(this.config.prefix.length).trim().split(/ +/);
        const commandName = args.shift().toLowerCase();

        const command = this.commands.get(commandName);
        if (command) {
            try {
                this.stats.commandsExecuted++;
                return await command.handler(ctx);
            } catch (error) {
                this.stats.errors++;
                console.error('[MiniBot] Command error:', error);
                return ctx.reply('❌ An error occurred');
            }
        }

        return null;
    }

    /**
     * Create message context
     */
    createContext(message) {
        return {
            message,
            text: message.text || '',
            from: message.from || {},
            chat: message.chat || {},
            timestamp: Date.now(),
            args: message.text ? message.text.split(' ').slice(1) : [],
            reply: (text) => ({ text, chat: message.chat, replyTo: message.id }),
            replyWithMarkdown: (text) => ({ text, parse_mode: 'Markdown', chat: message.chat }),
            replyWithImage: (url, caption = '') => ({ type: 'image', url, caption, chat: message.chat }),
            replyWithButton: (text, buttons) => ({ text, buttons, chat: message.chat })
        };
    }

    /**
     * Get bot stats
     */
    getStats() {
        return {
            ...this.stats,
            uptime: Date.now() - this.startTime,
            commandsLoaded: this.commands.size,
            memoryUsage: process.memoryUsage()
        };
    }

    /**
     * Export bot configuration
     */
    export() {
        return {
            name: this.config.name,
            prefix: this.config.prefix,
            owner: this.config.owner,
            commands: Array.from(this.commands.keys()),
            stats: this.getStats()
        };
    }
}

// WhatsApp Mini Bot (Baileys-based)
class WhatsAppMiniBot extends LadybugMiniBot {
    constructor(config = {}) {
        super(config);
        this.type = 'whatsapp';
        this.sessionId = config.sessionId;
    }

    async connect() {
        // Connection logic for WhatsApp
        console.log(`[MiniBot] WhatsApp connecting... Session: ${this.sessionId}`);
        return { success: true, message: 'WhatsApp mini bot initialized' };
    }

    async disconnect() {
        console.log(`[MiniBot] WhatsApp disconnecting...`);
        return { success: true };
    }
}

// Telegram Mini Bot
class TelegramMiniBot extends LadybugMiniBot {
    constructor(config = {}) {
        super(config);
        this.type = 'telegram';
        this.token = config.token;
    }

    async connect() {
        console.log(`[MiniBot] Telegram connecting... Token: ${this.token?.substring(0, 10)}...`);
        return { success: true, message: 'Telegram mini bot initialized' };
    }

    async disconnect() {
        console.log(`[MiniBot] Telegram disconnecting...`);
        return { success: true };
    }
}

// Discord Mini Bot
class DiscordMiniBot extends LadybugMiniBot {
    constructor(config = {}) {
        super(config);
        this.type = 'discord';
        this.token = config.token;
    }

    async connect() {
        console.log(`[MiniBot] Discord connecting...`);
        return { success: true, message: 'Discord mini bot initialized' };
    }

    async disconnect() {
        console.log(`[MiniBot] Discord disconnecting...`);
        return { success: true };
    }
}

// Fast Hosting Configuration
const FAST_HOSTING_CONFIG = {
    // Minimal memory footprint
    memory: '256MB',
    
    // Fast startup
    startupTimeout: 10,
    
    // Auto-restart on crash
    autoRestart: true,
    restartDelay: 1000,
    maxRestarts: 3,
    
    // Health check interval
    healthCheckInterval: 30000,
    
    // Request timeout
    requestTimeout: 5000,
    
    // Max connections
    maxConnections: 100
};

// Deployment configuration for Render
const RENDER_DEPLOYMENT = {
    type: 'web',
    name: 'ladybug-mini-bot',
    env: 'node',
    region: 'oregon',
    plan: 'starter', // Free tier
    buildCommand: 'npm install --production',
    startCommand: 'node index.js',
    healthCheckPath: '/health',
    envVars: [
        { key: 'NODE_ENV', value: 'production' },
        { key: 'BOT_TYPE', value: 'mini' },
        { key: 'PORT', generate: true }
    ]
};

// Create Express server for health checks and webhooks
function createMiniServer(bot, port = 3000) {
    const app = express();
    const server = http.createServer(app);

    // Health check endpoint
    app.get('/health', (req, res) => {
        const stats = bot.getStats();
        res.json({
            status: 'ok',
            uptime: stats.uptime,
            memory: Math.round(stats.memoryUsage.heapUsed / 1024 / 1024) + 'MB',
            messages: stats.messagesReceived,
            commands: stats.commandsExecuted
        });
    });

    // Bot info endpoint
    app.get('/info', (req, res) => {
        res.json(bot.export());
    });

    // Webhook endpoint
    app.post('/webhook', express.json(), async (req, res) => {
        const message = req.body;
        const result = await bot.processMessage(message);
        res.json(result || { status: 'ignored' });
    });

    return {
        app,
        server,
        start: () => new Promise((resolve) => {
            server.listen(port, () => {
                console.log(`[MiniBot] Server running on port ${port}`);
                resolve();
            });
        }),
        stop: () => new Promise((resolve) => {
            server.close(() => {
                console.log('[MiniBot] Server stopped');
                resolve();
            });
        })
    };
}

// Quick deploy function
async function quickDeploy(botConfig, platform = 'render') {
    console.log('[MiniBot] Starting quick deploy...');
    
    let bot;
    
    switch (botConfig.type) {
        case 'whatsapp':
            bot = new WhatsAppMiniBot(botConfig);
            break;
        case 'telegram':
            bot = new TelegramMiniBot(botConfig);
            break;
        case 'discord':
            bot = new DiscordMiniBot(botConfig);
            break;
        default:
            bot = new LadybugMiniBot(botConfig);
    }

    const server = createMiniServer(bot, botConfig.port);
    await server.start();
    
    console.log('[MiniBot] Deployed successfully!');
    console.log(`[MiniBot] Health check: http://localhost:${botConfig.port}/health`);
    
    return { bot, server };
}

module.exports = {
    LadybugMiniBot,
    WhatsAppMiniBot,
    TelegramMiniBot,
    DiscordMiniBot,
    createMiniServer,
    quickDeploy,
    FAST_HOSTING_CONFIG,
    RENDER_DEPLOYMENT
};