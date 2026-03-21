/**
 * MongoDB Database Configuration
 * LADYBUGNODES V(5.1)
 */

const mongoose = require('mongoose');
const chalk = require('chalk');

const MONGODB_URI = process.env.MONGODB_URI || process.env.MONGO_URL;

const connectDB = async () => {
  try {
    if (!MONGODB_URI) {
      console.log(chalk.yellow('[DB] No MongoDB URI provided - using file-based storage'));
      return false;
    }

    const conn = await mongoose.connect(MONGODB_URI, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });

    console.log(chalk.green(`[DB] MongoDB Connected: ${conn.connection.host}`));
    
    // Handle connection events
    mongoose.connection.on('error', (err) => {
      console.error(chalk.red(`[DB] Connection error: ${err.message}`));
    });

    mongoose.connection.on('disconnected', () => {
      console.log(chalk.yellow('[DB] MongoDB disconnected'));
    });

    mongoose.connection.on('reconnected', () => {
      console.log(chalk.green('[DB] MongoDB reconnected'));
    });

    return true;
  } catch (error) {
    console.error(chalk.red(`[DB] Error: ${error.message}`));
    console.log(chalk.yellow('[DB] Falling back to file-based storage'));
    return false;
  }
};

// Graceful shutdown
process.on('SIGINT', async () => {
  if (mongoose.connection.readyState === 1) {
    await mongoose.connection.close();
    console.log(chalk.yellow('[DB] MongoDB connection closed'));
  }
});

module.exports = { connectDB, mongoose };