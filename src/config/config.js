require('dotenv').config();

module.exports = {
  // Server Configuration
  port: process.env.PORT || 3000,
  
  // MongoDB Configuration
  mongodbUri: process.env.MONGODB_URI || 'mongodb://localhost:27017/crypto-crash',
  
  // JWT Configuration
  jwt: {
    secret: process.env.JWT_SECRET || 'your_jwt_secret_key_here',
    expiresIn: '24h'
  },
  
  // Crypto API Configuration
  cryptoApi: {
    coinGeckoUrl: process.env.COINGECKO_API_URL || 'https://api.coingecko.com/api/v3',
    supportedCurrencies: ['BTC', 'ETH']
  },
  
  // Game Configuration
  game: {
    roundInterval: parseInt(process.env.GAME_ROUND_INTERVAL) || 10000, // 10 seconds
    multiplierUpdateInterval: parseInt(process.env.MULTIPLIER_UPDATE_INTERVAL) || 100, // 100ms
    maxCrashValue: parseInt(process.env.MAX_CRASH_VALUE) || 100, // 100x
    growthFactor: 0.00005, // Controls how fast the multiplier grows
    initialMultiplier: 1.0
  }
};