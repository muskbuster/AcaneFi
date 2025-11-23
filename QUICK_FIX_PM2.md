# Quick Fix for PM2 - Node.js v20

## The Issue
Node.js v20.19.5 requires `--import` instead of `--loader` for tsx.

## Quick Fix Commands

Run these on your EC2 instance:

```bash
cd /home/ec2-user/AcaneFi/backend

# Pull latest changes
git pull

# Stop current PM2 process
pm2 delete arcanefi-api

# Option 1: Use updated ecosystem.config.js (recommended)
pm2 start ecosystem.config.js

# Option 2: Start directly with --import
pm2 start src/index.ts --name arcanefi-api --interpreter node --interpreter-args "--import tsx/esm"

# Save
pm2 save

# Check logs
pm2 logs arcanefi-api

# Test
curl http://localhost:3002/health
```

## Alternative: Build and Run JavaScript (Most Reliable)

If tsx still has issues, build TypeScript first:

```bash
cd /home/ec2-user/AcaneFi/backend

# Build TypeScript
npm run build

# Stop PM2
pm2 delete arcanefi-api

# Start compiled JavaScript
pm2 start dist/index.js --name arcanefi-api

# Save
pm2 save

# Check logs
pm2 logs arcanefi-api

# Test
curl http://localhost:3002/health
```

## Verify It's Working

```bash
# Check PM2 status
pm2 status
# Should show "online" without errors

# Check logs
pm2 logs arcanefi-api --lines 10
# Should show: "🚀 ArcaneFi Backend running on port 3002"

# Test health endpoint
curl http://localhost:3002/health
# Should return: {"status":"ok","timestamp":"..."}

# Test through Nginx
curl http://localhost/health

# Test external
curl https://api.arcane.tachyon.pe/health
```

