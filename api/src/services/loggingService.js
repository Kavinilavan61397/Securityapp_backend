const fs = require('fs');
const path = require('path');
const winston = require('winston');
const DailyRotateFile = require('winston-daily-rotate-file');

/**
 * Logging Service
 * Comprehensive logging system with multiple transports and log levels
 */

class LoggingService {
  constructor() {
    this.logger = null;
    this.initializeLogger();
  }

  // Initialize Winston logger with multiple transports
  initializeLogger() {
    const logDir = path.join(__dirname, '../../logs');
    
    // Create logs directory if it doesn't exist
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }

    // Define log format
    const logFormat = winston.format.combine(
      winston.format.timestamp({
        format: 'YYYY-MM-DD HH:mm:ss'
      }),
      winston.format.errors({ stack: true }),
      winston.format.json(),
      winston.format.printf(({ timestamp, level, message, stack, ...meta }) => {
        let logMessage = `${timestamp} [${level.toUpperCase()}]: ${message}`;
        
        if (stack) {
          logMessage += `\n${stack}`;
        }
        
        if (Object.keys(meta).length > 0) {
          logMessage += `\n${JSON.stringify(meta, null, 2)}`;
        }
        
        return logMessage;
      })
    );

    // Define transports
    const transports = [
      // Console transport for development
      new winston.transports.Console({
        level: process.env.LOG_LEVEL || 'info',
        format: winston.format.combine(
          winston.format.colorize(),
          winston.format.simple()
        )
      }),

      // Combined log file (all levels)
      new DailyRotateFile({
        filename: path.join(logDir, 'combined-%DATE%.log'),
        datePattern: 'YYYY-MM-DD',
        maxSize: '20m',
        maxFiles: '14d',
        level: 'info'
      }),

      // Error log file (errors only)
      new DailyRotateFile({
        filename: path.join(logDir, 'error-%DATE%.log'),
        datePattern: 'YYYY-MM-DD',
        maxSize: '20m',
        maxFiles: '30d',
        level: 'error'
      }),

      // Access log file (HTTP requests)
      new DailyRotateFile({
        filename: path.join(logDir, 'access-%DATE%.log'),
        datePattern: 'YYYY-MM-DD',
        maxSize: '20m',
        maxFiles: '7d',
        level: 'http'
      }),

      // Security log file (security events)
      new DailyRotateFile({
        filename: path.join(logDir, 'security-%DATE%.log'),
        datePattern: 'YYYY-MM-DD',
        maxSize: '20m',
        maxFiles: '90d',
        level: 'security'
      })
    ];

    // Create logger
    this.logger = winston.createLogger({
      level: process.env.LOG_LEVEL || 'info',
      format: logFormat,
      transports,
      exitOnError: false
    });

    // Add custom log levels
    this.logger.add(new winston.transports.Console({
      level: 'http',
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    }));

    this.logger.add(new winston.transports.Console({
      level: 'security',
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    }));
  }

  // Log info message
  info(message, meta = {}) {
    this.logger.info(message, meta);
  }

  // Log error message
  error(message, error = null, meta = {}) {
    if (error) {
      meta.error = {
        message: error.message,
        stack: error.stack,
        name: error.name
      };
    }
    this.logger.error(message, meta);
  }

  // Log warning message
  warn(message, meta = {}) {
    this.logger.warn(message, meta);
  }

  // Log debug message
  debug(message, meta = {}) {
    this.logger.debug(message, meta);
  }

  // Log HTTP request
  http(req, res, responseTime) {
    const logData = {
      method: req.method,
      url: req.originalUrl,
      statusCode: res.statusCode,
      responseTime: `${responseTime}ms`,
      userAgent: req.get('User-Agent'),
      ip: req.ip || req.connection.remoteAddress,
      userId: req.user ? req.user.id : null,
      userRole: req.user ? req.user.role : null
    };

    this.logger.http('HTTP Request', logData);
  }

  // Log security event
  security(event, details = {}) {
    const logData = {
      event,
      timestamp: new Date().toISOString(),
      ...details
    };

    this.logger.security('Security Event', logData);
  }

  // Log authentication event
  auth(event, userId, details = {}) {
    this.security(`AUTH_${event}`, {
      userId,
      ...details
    });
  }

  // Log authorization event
  authorization(event, userId, resource, details = {}) {
    this.security(`AUTHZ_${event}`, {
      userId,
      resource,
      ...details
    });
  }

  // Log data access event
  dataAccess(event, userId, resource, details = {}) {
    this.security(`DATA_${event}`, {
      userId,
      resource,
      ...details
    });
  }

  // Log system event
  system(event, details = {}) {
    this.info(`SYSTEM_${event}`, details);
  }

  // Log business event
  business(event, details = {}) {
    this.info(`BUSINESS_${event}`, details);
  }

  // Log performance metrics
  performance(operation, duration, details = {}) {
    this.info(`PERFORMANCE_${operation}`, {
      duration: `${duration}ms`,
      ...details
    });
  }

  // Log database operation
  database(operation, collection, duration, details = {}) {
    this.debug(`DATABASE_${operation}`, {
      collection,
      duration: `${duration}ms`,
      ...details
    });
  }

  // Log API usage
  api(operation, endpoint, userId, details = {}) {
    this.info(`API_${operation}`, {
      endpoint,
      userId,
      ...details
    });
  }

  // Get logger instance
  getLogger() {
    return this.logger;
  }

  // Create child logger with additional context
  child(defaultMeta = {}) {
    return this.logger.child(defaultMeta);
  }
}

module.exports = new LoggingService();
