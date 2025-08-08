const mongoose = require('mongoose');

const gameRoundSchema = new mongoose.Schema({
  roundNumber: {
    type: Number,
    required: true,
    unique: true
  },
  startTime: {
    type: Date,
    required: true,
    default: Date.now
  },
  endTime: {
    type: Date,
    default: null
  },
  crashPoint: {
    type: Number,
    required: true,
    comment: 'The multiplier at which the game crashed'
  },
  seed: {
    type: String,
    required: true,
    comment: 'Seed used for generating the crash point'
  },
  hash: {
    type: String,
    required: true,
    comment: 'Hash of the seed + round number for verification'
  },
  bets: [{
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
    transactionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Transaction'
    }
  }],
  cashouts: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    usdAmount: {
      type: Number,
      required: true,
      comment: 'USD equivalent of the crypto payout'
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
    multiplier: {
      type: Number,
      required: true
    },
    timestamp: {
      type: Date,
      default: Date.now
    },
    transactionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Transaction'
    }
  }],
  status: {
    type: String,
    enum: ['pending', 'active', 'completed'],
    default: 'pending'
  }
}, {
  timestamps: true
});

const GameRound = mongoose.model('GameRound', gameRoundSchema);

module.exports = GameRound;