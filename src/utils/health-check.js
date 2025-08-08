/**
 * Health Check Script
 * 
 * This script can be used to verify that your deployment is working correctly.
 * It checks the health endpoint of your API and reports the status.
 */

const axios = require('axios');
require('dotenv').config();

// Get the API URL from command line arguments or use default
const API_URL = process.argv[2] || process.env.API_URL || 'http://localhost:3000';

async function checkHealth() {
  console.log(`Checking health of API at: ${API_URL}`);
  
  try {
    // Check the health endpoint
    const healthResponse = await axios.get(`${API_URL}/health`);
    console.log('\n✅ Health Check Response:');
    console.log(JSON.stringify(healthResponse.data, null, 2));
    
    // Check if MongoDB is connected
    if (healthResponse.data.mongodb === 'connected') {
      console.log('\n✅ MongoDB is connected');
    } else {
      console.log('\n⚠️ MongoDB is not connected');
    }
    
    // Check if the API is responding to game history requests
    try {
      const historyResponse = await axios.get(`${API_URL}/api/game/history`);
      console.log('\n✅ Game history endpoint is working');
      console.log(`Found ${historyResponse.data.length} game rounds`);
    } catch (error) {
      console.log('\n❌ Game history endpoint error:', error.message);
    }
    
    console.log('\n✅ Health check completed successfully');
  } catch (error) {
    console.error('\n❌ Health check failed:');
    if (error.response) {
      // The request was made and the server responded with a status code
      // that falls out of the range of 2xx
      console.error(`Status: ${error.response.status}`);
      console.error('Response:', error.response.data);
    } else if (error.request) {
      // The request was made but no response was received
      console.error('No response received from server. The server might be down or unreachable.');
    } else {
      // Something happened in setting up the request that triggered an Error
      console.error('Error:', error.message);
    }
    
    console.log('\nTroubleshooting tips:');
    console.log('1. Check if the server is running');
    console.log('2. Verify the API URL is correct');
    console.log('3. Check if there are any network issues');
    console.log('4. Verify environment variables are set correctly');
    
    process.exit(1);
  }
}

checkHealth();