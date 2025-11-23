#!/bin/bash

# ArcaneFi Backend Deployment Script
set -e

AWS_HOST="${AWS_HOST:-ec2-user@13.234.67.38}"
AWS_KEY="${AWS_KEY:-tachyon-solver.pem}"

# Resolve key path - try Downloads, current directory, then home .ssh
if [ ! -f "$AWS_KEY" ]; then
  if [ -f "$HOME/Downloads/$AWS_KEY" ]; then
    AWS_KEY="$HOME/Downloads/$AWS_KEY"
  elif [ -f "$HOME/.ssh/$AWS_KEY" ]; then
    AWS_KEY="$HOME/.ssh/$AWS_KEY"
  elif [ -f "./$AWS_KEY" ]; then
    AWS_KEY="./$AWS_KEY"
  else
    echo "❌ Error: Key file not found: $AWS_KEY"
    echo "Searched in:"
    echo "  - $HOME/Downloads/$AWS_KEY"
    echo "  - $HOME/.ssh/$AWS_KEY"
    echo "  - ./$AWS_KEY"
    echo ""
    echo "Please set AWS_KEY environment variable with full path:"
    echo "  export AWS_KEY=/path/to/tachyon-solver.pem"
    exit 1
  fi
fi

echo "🚀 Deploying backend to AWS..."
echo "Host: $AWS_HOST"
echo "Key: $AWS_KEY"

ssh -i "$AWS_KEY" "$AWS_HOST" << 'ENDSSH'
set -e

cd ~/arcanefi

echo "📥 Pulling latest changes..."
# Stash any local changes and pull
git stash || true
git pull origin master || {
  echo "⚠️  Git pull failed, trying to reset and pull..."
  git fetch origin master
  git reset --hard origin/master
}

echo "📦 Installing dependencies..."
cd backend
npm install

echo "🔨 Building TypeScript..."
npm run build

echo "🛑 Stopping PM2 if running..."
pm2 stop arcanefi-api 2>/dev/null || pm2 delete arcanefi-api 2>/dev/null || true

echo "🔄 Starting backend directly with node..."
# Kill any existing node process running the backend
pkill -f "node.*dist/index.js" 2>/dev/null || true
sleep 1

# Start backend directly with nohup
cd ~/arcanefi/backend
nohup node dist/index.js > backend.log 2>&1 &
BACKEND_PID=$!
echo $BACKEND_PID > backend.pid

echo "✅ Backend started with PID: $BACKEND_PID"
sleep 2

echo "📋 Checking if backend is running:"
ps aux | grep "node.*dist/index.js" | grep -v grep || echo "⚠️  Backend process not found"
echo ""
echo "📋 Recent logs:"
tail -20 backend.log 2>/dev/null || echo "No logs yet"

ENDSSH

echo "✅ Backend deployed successfully!"

