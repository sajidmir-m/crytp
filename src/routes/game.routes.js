const express = require('express');
const router = express.Router();
const gameController = require('../controllers/game.controller');
const { authenticate } = require('../middleware/auth.middleware');

// Get current game state (public)
router.get('/state', gameController.getGameState);

// Get game history (public)
router.get('/history', gameController.getGameHistory);

// Place a bet (protected)
router.post('/bet', authenticate, gameController.placeBet);

// Cash out (protected)
router.post('/cashout', authenticate, gameController.cashOut);

// Admin game controls (for demo, no auth)
router.post('/pause', gameController.pauseGame);
router.post('/resume', gameController.resumeGame);
router.post('/stop', gameController.stopGame);
router.post('/start', gameController.startNewGame);

module.exports = router;