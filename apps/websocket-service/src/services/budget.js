/**
 * Budget Service for WebSocket
 * 
 * Handles budget-related WebSocket events and real-time updates
 */

export class BudgetService {
  constructor() {
    this.subscribers = new Map(); // orgId -> Set of WebSocket connections
  }

  /**
   * Subscribe to budget updates for an organization
   */
  subscribe(orgId, connection) {
    if (!this.subscribers.has(orgId)) {
      this.subscribers.set(orgId, new Set());
    }
    this.subscribers.get(orgId).add(connection);
    console.log(`📊 Budget subscription added for org: ${orgId}`);
  }

  /**
   * Unsubscribe from budget updates
   */
  unsubscribe(orgId, connection) {
    if (this.subscribers.has(orgId)) {
      this.subscribers.get(orgId).delete(connection);
      if (this.subscribers.get(orgId).size === 0) {
        this.subscribers.delete(orgId);
      }
      console.log(`📊 Budget subscription removed for org: ${orgId}`);
    }
  }

  /**
   * Emit budget update to all subscribers of an organization
   */
  async emitBudgetUpdate(orgId, budgetData) {
    const connections = this.subscribers.get(orgId);
    if (!connections || connections.size === 0) {
      console.log(`📊 No subscribers for org: ${orgId}`);
      return;
    }

    const event = {
      type: 'BUDGET_UPDATE',
      channel: `org:${orgId}:budget`,
      schema: 'budget.v1',
      idempotencyKey: `budget-${Date.now()}-${orgId}`,
      data: {
        orgId,
        ...budgetData,
        lastUpdate: new Date().toISOString(),
      },
    };

    let successCount = 0;
    let errorCount = 0;

    for (const connection of connections) {
      try {
        if (connection.ws && connection.ws.readyState === connection.ws.OPEN) {
          connection.ws.send(JSON.stringify(event));
          successCount++;
        } else {
          // Remove dead connections
          this.unsubscribe(orgId, connection);
        }
      } catch (error) {
        console.error(`❌ Error sending budget update to connection:`, error);
        errorCount++;
        // Remove failed connections
        this.unsubscribe(orgId, connection);
      }
    }

    console.log(`📊 Budget update sent to ${successCount} connections (${errorCount} errors) for org: ${orgId}`);
  }

  /**
   * Emit usage event to all subscribers of an organization
   */
  async emitUsageEvent(orgId, usageData) {
    const connections = this.subscribers.get(orgId);
    if (!connections || connections.size === 0) {
      return;
    }

    const event = {
      type: 'USAGE_UPDATE',
      channel: `org:${orgId}:usage`,
      schema: 'usage.v1',
      idempotencyKey: `usage-${Date.now()}-${orgId}`,
      data: {
        orgId,
        ...usageData,
        timestamp: new Date().toISOString(),
      },
    };

    for (const connection of connections) {
      try {
        if (connection.ws && connection.ws.readyState === connection.ws.OPEN) {
          connection.ws.send(JSON.stringify(event));
        } else {
          this.unsubscribe(orgId, connection);
        }
      } catch (error) {
        console.error(`❌ Error sending usage update:`, error);
        this.unsubscribe(orgId, connection);
      }
    }
  }

  /**
   * Get subscription statistics
   */
  getStats() {
    const stats = {
      totalSubscriptions: 0,
      orgSubscriptions: {},
    };

    for (const [orgId, connections] of this.subscribers) {
      stats.orgSubscriptions[orgId] = connections.size;
      stats.totalSubscriptions += connections.size;
    }

    return stats;
  }

  /**
   * Clean up dead connections
   */
  cleanup() {
    for (const [orgId, connections] of this.subscribers) {
      const deadConnections = [];
      
      for (const connection of connections) {
        if (!connection.ws || connection.ws.readyState !== connection.ws.OPEN) {
          deadConnections.push(connection);
        }
      }

      deadConnections.forEach(conn => connections.delete(conn));
      
      if (connections.size === 0) {
        this.subscribers.delete(orgId);
      }
    }
  }
}
