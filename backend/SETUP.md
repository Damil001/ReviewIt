# MongoDB Setup Guide

## Option 1: Local MongoDB Installation

### Windows

1. Download MongoDB Community Server from [mongodb.com](https://www.mongodb.com/try/download/community)
2. Install MongoDB
3. MongoDB should start automatically as a Windows service
4. Verify it's running: Open Command Prompt and run:
   ```bash
   mongod --version
   ```

### macOS

```bash
# Using Homebrew
brew tap mongodb/brew
brew install mongodb-community
brew services start mongodb-community
```

### Linux (Ubuntu/Debian)

```bash
# Import MongoDB public GPG key
wget -qO - https://www.mongodb.org/static/pgp/server-7.0.asc | sudo apt-key add -

# Add MongoDB repository
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu focal/mongodb-org/7.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-7.0.list

# Install MongoDB
sudo apt-get update
sudo apt-get install -y mongodb-org

# Start MongoDB
sudo systemctl start mongod
sudo systemctl enable mongod
```

## Option 2: MongoDB Atlas (Cloud - Recommended for Production)

1. Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Create a free account
3. Create a new cluster (free tier available)
4. Create a database user:
   - Go to "Database Access"
   - Click "Add New Database User"
   - Choose "Password" authentication
   - Create username and password
5. Whitelist your IP:
   - Go to "Network Access"
   - Click "Add IP Address"
   - Click "Allow Access from Anywhere" (for development) or add your IP
6. Get connection string:

   - Go to "Clusters"
   - Click "Connect"
   - Choose "Connect your application" (first option with code icon)
   - Select "Node.js" as the driver
   - Copy the connection string
   - Replace `<password>` with your database user password
   - Replace `<dbname>` with `reviewonly` or your preferred database name
   - The final string should look like:
     ```
     mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/reviewonly?retryWrites=true&w=majority
     ```

7. **IMPORTANT**: Whitelist your IP address:
   - Go to "Network Access" in the left sidebar
   - Click "Add IP Address"
   - For development: Click "Allow Access from Anywhere" (0.0.0.0/0)
   - For production: Add your specific IP address
   - Click "Confirm"

## Environment Setup

1. Create a `.env` file in the `backend` directory:

```env
PORT=3001
MONGODB_URI=mongodb://localhost:27017/reviewonly
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
```

2. For MongoDB Atlas, use:

```env
MONGODB_URI=mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/reviewonly?retryWrites=true&w=majority
```

## Verify Connection

1. Start the backend server:

```bash
cd backend
npm run dev
```

2. You should see:

```
✅ MongoDB connected successfully
   Database: reviewonly
   Host: localhost:27017
```

If you see connection errors, check:

- MongoDB is running (local) or connection string is correct (Atlas)
- Firewall isn't blocking the connection
- Database user credentials are correct (Atlas)

## Troubleshooting

### "MongoDB connection error"

- **Local**: Make sure MongoDB service is running
  - Windows: Check Services (services.msc) for MongoDB
  - macOS/Linux: `brew services list` or `sudo systemctl status mongod`
- **Atlas**: Verify connection string and IP whitelist

### "Authentication failed"

- Check username and password in connection string
- Ensure database user has proper permissions

### "Connection timeout"

- Check network connectivity
- Verify IP is whitelisted (Atlas)
- Check firewall settings
