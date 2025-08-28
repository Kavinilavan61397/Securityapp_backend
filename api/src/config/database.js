const mongoose = require('mongoose');

/**
 * Dynamic MongoDB Atlas Connection Module
 * 100% environment-driven configuration - NO hardcoded values
 * Using latest MongoDB 6.0+ compatible options
 */

class DatabaseConnection {
  constructor() {
    this.isConnected = false;
    this.connection = null;
  }

  /**
   * Connect to MongoDB Atlas with essential, dynamic configuration
   */
  async connect() {
    try {
      // Get MongoDB URI from environment variables
      const mongoUri = process.env.MONGODB_URI;
      
      if (!mongoUri) {
        throw new Error('MONGODB_URI environment variable is required');
      }

      // Essential connection options (MongoDB 6.0+ compatible)
      const connectionOptions = {
        // Connection pooling (environment-driven)
        maxPoolSize: parseInt(process.env.MONGODB_MAX_POOL_SIZE) || 10,
        
        // Timeout configurations (environment-driven)
        serverSelectionTimeoutMS: parseInt(process.env.MONGODB_SERVER_SELECTION_TIMEOUT) || 5000,
        socketTimeoutMS: parseInt(process.env.MONGODB_SOCKET_TIMEOUT) || 45000,
        
        // MongoDB standard features
        retryWrites: true,
        retryReads: true
      };

      // Connect to MongoDB Atlas
      this.connection = await mongoose.connect(mongoUri, connectionOptions);
      
      this.isConnected = true;
      
      console.log('✅ MongoDB Atlas connected successfully');
      console.log(`🌍 Database: ${this.connection.connection.name}`);
      console.log(`🔌 Host: ${this.connection.connection.host}`);
      console.log(`📊 Port: ${this.connection.connection.port}`);
      
      // Handle connection events
      this.setupEventHandlers();
      
      return this.connection;
      
    } catch (error) {
      console.error('❌ MongoDB Atlas connection failed:', error.message);
      throw error;
    }
  }

  /**
   * Setup MongoDB connection event handlers
   */
  setupEventHandlers() {
    const db = this.connection.connection;

    // Connection events
    db.on('connected', () => {
      console.log('🟢 MongoDB connection established');
      this.isConnected = true;
    });

    db.on('error', (err) => {
      console.error('🔴 MongoDB connection error:', err);
      this.isConnected = false;
    });

    db.on('disconnected', () => {
      console.log('🟡 MongoDB connection disconnected');
      this.isConnected = false;
    });

    // Graceful shutdown
    process.on('SIGINT', async () => {
      await this.disconnect();
      process.exit(0);
    });

    process.on('SIGTERM', async () => {
      await this.disconnect();
      process.exit(0);
    });
  }

  /**
   * Disconnect from MongoDB
   */
  async disconnect() {
    try {
      if (this.connection) {
        await mongoose.disconnect();
        this.isConnected = false;
        console.log('✅ MongoDB connection closed gracefully');
      }
    } catch (error) {
      console.error('❌ Error closing MongoDB connection:', error.message);
    }
  }

  /**
   * Get connection status
   */
  getConnectionStatus() {
    return {
      isConnected: this.isConnected,
      database: this.connection?.connection?.name || 'Not connected',
      host: this.connection?.connection?.host || 'Not connected',
      port: this.connection?.connection?.port || 'Not connected'
    };
  }

  /**
   * Health check for database connection
   */
  async healthCheck() {
    try {
      if (!this.isConnected) {
        return { status: 'disconnected', message: 'Database not connected' };
      }

      // Ping the database
      await mongoose.connection.db.admin().ping();
      
      return { 
        status: 'healthy', 
        message: 'Database connection is healthy',
        timestamp: new Date().toISOString()
      };
      
    } catch (error) {
      return { 
        status: 'unhealthy', 
        message: 'Database health check failed',
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }
}

// Create singleton instance
const databaseConnection = new DatabaseConnection();

module.exports = databaseConnection;
