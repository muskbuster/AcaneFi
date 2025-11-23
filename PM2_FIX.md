# Fix PM2 TypeScript ES Module Issue

## Problem
PM2 can't run TypeScript files directly with `ts-node` when using ES modules.

## Solution Options

### Option 1: Use tsx (Recommended - Already in package.json)

```bash
cd /home/ec2-user/AcaneFi/backend

# Install tsx if not already installed
npm install --save-dev tsx

# Stop current PM2 process
pm2 delete arcanefi-api

# Start with tsx
pm2 start src/index.ts --name arcanefi-api --interpreter node --interpreter-args "--loader tsx/esm"

# Or use the updated ecosystem.config.js
pm2 start ecosystem.config.js

# Save
pm2 save

# Check logs
pm2 logs arcanefi-api
```

### Option 2: Build TypeScript and Run JavaScript (Production)

```bash
cd /home/ec2-user/AcaneFi/backend

# Build TypeScript
npm run build

# This creates dist/index.js

# Stop current PM2 process
pm2 delete arcanefi-api

# Start with compiled JavaScript
pm2 start dist/index.js --name arcanefi-api

# Save
pm2 save

# Check logs
pm2 logs arcanefi-api
```

### Option 3: Use tsx directly in ecosystem.config.js

Update ecosystem.config.js to use tsx:

```javascript
export default {
  apps: [
    {
      name: 'arcanefi-api',
      script: 'src/index.ts',
      interpreter: 'node',
      interpreter_args: '--loader tsx/esm',
      // ... rest of config
    },
  ],
};
```

## Quick Fix Commands

Run these on your EC2 instance:

```bash
cd /home/ec2-user/AcaneFi/backend

# Pull latest changes (includes fixed ecosystem.config.js)
git pull

# Install tsx if needed
npm install --save-dev tsx

# Stop and delete current process
pm2 delete arcanefi-api

# Start with updated config
pm2 start ecosystem.config.js

# Or start directly with tsx
pm2 start src/index.ts --name arcanefi-api --interpreter node --interpreter-args "--loader tsx/esm"

# Save
pm2 save

# Check status
pm2 status

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
pm2 logs arcanefi-api --lines 20
# Should show: "🚀 ArcaneFi Backend running on port 3002"

# Test health endpoint
curl http://localhost:3002/health
# Should return: {"status":"ok","timestamp":"..."}

# Test through Nginx
curl http://localhost/health

# Test external
curl https://api.arcane.tachyon.pe/health
```

