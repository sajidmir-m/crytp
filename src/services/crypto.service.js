const axios = require('axios');
const NodeCache = require('node-cache');
const config = require('../config/config');

class CryptoService {
  constructor() {
    // Initialize cache with 10 seconds TTL
    this.cache = new NodeCache({ stdTTL: 10 });
    this.apiUrl = config.cryptoApi.coinGeckoUrl;
    this.supportedCurrencies = config.cryptoApi.supportedCurrencies;
    this.currencyIds = {
      'BTC': 'bitcoin',
      'ETH': 'ethereum'
    };
  }

  /**
   * Get current price for a cryptocurrency
   * @param {string} currency - Cryptocurrency symbol (BTC, ETH)
   * @returns {Promise<number>} - Current price in USD
   */
  async getPrice(currency) {
    if (!this.supportedCurrencies.includes(currency)) {
      throw new Error(`Unsupported currency: ${currency}`);
    }

    // Check if price is in cache
    const cacheKey = `price_${currency}`;
    const cachedPrice = this.cache.get(cacheKey);
    
    if (cachedPrice !== undefined) {
      return cachedPrice;
    }

    try {
      // Fetch price from CoinGecko API
      const currencyId = this.currencyIds[currency];
      const response = await axios.get(`${this.apiUrl}/simple/price`, {
        params: {
          ids: currencyId,
          vs_currencies: 'usd'
        }
      });

      const price = response.data[currencyId].usd;
      
      // Cache the price
      this.cache.set(cacheKey, price);
      
      return price;
    } catch (error) {
      console.error(`Error fetching ${currency} price:`, error.message);
      
      // If we have a cached price, return it even if expired
      const oldPrice = this.cache.get(cacheKey, true);
      if (oldPrice) {
        console.log(`Using expired cached price for ${currency}: $${oldPrice}`);
        return oldPrice;
      }
      
      // Return mock prices if API is unavailable
      const mockPrices = {
        'BTC': 60000,
        'ETH': 3000
      };
      
      console.log(`Using mock price for ${currency}: $${mockPrices[currency]}`);
      this.cache.set(cacheKey, mockPrices[currency]);
      return mockPrices[currency];
    }
  }

  /**
   * Convert USD to cryptocurrency
   * @param {number} usdAmount - Amount in USD
   * @param {string} currency - Cryptocurrency symbol (BTC, ETH)
   * @returns {Promise<{cryptoAmount: number, price: number}>} - Converted amount and price used
   */
  async usdToCrypto(usdAmount, currency) {
    const price = await this.getPrice(currency);
    const cryptoAmount = usdAmount / price;
    
    return {
      cryptoAmount,
      price
    };
  }

  /**
   * Convert cryptocurrency to USD
   * @param {number} cryptoAmount - Amount in cryptocurrency
   * @param {string} currency - Cryptocurrency symbol (BTC, ETH)
   * @returns {Promise<{usdAmount: number, price: number}>} - Converted amount and price used
   */
  async cryptoToUsd(cryptoAmount, currency) {
    const price = await this.getPrice(currency);
    const usdAmount = cryptoAmount * price;
    
    return {
      usdAmount,
      price
    };
  }

  /**
   * Get prices for all supported cryptocurrencies
   * @returns {Promise<Object>} - Object with currency symbols as keys and prices as values
   */
  async getAllPrices() {
    const prices = {};
    
    for (const currency of this.supportedCurrencies) {
      prices[currency] = await this.getPrice(currency);
    }
    
    return prices;
  }
}

module.exports = new CryptoService();