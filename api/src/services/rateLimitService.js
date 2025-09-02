const rateLimit = require('express-rate-limit');
const RedisStore = require('rate-limit-redis');
const Redis = require('redis');

/**
 * Rate Limiting Service
 * Advanced rate limiting with Redis support and role-based limits
 */

class RateLimitService {
  constructor() {
    this.redisClient = null;
    this.initializeRedis();
  }

  // Initialize Redis connection for distributed rate limiting
  initializeRedis() {
    if (process.env.REDIS_URL) {
      try {
        this.redisClient = Redis.createClient({
          url: process.env.REDIS_URL
        });

        this.redisClient.on('error', (err) => {
          console.error('Redis connection error:', err);
        });

        this.redisClient.on('connect', () => {
          console.log('Redis connected for rate limiting');
        });
      } catch (error) {
        console.error('Failed to initialize Redis:', error);
      }
    }
  }

  // Create rate limiter with Redis store
  createRateLimiter(options = {}) {
    const defaultOptions = {
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 100, // limit each IP to 100 requests per windowMs
      message: {
        success: false,
        message: 'Too many requests from this IP, please try again later.',
        retryAfter: Math.ceil(options.windowMs / 1000)
      },
      standardHeaders: true,
      legacyHeaders: false,
      skip: (req) => {
        // Skip rate limiting for health checks
        return req.path === '/health' || req.path === '/db-health';
      }
    };

    const limiterOptions = { ...defaultOptions, ...options };

    // Use Redis store if available, otherwise use memory store
    if (this.redisClient) {
      limiterOptions.store = new RedisStore({
        sendCommand: (...args) => this.redisClient.sendCommand(args),
      });
    }

    return rateLimit(limiterOptions);
  }

  // General API rate limiter
  getGeneralLimiter() {
    return this.createRateLimiter({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 100, // 100 requests per 15 minutes
      message: {
        success: false,
        message: 'Too many requests, please try again later.',
        retryAfter: 900
      }
    });
  }

  // Authentication rate limiter (stricter)
  getAuthLimiter() {
    return this.createRateLimiter({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 5, // 5 login attempts per 15 minutes
      message: {
        success: false,
        message: 'Too many authentication attempts, please try again later.',
        retryAfter: 900
      },
      skipSuccessfulRequests: true // Don't count successful requests
    });
  }

  // OTP rate limiter (very strict)
  getOTPLimiter() {
    return this.createRateLimiter({
      windowMs: 5 * 60 * 1000, // 5 minutes
      max: 3, // 3 OTP requests per 5 minutes
      message: {
        success: false,
        message: 'Too many OTP requests, please try again later.',
        retryAfter: 300
      }
    });
  }

  // Upload rate limiter
  getUploadLimiter() {
    return this.createRateLimiter({
      windowMs: 60 * 60 * 1000, // 1 hour
      max: 20, // 20 uploads per hour
      message: {
        success: false,
        message: 'Upload limit exceeded, please try again later.',
        retryAfter: 3600
      }
    });
  }

  // Role-based rate limiter
  getRoleBasedLimiter() {
    return rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: (req) => {
        // Different limits based on user role
        if (!req.user) return 10; // Unauthenticated users
        
        switch (req.user.role) {
          case 'SUPER_ADMIN':
            return 1000; // Very high limit for super admins
          case 'BUILDING_ADMIN':
            return 500; // High limit for building admins
          case 'SECURITY':
            return 200; // Medium limit for security
          case 'RESIDENT':
            return 100; // Standard limit for residents
          default:
            return 50; // Low limit for unknown roles
        }
      },
      keyGenerator: (req) => {
        // Use user ID if authenticated, otherwise IP
        return req.user ? `user:${req.user.id}` : `ip:${req.ip}`;
      },
      message: {
        success: false,
        message: 'Rate limit exceeded for your role, please try again later.',
        retryAfter: 900
      },
      standardHeaders: true,
      legacyHeaders: false,
      store: this.redisClient ? new RedisStore({
        sendCommand: (...args) => this.redisClient.sendCommand(args),
      }) : undefined
    });
  }

  // Endpoint-specific rate limiter
  getEndpointLimiter(endpoint, options = {}) {
    const endpointLimits = {
      '/api/auth/login': { max: 5, windowMs: 15 * 60 * 1000 },
      '/api/auth/register': { max: 3, windowMs: 60 * 60 * 1000 },
      '/api/auth/verify-otp': { max: 10, windowMs: 5 * 60 * 1000 },
      '/api/visitors': { max: 50, windowMs: 15 * 60 * 1000 },
      '/api/visits': { max: 100, windowMs: 15 * 60 * 1000 },
      '/api/notifications': { max: 200, windowMs: 15 * 60 * 1000 },
      '/api/photos/upload': { max: 10, windowMs: 60 * 60 * 1000 },
      '/api/analytics': { max: 20, windowMs: 15 * 60 * 1000 }
    };

    const limitConfig = endpointLimits[endpoint] || { max: 100, windowMs: 15 * 60 * 1000 };
    
    return this.createRateLimiter({
      ...limitConfig,
      ...options,
      message: {
        success: false,
        message: `Rate limit exceeded for ${endpoint}, please try again later.`,
        retryAfter: Math.ceil((limitConfig.windowMs || 15 * 60 * 1000) / 1000)
      }
    });
  }

  // Burst rate limiter (for short bursts of requests)
  getBurstLimiter() {
    return this.createRateLimiter({
      windowMs: 1 * 60 * 1000, // 1 minute
      max: 20, // 20 requests per minute
      message: {
        success: false,
        message: 'Burst rate limit exceeded, please slow down.',
        retryAfter: 60
      }
    });
  }

  // Daily rate limiter
  getDailyLimiter() {
    return this.createRateLimiter({
      windowMs: 24 * 60 * 60 * 1000, // 24 hours
      max: 1000, // 1000 requests per day
      message: {
        success: false,
        message: 'Daily rate limit exceeded, please try again tomorrow.',
        retryAfter: 86400
      }
    });
  }

  // Custom rate limiter with specific configuration
  createCustomLimiter(config) {
    return this.createRateLimiter(config);
  }

  // Get rate limit status for a key
  async getRateLimitStatus(key) {
    if (!this.redisClient) {
      return null; // Can't get status without Redis
    }

    try {
      const current = await this.redisClient.get(key);
      const ttl = await this.redisClient.ttl(key);
      
      return {
        current: current ? parseInt(current) : 0,
        ttl: ttl > 0 ? ttl : 0,
        remaining: Math.max(0, 100 - (current ? parseInt(current) : 0)) // Assuming max 100
      };
    } catch (error) {
      console.error('Error getting rate limit status:', error);
      return null;
    }
  }

  // Reset rate limit for a key
  async resetRateLimit(key) {
    if (!this.redisClient) {
      return false;
    }

    try {
      await this.redisClient.del(key);
      return true;
    } catch (error) {
      console.error('Error resetting rate limit:', error);
      return false;
    }
  }

  // Get Redis client
  getRedisClient() {
    return this.redisClient;
  }

  // Close Redis connection
  async close() {
    if (this.redisClient) {
      await this.redisClient.quit();
    }
  }
}

module.exports = new RateLimitService();
