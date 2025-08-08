const crypto = require('crypto');
const config = require('../config/config');
const GameRound = require('../models/gameRound.model');
const Transaction = require('../models/transaction.model');
const Wallet = require('../models/wallet.model');
const cryptoService = require('./crypto.service');

class GameService {
  constructor(io) {
    this.io = io;
    this.currentRound = null;
    this.currentMultiplier = config.game.initialMultiplier;
    this.isGameRunning = false;
    this.roundInterval = config.game.roundInterval;
    this.multiplierUpdateInterval = config.game.multiplierUpdateInterval;
    this.maxCrashValue = config.game.maxCrashValue;
    this.growthFactor = config.game.growthFactor;
    this.roundNumber = 0;
    this.multiplierUpdateTimer = null;
    this.roundTimer = null;
    this.activeBets = new Map(); // Map of userId -> bet details
    this.cashedOut = new Set(); // Set of userIds who have cashed out
    this.roundPhase = 'waiting'; // 'betting', 'running', 'ended', 'waiting'
    this.bettingCountdownTimer = null; // Timer for the betting countdown
    this.runningCountdownTimer = null; // Timer for the running phase countdown
  }

  /**
   * Start the game loop
   */
  async startGameLoop() {
    try {
      // Get the latest round number from the database
      const latestRound = await GameRound.findOne().sort({ roundNumber: -1 }).limit(1);
      this.roundNumber = latestRound ? latestRound.roundNumber : 0;
    } catch (error) {
      console.error('Error fetching latest round number:', error.message);
      console.log('Starting with round number 0');
      this.roundNumber = 0;
    }

    // Start the first round
    this.scheduleNextRound();
  }

  /**
   * Schedule the next game round
   */
  scheduleNextRound() {
    console.log('Scheduling next round...');
    if (this.roundTimer) clearTimeout(this.roundTimer);
    if (this.bettingCountdownTimer) clearInterval(this.bettingCountdownTimer);
    if (this.runningCountdownTimer) clearInterval(this.runningCountdownTimer);
    this.roundPhase = 'waiting';
    this.io.emit('game:phase', { phase: 'waiting' });
    this.io.emit('game:waiting', { nextRoundIn: 7 }); // 7 seconds until next round
    this.roundTimer = setTimeout(() => {
      this.startBettingPhase();
    }, 7000);
  }

  startBettingPhase() {
    this.roundPhase = 'betting';
    this.io.emit('game:phase', { phase: 'betting' });
    this.io.emit('game:betting', { bettingTime: 3 }); // 3 seconds for betting
    this.activeBets.clear();
    this.cashedOut.clear();
    // Do NOT create a plain JS object for currentRound here!
    let countdown = 3;
    this.io.emit('game:bettingCountdown', { seconds: countdown });
    this.bettingCountdownTimer = setInterval(() => {
      countdown--;
      this.io.emit('game:bettingCountdown', { seconds: countdown });
      if (countdown <= 0) {
        clearInterval(this.bettingCountdownTimer);
        this.startRound();
      }
    }, 1000);
  }

  /**
   * Start a new game round
   */
  async startRound() {
    try {
      this.roundNumber++;
      this.isGameRunning = true;
      this.currentMultiplier = config.game.initialMultiplier;
      this.roundPhase = 'running';
      this.io.emit('game:phase', { phase: 'running' });
      
      // Generate crash point using provably fair algorithm
      const { crashPoint, seed, hash } = this.generateCrashPoint(this.roundNumber);
      
      // Check if MongoDB is connected
      const isMongoConnected = require('mongoose').connection.readyState === 1;
      
      if (isMongoConnected) {
        // Create a new game round in the database
        this.currentRound = new GameRound({
          roundNumber: this.roundNumber,
          startTime: new Date(),
          crashPoint,
          seed,
          hash,
          status: 'active',
          bets: [],
          cashouts: []
        });
        
        await this.currentRound.save();
      } else {
        // Fallback: create a plain JS object for demo mode
        this.currentRound = {
          _id: `demo-round-${this.roundNumber}`,
          roundNumber: this.roundNumber,
          startTime: new Date(),
          crashPoint,
          seed,
          hash,
          status: 'active',
          bets: [],
          cashouts: []
        };
      }
      
      console.log(`Round ${this.roundNumber} started with crash point: ${crashPoint}x`);
      
      // Broadcast round start to clients
      this.io.emit('game:started', {
        roundId: this.currentRound._id,
        roundNumber: this.roundNumber,
        startTime: this.currentRound.startTime
      });
      
      // Start updating the multiplier
      this.startMultiplierUpdates(crashPoint);
    } catch (error) {
      console.error('Error starting round:', error);
      this.scheduleNextRound();
    }
  }



