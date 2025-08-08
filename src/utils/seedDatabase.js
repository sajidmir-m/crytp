const mongoose = require('mongoose');
const User = require('../models/user.model');
const Wallet = require('../models/wallet.model');
const GameRound = require('../models/gameRound.model');
const Transaction = require('../models/transaction.model');
const config = require('../config/config');
const provablyFair = require('./provablyFair');

// Connect to MongoDB
mongoose.connect(config.mongodbUri)
  .then(() => {
    console.log('Connected to MongoDB');
    seedDatabase();
  })
  .catch((error) => {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  });

/**
 * Seed the database with sample data
 */
async function seedDatabase() {
  try {
    // Clear existing data
    await User.deleteMany({});
    await Wallet.deleteMany({});
    await GameRound.deleteMany({});
    await Transaction.deleteMany({});
    
    console.log('Cleared existing data');
    
    // Create sample users
    const users = await createSampleUsers();
    console.log(`Created ${users.length} sample users`);
    
    // Create sample wallets
    const wallets = await createSampleWallets(users);
    console.log(`Created ${wallets.length} sample wallets`);
    
    // Create sample game rounds
    const rounds = await createSampleGameRounds();
    console.log(`Created ${rounds.length} sample game rounds`);
    
    // Create sample transactions
    const transactions = await createSampleTransactions(users, rounds);
    console.log(`Created ${transactions.length} sample transactions`);
    
    console.log('Database seeded successfully');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding database:', error);
    process.exit(1);
  }
}

/**
 * Create sample users
 * @returns {Promise<Array>} - Array of created users
 */
async function createSampleUsers() {
  const users = [
    {
      username: 'user1',
      email: 'user1@example.com',
      password: 'password123'
    },
    {
      username: 'user2',
      email: 'user2@example.com',
      password: 'password123'
    },
    {
      username: 'user3',
      email: 'user3@example.com',
      password: 'password123'
    }
  ];
  
  return await User.create(users);
}

/**
 * Create sample wallets for users
 * @param {Array} users - Array of users
 * @returns {Promise<Array>} - Array of created wallets
 */
async function createSampleWallets(users) {
  const wallets = users.map(user => ({
    userId: user._id,
    balances: {
      BTC: 0.01, // 0.01 BTC
      ETH: 0.5   // 0.5 ETH
    }
  }));
  
  return await Wallet.create(wallets);
}

/**
 * Create sample game rounds
 * @returns {Promise<Array>} - Array of created game rounds
 */
async function createSampleGameRounds() {
  const rounds = [];
  
  for (let i = 1; i <= 5; i++) {
    const seed = provablyFair.generateSeed();
    const hash = provablyFair.generateHash(seed, i);
    const crashPoint = provablyFair.calculateCrashPoint(hash);
    
    rounds.push({
      roundNumber: i,
      startTime: new Date(Date.now() - (i * 60000)), // i minutes ago
      endTime: new Date(Date.now() - (i * 60000) + 30000), // 30 seconds after start
      crashPoint,
      seed,
      hash,
      status: 'completed',
      bets: [],
      cashouts: []
    });
  }
  
  return await GameRound.create(rounds);
}

/**
 * Create sample transactions
 * @param {Array} users - Array of users
 * @param {Array} rounds - Array of game rounds
 * @returns {Promise<Array>} - Array of created transactions
 */
async function createSampleTransactions(users, rounds) {
  const transactions = [];
  const currencies = ['BTC', 'ETH'];
  const btcPrice = 60000; // Mock BTC price in USD
  const ethPrice = 3000;  // Mock ETH price in USD
  
  for (const round of rounds) {
    for (const user of users) {
      const currency = currencies[Math.floor(Math.random() * currencies.length)];
      const usdAmount = Math.floor(Math.random() * 50) + 10; // $10-$60
      const price = currency === 'BTC' ? btcPrice : ethPrice;
      const cryptoAmount = usdAmount / price;
      
      // Create bet transaction
      const betTransaction = {
        userId: user._id,
        usdAmount,
        cryptoAmount,
        currency,
        transactionType: 'bet',
        priceAtTime: price,
        gameRoundId: round._id,
        timestamp: round.startTime
      };
      
      transactions.push(betTransaction);
      
      // Add bet to round
      round.bets.push({
        userId: user._id,
        usdAmount,
        cryptoAmount,
        currency,
        transactionId: null // Will be updated after transaction is created
      });
      
      // Randomly determine if user cashed out
      const didCashOut = Math.random() > 0.3; // 70% chance of cashing out
      
      if (didCashOut) {
        const cashoutMultiplier = Math.min(round.crashPoint * Math.random(), round.crashPoint);
        const cryptoPayout = cryptoAmount * cashoutMultiplier;
        const usdPayout = usdAmount * cashoutMultiplier;
        
        // Create cashout transaction
        const cashoutTransaction = {
          userId: user._id,
          usdAmount: usdPayout,
          cryptoAmount: cryptoPayout,
          currency,
          transactionType: 'cashout',
          priceAtTime: price,
          gameRoundId: round._id,
          multiplier: cashoutMultiplier,
          timestamp: new Date(round.startTime.getTime() + Math.random() * 30000) // Random time during round
        };
        
        transactions.push(cashoutTransaction);
        
        // Add cashout to round
        round.cashouts.push({
          userId: user._id,
          usdAmount: usdPayout,
          cryptoAmount: cryptoPayout,
          currency,
          multiplier: cashoutMultiplier,
          timestamp: cashoutTransaction.timestamp,
          transactionId: null // Will be updated after transaction is created
        });
      }
    }
    
    await round.save();
  }
  
  const createdTransactions = await Transaction.create(transactions);
  
  // Update transaction IDs in rounds
  for (const round of rounds) {
    const roundTransactions = createdTransactions.filter(t => t.gameRoundId.toString() === round._id.toString());
    
    // Update bet transaction IDs
    for (let i = 0; i < round.bets.length; i++) {
      const betTransaction = roundTransactions.find(t => 
        t.userId.toString() === round.bets[i].userId.toString() && 
        t.transactionType === 'bet'
      );
      
      if (betTransaction) {
        round.bets[i].transactionId = betTransaction._id;
      }
    }
    
    // Update cashout transaction IDs
    for (let i = 0; i < round.cashouts.length; i++) {
      const cashoutTransaction = roundTransactions.find(t => 
        t.userId.toString() === round.cashouts[i].userId.toString() && 
        t.transactionType === 'cashout'
      );
      
      if (cashoutTransaction) {
        round.cashouts[i].transactionId = cashoutTransaction._id;
      }
    }
    
    await round.save();
  }
  
  return createdTransactions;
}