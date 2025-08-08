const Wallet = require('../models/wallet.model');
const Transaction = require('../models/transaction.model');
const cryptoService = require('./crypto.service');
const mongoose = require('mongoose');

class WalletService {
  /**
   * Get a user's wallet, creating one if it doesn't exist
   * @param {string} userId - User ID
   * @returns {Promise<Object>} - Wallet with USD equivalent values
   */
  async getWallet(userId) {
    try {
      // Find or create wallet
      let wallet = await Wallet.findOne({ userId });
      
      if (!wallet) {
        wallet = new Wallet({ userId });
        await wallet.save();
      }
      
      // Get current prices for all currencies
      const prices = await cryptoService.getAllPrices();
      
      // Calculate USD equivalent for each currency
      const balancesWithUsd = {};
      
      for (const [currency, amount] of Object.entries(wallet.balances)) {
        balancesWithUsd[currency] = {
          amount,
          usdEquivalent: amount * prices[currency]
        };
      }
      
      return {
        _id: wallet._id,
        userId: wallet.userId,
        balances: balancesWithUsd,
        updatedAt: wallet.updatedAt
      };
    } catch (error) {
      console.error('Error getting wallet:', error);
      throw error;
    }
  }

  /**
   * Get transaction history for a user
   * @param {string} userId - User ID
   * @param {number} limit - Number of transactions to retrieve
   * @returns {Promise<Array>} - Array of transactions
   */
  async getTransactionHistory(userId, limit = 20) {
    try {
      const transactions = await Transaction.find({ userId })
        .sort({ timestamp: -1 })
        .limit(limit);
      
      return transactions;
    } catch (error) {
      console.error('Error getting transaction history:', error);
      throw error;
    }
  }

  /**
   * Update a wallet's balance (with transaction safety)
   * @param {string} userId - User ID
   * @param {string} currency - Cryptocurrency symbol (BTC, ETH)
   * @param {number} amount - Amount to add (positive) or subtract (negative)
   * @returns {Promise<Object>} - Updated wallet
   */
  async updateBalance(userId, currency, amount) {
    const session = await mongoose.startSession();
    session.startTransaction();
    
    try {
      // Find wallet with session for transaction safety
      const wallet = await Wallet.findOne({ userId }).session(session);
      
      if (!wallet) {
        throw new Error('Wallet not found');
      }
      
      // Check if balance would go negative
      const currentBalance = wallet.balances[currency] || 0;
      if (currentBalance + amount < 0) {
        throw new Error(`Insufficient ${currency} balance`);
      }
      
      // Update balance
      wallet.balances[currency] = currentBalance + amount;
      await wallet.save({ session });
      
      // Commit transaction
      await session.commitTransaction();
      session.endSession();
      
      return wallet;
    } catch (error) {
      // Abort transaction on error
      await session.abortTransaction();
      session.endSession();
      
      console.error('Error updating wallet balance:', error);
      throw error;
    }
  }
}

module.exports = new WalletService();