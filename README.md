# Crypto Crash Game

A real-time multiplayer "Crash" game where players bet in USD, which is converted to cryptocurrency (BTC or ETH) using real-time prices. Players watch a multiplier increase and decide when to cash out before the game crashes.

## Features

- **Real-time Game Mechanics**: Game rounds start every 10 seconds with multiplier updates every 100ms
- **Cryptocurrency Integration**: Bets in USD are converted to crypto using real-time prices from CoinGecko API
- **Provably Fair Algorithm**: Transparent and verifiable crash point generation
- **WebSocket Communication**: Real-time updates for all connected players
- **User Authentication**: Secure registration and login system
- **Wallet Management**: Track cryptocurrency balances and transaction history

## Tech Stack

- **Backend**: Node.js with Express.js
- **Database**: MongoDB with Mongoose ODM
- **Real-time Communication**: Socket.IO
- **Cryptocurrency API**: CoinGecko API
- **Authentication**: JWT (JSON Web Tokens)

## Setup Instructions

### Prerequisites

- Node.js (v16 or higher)
- MongoDB (local or Atlas)

### Installation

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd crypto-crash-game
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env` file in the root directory with the following variables:
   ```
   # Server Configuration
   PORT=3000
   NODE_ENV=development
   
   # MongoDB Configuration
   MONGODB_URI=mongodb://localhost:27017/crypto-crash
   
   # JWT Configuration
   JWT_SECRET=your_jwt_secret_key_here
   JWT_EXPIRATION=7d
   
   # Crypto API Configuration (CoinGecko)
   COINGECKO_API_URL=https://api.coingecko.com/api/v3
   
   # Game Configuration
   GAME_ROUND_INTERVAL=10000
   MULTIPLIER_UPDATE_INTERVAL=100
   MAX_CRASH_VALUE=100
   
   # Frontend URL for CORS
   ALLOWED_ORIGINS=http://localhost:3000
   
   # Logging
   LOG_LEVEL=info
   ```

4. Start the server:
   ```bash
   # For production
   npm start
   
   # For development with auto-restart
   npm run dev
   ```

5. The server will be running at `http://localhost:3000`

### Populating Sample Data

To populate the database with sample data (users, wallets, game rounds):

```bash
npm run seed
```

This will create:
- 3 sample users with credentials (email: user1@example.com, password: password123)
- Wallets for each user with initial balances
- Sample game rounds with bets and cashouts

### Deployment

For detailed deployment instructions to Render (backend) and Vercel (frontend), please refer to the [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md) file.

## API Endpoints

### Authentication

- **POST /api/auth/register** - Register a new user
  - Request: `{ "username": "string", "email": "string", "password": "string" }`
  - Response: `{ "token": "string", "user": { "_id": "string", "username": "string", "email": "string" } }`

- **POST /api/auth/login** - Login a user
  - Request: `{ "email": "string", "password": "string" }`
  - Response: `{ "token": "string", "user": { "_id": "string", "username": "string", "email": "string" } }`

- **GET /api/auth/profile** - Get current user profile (requires authentication)
  - Response: `{ "user": { "_id": "string", "username": "string", "email": "string" } }`

### Game

- **GET /api/game/state** - Get current game state
  - Response: `{ "status": "string", "multiplier": "number", "roundId": "string", "nextRoundIn": "number" }`

- **GET /api/game/history** - Get game round history
  - Response: `[{ "roundNumber": "number", "startTime": "date", "endTime": "date", "crashPoint": "number", "seed": "string", "hash": "string" }]`

- **POST /api/game/bet** - Place a bet (requires authentication)
  - Request: `{ "usdAmount": "number", "currency": "string" }`
  - Response: `{ "bet": { "userId": "string", "usdAmount": "number", "cryptoAmount": "number", "currency": "string", "priceAtBet": "number" } }`

- **POST /api/game/cashout** - Cash out (requires authentication)
  - Response: `{ "cashout": { "userId": "string", "usdAmount": "number", "cryptoAmount": "number", "currency": "string", "multiplier": "number" } }`

### Wallet

- **GET /api/wallet** - Get user wallet (requires authentication)
  - Response: `{ "balances": { "BTC": { "amount": "number", "usdEquivalent": "number" }, "ETH": { "amount": "number", "usdEquivalent": "number" } } }`

- **GET /api/wallet/transactions** - Get user transactions (requires authentication)
  - Response: `[{ "userId": "string", "usdAmount": "number", "cryptoAmount": "number", "currency": "string", "transactionType": "string", "transactionHash": "string", "priceAtTime": "number", "timestamp": "date" }]`

- **GET /api/wallet/prices** - Get current cryptocurrency prices
  - Response: `{ "BTC": "number", "ETH": "number" }`

## WebSocket Events

### Client to Server

- **game:cashout** - Request to cash out during a game round

### Server to Client

- **game:waiting** - Game is waiting for the next round to start
  - Payload: `{ "nextRoundIn": "number" }`

- **game:started** - A new game round has started
  - Payload: `{ "roundId": "string", "roundNumber": "number" }`

- **game:multiplier** - Multiplier update
  - Payload: `{ "multiplier": "number" }`

- **game:cashout** - A player has cashed out
  - Payload: `{ "userId": "string", "username": "string", "multiplier": "number", "usdAmount": "number" }`

- **game:cashout:success** - Current player's cashout was successful
  - Payload: `{ "cashout": { "userId": "string", "usdAmount": "number", "cryptoAmount": "number", "currency": "string", "multiplier": "number" } }`

- **game:crashed** - The game has crashed
  - Payload: `{ "crashPoint": "number", "roundId": "string" }`

- **error** - An error occurred
  - Payload: `{ "message": "string" }`

## Provably Fair Algorithm

The game uses a provably fair algorithm to determine crash points:

1. For each round, a random seed is generated using cryptographically secure methods
2. The seed is combined with the round number and hashed using SHA-256
3. The hash is converted to a number and used to calculate the crash point
4. The seed for the current round is revealed after the round ends
5. Players can verify the crash point by using the provided seed and round number

Formula: `crashPoint = (100 * hash / (2^52 - 1)) / (1 - (hash % 101) / 101)`

## Testing

### WebSocket Client

A simple WebSocket client is included for testing the real-time functionality. Open `public/index.html` in your browser after starting the server.

### API Testing

You can use the following cURL commands to test the API endpoints:

**Register a user:**
```
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser","email":"test@example.com","password":"password123"}'
```

**Login:**
```
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'
```

**Place a bet:**
```
curl -X POST http://localhost:3000/api/game/bet \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"usdAmount":10,"currency":"BTC"}'
```

**Cash out:**
```
curl -X POST http://localhost:3000/api/game/cashout \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## License

MIT"# crypto" 
