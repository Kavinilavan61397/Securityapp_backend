const os = require('os');
const process = require('process');
const mongoose = require('mongoose');

/**
 * System Monitoring Service
 * Comprehensive system health monitoring and metrics collection
 */

class MonitoringService {
  constructor() {
    this.metrics = {
      startTime: Date.now(),
      requestCount: 0,
      errorCount: 0,
      responseTimes: [],
      memoryUsage: [],
      cpuUsage: []
    };
    
    this.startMonitoring();
  }

  // Start system monitoring
  startMonitoring() {
    // Monitor memory usage every 5 minutes
    setInterval(() => {
      this.collectMemoryMetrics();
    }, 5 * 60 * 1000);

    // Monitor CPU usage every 5 minutes
    setInterval(() => {
      this.collectCPUMetrics();
    }, 5 * 60 * 1000);

    // Clean up old metrics every hour
    setInterval(() => {
      this.cleanupMetrics();
    }, 60 * 60 * 1000);
  }

  // Collect memory metrics
  collectMemoryMetrics() {
    const memUsage = process.memoryUsage();
    const systemMem = {
      total: os.totalmem(),
      free: os.freemem(),
      used: os.totalmem() - os.freemem()
    };

    this.metrics.memoryUsage.push({
      timestamp: Date.now(),
      process: {
        rss: memUsage.rss,
        heapTotal: memUsage.heapTotal,
        heapUsed: memUsage.heapUsed,
        external: memUsage.external,
        arrayBuffers: memUsage.arrayBuffers
      },
      system: systemMem
    });

    // Keep only last 100 entries
    if (this.metrics.memoryUsage.length > 100) {
      this.metrics.memoryUsage = this.metrics.memoryUsage.slice(-100);
    }
  }

  // Collect CPU metrics
  collectCPUMetrics() {
    const cpus = os.cpus();
    const loadAvg = os.loadavg();
    
    this.metrics.cpuUsage.push({
      timestamp: Date.now(),
      loadAverage: {
        '1min': loadAvg[0],
        '5min': loadAvg[1],
        '15min': loadAvg[2]
      },
      cpuCount: cpus.length,
      cpuModel: cpus[0]?.model || 'Unknown'
    });

    // Keep only last 100 entries
    if (this.metrics.cpuUsage.length > 100) {
      this.metrics.cpuUsage = this.metrics.cpuUsage.slice(-100);
    }
  }

  // Record request metrics
  recordRequest(responseTime, statusCode) {
    this.metrics.requestCount++;
    
    if (statusCode >= 400) {
      this.metrics.errorCount++;
    }

    this.metrics.responseTimes.push({
      timestamp: Date.now(),
      responseTime,
      statusCode
    });

    // Keep only last 1000 entries
    if (this.metrics.responseTimes.length > 1000) {
      this.metrics.responseTimes = this.metrics.responseTimes.slice(-1000);
    }
  }

  // Get system health status
  getSystemHealth() {
    const uptime = Date.now() - this.metrics.startTime;
    const memUsage = process.memoryUsage();
    const loadAvg = os.loadavg();

    // Calculate average response time
    const avgResponseTime = this.metrics.responseTimes.length > 0
      ? this.metrics.responseTimes.reduce((sum, req) => sum + req.responseTime, 0) / this.metrics.responseTimes.length
      : 0;

    // Calculate error rate
    const errorRate = this.metrics.requestCount > 0
      ? (this.metrics.errorCount / this.metrics.requestCount) * 100
      : 0;

    // Get database status
    const dbStatus = this.getDatabaseStatus();

    return {
      status: this.determineOverallStatus(loadAvg, memUsage, errorRate),
      uptime: {
        milliseconds: uptime,
        seconds: Math.floor(uptime / 1000),
        minutes: Math.floor(uptime / (1000 * 60)),
        hours: Math.floor(uptime / (1000 * 60 * 60)),
        days: Math.floor(uptime / (1000 * 60 * 60 * 24))
      },
      requests: {
        total: this.metrics.requestCount,
        errors: this.metrics.errorCount,
        errorRate: parseFloat(errorRate.toFixed(2)),
        averageResponseTime: parseFloat(avgResponseTime.toFixed(2))
      },
      memory: {
        process: {
          rss: memUsage.rss,
          heapTotal: memUsage.heapTotal,
          heapUsed: memUsage.heapUsed,
          external: memUsage.external,
          arrayBuffers: memUsage.arrayBuffers
        },
        system: {
          total: os.totalmem(),
          free: os.freemem(),
          used: os.totalmem() - os.freemem(),
          usagePercent: parseFloat(((os.totalmem() - os.freemem()) / os.totalmem() * 100).toFixed(2))
        }
      },
      cpu: {
        loadAverage: {
          '1min': parseFloat(loadAvg[0].toFixed(2)),
          '5min': parseFloat(loadAvg[1].toFixed(2)),
          '15min': parseFloat(loadAvg[2].toFixed(2))
        },
        count: os.cpus().length
      },
      database: dbStatus,
      timestamp: new Date().toISOString()
    };
  }

