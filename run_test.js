/**
 * Test script for Crypto Crash Game
 * 
 * This script helps to:
 * 1. Start the server
 * 2. Seed the database with sample data
 * 3. Test basic API endpoints
 */

const { spawn } = require('child_process');
const axios = require('axios');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const API_URL = 'http://localhost:3000/api';
let token = null;

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m'
};

/**
 * Print a colored message to the console
 */
function printMessage(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

/**
 * Seed the database with sample data
 */
async function seedDatabase() {
  printMessage('\nSeeding database with sample data...', colors.yellow);
  
  try {
    const seedProcess = spawn('node', ['src/utils/seedDatabase.js'], { stdio: 'inherit' });
    
    return new Promise((resolve, reject) => {
      seedProcess.on('close', (code) => {
        if (code === 0) {
          printMessage('Database seeded successfully!', colors.green);
          resolve();
        } else {
          printMessage('Failed to seed database.', colors.red);
          reject(new Error('Seed process exited with code ' + code));
        }
      });
    });
  } catch (error) {
    printMessage(`Error seeding database: ${error.message}`, colors.red);
    throw error;
  }
}

/**
 * Test user registration
 */
async function testRegistration() {
  printMessage('\nTesting user registration...', colors.yellow);
  
  try {
    const username = `testuser_${Date.now().toString().slice(-4)}`;
    const email = `test_${Date.now().toString().slice(-4)}@example.com`;
    const password = 'password123';
    
    const response = await axios.post(`${API_URL}/auth/register`, {
      username,
      email,
      password
    });
    
    token = response.data.token;
    
    printMessage('Registration successful!', colors.green);
    printMessage(`Username: ${username}`, colors.cyan);
    printMessage(`Email: ${email}`, colors.cyan);
    printMessage(`Password: ${password}`, colors.cyan);
    printMessage(`Token: ${token.substring(0, 20)}...`, colors.cyan);
    
    return { username, email, password };
  } catch (error) {
    printMessage(`Error during registration: ${error.response?.data?.message || error.message}`, colors.red);
    throw error;
  }
}

/**
 * Test user login
 */
async function testLogin(email, password) {
  printMessage('\nTesting user login...', colors.yellow);
  
  try {
    const response = await axios.post(`${API_URL}/auth/login`, {
      email,
      password
    });
    
    token = response.data.token;
    
    printMessage('Login successful!', colors.green);
    printMessage(`Token: ${token.substring(0, 20)}...`, colors.cyan);
    
    return token;
  } catch (error) {
    printMessage(`Error during login: ${error.response?.data?.message || error.message}`, colors.red);
    throw error;
  }
}

/**
 * Test getting wallet information
 */
async function testGetWallet() {
  printMessage('\nTesting get wallet...', colors.yellow);
  
  try {
    const response = await axios.get(`${API_URL}/wallet`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    
    printMessage('Wallet retrieved successfully!', colors.green);
    printMessage('Balances:', colors.cyan);
    
    for (const [currency, details] of Object.entries(response.data.balances)) {
      printMessage(`  ${currency}: ${details.amount.toFixed(8)} ($${details.usdEquivalent.toFixed(2)})`, colors.cyan);
    }
    
    return response.data;
  } catch (error) {
    printMessage(`Error getting wallet: ${error.response?.data?.message || error.message}`, colors.red);
    throw error;
  }
}

/**
 * Test getting cryptocurrency prices
 */
async function testGetPrices() {
  printMessage('\nTesting get cryptocurrency prices...', colors.yellow);
  
  try {
    const response = await axios.get(`${API_URL}/wallet/prices`);
    
    printMessage('Prices retrieved successfully!', colors.green);
    printMessage('Current prices:', colors.cyan);
    
    for (const [currency, price] of Object.entries(response.data)) {
      printMessage(`  ${currency}: $${price.toFixed(2)}`, colors.cyan);
    }
    
    return response.data;
  } catch (error) {
    printMessage(`Error getting prices: ${error.response?.data?.message || error.message}`, colors.red);
    throw error;
  }
}

/**
 * Test placing a bet
 */
async function testPlaceBet() {
  printMessage('\nTesting place bet...', colors.yellow);
  
  try {
    const response = await axios.post(`${API_URL}/game/bet`, {
      usdAmount: 10,
      currency: 'BTC'
    }, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    
    printMessage('Bet placed successfully!', colors.green);
    printMessage(`USD Amount: $${response.data.bet.usdAmount}`, colors.cyan);
    printMessage(`Crypto Amount: ${response.data.bet.cryptoAmount} ${response.data.bet.currency}`, colors.cyan);
    printMessage(`Price at Bet: $${response.data.bet.priceAtBet}`, colors.cyan);
    
    return response.data;
  } catch (error) {
    printMessage(`Error placing bet: ${error.response?.data?.message || error.message}`, colors.red);
    throw error;
  }
}

/**
 * Test getting game state
 */
async function testGetGameState() {
  printMessage('\nTesting get game state...', colors.yellow);
  
  try {
    const response = await axios.get(`${API_URL}/game/state`);
    
    printMessage('Game state retrieved successfully!', colors.green);
    printMessage(`Status: ${response.data.status}`, colors.cyan);
    printMessage(`Multiplier: ${response.data.multiplier}x`, colors.cyan);
    
    if (response.data.status === 'waiting') {
      printMessage(`Next Round In: ${response.data.nextRoundIn}s`, colors.cyan);
    }
    
    return response.data;
  } catch (error) {
    printMessage(`Error getting game state: ${error.response?.data?.message || error.message}`, colors.red);
    throw error;
  }
}

/**
 * Test getting game history
 */
async function testGetGameHistory() {
  printMessage('\nTesting get game history...', colors.yellow);
  
  try {
    const response = await axios.get(`${API_URL}/game/history`);
    
    printMessage('Game history retrieved successfully!', colors.green);
    printMessage(`Total Rounds: ${response.data.length}`, colors.cyan);
    
    if (response.data.length > 0) {
      printMessage('Latest rounds:', colors.cyan);
      
      response.data.slice(0, 3).forEach(round => {
        printMessage(`  Round ${round.roundNumber}: Crashed at ${round.crashPoint.toFixed(2)}x`, colors.cyan);
      });
    }
    
    return response.data;
  } catch (error) {
    printMessage(`Error getting game history: ${error.response?.data?.message || error.message}`, colors.red);
    throw error;
  }
}

/**
 * Run all tests
 */
async function runTests() {
  try {
    printMessage('\n=== CRYPTO CRASH GAME TEST SCRIPT ===', colors.bright + colors.yellow);
    
    // Ask if user wants to seed the database
    const seedAnswer = await new Promise(resolve => {
      rl.question('Do you want to seed the database with sample data? (y/n): ', answer => {
        resolve(answer.toLowerCase());
      });
    });
    
    if (seedAnswer === 'y' || seedAnswer === 'yes') {
      await seedDatabase();
    }
    
    // Test registration and login
    const { email, password } = await testRegistration();
    await testLogin(email, password);
    
    // Test wallet and prices
    await testGetWallet();
    await testGetPrices();
    
    // Test game functionality
    await testGetGameState();
    await testGetGameHistory();
    
    // Ask if user wants to place a bet
    const betAnswer = await new Promise(resolve => {
      rl.question('Do you want to place a test bet? (y/n): ', answer => {
        resolve(answer.toLowerCase());
      });
    });
    
    if (betAnswer === 'y' || betAnswer === 'yes') {
      await testPlaceBet();
    }
    
    printMessage('\n=== ALL TESTS COMPLETED SUCCESSFULLY ===', colors.bright + colors.green);
    printMessage('\nTo test the WebSocket functionality, open the following URL in your browser:', colors.yellow);
    printMessage('http://localhost:3000/index.html', colors.cyan);
    
  } catch (error) {
    printMessage(`\n=== TEST FAILED ===\n${error.message}`, colors.bright + colors.red);
  } finally {
    rl.close();
  }
}

// Run the tests
runTests();