  /**
   * Start updating the multiplier until it reaches the crash point
   * @param {number} crashPoint - The multiplier at which the game will crash
   */
  startMultiplierUpdates(crashPoint) {
    const startTime = Date.now();
    
    // Clear any existing timer
    if (this.multiplierUpdateTimer) {
      clearInterval(this.multiplierUpdateTimer);
    }
    if (this.runningCountdownTimer) {
      clearInterval(this.runningCountdownTimer);
    }
    
    // Update the multiplier at regular intervals
    this.multiplierUpdateTimer = setInterval(() => {
      const timeElapsed = Date.now() - startTime;
      
      // Calculate the current multiplier using exponential growth formula
      this.currentMultiplier = config.game.initialMultiplier + (timeElapsed * this.growthFactor);
      
      // Broadcast the current multiplier to clients
      this.io.emit('game:multiplier', {
        multiplier: this.currentMultiplier.toFixed(2),
        roundId: this.currentRound._id
      });
      
      // Check if the game should crash
      if (this.currentMultiplier >= crashPoint) {
        if (this.runningCountdownTimer) clearInterval(this.runningCountdownTimer);
        this.crashGame();
      }
    }, this.multiplierUpdateInterval);
  }

  /**
   * End the current game round with a crash
   */
  async crashGame() {
    // Stop the multiplier updates
    if (this.multiplierUpdateTimer) {
      clearInterval(this.multiplierUpdateTimer);
    }
    if (this.runningCountdownTimer) {
      clearInterval(this.runningCountdownTimer);
    }
    
    this.isGameRunning = false;
    this.roundPhase = 'ended';
    this.io.emit('game:phase', { phase: 'ended' });
    
    // Update the game round in the database
    if (this.currentRound) {
      this.currentRound.endTime = new Date();
      this.currentRound.status = 'completed';
      
      // Check if MongoDB is connected and if the currentRound is a database model
      const isMongoConnected = require('mongoose').connection.readyState === 1;
      if (isMongoConnected && typeof this.currentRound.save === 'function') {
        try {
          await this.currentRound.save();
        } catch (error) {
          console.error('Error saving game round:', error.message);
        }
      } else {
        console.log('Running in demo mode: Game round not saved to database');
      }
      
      console.log(`Round ${this.roundNumber} crashed at ${this.currentRound.crashPoint}x`);
      
      // Broadcast crash to clients
      this.io.emit('game:crashed', {
        roundId: this.currentRound._id,
        crashPoint: this.currentRound.crashPoint,
        hash: this.currentRound.hash,
        seed: this.currentRound.seed
      });
    }
    
    // Schedule the next round
    setTimeout(() => {
      this.scheduleNextRound();
    }, 1000); // 1 second to show results before next round
  }

  /**
   * Generate a crash point using a provably fair algorithm
   * @param {number} roundNumber - The current round number
   * @returns {Object} - Object containing crashPoint, seed, and hash
   */
  generateCrashPoint(roundNumber) {
    // Generate a random seed
    const seed = crypto.randomBytes(32).toString('hex');
    
    // Create a hash from the seed and round number
    const hash = crypto.createHash('sha256')
      .update(`${seed}:${roundNumber}`)
      .digest('hex');
    
    // Use the first 8 characters of the hash to generate a number between 1 and maxCrashValue
    const hashFragment = hash.slice(0, 8);
    const decimal = parseInt(hashFragment, 16);
    
    // Calculate crash point with 2 decimal places
    // Ensure minimum crash point is 1.0
    let crashPoint = 1.0 + (decimal % this.maxCrashValue);
    
    // Ensure crash point has 2 decimal places
    crashPoint = parseFloat(crashPoint.toFixed(2));
    
    return { crashPoint, seed, hash };
  }