  // Get database status
  getDatabaseStatus() {
    const connection = mongoose.connection;
    
    return {
      status: connection.readyState === 1 ? 'connected' : 'disconnected',
      readyState: connection.readyState,
      host: connection.host,
      port: connection.port,
      name: connection.name,
      collections: Object.keys(connection.collections).length
    };
  }

  // Determine overall system status
  determineOverallStatus(loadAvg, memUsage, errorRate) {
    const memUsagePercent = (memUsage.heapUsed / memUsage.heapTotal) * 100;
    
    // Critical conditions
    if (errorRate > 10 || memUsagePercent > 90 || loadAvg[0] > os.cpus().length * 2) {
      return 'critical';
    }
    
    // Warning conditions
    if (errorRate > 5 || memUsagePercent > 80 || loadAvg[0] > os.cpus().length) {
      return 'warning';
    }
    
    // Healthy
    return 'healthy';
  }

  // Get performance metrics
  getPerformanceMetrics() {
    const recentRequests = this.metrics.responseTimes.slice(-100); // Last 100 requests
    
    if (recentRequests.length === 0) {
      return {
        averageResponseTime: 0,
        minResponseTime: 0,
        maxResponseTime: 0,
        p95ResponseTime: 0,
        p99ResponseTime: 0,
        requestsPerMinute: 0
      };
    }

    const responseTimes = recentRequests.map(req => req.responseTime).sort((a, b) => a - b);
    const avgResponseTime = responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length;
    const p95Index = Math.floor(responseTimes.length * 0.95);
    const p99Index = Math.floor(responseTimes.length * 0.99);

    // Calculate requests per minute
    const now = Date.now();
    const oneMinuteAgo = now - (60 * 1000);
    const requestsLastMinute = recentRequests.filter(req => req.timestamp > oneMinuteAgo).length;

    return {
      averageResponseTime: parseFloat(avgResponseTime.toFixed(2)),
      minResponseTime: responseTimes[0],
      maxResponseTime: responseTimes[responseTimes.length - 1],
      p95ResponseTime: responseTimes[p95Index],
      p99ResponseTime: responseTimes[p99Index],
      requestsPerMinute: requestsLastMinute
    };
  }

  // Get memory trends
  getMemoryTrends() {
    return {
      process: this.metrics.memoryUsage.slice(-24), // Last 24 data points (2 hours)
      system: this.metrics.memoryUsage.slice(-24)
    };
  }

  // Get CPU trends
  getCPUTrends() {
    return this.metrics.cpuUsage.slice(-24); // Last 24 data points (2 hours)
  }

  // Get error analysis
  getErrorAnalysis() {
    const recentErrors = this.metrics.responseTimes
      .filter(req => req.statusCode >= 400)
      .slice(-50); // Last 50 errors

    const errorCounts = {};
    recentErrors.forEach(error => {
      errorCounts[error.statusCode] = (errorCounts[error.statusCode] || 0) + 1;
    });

    return {
      totalErrors: recentErrors.length,
      errorBreakdown: errorCounts,
      recentErrors: recentErrors.slice(-10) // Last 10 errors
    };
  }

  // Clean up old metrics
  cleanupMetrics() {
    const oneHourAgo = Date.now() - (60 * 60 * 1000);
    
    // Clean up response times older than 1 hour
    this.metrics.responseTimes = this.metrics.responseTimes.filter(
      req => req.timestamp > oneHourAgo
    );
  }

  // Get comprehensive system report
  getSystemReport() {
    return {
      health: this.getSystemHealth(),
      performance: this.getPerformanceMetrics(),
      memory: this.getMemoryTrends(),
      cpu: this.getCPUTrends(),
      errors: this.getErrorAnalysis(),
      timestamp: new Date().toISOString()
    };
  }

  // Reset metrics (for testing)
  resetMetrics() {
    this.metrics = {
      startTime: Date.now(),
      requestCount: 0,
      errorCount: 0,
      responseTimes: [],
      memoryUsage: [],
      cpuUsage: []
    };
  }
}

module.exports = new MonitoringService();
