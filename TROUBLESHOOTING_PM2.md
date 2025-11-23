# PM2 Troubleshooting Guide

## Issue: Backend shows as "online" but health check fails

### Step 1: Check PM2 Logs

```bash
# View all logs
pm2 logs arcanefi-api

# View only errors
pm2 logs arcanefi-api --err

# View only output
pm2 logs arcanefi-api --out

# View last 50 lines
pm2 logs arcanefi-api --lines 50
```

### Step 2: Check PM2 Status

```bash
# Detailed status
pm2 status

# More details
pm2 describe arcanefi-api

# Monitor in real-time
pm2 monit
```

### Step 3: Common Issues and Fixes

#### Issue 1: Missing .env file or environment variables

```bash
# Check if .env exists
cd /home/ec2-user/AcaneFi/backend
ls -la .env

# If missing, create it
nano .env
# (Add all required environment variables)

# Restart PM2
pm2 restart arcanefi-api
```

#### Issue 2: Missing dependencies

```bash
cd /home/ec2-user/AcaneFi/backend
npm install

# Restart PM2
pm2 restart arcanefi-api
```

#### Issue 3: Port already in use

```bash
# Check if port 3002 is in use
sudo lsof -i :3002

# Kill process if needed
sudo kill -9 <PID>

# Restart PM2
pm2 restart arcanefi-api
```

#### Issue 4: TypeScript/ts-node issues

```bash
# Verify ts-node is installed
which ts-node
ts-node --version

# If missing, install
sudo npm install -g ts-node typescript

# Restart PM2
pm2 restart arcanefi-api
```

#### Issue 5: Database connection issues

```bash
# Check if DATABASE_URL is set correctly
cd /home/ec2-user/AcaneFi/backend
grep DATABASE_URL .env

# Test database connection (if using PostgreSQL)
psql $DATABASE_URL -c "SELECT 1;"
```

### Step 4: Restart PM2 Process

```bash
# Stop the process
pm2 stop arcanefi-api

# Delete the process
pm2 delete arcanefi-api

# Start fresh
cd /home/ec2-user/AcaneFi/backend
pm2 start src/index.ts --name arcanefi-api --interpreter ts-node

# Or use ecosystem config (after fixing it)
pm2 start ecosystem.config.js

# Save
pm2 save
```

### Step 5: Test Backend Directly

```bash
# Try running directly (not through PM2)
cd /home/ec2-user/AcaneFi/backend
node --loader ts-node/esm src/index.ts

# Or
ts-node src/index.ts

# This will show errors directly in the terminal
```

### Step 6: Check System Resources

```bash
# Check memory
free -h

# Check disk space
df -h

# Check CPU
top
```

### Step 7: Verify Environment Variables

```bash
cd /home/ec2-user/AcaneFi/backend

# Check if .env is loaded
cat .env

# Test if environment variables are accessible
node -e "require('dotenv').config(); console.log(process.env.PORT)"
```

### Step 8: Check Nginx Configuration

```bash
# Verify Nginx is running
sudo systemctl status nginx

# Check Nginx error logs
sudo tail -f /var/log/nginx/arcanefi-api-error.log

# Test Nginx configuration
sudo nginx -t

# Restart Nginx
sudo systemctl restart nginx
```

## Quick Diagnostic Commands

```bash
# 1. Check PM2 status
pm2 status

# 2. Check logs
pm2 logs arcanefi-api --lines 100

# 3. Check if port is listening
sudo netstat -tlnp | grep 3002
# or
sudo ss -tlnp | grep 3002

# 4. Test local connection
curl -v http://localhost:3002/health

# 5. Test through Nginx
curl -v http://localhost/health

# 6. Test external
curl -v https://api.arcane.tachyon.pe/health
```

## Most Common Fix

Usually the issue is missing `.env` file or incorrect environment variables:

```bash
cd /home/ec2-user/AcaneFi/backend

# 1. Create .env file
nano .env
# (Add all required variables from env.example)

# 2. Install dependencies
npm install

# 3. Restart PM2
pm2 delete arcanefi-api
pm2 start src/index.ts --name arcanefi-api --interpreter ts-node
pm2 save

# 4. Check logs
pm2 logs arcanefi-api

# 5. Test
curl http://localhost:3002/health
```

