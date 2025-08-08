const walletService = require('../services/wallet.service');
const cryptoService = require('../services/crypto.service');

/**
 * Get user's wallet
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const getWallet = async (req, res) => {
  try {
    const userId = req.user._id;
    
    // Get wallet
    const wallet = await walletService.getWallet(userId);
    
    res.status(200).json(wallet);
  } catch (error) {
    console.error('Get wallet error:', error);
    res.status(500).json({ message: 'Failed to get wallet' });
  }
};

/**
 * Get transaction history
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const getTransactionHistory = async (req, res) => {
  try {
    const userId = req.user._id;
    const limit = parseInt(req.query.limit) || 20;
    
    // Get transaction history
    const transactions = await walletService.getTransactionHistory(userId, limit);
    
    res.status(200).json(transactions);
  } catch (error) {
    console.error('Get transaction history error:', error);
    res.status(500).json({ message: 'Failed to get transaction history' });
  }
};

/**
 * Get current cryptocurrency prices
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const getCryptoPrices = async (req, res) => {
  try {
    // Get prices for all supported cryptocurrencies
    const prices = await cryptoService.getAllPrices();
    
    res.status(200).json(prices);
  } catch (error) {
    console.error('Get crypto prices error:', error);
    res.status(500).json({ message: 'Failed to get cryptocurrency prices' });
  }
};

module.exports = {
  getWallet,
  getTransactionHistory,
  getCryptoPrices
};