  /**
   * Place a bet for a user
   * @param {string} userId - User ID
   * @param {number} usdAmount - Bet amount in USD
   * @param {string} currency - Cryptocurrency to bet with (BTC, ETH)
   * @returns {Promise<Object>} - Bet details
   */
  async placeBet(userId, usdAmount, currency) {
    try {
      // Validate inputs
      if (!userId || usdAmount <= 0 || !currency) {
        throw new Error('Invalid bet parameters');
      }
      
      if (!config.cryptoApi.supportedCurrencies.includes(currency)) {
        throw new Error(`Unsupported currency: ${currency}`);
      }
      
      // Only allow bets during the betting phase
      if (this.roundPhase !== 'betting') {
        throw new Error('Betting is closed for this round');
      }
      
      // Check if user already has an active bet
      if (this.activeBets.has(userId)) {
        throw new Error('User already has an active bet for this round');
      }
      
      // Convert USD to cryptocurrency
      const { cryptoAmount, price } = await cryptoService.usdToCrypto(usdAmount, currency);
      
      // Check if MongoDB is connected
      const isMongoConnected = require('mongoose').connection.readyState === 1;
      let transactionId = `demo-tx-${Date.now()}`;
      
      if (isMongoConnected) {
        // Get user's wallet
        const wallet = await Wallet.findOne({ userId });
        if (!wallet) {
          throw new Error('Wallet not found');
        }
        
        // Check if user has enough balance
        if (wallet.balances[currency] < cryptoAmount) {
          throw new Error(`Insufficient ${currency} balance`);
        }
        
        // Deduct the bet amount from the wallet
        await wallet.updateBalance(currency, -cryptoAmount);
        
        // Create a transaction record with proper gameRoundId
        const gameRoundId = this.currentRound && this.currentRound._id ? this.currentRound._id : undefined;
        const transaction = new Transaction({
          userId,
          usdAmount,
          cryptoAmount,
          currency,
          transactionType: 'bet',
          priceAtTime: price,
          gameRoundId: gameRoundId
        });
        
        await transaction.save();
        transactionId = transaction._id;
      } else {
        console.log('Running in demo mode: Bet processed without database updates');
      }
      
      // Store the bet details
      const betDetails = {
        userId,
        usdAmount,
        cryptoAmount,
        currency,
        transactionId
      };
      
      this.activeBets.set(userId, betDetails);
      
      // If a round is active, add the bet to the round
      if (this.currentRound) {
        this.currentRound.bets.push(betDetails);
        
        // Save to database only if MongoDB is connected and currentRound is a database model
        if (isMongoConnected && typeof this.currentRound.save === 'function') {
          try {
            await this.currentRound.save();
          } catch (error) {
            console.error('Error saving bet to game round:', error.message);
          }
        }
      }
      
      return {
        success: true,
        bet: betDetails
      };
    } catch (error) {
      console.error('Error placing bet:', error);
      throw error;
    }
  }

