# MongoDB Quick Start Guide

## Step 1: Install MongoDB

### Option A: Local Installation (Recommended for Development)

**Windows:**
1. Download from [mongodb.com/download](https://www.mongodb.com/try/download/community)
2. Run the installer
3. MongoDB will start as a Windows service automatically

**macOS:**
```bash
brew tap mongodb/brew
brew install mongodb-community
brew services start mongodb-community
```

**Linux:**
```bash
# See SETUP.md for detailed Linux instructions
```

### Option B: MongoDB Atlas (Cloud - Free Tier Available)

1. Sign up at [mongodb.com/cloud/atlas](https://www.mongodb.com/cloud/atlas)
2. Create a free cluster
3. Create database user
4. Whitelist IP (use 0.0.0.0/0 for development)
5. Get connection string

## Step 2: Create .env File

Create a `.env` file in the `backend` directory:

```env
PORT=3001
MONGODB_URI=mongodb://localhost:27017/reviewonly
JWT_SECRET=your-super-secret-jwt-key-change-this
```

**For MongoDB Atlas, use:**
```env
MONGODB_URI=mongodb+srv://damiljamil63_db_user:hRGBAIKyPQ7Ll236@cluster0.xxxxx.mongodb.net/reviewonly?retryWrites=true&w=majority
```

**Important Steps:**
1. Replace `cluster0.xxxxx.mongodb.net` with your actual cluster address from Atlas
2. **Whitelist your IP** in Atlas:
   - Go to "Network Access" → "Add IP Address"
   - Click "Allow Access from Anywhere" for development
   - Or add your specific IP for better security

## Step 3: Test Connection

```bash
cd backend
npm run test-db
```

You should see:
```
✅ Connection successful!
```

## Step 4: Start Server

```bash
npm run dev
```

Expected output:
```
✅ MongoDB connected successfully
   Database: reviewonly
   Host: localhost:27017

🚀 Server running on http://localhost:3001
📡 API endpoints available at http://localhost:3001/api

✨ Ready to accept requests!
```

## Troubleshooting

### "MongoDB connection error"
- **Local**: Check if MongoDB is running
  - Windows: Services → MongoDB
  - macOS: `brew services list`
  - Linux: `sudo systemctl status mongod`
- **Atlas**: Verify connection string and IP whitelist

### "Connection timeout"
- Check firewall settings
- Verify network connectivity
- For Atlas: Ensure IP is whitelisted

### Need more help?
See `SETUP.md` for detailed instructions.

