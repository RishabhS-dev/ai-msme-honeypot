const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const bodyParser = require('body-parser');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
require('dotenv').config();

// Import routes
const apiRoutes = require('./routes/api');
const alertRoutes = require('./routes/alerts');
const honeypotRoutes = require('./routes/honeypots');

// Import services
const ElasticsearchService = require('./services/elasticsearch');
const HoneypotManager = require('./services/honeypot-manager');
const AlertService = require('./services/alert-service');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || "http://localhost:3000",
  credentials: true
}));
app.use(morgan('combined'));
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '10mb' }));

// Global variables for services
let esService, honeypotManager, alertService;

// Initialize services
async function initializeServices() {
  try {
    // Initialize Elasticsearch connection
    esService = new ElasticsearchService({
      node: process.env.ELASTICSEARCH_URL || 'http://localhost:9200',
      auth: {
        username: process.env.ES_USERNAME || 'elastic',
        password: process.env.ES_PASSWORD || 'changeme'
      }
    });
    
    await esService.connect();
    console.log('✅ Elasticsearch connected');

    // Initialize Honeypot Manager
    honeypotManager = new HoneypotManager(io);
    await honeypotManager.initialize();
    console.log('✅ Honeypot Manager initialized');

    // Initialize Alert Service
    alertService = new AlertService(io, {
      email: {
        service: 'gmail',
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      },
      sms: {
        accountSid: process.env.TWILIO_SID,
        authToken: process.env.TWILIO_TOKEN,
        fromNumber: process.env.TWILIO_FROM
      }
    });
    console.log('✅ Alert Service initialized');

    // Make services available globally
    app.locals.esService = esService;
    app.locals.honeypotManager = honeypotManager;
    app.locals.alertService = alertService;
    app.locals.io = io;

  } catch (error) {
    console.error('❌ Service initialization failed:', error);
    process.exit(1);
  }
}

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log(`🔌 Client connected: ${socket.id}`);
  
  socket.on('subscribe-attacks', () => {
    socket.join('attack-feed');
    console.log(`📡 Client ${socket.id} subscribed to attack feed`);
  });

  socket.on('subscribe-alerts', () => {
    socket.join('alert-feed');
    console.log(`🚨 Client ${socket.id} subscribed to alert feed`);
  });

  socket.on('disconnect', () => {
    console.log(`🔌 Client disconnected: ${socket.id}`);
  });
});

// API Routes
app.use('/api', apiRoutes);
app.use('/api/alerts', alertRoutes);
app.use('/api/honeypots', honeypotRoutes);

// Health check endpoint
app.get('/health', async (req, res) => {
  try {
    const status = {
      timestamp: new Date().toISOString(),
      status: 'healthy',
      services: {
        elasticsearch: await esService?.isConnected() || false,
        honeypots: honeypotManager?.getStatus() || 'unknown',
        alerts: alertService?.isReady() || false
      }
    };
    res.json(status);
  } catch (error) {
    res.status(500).json({
      status: 'unhealthy',
      error: error.message
    });
  }
});

// Real-time log processing
async function startLogProcessor() {
  if (!esService) return;
  
  setInterval(async () => {
    try {
      // Query recent logs from Elasticsearch
      const recentLogs = await esService.getRecentLogs(60); // Last 60 seconds
      
      if (recentLogs && recentLogs.length > 0) {
        // Process logs with AI engine
        const processedData = await processLogsWithAI(recentLogs);
        
        // Emit real-time updates to connected clients
        io.to('attack-feed').emit('new-attacks', processedData.attacks);
        
        // Check for critical threats and trigger alerts
        const criticalThreats = processedData.threats.filter(t => t.severity === 'critical');
        if (criticalThreats.length > 0) {
          for (const threat of criticalThreats) {
            await alertService.sendAlert(threat);
            io.to('alert-feed').emit('critical-alert', threat);
          }
        }

        // Trigger dynamic honeypot adaptation if needed
        const adaptationNeeded = processedData.recommendations.filter(r => r.type === 'adapt');
        if (adaptationNeeded.length > 0) {
          for (const recommendation of adaptationNeeded) {
            await honeypotManager.adaptNetwork(recommendation);
          }
        }
      }
    } catch (error) {
      console.error('❌ Log processing error:', error);
    }
  }, 5000); // Process every 5 seconds
}

// AI Processing function (calls Python AI engine)
async function processLogsWithAI(logs) {
  const { spawn } = require('child_process');
  
  return new Promise((resolve, reject) => {
    const pythonProcess = spawn('python', ['./ai-engine/analyzer.py'], {
      stdio: ['pipe', 'pipe', 'pipe']
    });

    let result = '';
    let error = '';

    pythonProcess.stdout.on('data', (data) => {
      result += data.toString();
    });

    pythonProcess.stderr.on('data', (data) => {
      error += data.toString();
    });

    pythonProcess.on('close', (code) => {
      if (code === 0) {
        try {
          const parsedResult = JSON.parse(result);
          resolve(parsedResult);
        } catch (parseError) {
          reject(new Error(`Failed to parse AI engine output: ${parseError.message}`));
        }
      } else {
        reject(new Error(`AI engine failed with code ${code}: ${error}`));
      }
    });

    pythonProcess.stdin.write(JSON.stringify(logs));
    pythonProcess.stdin.end();
  });
}

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('❌ Server error:', error);
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Route not found',
    path: req.originalUrl
  });
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('🔄 Received SIGTERM, shutting down gracefully');
  server.close(async () => {
    if (esService) await esService.disconnect();
    if (honeypotManager) await honeypotManager.cleanup();
    process.exit(0);
  });
});

// Start server
const PORT = process.env.PORT || 5000;

async function startServer() {
  await initializeServices();
  await startLogProcessor();
  
  server.listen(PORT, () => {
    console.log(`🚀 AI Honeypot Server running on port ${PORT}`);
    console.log(`📊 Dashboard available at: http://localhost:${PORT}`);
    console.log(`🔗 Frontend should connect to: http://localhost:${PORT}`);
  });
}

startServer().catch(error => {
  console.error('❌ Failed to start server:', error);
  process.exit(1);
});

module.exports = app;