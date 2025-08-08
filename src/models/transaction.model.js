const mongoose = require('mongoose');
const crypto = require('crypto');

const transactionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  usdAmount: {
    type: Number,
    required: true
  },
  cryptoAmount: {
    type: Number,
    required: true
  },
  currency: {
    type: String,
    enum: ['BTC', 'ETH'],
    required: true
  },
  transactionType: {
    type: String,
    enum: ['bet', 'cashout'],
    required: true
  },
  transactionHash: {
    type: String,
    required: true,
    default: function() {
      // Generate a mock transaction hash
      return crypto.randomBytes(32).toString('hex');
    }
  },
  priceAtTime: {
    type: Number,
    required: true,
    comment: 'USD per crypto at the time of transaction'
  },
  gameRoundId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'GameRound',
    required: true
  },
  multiplier: {
    type: Number,
    default: null,
    comment: 'Multiplier at cashout, null for bets'
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

const Transaction = mongoose.model('Transaction', transactionSchema);

module.exports = Transaction;