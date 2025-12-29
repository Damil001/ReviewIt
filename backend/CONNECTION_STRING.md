# MongoDB Atlas Connection String Setup

## Your Credentials
- **Username**: `damiljamil63_db_user`
- **Password**: `hRGBAIKyPQ7Ll236` (keep this secure!)

## Step 1: Get Your Cluster Connection String

1. In MongoDB Atlas, click **"Connect"** on your cluster
2. Select **"Connect your application"** (the first option with the code icon)
3. Choose **"Node.js"** as the driver
4. Copy the connection string - it will look like:
   ```
   mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
   ```

## Step 2: Create Your .env File

In the `backend` directory, create a `.env` file with:

```env
PORT=3001
MONGODB_URI=mongodb+srv://damiljamil63_db_user:hRGBAIKyPQ7Ll236@cluster0.xxxxx.mongodb.net/reviewonly?retryWrites=true&w=majority
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
```

**Important**: Replace `cluster0.xxxxx.mongodb.net` with your actual cluster address from Atlas.

## Step 3: Whitelist Your IP Address

Before connecting, you need to whitelist your IP:

1. In MongoDB Atlas, go to **"Network Access"** (left sidebar)
2. Click **"Add IP Address"**
3. For development, click **"Allow Access from Anywhere"** (0.0.0.0/0)
   - Or add your specific IP address for better security
4. Click **"Confirm"**

## Step 4: Test the Connection

```bash
cd backend
npm run test-db
```

You should see:
```
✅ Connection successful!
```

## Step 5: Start Your Server

```bash
npm run dev
```

Expected output:
```
✅ MongoDB connected successfully
   Database: reviewonly
   Host: cluster0.xxxxx.mongodb.net

🚀 Server running on http://localhost:3001
```

## Security Notes

⚠️ **Important Security Tips:**
- Never commit your `.env` file to git (it's already in `.gitignore`)
- Don't share your connection string publicly
- For production, use environment variables on your hosting platform
- Consider using IP whitelisting instead of "Allow from anywhere" in production

