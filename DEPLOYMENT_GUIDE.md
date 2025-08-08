# Deployment Guide for Crypto Crash Game

This guide will help you deploy your Crypto Crash Game application to Render (backend) and Vercel (frontend).

## Prerequisites

- GitHub account
- Render account (https://render.com)
- Vercel account (https://vercel.com)
- Your project code pushed to a GitHub repository

## Part 1: Deploying the Backend to Render

### Step 1: Prepare Your Backend for Deployment

1. Make sure your backend code is ready for production:
   - Update your `.env` file to include production-ready values
   - Ensure your MongoDB connection string is set up for a production database
   - Make sure your server listens on the port provided by Render: `const PORT = process.env.PORT || 3000;`

2. Create a `render.yaml` file in your project root with the following content:

```yaml
services:
  - type: web
    name: crypto-crash-api
    env: node
    buildCommand: npm install
    startCommand: node src/server.js
    envVars:
      - key: NODE_ENV
        value: production
      - key: MONGODB_URI
        sync: false # You'll set this in the Render dashboard
      - key: JWT_SECRET
        sync: false # You'll set this in the Render dashboard
```

### Step 2: Deploy to Render

1. Sign up or log in to [Render](https://render.com)

2. Click on "New" and select "Web Service"

3. Connect your GitHub repository

4. Configure your web service:
   - **Name**: crypto-crash-api (or your preferred name)
   - **Environment**: Node
   - **Build Command**: `npm install`
   - **Start Command**: `node src/server.js`

5. Add environment variables:
   - Click on "Advanced" and add your environment variables:
     - `NODE_ENV`: production
     - `MONGODB_URI`: Your MongoDB connection string (use MongoDB Atlas for production)
     - `JWT_SECRET`: Your JWT secret key
     - Any other environment variables your app needs

6. Click "Create Web Service"

7. Render will automatically build and deploy your application. Once deployed, you'll get a URL like `https://crypto-crash-api.onrender.com`

### Step 3: Set Up MongoDB Atlas (Production Database)

1. Sign up or log in to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)

2. Create a new cluster (the free tier is sufficient for starting)

3. Set up database access:
   - Create a database user with a strong password
   - Add your IP to the IP Access List (or allow access from anywhere for testing)

4. Get your connection string:
   - Click "Connect" on your cluster
   - Select "Connect your application"
   - Copy the connection string and replace `<password>` with your database user's password

5. Update your Render environment variable `MONGODB_URI` with this connection string

## Part 2: Deploying the Frontend to Vercel

### Step 1: Prepare Your Frontend for Deployment

1. Update your frontend code to use the deployed backend URL:

```javascript
// Change this in your index.html file
const API_URL = 'https://crypto-crash-api.onrender.com/api'; // Replace with your actual Render URL
```

2. Make sure your WebSocket connection also uses the deployed URL:

```javascript
// Change this in your WebSocket connection code
socket = io('https://crypto-crash-api.onrender.com', { // Replace with your actual Render URL
  auth: { token },
  // other options...
});
```

### Step 2: Deploy to Vercel

1. Sign up or log in to [Vercel](https://vercel.com)

2. Click on "New Project"

3. Import your GitHub repository

4. Configure your project:
   - **Framework Preset**: Other (or select the appropriate framework if you're using one)
   - **Build Command**: Leave empty if you're just serving static files
   - **Output Directory**: `public` (or the directory containing your frontend files)

5. Click "Deploy"

6. Vercel will automatically build and deploy your application. Once deployed, you'll get a URL like `https://crypto-crash.vercel.app`

## Part 3: Connecting Frontend and Backend

### CORS Configuration

Make sure your backend allows requests from your Vercel domain by updating your CORS configuration in `server.js`:

```javascript
app.use(cors({
  origin: [
    'https://crypto-crash.vercel.app', // Your Vercel domain
    'http://localhost:3000' // For local development
  ],
  credentials: true
}));
```

### WebSocket Configuration

Update your WebSocket server to accept connections from your Vercel domain:

```javascript
const io = new Server(server, {
  cors: {
    origin: [
      'https://crypto-crash.vercel.app', // Your Vercel domain
      'http://localhost:3000' // For local development
    ],
    methods: ['GET', 'POST'],
    credentials: true
  }
});
```

## Part 4: Testing Your Deployment

1. Visit your Vercel URL (e.g., `https://crypto-crash.vercel.app`)

2. Test all functionality:
   - Registration and login
   - Placing bets
   - Cashing out
   - WebSocket real-time updates

3. Check for any errors in the browser console or server logs

## Troubleshooting

### Backend Issues

- **MongoDB Connection Errors**: Make sure your MongoDB Atlas cluster is properly configured and the connection string is correct
- **CORS Errors**: Verify that your CORS configuration includes your Vercel domain
- **Environment Variables**: Check that all required environment variables are set in the Render dashboard

### Frontend Issues

- **API Connection Errors**: Ensure your frontend is using the correct Render URL for API calls
- **WebSocket Connection Errors**: Check that your WebSocket connection is using the correct URL and protocol (wss:// for secure connections)

## Maintenance

- Monitor your application's performance and logs in the Render and Vercel dashboards
- Set up automatic database backups in MongoDB Atlas
- Consider setting up a CI/CD pipeline for automated deployments

## Security Considerations

- Use environment variables for sensitive information (never commit secrets to your repository)
- Implement rate limiting to prevent abuse
- Set up proper authentication and authorization
- Use HTTPS for all communications
- Regularly update dependencies to patch security vulnerabilities

Congratulations! Your Crypto Crash Game should now be fully deployed and accessible online.