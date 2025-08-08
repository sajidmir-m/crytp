const crypto = require('crypto');

/**
 * Utility functions for provably fair crash game
 */
const provablyFair = {
  /**
   * Generate a random seed
   * @returns {string} - Random seed
   */
  generateSeed: () => {
    return crypto.randomBytes(32).toString('hex');
  },
  
  /**
   * Generate a hash from a seed and round number
   * @param {string} seed - Random seed
   * @param {number} roundNumber - Game round number
   * @returns {string} - Hash
   */
  generateHash: (seed, roundNumber) => {
    return crypto.createHash('sha256')
      .update(`${seed}:${roundNumber}`)
      .digest('hex');
  },
  
  /**
   * Calculate crash point from a hash
   * @param {string} hash - Hash generated from seed and round number
   * @param {number} maxCrashValue - Maximum crash value
   * @returns {number} - Crash point
   */
  calculateCrashPoint: (hash, maxCrashValue = 100) => {
    // Use the first 8 characters of the hash to generate a number
    const hashFragment = hash.slice(0, 8);
    const decimal = parseInt(hashFragment, 16);
    
    // Calculate crash point with 2 decimal places
    // Ensure minimum crash point is 1.0
    let crashPoint = 1.0 + (decimal % maxCrashValue);
    
    // Ensure crash point has 2 decimal places
    crashPoint = parseFloat(crashPoint.toFixed(2));
    
    return crashPoint;
  },
  
  /**
   * Verify a crash point using the seed, round number, and hash
   * @param {string} seed - Random seed
   * @param {number} roundNumber - Game round number
   * @param {string} hash - Hash generated from seed and round number
   * @param {number} crashPoint - Crash point
   * @param {number} maxCrashValue - Maximum crash value
   * @returns {boolean} - Whether the crash point is valid
   */
  verifyCrashPoint: (seed, roundNumber, hash, crashPoint, maxCrashValue = 100) => {
    // Verify the hash
    const calculatedHash = provablyFair.generateHash(seed, roundNumber);
    
    if (calculatedHash !== hash) {
      return false;
    }
    
    // Verify the crash point
    const calculatedCrashPoint = provablyFair.calculateCrashPoint(hash, maxCrashValue);
    
    return calculatedCrashPoint === crashPoint;
  }
};

module.exports = provablyFair;