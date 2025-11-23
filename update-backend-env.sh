#!/bin/bash

# ArcaneFi Backend Environment Variables Update Script
set -e

# Default values
DEFAULT_AWS_HOST="ec2-user@13.234.67.38"
DEFAULT_AWS_KEY="tachyon-solver.pem" # Just the filename

# Override with environment variables if set
AWS_HOST="${AWS_HOST:-$DEFAULT_AWS_HOST}"
AWS_KEY_FILENAME="${AWS_KEY_FILENAME:-$DEFAULT_AWS_KEY}"

# Attempt to find the key file
KEY_PATH=""
if [ -f "$AWS_KEY_FILENAME" ]; then
  KEY_PATH="./$AWS_KEY_FILENAME"
elif [ -f "$HOME/.ssh/$AWS_KEY_FILENAME" ]; then
  KEY_PATH="$HOME/.ssh/$AWS_KEY_FILENAME"
elif [ -f "$HOME/Downloads/$AWS_KEY_FILENAME" ]; then
  KEY_PATH="$HOME/Downloads/$AWS_KEY_FILENAME"
elif [ -n "$AWS_KEY" ] && [ -f "$AWS_KEY" ]; then # Check if AWS_KEY env var is a full path
  KEY_PATH="$AWS_KEY"
fi

if [ -z "$KEY_PATH" ]; then
  echo "❌ Error: Key file '$AWS_KEY_FILENAME' not found."
  echo "Please provide the full path to your key file using 'export AWS_KEY=/full/path/to/your-key.pem'"
  echo "Or place it in ~/Downloads/, ~/.ssh/, or the project root."
  exit 1
fi

echo "🔧 Updating backend environment variables on AWS..."
echo "Host: $AWS_HOST"
echo "Key: $KEY_PATH"
echo ""

# Ensure the key has correct permissions
chmod 400 "$KEY_PATH"

# Read DEPLOYER_PRIVATE_KEY from local .env if not provided
if [ -z "$DEPLOYER_PRIVATE_KEY" ]; then
  if [ -f "backend/.env" ]; then
    DEPLOYER_PRIVATE_KEY=$(grep "^DEPLOYER_PRIVATE_KEY=" backend/.env | cut -d '=' -f2- | tr -d '"' | tr -d "'" || echo "")
  fi
fi

if [ -z "$DEPLOYER_PRIVATE_KEY" ]; then
  echo "⚠️  DEPLOYER_PRIVATE_KEY not found in backend/.env"
  echo "Please set it: export DEPLOYER_PRIVATE_KEY=your_hex_private_key"
  echo "Or add it to backend/.env file"
  read -p "Enter DEPLOYER_PRIVATE_KEY (or press Enter to skip): " DEPLOYER_PRIVATE_KEY
fi

ssh -i "$KEY_PATH" "$AWS_HOST" << ENDSSH
set -e

cd ~/arcanefi/backend

echo "📂 Checking backend directory contents..."
ls -la | grep -E "\.env|env\.example" || echo "No .env or env.example files visible"
echo ""

# Check if .env exists, if not create from env.example
if [ ! -f .env ]; then
  echo "⚠️  .env file not found, checking for env.example..."
  if [ -f env.example ]; then
    cp env.example .env
    echo "✅ Created .env from env.example"
  else
    echo "❌ Error: Neither .env nor env.example found in ~/arcanefi/backend"
    echo "Listing all files in backend directory:"
    ls -la
    exit 1
  fi
else
  echo "✅ Found existing .env file"
fi

echo "📝 Current .env file location: ~/arcanefi/backend/.env"
echo ""

# Backup .env file
cp .env .env.backup.\$(date +%Y%m%d_%H%M%S)
echo "✅ Created backup of .env file"

# Update or add DEPLOYER_PRIVATE_KEY
if [ -n "$DEPLOYER_PRIVATE_KEY" ]; then
  if grep -q "^DEPLOYER_PRIVATE_KEY=" .env; then
    # Update existing
    sed -i "s|^DEPLOYER_PRIVATE_KEY=.*|DEPLOYER_PRIVATE_KEY=$DEPLOYER_PRIVATE_KEY|" .env
    echo "✅ Updated DEPLOYER_PRIVATE_KEY in .env"
  else
    # Add new
    echo "" >> .env
    echo "DEPLOYER_PRIVATE_KEY=$DEPLOYER_PRIVATE_KEY" >> .env
    echo "✅ Added DEPLOYER_PRIVATE_KEY to .env"
  fi
else
  echo "⚠️  DEPLOYER_PRIVATE_KEY not provided, skipping..."
fi

echo ""
echo "📋 Updated .env file:"
echo "---"
grep -E "^DEPLOYER_PRIVATE_KEY=|^PRIVATE_KEY=|^TEE_WALLET_ADDRESS=" .env | head -3 || echo "No matching variables found"
echo "---"
echo ""

echo "🔄 Restarting PM2 to apply changes..."
pm2 restart arcanefi-api || pm2 start ecosystem.config.js --name arcanefi-api --update-env

echo ""
echo "✅ Environment variables updated and PM2 restarted!"
echo ""
pm2 status
pm2 logs arcanefi-api --lines 5 --nostream

ENDSSH

echo ""
echo "✅ Environment update complete!"

