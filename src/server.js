const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

// Import routes
const authRoutes = require('./routes/auth.routes');
const gameRoutes = require('./routes/game.routes');
const walletRoutes = require('./routes/wallet.routes');

// Import WebSocket handler
const setupWebSocket = require('./websocket/socket');

// Import game service
const GameService = require('./services/game.service');

// Create Express app
const app = express();
const server = http.createServer(app);

// Configure CORS for production and development
const defaultOrigins = [
  'http://localhost:3000',
  'http://localhost:5000',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:5000',
  'https://crypto-crash.vercel.app'
];

// Use ALLOWED_ORIGINS from environment variables if available
const allowedOrigins = process.env.ALLOWED_ORIGINS 
  ? process.env.ALLOWED_ORIGINS.split(',') 
  : defaultOrigins;

// Configure Socket.IO with CORS
const io = new Server(server, {
  cors: {
    origin: function(origin, callback) {
      // Allow requests with no origin (like mobile apps, curl, etc)
      if (!origin) return callback(null, true);
      
      if (allowedOrigins.indexOf(origin) === -1) {
        // For development, allow all origins
        if (process.env.NODE_ENV !== 'production') {
          return callback(null, true);
        }
        return callback(null, allowedOrigins);
      }
      return callback(null, true);
    },
    methods: ['GET', 'POST'],
    credentials: true
  },
  transports: ['websocket', 'polling']
});

// Middleware
app.use(cors({
  origin: function(origin, callback) {
    // Allow requests with no origin (like mobile apps, curl, etc)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) === -1) {
      // For development, allow all origins
      if (process.env.NODE_ENV !== 'production') {
        return callback(null, true);
      }
      return callback(null, allowedOrigins);
    }
    return callback(null, true);
  },
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/game', gameRoutes);
app.use('/api/wallet', walletRoutes);

// Setup WebSocket
setupWebSocket(io);

// Initialize game service
const gameService = new GameService(io);

// Set up singleton instance for WebSocket access
GameService.instance = gameService;

// Make game service available to routes
app.set('gameService', gameService);

// MongoDB Connection with retry logic
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/crypto-crash';
const connectWithRetry = () => {
  console.log('Attempting to connect to MongoDB...');
  
  // Configure mongoose for production
  mongoose.set('strictQuery', false);
  
  // Connection options
  const options = {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    serverSelectionTimeoutMS: 5000, // Timeout after 5s instead of 30s
    heartbeatFrequencyMS: 10000, // Default is 10000
    maxPoolSize: 10, // Maintain up to 10 socket connections
  };
  
  mongoose.connect(MONGODB_URI, options)
    .then(() => {
      console.log('Connected to MongoDB successfully');
      // Start game loop after MongoDB connection
      gameService.startGameLoop();
    })
    .catch(err => {
      console.error('MongoDB connection error:', err.message);
      console.log('Starting server without MongoDB connection. Some features will not work.');
      // Start game loop even without MongoDB connection
      gameService.startGameLoop();
      
      // Retry connection after delay if not in test mode
      if (process.env.NODE_ENV !== 'test') {
        console.log('Retrying MongoDB connection in 5 seconds...');
        setTimeout(connectWithRetry, 5000);
      }
    });
};

// Handle MongoDB connection events
mongoose.connection.on('error', (err) => {
  console.error('MongoDB connection error:', err);
});

mongoose.connection.on('disconnected', () => {
  console.log('MongoDB disconnected. Attempting to reconnect...');
  if (process.env.NODE_ENV !== 'test') {
    setTimeout(connectWithRetry, 5000);
  }
});

// Handle application termination
process.on('SIGINT', () => {
  mongoose.connection.close().then(() => {
    console.log('MongoDB connection closed due to app termination');
    process.exit(0);
  }).catch((err) => {
    console.error('Error closing MongoDB connection:', err);
    process.exit(1);
  });
});

// Initial connection attempt
connectWithRetry();

// Serve static files from the public directory
app.use(express.static('public'));

// Start server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// Health check endpoint for monitoring
app.get('/health', (req, res) => {
  const dbStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'crypto-crash-api',
    mongodb: dbStatus,
    uptime: process.uptime()
  });
});

// 404 handler
app.use((req, res, next) => {
  res.status(404).json({
    status: 'error',
    message: 'Resource not found',
    path: req.originalUrl
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(`[${new Date().toISOString()}] Error:`, err);
  
  // Handle specific error types
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      status: 'error',
      message: 'Validation Error',
      details: err.message
    });
  }
  
  if (err.name === 'UnauthorizedError' || err.message === 'Unauthorized') {
    return res.status(401).json({
      status: 'error',
      message: 'Unauthorized access',
    });
  }
  
  if (err.name === 'MongoError' || err.name === 'MongooseError') {
    return res.status(503).json({
      status: 'error',
      message: 'Database service unavailable',
    });
  }
  
  // Default error response
  const statusCode = err.statusCode || 500;
  res.status(statusCode).json({
    status: 'error',
    message: process.env.NODE_ENV === 'production' ? 'Something went wrong' : err.message || 'Internal Server Error'
  });
});