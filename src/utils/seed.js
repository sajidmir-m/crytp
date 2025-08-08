/**
 * Database Seed Script
 * 
 * This script populates the database with sample data for testing purposes.
 * It creates sample users, wallets, and game rounds.
 */

require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const User = require('../models/user.model');
const Wallet = require('../models/wallet.model');
const GameRound = require('../models/gameround.model');
const Transaction = require('../models/transaction.model');

// MongoDB Connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/crypto-crash';

// Sample data
const sampleUsers = [
  {
    name: 'Test User 1',
    email: 'user1@example.com',
    password: 'password123'
  },
  {
    name: 'Test User 2',
    email: 'user2@example.com',
    password: 'password123'
  },
  {
    name: 'Test User 3',
    email: 'user3@example.com',
    password: 'password123'
  }
];

// Sample game rounds
const sampleGameRounds = [
  {
    roundId: 1,
    crashPoint: 2.5,
    startTime: new Date(Date.now() - 300000), // 5 minutes ago
    endTime: new Date(Date.now() - 290000),   // 4 minutes 50 seconds ago
    status: 'completed'
  },
  {
    roundId: 2,
    crashPoint: 1.2,
    startTime: new Date(Date.now() - 200000), // 3 minutes 20 seconds ago
    endTime: new Date(Date.now() - 190000),   // 3 minutes 10 seconds ago
    status: 'completed'
  },
  {
    roundId: 3,
    crashPoint: 10.5,
    startTime: new Date(Date.now() - 100000), // 1 minute 40 seconds ago
    endTime: new Date(Date.now() - 90000),    // 1 minute 30 seconds ago
    status: 'completed'
  }
];

// Function to seed the database
async function seedDatabase() {
  try {
    // Connect to MongoDB
    await mongoose.connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('Connected to MongoDB for seeding');

    // Clear existing data
    await User.deleteMany({});
    await Wallet.deleteMany({});
    await GameRound.deleteMany({});
    await Transaction.deleteMany({});
    console.log('Cleared existing data');

    // Create users and wallets
    const createdUsers = [];
    for (const userData of sampleUsers) {
      // Hash password
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(userData.password, salt);

      // Create user
      const user = await User.create({
        name: userData.name,
        email: userData.email,
        password: hashedPassword
      });

      createdUsers.push(user);

      // Create wallet for user
      await Wallet.create({
        userId: user._id,
        balances: {
          BTC: 0.01,
          ETH: 0.5
        }
      });

      console.log(`Created user: ${userData.email} with wallet`);
    }

    // Create game rounds
    for (const roundData of sampleGameRounds) {
      const gameRound = await GameRound.create(roundData);
      console.log(`Created game round: ${gameRound.roundId}`);

      // Add bets and cashouts for each round
      for (let i = 0; i < createdUsers.length; i++) {
        const user = createdUsers[i];
        const betAmount = 10 + i * 5; // Different bet amounts
        const cryptoCurrency = i % 2 === 0 ? 'BTC' : 'ETH';
        const cryptoPrice = cryptoCurrency === 'BTC' ? 60000 : 3000;
        const cryptoAmount = betAmount / cryptoPrice;

        // Create bet transaction
        await Transaction.create({
          userId: user._id,
          roundId: gameRound.roundId,
          type: 'bet',
          usdAmount: betAmount,
          cryptoAmount: cryptoAmount,
          cryptoCurrency: cryptoCurrency,
          cryptoPrice: cryptoPrice,
          timestamp: gameRound.startTime
        });

        // Create cashout for some users (not all)
        if (i < 2) { // Only first two users cash out
          const cashoutMultiplier = i === 0 ? 1.5 : 2.0;
          // Only cash out if the multiplier is less than the crash point
          if (cashoutMultiplier < gameRound.crashPoint) {
            await Transaction.create({
              userId: user._id,
              roundId: gameRound.roundId,
              type: 'cashout',
              usdAmount: betAmount * cashoutMultiplier,
              cryptoAmount: cryptoAmount * cashoutMultiplier,
              cryptoCurrency: cryptoCurrency,
              cryptoPrice: cryptoPrice,
              multiplier: cashoutMultiplier,
              timestamp: new Date(gameRound.startTime.getTime() + 2000 + i * 1000) // Different cashout times
            });
          }
        }
      }
    }

    console.log('Database seeded successfully!');
  } catch (error) {
    console.error('Error seeding database:', error);
  } finally {
    // Close the connection
    await mongoose.connection.close();
    console.log('MongoDB connection closed');
    process.exit(0);
  }
}

// Run the seed function
seedDatabase();