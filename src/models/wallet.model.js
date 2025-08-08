const mongoose = require('mongoose');

const walletSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  balances: {
    BTC: {
      type: Number,
      default: 0.001, // Starting with some BTC for testing
      min: 0
    },
    ETH: {
      type: Number,
      default: 0.01, // Starting with some ETH for testing
      min: 0
    }
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Method to update balance
walletSchema.methods.updateBalance = async function(currency, amount) {
  if (!this.balances[currency] && amount < 0) {
    throw new Error(`Insufficient ${currency} balance`);
  }
  
  // Ensure balance doesn't go negative
  if (this.balances[currency] + amount < 0) {
    throw new Error(`Insufficient ${currency} balance`);
  }
  
  this.balances[currency] += amount;
  return this.save();
};

// Method to get balance
walletSchema.methods.getBalance = function(currency) {
  return this.balances[currency] || 0;
};

const Wallet = mongoose.model('Wallet', walletSchema);

module.exports = Wallet;