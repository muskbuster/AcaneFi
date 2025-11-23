#!/bin/bash

# ArcaneFi Backend - Update All Environment Variables from env.example
set -e

# Default values
DEFAULT_AWS_HOST="ec2-user@13.234.67.38"
DEFAULT_AWS_KEY="tachyon-solver.pem"

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
elif [ -n "$AWS_KEY" ] && [ -f "$AWS_KEY" ]; then
  KEY_PATH="$AWS_KEY"
fi

if [ -z "$KEY_PATH" ]; then
  echo "❌ Error: Key file '$AWS_KEY_FILENAME' not found."
  echo "Please provide the full path to your key file using 'export AWS_KEY=/full/path/to/your-key.pem'"
  exit 1
fi

echo "🔧 Updating all backend environment variables on AWS from env.example..."
echo "Host: $AWS_HOST"
echo "Key: $KEY_PATH"
echo ""

# Ensure the key has correct permissions
chmod 400 "$KEY_PATH"

# Read env.example file
ENV_FILE="backend/env.example"
if [ ! -f "$ENV_FILE" ]; then
  echo "❌ Error: $ENV_FILE not found"
  exit 1
fi

echo "📋 Reading environment variables from $ENV_FILE..."
echo ""

# Extract all non-comment, non-empty lines from env.example (lines 1-57)
ENV_VARS=$(sed -n '1,57p' "$ENV_FILE" | grep -v '^#' | grep -v '^$' | grep '=')

ssh -i "$KEY_PATH" "$AWS_HOST" << 'ENDSSH'
set -e

cd ~/arcanefi/backend

echo "📂 Checking backend directory..."
if [ ! -f .env ]; then
  if [ -f env.example ]; then
    cp env.example .env
    echo "✅ Created .env from env.example"
  else
    echo "❌ Error: env.example not found"
    exit 1
  fi
fi

# Backup .env file
cp .env .env.backup.$(date +%Y%m%d_%H%M%S)
echo "✅ Created backup of .env file"
echo ""

ENDSSH

# Now update each variable
echo "$ENV_VARS" | while IFS='=' read -r key value; do
  if [ -n "$key" ] && [ -n "$value" ]; then
    # Remove any leading/trailing whitespace
    key=$(echo "$key" | xargs)
    value=$(echo "$value" | xargs)
    
    # Skip if value is empty or just whitespace
    if [ -z "$value" ]; then
      continue
    fi
    
    echo "📝 Updating $key..."
    
    ssh -i "$KEY_PATH" "$AWS_HOST" << ENDSSH
set -e
cd ~/arcanefi/backend

# Escape special characters in value for sed
escaped_value=$(printf '%s\n' "$value" | sed 's/[[\.*^$()+?{|]/\\&/g')

if grep -q "^${key}=" .env; then
  # Update existing
  sed -i "s|^${key}=.*|${key}=${escaped_value}|" .env
  echo "  ✅ Updated $key"
else
  # Add new
  echo "${key}=${value}" >> .env
  echo "  ✅ Added $key"
fi
ENDSSH
  fi
done

echo ""
echo "🔄 Restarting PM2 to apply changes..."
ssh -i "$KEY_PATH" "$AWS_HOST" << 'ENDSSH'
cd ~/arcanefi/backend

echo ""
echo "📋 Updated .env file (showing first 20 lines):"
echo "---"
head -20 .env | grep -E "^[A-Z_]+=" || echo "No variables found"
echo "---"
echo ""

echo "🔄 Restarting PM2..."
pm2 restart arcanefi-api || pm2 start ecosystem.config.js --name arcanefi-api --update-env

echo ""
echo "✅ Environment variables updated and PM2 restarted!"
echo ""
pm2 status
pm2 logs arcanefi-api --lines 5 --nostream

ENDSSH

echo ""
echo "✅ All environment variables updated successfully!"

