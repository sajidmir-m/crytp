const jwt = require('jsonwebtoken');
const config = require('../config/config');
const User = require('../models/user.model');
const GameService = require('../services/game.service');

/**
 * Setup WebSocket server
 * @param {Object} io - Socket.IO server instance
 */
const setupWebSocket = (io) => {
  // Middleware to authenticate WebSocket connections
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      
      if (!token) {
        return next(new Error('Authentication required'));
      }
      
      // Verify token
      const decoded = jwt.verify(token, config.jwt.secret);
      
      // Check if user exists
      const user = await User.findById(decoded.userId);
      
      if (!user) {
        return next(new Error('User not found'));
      }
      
      // Attach user to socket
      socket.user = {
        _id: user._id,
        email: user.email,
        username: user.username
      };
      
      next();
    } catch (error) {
      console.error('WebSocket authentication error:', error.message);
      next(new Error('Authentication failed'));
    }
  });

  // Handle connections
  io.on('connection', (socket) => {
    console.log(`User connected: ${socket.user.username} (${socket.id})`);
    
    // Send current game state to the connected client
    const gameService = socket.gameService;
    if (gameService) {
      socket.emit('game:state', gameService.getGameState());
    }
    
    // Handle cashout requests
    socket.on('game:cashout', async () => {
      try {
        if (!socket.user) {
          socket.emit('error', { message: 'Authentication required' });
          return;
        }
        // Use the singleton instance
        const GameService = require('../services/game.service');
        const gameService = GameService.instance;
        if (!gameService) {
          socket.emit('error', { message: 'Game service not available' });
          return;
        }
        // Process cashout
        const result = await gameService.cashOut(socket.user._id.toString());
        // Send confirmation to the client
        socket.emit('game:cashout:success', result);
      } catch (error) {
        console.error('Cashout error:', error.message);
        socket.emit('error', { message: error.message });
      }
    });
    
    // Handle disconnections
    socket.on('disconnect', () => {
      console.log(`User disconnected: ${socket.user.username} (${socket.id})`);
    });
  });

  return io;
};

module.exports = setupWebSocket;