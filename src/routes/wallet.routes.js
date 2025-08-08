const express = require('express');
const router = express.Router();
const walletController = require('../controllers/wallet.controller');
const { authenticate } = require('../middleware/auth.middleware');

// Get user's wallet (protected)
router.get('/', authenticate, walletController.getWallet);

// Get transaction history (protected)
router.get('/transactions', authenticate, walletController.getTransactionHistory);

// Get current cryptocurrency prices (public)
router.get('/prices', walletController.getCryptoPrices);

module.exports = router;