/**
 * Health Service for WebSocket service monitoring
 * 
 * Provides health checks, metrics, and monitoring capabilities
 * for the GovernsAI WebSocket service.
 */
export class HealthService {
  constructor() {
    this.startTime = Date.now();
    this.metrics = {
      connections: {
        total: 0,
        active: 0,
        peak: 0
      },
      messages: {
        received: 0,
        sent: 0,
        errors: 0
      },
      decisions: {
        processed: 0,
        duplicates: 0,
        errors: 0
      },
      organizations: new Set()
    };
    
    this.connectionHistory = [];
    this.messageHistory = [];
    this.maxHistorySize = 1000;
  }

  /**
   * Get current health status
   */
  getStatus() {
    const uptime = Date.now() - this.startTime;
    const memoryUsage = process.memoryUsage();
    
    return {
      status: this.determineOverallHealth(),
      timestamp: new Date().toISOString(),
      uptime: {
        seconds: Math.floor(uptime / 1000),
        human: this.formatUptime(uptime)
      },
      service: {
        name: 'GovernsAI WebSocket Service',
        version: '1.0.0',
        pid: process.pid,
        node: process.version
      },
      metrics: {
        ...this.metrics,
        organizations: this.metrics.organizations.size
      },
      memory: {
        rss: Math.round(memoryUsage.rss / 1024 / 1024),
        heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024),
        heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024),
        external: Math.round(memoryUsage.external / 1024 / 1024)
      },
      performance: {
        connectionsPerSecond: this.calculateConnectionRate(),
        messagesPerSecond: this.calculateMessageRate(),
        avgResponseTime: this.calculateAvgResponseTime()
      }
    };
  }

  /**
   * Determine overall health status
   */
  determineOverallHealth() {
    const memoryUsage = process.memoryUsage();
    const heapUsedMB = memoryUsage.heapUsed / 1024 / 1024;
    const errorRate = this.metrics.messages.errors / (this.metrics.messages.received || 1);

    // Check memory usage (unhealthy if > 1GB heap)
    if (heapUsedMB > 1024) {
      return 'unhealthy';
    }

    // Check error rate (unhealthy if > 10% errors)
    if (errorRate > 0.1) {
      return 'unhealthy';
    }

    // Check if service is responsive
    if (this.metrics.connections.active > 0 && this.calculateMessageRate() === 0) {
      return 'degraded';
    }

    return 'healthy';
  }

  /**
   * Record new connection
   */
  recordConnection(connectionId, orgId) {
    this.metrics.connections.total++;
    this.metrics.connections.active++;
    this.metrics.organizations.add(orgId);
    
    if (this.metrics.connections.active > this.metrics.connections.peak) {
      this.metrics.connections.peak = this.metrics.connections.active;
    }

    this.addToHistory(this.connectionHistory, {
      type: 'connect',
      connectionId,
      orgId,
      timestamp: Date.now()
    });
  }

  /**
   * Record connection disconnection
   */
  recordDisconnection(connectionId) {
    this.metrics.connections.active = Math.max(0, this.metrics.connections.active - 1);
    
    this.addToHistory(this.connectionHistory, {
      type: 'disconnect',
      connectionId,
      timestamp: Date.now()
    });
  }

  /**
   * Record message received
   */
  recordMessageReceived(messageType, connectionId) {
    this.metrics.messages.received++;
    
    this.addToHistory(this.messageHistory, {
      type: 'received',
      messageType,
      connectionId,
      timestamp: Date.now()
    });
  }

  /**
   * Record message sent
   */
  recordMessageSent(messageType, connectionId) {
    this.metrics.messages.sent++;
    
    this.addToHistory(this.messageHistory, {
      type: 'sent',
      messageType,
      connectionId,
      timestamp: Date.now()
    });
  }

  /**
   * Record message error
   */
  recordMessageError(error, connectionId) {
    this.metrics.messages.errors++;
    
    this.addToHistory(this.messageHistory, {
      type: 'error',
      error: error.message,
      connectionId,
      timestamp: Date.now()
    });
  }

  /**
   * Record decision processed
   */
  recordDecisionProcessed(decisionId, isDuplicate = false) {
    if (isDuplicate) {
      this.metrics.decisions.duplicates++;
    } else {
      this.metrics.decisions.processed++;
    }
  }

  /**
   * Record decision error
   */
  recordDecisionError(error) {
    this.metrics.decisions.errors++;
  }

  /**
   * Calculate connection rate (connections per second)
   */
  calculateConnectionRate() {
    const recentConnections = this.getRecentEvents(this.connectionHistory, 60000); // Last minute
    return recentConnections.length / 60;
  }

  /**
   * Calculate message rate (messages per second)
   */
  calculateMessageRate() {
    const recentMessages = this.getRecentEvents(this.messageHistory, 60000); // Last minute
    return recentMessages.length / 60;
  }

  /**
   * Calculate average response time
   */
  calculateAvgResponseTime() {
    // This would require tracking request/response pairs
    // For now, return a placeholder
    return 0;
  }

  /**
   * Get recent events from history
   */
  getRecentEvents(history, timeWindowMs) {
    const cutoff = Date.now() - timeWindowMs;
    return history.filter(event => event.timestamp > cutoff);
  }

  /**
   * Add event to history with size limit
   */
  addToHistory(history, event) {
    history.push(event);
    
    if (history.length > this.maxHistorySize) {
      history.shift(); // Remove oldest event
    }
  }

  /**
   * Format uptime for human readability
   */
  formatUptime(uptimeMs) {
    const seconds = Math.floor(uptimeMs / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) {
      return `${days}d ${hours % 24}h ${minutes % 60}m`;
    } else if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  }

  /**
   * Get detailed metrics
   */
  getDetailedMetrics() {
    return {
      ...this.getStatus(),
      history: {
        connections: this.connectionHistory.slice(-100), // Last 100 connection events
        messages: this.messageHistory.slice(-100) // Last 100 message events
      },
      organizations: Array.from(this.metrics.organizations)
    };
  }

  /**
   * Reset metrics (useful for testing)
   */
  resetMetrics() {
    this.metrics = {
      connections: {
        total: 0,
        active: 0,
        peak: 0
      },
      messages: {
        received: 0,
        sent: 0,
        errors: 0
      },
      decisions: {
        processed: 0,
        duplicates: 0,
        errors: 0
      },
      organizations: new Set()
    };
    
    this.connectionHistory = [];
    this.messageHistory = [];
    this.startTime = Date.now();
  }

  /**
   * Get system resource usage
   */
  getResourceUsage() {
    const memoryUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();
    
    return {
      memory: {
        rss: memoryUsage.rss,
        heapTotal: memoryUsage.heapTotal,
        heapUsed: memoryUsage.heapUsed,
        external: memoryUsage.external,
        arrayBuffers: memoryUsage.arrayBuffers
      },
      cpu: {
        user: cpuUsage.user,
        system: cpuUsage.system
      },
      process: {
        pid: process.pid,
        ppid: process.ppid,
        platform: process.platform,
        arch: process.arch,
        version: process.version,
        uptime: process.uptime()
      }
    };
  }

  /**
   * Check if service is ready to accept connections
   */
  isReady() {
    const status = this.getStatus();
    return status.status === 'healthy' || status.status === 'degraded';
  }

  /**
   * Check if service is alive
   */
  isAlive() {
    return true; // If this method is called, the service is alive
  }

  /**
   * Get health check endpoints info
   */
  getHealthEndpoints() {
    return {
      '/health': 'Basic health status',
      '/health/ready': 'Readiness probe',
      '/health/live': 'Liveness probe',
      '/health/metrics': 'Detailed metrics'
    };
  }
}