  /**
   * Cash out a user's bet
   * @param {string} userId - User ID
   * @returns {Promise<Object>} - Cashout details
   */
  async cashOut(userId) {
    try {
      // Validate inputs
      if (!userId) {
        throw new Error('Invalid user ID');
      }
      
      // Check if a round is active
      if (!this.isGameRunning) {
        throw new Error('No active round to cash out from');
      }
      
      // Only allow cashout during the running phase
      if (this.roundPhase !== 'running') {
        throw new Error('Cashout is only allowed while the game is running');
      }
      
      // Check if user has an active bet
      if (!this.activeBets.has(userId)) {
        throw new Error('No active bet found for this user');
      }
      
      // Check if user has already cashed out
      if (this.cashedOut.has(userId)) {
        throw new Error('User has already cashed out');
      }
      
      // Get the bet details
      const bet = this.activeBets.get(userId);
      
      // Calculate the payout
      const multiplier = this.currentMultiplier;
      const cryptoPayout = bet.cryptoAmount * multiplier;
      const usdPayout = bet.usdAmount * multiplier;
      
      // Check if MongoDB is connected
      const isMongoConnected = require('mongoose').connection.readyState === 1;
      let transactionId = `demo-cashout-${Date.now()}`;
      
      if (isMongoConnected) {
        // Get user's wallet
        const wallet = await Wallet.findOne({ userId });
        if (!wallet) {
          throw new Error('Wallet not found');
        }
        
        // Add the payout to the wallet
        await wallet.updateBalance(bet.currency, cryptoPayout);
        
        // Create a transaction record with proper gameRoundId
        const gameRoundId = this.currentRound && this.currentRound._id ? this.currentRound._id : undefined;
        const transaction = new Transaction({
          userId,
          usdAmount: usdPayout,
          cryptoAmount: cryptoPayout,
          currency: bet.currency,
          transactionType: 'cashout',
          priceAtTime: bet.usdAmount / bet.cryptoAmount, // Use the same price as the bet
          gameRoundId: gameRoundId,
          multiplier
        });
        
        await transaction.save();
        transactionId = transaction._id;
      } else {
        console.log('Running in demo mode: Cashout processed without database updates');
      }
      
      // Mark user as cashed out
      this.cashedOut.add(userId);
      
      // Add the cashout to the round
      const cashoutDetails = {
        userId,
        usdAmount: usdPayout,
        cryptoAmount: cryptoPayout,
        currency: bet.currency,
        multiplier,
        timestamp: new Date(),
        transactionId
      };
      
      if (this.currentRound) {
        this.currentRound.cashouts.push(cashoutDetails);
        
        // Save to database only if MongoDB is connected and currentRound is a database model
        if (isMongoConnected && typeof this.currentRound.save === 'function') {
          try {
            await this.currentRound.save();
          } catch (error) {
            console.error('Error saving cashout to game round:', error.message);
          }
        }
      }
      
      // Broadcast the cashout to clients
      this.io.emit('game:cashout', {
        userId,
        multiplier,
        usdAmount: usdPayout,
        cryptoAmount: cryptoPayout,
        currency: bet.currency
      });
      
      return {
        success: true,
        cashout: cashoutDetails
      };
    } catch (error) {
      console.error('Error cashing out:', error);
      throw error;
    }
  }

  /**
   * Get the current game state
   * @returns {Object} - Current game state
   */
  getGameState() {
    return {
      isRunning: this.isGameRunning,
      currentRound: this.currentRound ? this.currentRound._id : null,
      roundNumber: this.roundNumber,
      currentMultiplier: this.currentMultiplier,
      activeBets: Array.from(this.activeBets.values()),
      cashedOut: Array.from(this.cashedOut)
    };
  }

  /**
   * Get game round history
   * @param {number} limit - Number of rounds to retrieve
   * @returns {Promise<Array>} - Array of game rounds
   */
  async getGameHistory(limit = 10) {
    try {
      const rounds = await GameRound.find({ status: 'completed' })
        .sort({ roundNumber: -1 })
        .limit(limit)
        .maxTimeMS(5000); // Set a lower timeout for this operation
      
      return rounds;
    } catch (error) {
      console.error('Error getting game history:', error);
      // Return empty array instead of throwing error
      return [];
    }
  }

  pauseGame() {
    if (this.roundPhase === 'running' && this.isGameRunning) {
      this.isGameRunning = false;
      this.roundPhase = 'paused';
      if (this.multiplierUpdateTimer) clearInterval(this.multiplierUpdateTimer);
      if (this.runningCountdownTimer) clearInterval(this.runningCountdownTimer);
      this.io.emit('game:phase', { phase: 'paused' });
      this.io.emit('game:paused');
    }
  }

  resumeGame() {
    if (this.roundPhase === 'paused' && !this.isGameRunning) {
      this.isGameRunning = true;
      this.roundPhase = 'running';
      this.io.emit('game:phase', { phase: 'running' });
      if (this.currentRound && this.currentRound.crashPoint) {
        this.startMultiplierUpdates(this.currentRound.crashPoint);
      }
      this.io.emit('game:resumed');
    }
  }

  stopGame() {
    this.isGameRunning = false;
    this.roundPhase = 'stopped';
    if (this.multiplierUpdateTimer) clearInterval(this.multiplierUpdateTimer);
    if (this.roundTimer) clearTimeout(this.roundTimer);
    if (this.bettingCountdownTimer) clearInterval(this.bettingCountdownTimer);
    if (this.runningCountdownTimer) clearInterval(this.runningCountdownTimer);
    this.io.emit('game:phase', { phase: 'stopped' });
    this.io.emit('game:stopped');
  }

  startNewGame() {
    if (this.roundPhase === 'stopped') {
      this.scheduleNextRound();
    }
  }
}

// Export the class
module.exports = GameService;