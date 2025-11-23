# PM2 Start Fix - "No script path" Error

## The Issue
PM2 can't find the script path when using ecosystem.config.js with relative paths.

## Quick Fix - Use Direct Command (Easiest)

Run this on your EC2 instance:

```bash
cd /home/ec2-user/AcaneFi/backend

# Start directly with tsx
pm2 start src/index.ts --name arcanefi-api --interpreter node --interpreter-args "--import tsx/esm"

# Save
pm2 save

# Check logs
pm2 logs arcanefi-api

# Test
curl http://localhost:3002/health
```

## Alternative: Build and Run JavaScript (Most Reliable)

```bash
cd /home/ec2-user/AcaneFi/backend

# Build TypeScript
npm run build

# Start compiled JavaScript
pm2 start dist/index.js --name arcanefi-api

# Save
pm2 save

# Check logs
pm2 logs arcanefi-api

# Test
curl http://localhost:3002/health
```

## Or: Use Updated ecosystem.config.js

After pulling latest changes:

```bash
cd /home/ec2-user/AcaneFi/backend

# Pull latest (includes fixed ecosystem.config.js)
git pull

# Start with ecosystem config
pm2 start ecosystem.config.js

# Save
pm2 save

# Check logs
pm2 logs arcanefi-api
```

## Recommended: Build First (Production Best Practice)

For production, always build TypeScript first:

```bash
cd /home/ec2-user/AcaneFi/backend

# Build
npm run build

# Start
pm2 delete arcanefi-api
pm2 start dist/index.js --name arcanefi-api
pm2 save

# Verify
pm2 logs arcanefi-api
curl http://localhost:3002/health
```

This is the most reliable approach - no TypeScript runtime needed!

