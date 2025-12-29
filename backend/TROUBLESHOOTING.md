# MongoDB Connection Troubleshooting

## Common Error: `queryTxt ETIMEOUT`

This error means your IP address is **not whitelisted** in MongoDB Atlas.

### Solution: Whitelist Your IP Address

1. **Go to MongoDB Atlas Dashboard**
   - Log in at [cloud.mongodb.com](https://cloud.mongodb.com)

2. **Navigate to Network Access**
   - Click on **"Network Access"** in the left sidebar
   - (Under the "Security" section)

3. **Add IP Address**
   - Click the green **"Add IP Address"** button
   - You have two options:

   **Option A: Allow from Anywhere (Easiest for Development)**
   - Click **"Allow Access from Anywhere"**
   - This adds `0.0.0.0/0` (allows all IPs)
   - Click **"Confirm"**
   - ⚠️ **Note**: Only use this for development, not production!

   **Option B: Add Your Current IP (More Secure)**
   - Click **"Add Current IP Address"** (if available)
   - Or manually enter your IP address
   - Click **"Confirm"**

4. **Wait for Changes to Apply**
   - It may take 1-2 minutes for changes to propagate
   - You'll see a status indicator showing the change is being deployed

5. **Try Connecting Again**
   ```bash
   npm run dev
   ```

## Other Common Issues

### Error: "Authentication failed"
- **Cause**: Wrong username or password in connection string
- **Solution**: 
  - Double-check your `.env` file
  - Make sure password doesn't have special characters that need URL encoding
  - If password has special characters, URL encode them (e.g., `@` becomes `%40`)

### Error: "Connection refused"
- **Cause**: Firewall or network blocking connection
- **Solution**:
  - Check if your firewall is blocking outbound connections
  - Try from a different network
  - Verify your IP is whitelisted in Atlas

### Error: "Invalid connection string"
- **Cause**: Malformed connection string in `.env`
- **Solution**:
  - Make sure your `.env` file has the correct format:
    ```
    MONGODB_URI=mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/reviewonly?retryWrites=true&w=majority
    ```
  - No spaces around the `=` sign
  - No quotes needed around the value

### Still Having Issues?

1. **Verify Connection String Format**:
   ```bash
   # Check your .env file (don't share this publicly!)
   cat .env
   ```

2. **Test Connection Separately**:
   ```bash
   npm run test-db
   ```

3. **Check Atlas Dashboard**:
   - Go to your cluster
   - Click "Connect" → "Connect your application"
   - Verify the connection string matches your `.env` file

4. **Check Network Access**:
   - Go to "Network Access" in Atlas
   - Verify your IP is listed and shows "Active" status

