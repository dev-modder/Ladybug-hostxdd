'use strict';

/**
 * Cleanup Script for LADYBUGNODES V(7)
 * Runs daily to clean up old data, logs, and expired sessions
 */

const fs = require('fs');
const path = require('path');

const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, '..', 'data');
const LOGS_DIR = path.join(DATA_DIR, 'logs');
const TEMP_DIR = path.join(DATA_DIR, 'temp-sessions');

console.log('[Cleanup] Starting cleanup process...');
console.log(`[Cleanup] Data directory: ${DATA_DIR}`);

// Clean old logs (older than 30 days)
function cleanOldLogs() {
    const logsDir = LOGS_DIR;
    if (!fs.existsSync(logsDir)) {
        console.log('[Cleanup] No logs directory found');
        return 0;
    }

    const cutoff = Date.now() - (30 * 24 * 60 * 60 * 1000); // 30 days
    let cleaned = 0;

    const botDirs = fs.readdirSync(logsDir);
    for (const botId of botDirs) {
        const botLogDir = path.join(logsDir, botId);
        if (!fs.statSync(botLogDir).isDirectory()) continue;

        const files = fs.readdirSync(botLogDir);
        for (const file of files) {
            if (file.startsWith('log-') && file.endsWith('.jsonl')) {
                const filePath = path.join(botLogDir, file);
                const stat = fs.statSync(filePath);
                
                if (stat.mtimeMs < cutoff) {
                    fs.unlinkSync(filePath);
                    cleaned++;
                    console.log(`[Cleanup] Deleted old log: ${file}`);
                }
            }
        }
    }

    return cleaned;
}

// Clean temp sessions (older than 1 day)
function cleanTempSessions() {
    const tempDir = TEMP_DIR;
    if (!fs.existsSync(tempDir)) {
        console.log('[Cleanup] No temp sessions directory found');
        return 0;
    }

    const cutoff = Date.now() - (24 * 60 * 60 * 1000); // 1 day
    let cleaned = 0;

    const files = fs.readdirSync(tempDir);
    for (const file of files) {
        const filePath = path.join(tempDir, file);
        const stat = fs.statSync(filePath);
        
        if (stat.mtimeMs < cutoff) {
            if (fs.statSync(filePath).isDirectory()) {
                fs.rmSync(filePath, { recursive: true, force: true });
            } else {
                fs.unlinkSync(filePath);
            }
            cleaned++;
            console.log(`[Cleanup] Deleted temp: ${file}`);
        }
    }

    return cleaned;
}

// Clean old backups (older than 7 days)
function cleanOldBackups() {
    const backupsDir = path.join(DATA_DIR, 'backups');
    if (!fs.existsSync(backupsDir)) {
        console.log('[Cleanup] No backups directory found');
        return 0;
    }

    const cutoff = Date.now() - (7 * 24 * 60 * 60 * 1000); // 7 days
    let cleaned = 0;

    const files = fs.readdirSync(backupsDir);
    for (const file of files) {
        if (file.endsWith('.zip')) {
            const filePath = path.join(backupsDir, file);
            const stat = fs.statSync(filePath);
            
            if (stat.mtimeMs < cutoff) {
                fs.unlinkSync(filePath);
                cleaned++;
                console.log(`[Cleanup] Deleted old backup: ${file}`);
            }
        }
    }

    return cleaned;
}

// Run cleanup
try {
    console.log('[Cleanup] Cleaning old logs...');
    const logsCleaned = cleanOldLogs();
    console.log(`[Cleanup] Cleaned ${logsCleaned} old log files`);

    console.log('[Cleanup] Cleaning temp sessions...');
    const tempCleaned = cleanTempSessions();
    console.log(`[Cleanup] Cleaned ${tempCleaned} temp files`);

    console.log('[Cleanup] Cleaning old backups...');
    const backupsCleaned = cleanOldBackups();
    console.log(`[Cleanup] Cleaned ${backupsCleaned} old backups`);

    console.log('[Cleanup] Cleanup complete!');
    console.log(`[Cleanup] Total files cleaned: ${logsCleaned + tempCleaned + backupsCleaned}`);
} catch (error) {
    console.error('[Cleanup] Error:', error.message);
    process.exit(1);
}