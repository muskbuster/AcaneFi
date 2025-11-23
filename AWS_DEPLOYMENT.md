# AWS Deployment Guide for ArcaneFi Backend

## Prerequisites
- AWS Account
- Domain: `api.arcane.tachyon.pe` (A record already created)
- EC2 Instance (Ubuntu 22.04 LTS recommended)
- SSH access to EC2 instance

---

## Step 1: Launch EC2 Instance

### In AWS Console:
1. **EC2 Dashboard** → **Launch Instance**
2. **Name**: `arcanefi-backend`
3. **AMI**: Ubuntu Server 22.04 LTS (free tier eligible)
4. **Instance Type**: `t3.micro` or `t3.small` (free tier: t2.micro)
5. **Key Pair**: Create new or use existing (save `.pem` file)
6. **Network Settings**: 
   - Create security group (we'll configure in Step 2)
   - Allow SSH from your IP
7. **Storage**: 20 GB (default)
8. **Launch Instance**

---

## Step 2: Configure Security Group

### In EC2 Console → Security Groups:

**Inbound Rules:**
```
Type          Protocol    Port Range    Source                    Description
SSH           TCP         22             Your IP / 0.0.0.0/0       SSH access
HTTP          TCP         80             0.0.0.0/0                HTTP (for Let's Encrypt)
HTTPS         TCP         443            0.0.0.0/0                HTTPS
Custom TCP    TCP         3002           0.0.0.0.0                Backend API (or restrict to ALB)
```

**Outbound Rules:**
```
Type          Protocol    Port Range    Destination               Description
All Traffic   All         All           0.0.0.0/0                  Allow all outbound
```

**Note**: If using Application Load Balancer (ALB), restrict port 3002 to ALB security group only.

---

## Step 3: Connect to EC2 Instance

```bash
# Update permissions
chmod 400 your-key.pem

# Connect
ssh -i your-key.pem ubuntu@<EC2_PUBLIC_IP>
```

---

## Step 4: Install Dependencies on EC2

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 20.x
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Verify installation
node --version  # Should be v20.x
npm --version

# Install PM2 (process manager)
sudo npm install -g pm2

# Install Nginx (for reverse proxy and SSL)
sudo apt install -y nginx

# Install Certbot (for Let's Encrypt SSL)
sudo apt install -y certbot python3-certbot-nginx

# Install Git
sudo apt install -y git

# Install PostgreSQL client (if needed)
sudo apt install -y postgresql-client
```

---

## Step 5: Deploy Backend Code

```bash
# Clone repository
cd /home/ubuntu
git clone git@github.com:muskbuster/AcaneFi.git
cd AcaneFi/backend

# Install dependencies
npm install

# Create .env file
nano .env
```

**Add to `.env`:**
```env
# Server
PORT=3002
NODE_ENV=production

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/arcanefi

# CDP (Coinbase Developer Platform) Server Wallets v2
CDP_API_KEY_ID=your-api-key-id
CDP_API_KEY_SECRET=your-api-key-secret
CDP_WALLET_SECRET=your-wallet-secret
CDP_ACCOUNT_ID=your-account-id
CDP_TEE_ACCOUNT_NAME=tee-account

# TEE Wallet
TEE_WALLET_ADDRESS=0x278258D222028BDbC165684923443FE10BFD4b95

# LayerZero
LZ_ENDPOINT_ETHEREUM_SEPOLIA=0x6EDCE65403992e310A62460808c4b910D972f10f
LZ_ENDPOINT_BASE_SEPOLIA=0x6EDCE65403992e310A62460808c4b910D972f10f
LZ_ENDPOINT_ARC=0x6EDCE65403992e310A62460808c4b910D972f10f

# Unified Vault Addresses
UNIFIED_VAULT_ETHEREUM_SEPOLIA=0xe9167Bf4aB30E4BA79ee901f89281261B0021e4C
UNIFIED_VAULT_BASE_SEPOLIA=0x45789e1C1c3c7bE6950355dbCAaBB5647e1bc8f2
UNIFIED_VAULT_RARI=0xDB61eA01ba56A604f8E44d61576D2506e016Fc90

# VaultFactory Addresses
VAULT_FACTORY_BASE_SEPOLIA=0xA4604BED3C481fAFF5F8dF0A99bDFc7798190380
VAULT_FACTORY_ETHEREUM_SEPOLIA=0x7AD1F6B4B131535265978f6d14f9F3FaAD1e5670
VAULT_FACTORY_RARI=0xdbD58407D33D730614932325cC7fb8AAf62533C3

# Mock Uniswap Contracts
MOCK_UNISWAP_BASE_SEPOLIA=0x01e8886b55fb3A69C671416907AA929d737D697F
MOCK_ETH_BASE_SEPOLIA=0xb343D2164448333E2981Ce30BfA001443DA9098a
MOCK_WBTC_BASE_SEPOLIA=0x715717fa5c882660bB8Eaa3142b91315d8597Fb7
MOCK_ZEC_BASE_SEPOLIA=0x5F132592657daAe8488408557b634b9C41680eF9

# RPC Endpoints
RPC_ETHEREUM_SEPOLIA=https://ethereum-sepolia.public.blastapi.io
RPC_BASE_SEPOLIA=https://sepolia.base.org
RPC_ARC=https://rpc.testnet.arc.network
RPC_RARI=https://rari-testnet.calderachain.xyz/http

# Private Key (base64 encoded)
PRIVATE_KEY=your-private-key-here
```

**Save and exit** (Ctrl+X, Y, Enter)

---

## Step 6: Configure Nginx Reverse Proxy

```bash
# Create Nginx configuration
sudo nano /etc/nginx/sites-available/arcanefi-api
```

**Add this configuration:**
```nginx
server {
    listen 80;
    server_name api.arcane.tachyon.pe;

    # Logging
    access_log /var/log/nginx/arcanefi-api-access.log;
    error_log /var/log/nginx/arcanefi-api-error.log;

    # Proxy to backend
    location / {
        proxy_pass http://localhost:3002;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Health check endpoint
    location /health {
        proxy_pass http://localhost:3002/health;
        access_log off;
    }
}
```

**Enable the site:**
```bash
# Create symlink
sudo ln -s /etc/nginx/sites-available/arcanefi-api /etc/nginx/sites-enabled/

# Remove default site (optional)
sudo rm /etc/nginx/sites-enabled/default

# Test Nginx configuration
sudo nginx -t

# Restart Nginx
sudo systemctl restart nginx
```

---

## Step 7: Obtain SSL Certificate with Let's Encrypt

```bash
# Request SSL certificate
sudo certbot --nginx -d api.arcane.tachyon.pe

# Follow prompts:
# - Enter email address
# - Agree to terms
# - Choose whether to redirect HTTP to HTTPS (recommended: Yes)
```

**Certbot will automatically:**
- Obtain SSL certificate
- Configure Nginx with SSL
- Set up auto-renewal

**Verify auto-renewal:**
```bash
sudo certbot renew --dry-run
```

---

## Step 8: Start Backend with PM2

```bash
# Navigate to backend directory
cd /home/ubuntu/AcaneFi/backend

# Build TypeScript (if needed)
npm run build

# Start with PM2
pm2 start src/index.ts --name arcanefi-api --interpreter ts-node

# Or if using compiled JS:
# pm2 start dist/index.js --name arcanefi-api

# Save PM2 configuration
pm2 save

# Setup PM2 to start on boot
pm2 startup
# Follow the command it outputs (usually: sudo env PATH=... pm2 startup systemd -u ubuntu --hp /home/ubuntu)
```

**PM2 Commands:**
```bash
pm2 list              # View running processes
pm2 logs arcanefi-api # View logs
pm2 restart arcanefi-api # Restart
pm2 stop arcanefi-api    # Stop
pm2 delete arcanefi-api  # Remove
```

---

## Step 9: Verify Deployment

```bash
# Check backend is running
curl http://localhost:3002/health

# Check Nginx is proxying
curl http://localhost/health

# Check SSL (from your local machine)
curl https://api.arcane.tachyon.pe/health
```

**Expected response:**
```json
{"status":"ok","timestamp":"2025-11-23T..."}
```

---

## Step 10: Update DNS (if needed)

**In your DNS provider (where tachyon.pe is hosted):**
- Ensure A record points to EC2 public IP:
  ```
  api.arcane.tachyon.pe → <EC2_PUBLIC_IP>
  ```

---

## Security Group Summary

**Inbound Rules:**
- **SSH (22)**: Your IP only (or 0.0.0.0/0 if using key-based auth)
- **HTTP (80)**: 0.0.0.0/0 (for Let's Encrypt)
- **HTTPS (443)**: 0.0.0.0/0 (public API access)
- **Custom TCP (3002)**: 127.0.0.1/32 or ALB security group (backend only accessible via Nginx)

**Outbound Rules:**
- **All Traffic**: 0.0.0.0/0 (for API calls, database, etc.)

---

## Troubleshooting

### Backend not starting:
```bash
# Check logs
pm2 logs arcanefi-api

# Check if port is in use
sudo lsof -i :3002

# Check environment variables
cd /home/ubuntu/AcaneFi/backend
cat .env
```

### Nginx errors:
```bash
# Check Nginx status
sudo systemctl status nginx

# Check Nginx logs
sudo tail -f /var/log/nginx/arcanefi-api-error.log

# Test configuration
sudo nginx -t
```

### SSL certificate issues:
```bash
# Check certificate status
sudo certbot certificates

# Renew manually
sudo certbot renew

# Check Nginx SSL configuration
sudo cat /etc/nginx/sites-available/arcanefi-api
```

### Firewall issues:
```bash
# Check if UFW is blocking
sudo ufw status

# Allow ports (if UFW is active)
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
```

---

## Monitoring & Maintenance

### View logs:
```bash
# Backend logs
pm2 logs arcanefi-api

# Nginx access logs
sudo tail -f /var/log/nginx/arcanefi-api-access.log

# Nginx error logs
sudo tail -f /var/log/nginx/arcanefi-api-error.log
```

### Update deployment:
```bash
cd /home/ubuntu/AcaneFi
git pull
cd backend
npm install
pm2 restart arcanefi-api
```

---

## Cost Optimization

- Use **t3.micro** or **t2.micro** (free tier eligible)
- Enable **EC2 Auto Scaling** if needed
- Use **CloudWatch** for monitoring (free tier: 10 metrics)
- Consider **Application Load Balancer** for high availability (adds cost)

---

## Next Steps

1. ✅ EC2 instance launched
2. ✅ Security group configured
3. ✅ Backend deployed
4. ✅ Nginx reverse proxy configured
5. ✅ SSL certificate installed
6. ✅ PM2 process manager running
7. ✅ API accessible at `https://api.arcane.tachyon.pe`

**Test your API:**
```bash
curl https://api.arcane.tachyon.pe/health
curl https://api.arcane.tachyon.pe/api/tee/register-trader
```

