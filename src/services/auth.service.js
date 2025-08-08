const jwt = require('jsonwebtoken');
const User = require('../models/user.model');
const Wallet = require('../models/wallet.model');
const config = require('../config/config');

class AuthService {
  /**
   * Register a new user
   * @param {Object} userData - User data (username, email, password)
   * @returns {Promise<Object>} - Registered user and token
   */
  async register(userData) {
    try {
      // Check if user already exists
      const existingUser = await User.findOne({
        $or: [
          { email: userData.email },
          { username: userData.username }
        ]
      });
      
      if (existingUser) {
        throw new Error('User with this email or username already exists');
      }
      
      // Create new user
      const user = new User(userData);
      await user.save();
      
      // Create wallet for the user
      const wallet = new Wallet({ userId: user._id });
      await wallet.save();
      
      // Generate JWT token
      const token = this.generateToken(user);
      
      return {
        user: {
          _id: user._id,
          username: user.username,
          email: user.email
        },
        token
      };
    } catch (error) {
      console.error('Error registering user:', error);
      throw error;
    }
  }

  /**
   * Login a user
   * @param {string} email - User email
   * @param {string} password - User password
   * @returns {Promise<Object>} - Logged in user and token
   */
  async login(email, password) {
    try {
      // Find user by email
      const user = await User.findOne({ email });
      
      if (!user) {
        throw new Error('Invalid email or password');
      }
      
      // Check password
      const isPasswordValid = await user.comparePassword(password);
      
      if (!isPasswordValid) {
        throw new Error('Invalid email or password');
      }
      
      // Generate JWT token
      const token = this.generateToken(user);
      
      return {
        user: {
          _id: user._id,
          username: user.username,
          email: user.email
        },
        token
      };
    } catch (error) {
      console.error('Error logging in user:', error);
      throw error;
    }
  }

  /**
   * Generate JWT token for a user
   * @param {Object} user - User object
   * @returns {string} - JWT token
   */
  generateToken(user) {
    const payload = {
      userId: user._id,
      email: user.email,
      username: user.username
    };
    
    return jwt.sign(payload, config.jwt.secret, {
      expiresIn: config.jwt.expiresIn
    });
  }

  /**
   * Verify JWT token
   * @param {string} token - JWT token
   * @returns {Object} - Decoded token payload
   */
  verifyToken(token) {
    try {
      return jwt.verify(token, config.jwt.secret);
    } catch (error) {
      throw new Error('Invalid token');
    }
  }

  /**
   * Get user by ID
   * @param {string} userId - User ID
   * @returns {Promise<Object>} - User object
   */
  async getUserById(userId) {
    try {
      const user = await User.findById(userId);
      
      if (!user) {
        throw new Error('User not found');
      }
      
      return {
        _id: user._id,
        username: user.username,
        email: user.email
      };
    } catch (error) {
      console.error('Error getting user:', error);
      throw error;
    }
  }
}

module.exports = new AuthService();