const GameService = require('../services/game.service');

/**
 * Place a bet
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const placeBet = async (req, res) => {
  try {
    const { usdAmount, currency } = req.body;
    const userId = req.user._id;
    
    // Validate input
    if (!usdAmount || !currency) {
      return res.status(400).json({ message: 'USD amount and currency are required' });
    }
    
    if (usdAmount <= 0) {
      return res.status(400).json({ message: 'Bet amount must be greater than 0' });
    }
    
    // Get game service instance
    const gameService = req.app.get('gameService');
    
    if (!gameService) {
      return res.status(500).json({ message: 'Game service not available' });
    }
    
    try {
      // Place bet
      const result = await gameService.placeBet(userId.toString(), usdAmount, currency);
      res.status(200).json(result);
    } catch (dbError) {
      console.error('Database error when placing bet:', dbError);
      
      if (dbError.message.includes('Insufficient')) {
        return res.status(400).json({ message: dbError.message });
      }
      
      if (dbError.message.includes('Cannot place bet')) {
        return res.status(400).json({ message: dbError.message });
      }
      
      // If it's a MongoDB connection error
      if (dbError.name === 'MongooseError' || dbError.name === 'MongoError') {
        return res.status(503).json({ message: 'Database service unavailable. Please try again later.' });
      }
      
      throw dbError; // Re-throw for the outer catch block
    }
  } catch (error) {
    console.error('Place bet error:', error);
    res.status(500).json({ message: 'Failed to place bet' });
  }
};

/**
 * Cash out
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const cashOut = async (req, res) => {
  try {
    const userId = req.user._id;
    // Get game service instance
    let gameService = req.app.get('gameService');
    if (!gameService) {
      console.error('gameService not found on app, using fallback singleton');
      gameService = GameService;
    }
    if (!gameService) {
      return res.status(500).json({ message: 'Game service not available' });
    }
    try {
      // Cash out
      const result = await gameService.cashOut(userId.toString());
      res.status(200).json(result);
    } catch (dbError) {
      console.error('Database error when cashing out:', dbError);
      if (dbError.message.includes('No active round') || 
          dbError.message.includes('No active bet') ||
          dbError.message.includes('already cashed out')) {
        return res.status(400).json({ message: dbError.message });
      }
      if (dbError.name === 'MongooseError' || dbError.name === 'MongoError') {
        return res.status(503).json({ message: 'Database service unavailable. Please try again later.' });
      }
      throw dbError; // Re-throw for the outer catch block
    }
  } catch (error) {
    console.error('Cash out error:', error);
    res.status(500).json({ message: 'Failed to cash out' });
  }
};

/**
 * Get current game state
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const getGameState = async (req, res) => {
  try {
    // Get game service instance
    const gameService = req.app.get('gameService');
    
    if (!gameService) {
      return res.status(500).json({ message: 'Game service not available' });
    }
    
    // Get game state - this is a synchronous method so no need for try/catch for DB errors
    const gameState = gameService.getGameState();
    
    res.status(200).json(gameState);
  } catch (error) {
    console.error('Get game state error:', error);
    // Return a default game state if there's an error
    res.status(200).json({
      roundNumber: 0,
      status: 'waiting',
      multiplier: 1.0,
      timeRemaining: 10,
      activePlayers: 0
    });
  }
};

/**
 * Get game history
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const getGameHistory = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    
    // Get game service instance
    const gameService = req.app.get('gameService');
    
    if (!gameService) {
      return res.status(500).json({ message: 'Game service not available' });
    }
    
    try {
      // Get game history
      const history = await gameService.getGameHistory(limit);
      res.status(200).json(history);
    } catch (dbError) {
      console.error('Get game history error:', dbError);
      // Return empty history array if MongoDB is not connected
      res.status(200).json([]);
    }
  } catch (error) {
    console.error('Get game history error:', error);
    res.status(500).json({ message: 'Failed to get game history' });
  }
};

/**
 * Admin: Pause the game
 */
const pauseGame = (req, res) => {
  const gameService = req.app.get('gameService');
  if (!gameService) return res.status(500).json({ message: 'Game service not available' });
  gameService.pauseGame();
  res.status(200).json({ message: 'Game paused' });
};

/**
 * Admin: Resume the game
 */
const resumeGame = (req, res) => {
  const gameService = req.app.get('gameService');
  if (!gameService) return res.status(500).json({ message: 'Game service not available' });
  gameService.resumeGame();
  res.status(200).json({ message: 'Game resumed' });
};

/**
 * Admin: Stop the game
 */
const stopGame = (req, res) => {
  const gameService = req.app.get('gameService');
  if (!gameService) return res.status(500).json({ message: 'Game service not available' });
  gameService.stopGame();
  res.status(200).json({ message: 'Game stopped' });
};

/**
 * Admin: Start a new game
 */
const startNewGame = (req, res) => {
  const gameService = req.app.get('gameService');
  if (!gameService) return res.status(500).json({ message: 'Game service not available' });
  gameService.startNewGame();
  res.status(200).json({ message: 'New game started' });
};

module.exports = {
  placeBet,
  cashOut,
  getGameState,
  getGameHistory,
  pauseGame,
  resumeGame,
  stopGame,
  startNewGame
};