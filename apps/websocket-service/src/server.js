import { WebSocketServer } from 'ws';
import express from 'express';
import { createServer } from 'http';
import cors from 'cors';
import dotenv from 'dotenv';
import { SimpleWebSocketHandler } from './websocket/simple-handler.js';
import { AuthService } from './services/auth.js';
import { DecisionService } from './services/decision.js';
import { HealthService } from './services/health.js';
import { BudgetService } from './services/budget.js';
import { installStructuredConsoleLogging } from './logging/structured-console.js';

// Load environment variables
dotenv.config();
installStructuredConsoleLogging();

/**
 * GovernsAI WebSocket Service
 * 
 * A standalone service for handling real-time AI governance decisions
 * via WebSocket connections. Supports precheck/postcheck workflows.
 */
class GovernsWebSocketService {
  constructor() {
    this.port = process.env.PORT || 3000;
    this.app = express();
    this.server = createServer(this.app);
    this.wss = null;
    this.wsHandler = null;
    
    // Initialize services
    this.authService = new AuthService();
    this.decisionService = new DecisionService();
    this.healthService = new HealthService();
    this.budgetService = new BudgetService();
  }

  /**
   * Initialize the service
   */
  async initialize() {
    try {
      console.log('🚀 Initializing GovernsAI WebSocket Service...');
      
      // Setup Express middleware
      this.setupExpress();
      
      // Setup HTTP routes
      this.setupRoutes();
      
      // Setup WebSocket server
      this.setupWebSocket();
      
      // Setup graceful shutdown
      this.setupGracefulShutdown();
      
      console.log('✅ Service initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize service:', error);
      process.exit(1);
    }
  }

  /**
   * Setup Express middleware
   */
  setupExpress() {
    // CORS configuration
    const allowedOrigins = process.env.ALLOWED_ORIGINS
      ? process.env.ALLOWED_ORIGINS.split(',').map(origin => origin.trim())
      : ['http://localhost:3002', 'http://localhost:3000'];

    this.app.use(cors({
      origin: allowedOrigins,
      credentials: true
    }));
    
    // JSON parsing
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true }));
    
    // Request logging
    this.app.use((req, res, next) => {
      console.log(`📡 ${req.method} ${req.path} - ${req.ip}`);
      next();
    });
  }

  /**
   * Setup HTTP routes
   */
  setupRoutes() {
    // Health check endpoint
    this.app.get('/health', (req, res) => {
      const health = this.healthService.getStatus();
      res.status(health.status === 'healthy' ? 200 : 503).json(health);
    });

    // Service info endpoint
    this.app.get('/info', (req, res) => {
      res.json({
        service: 'GovernsAI WebSocket Service',
        version: '1.0.0',
        uptime: process.uptime(),
        connections: this.wsHandler?.getConnectionCount() || 0,
        environment: process.env.NODE_ENV || 'development',
        features: [
          'Real-time decision streaming',
          'Precheck/postcheck support',
          'Channel-based routing',
          'API key authentication',
          'Message persistence'
        ]
      });
    });

    // WebSocket connection endpoint info
    this.app.get('/ws', (req, res) => {
      console.log('🔌 WebSocket connection endpoint info');
      console.log(`🔌 Host: ${req.get('host')}`);
      console.log(`🔌 Environment: ${process.env.NODE_ENV}`);
      console.log(`🔌 CORS Origins: ${process.env.ALLOWED_ORIGINS}`);
      // Security: Never log sensitive environment variables (JWT_SECRET, DATABASE_URL, etc.)
      res.json({
        websocket: {
          url: `ws${process.env.NODE_ENV === 'production' ? 's' : ''}://${req.get('host')}/ws`,
          protocols: ['governs-v1'],
          authentication: 'API key via query parameter',
          channels: [
            'org:{orgId}:decisions',
            'user:{userId}:notifications',
            'key:{keyId}:usage'
          ],
          messageTypes: [
            'INGEST - Send decision data',
            'SUB - Subscribe to channels', 
            'UNSUB - Unsubscribe from channels',
            'PING - Heartbeat'
          ]
        }
      });
    });

    // API endpoints for dashboard integration
    this.app.get('/api/connections', async (req, res) => {
      try {
        const { orgId } = req.query;
        const connections = await this.wsHandler?.getConnectionsByOrg(orgId);
        res.json({ success: true, connections: connections || [] });
      } catch (error) {
        console.error('Error fetching connections:', error);
        res.status(500).json({ success: false, error: 'Internal server error' });
      }
    });

    // 404 handler
    this.app.use('*', (req, res) => {
      res.status(404).json({
        error: 'Endpoint not found',
        message: 'This is the GovernsAI WebSocket Service. Use /ws for WebSocket connections.',
        endpoints: ['/health', '/info', '/ws', '/api/connections']
      });
    });
  }

  /**
   * Setup WebSocket server
   */
  setupWebSocket() {
    // Create WebSocket server
    this.wss = new WebSocketServer({
      server: this.server,
      path: '/ws',
      protocols: ['governs-v1'],
      perMessageDeflate: true,
      maxPayload: 1024 * 1024 // 1MB max message size
    });

    // Initialize simplified WebSocket handler
    this.wsHandler = new SimpleWebSocketHandler({
      authService: this.authService,
      decisionService: this.decisionService,
      healthService: this.healthService,
      budgetService: this.budgetService
    });

    // Handle new WebSocket connections
    this.wss.on('connection', (ws, req) => {
      this.wsHandler.handleConnection(ws, req);
    });

    console.log('🔌 WebSocket server configured on /ws');
  }

  /**
   * Setup graceful shutdown
   */
  setupGracefulShutdown() {
    const shutdown = async (signal) => {
      console.log(`\n🛑 Received ${signal}, shutting down gracefully...`);
      
      try {
        // Close WebSocket connections
        if (this.wsHandler) {
          await this.wsHandler.shutdown();
        }
        
        // Close WebSocket server
        if (this.wss) {
          this.wss.close();
        }
        
        // Close HTTP server
        this.server.close(() => {
          console.log('✅ HTTP server closed');
        });
        
        // Close database connections
        await this.decisionService.disconnect();
        
        console.log('✅ Graceful shutdown completed');
        process.exit(0);
      } catch (error) {
        console.error('❌ Error during shutdown:', error);
        process.exit(1);
      }
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGUSR2', () => shutdown('SIGUSR2')); // For nodemon
  }

  /**
   * Start the service
   */
  async start() {
    try {
      await this.initialize();
      
      this.server.listen(this.port, () => {
        console.log('');
        console.log('🌟 GovernsAI WebSocket Service Started!');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log(`📡 HTTP Server: http://localhost:${this.port}`);
        console.log(`🔌 WebSocket: ws://localhost:${this.port}/ws`);
        console.log(`🏥 Health Check: http://localhost:${this.port}/health`);
        console.log(`📊 Service Info: http://localhost:${this.port}/info`);
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
        console.log(`📝 Process ID: ${process.pid}`);
        console.log('');
      });
    } catch (error) {
      console.error('❌ Failed to start service:', error);
      process.exit(1);
    }
  }
}

// Start the service if this file is run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const service = new GovernsWebSocketService();
  service.start().catch(console.error);
}

export { GovernsWebSocketService };
