# AWS Deployment Guide for ArcaneFi Backend - Amazon Linux 2023

## Prerequisites
- AWS EC2 Instance running **Amazon Linux 2023**
- Domain: `api.arcane.tachyon.pe` (A record pointing to EC2 IP)
- SSH access to EC2 instance

---

## Step 1: Install Dependencies on Amazon Linux 2023

```bash
# Update system
sudo dnf update -y

# Install Node.js 20.x (using NodeSource)
curl -fsSL https://rpm.nodesource.com/setup_20.x | sudo bash -
sudo dnf install -y nodejs

# Verify installation
node --version  # Should be v20.x
npm --version

# Install PM2 (process manager)
sudo npm install -g pm2

# Install Nginx (for reverse proxy and SSL)
sudo dnf install -y nginx

# Install Certbot (for Let's Encrypt SSL)
sudo dnf install -y certbot python3-certbot-nginx

# Install Git
sudo dnf install -y git

# Install PostgreSQL client (if needed)
sudo dnf install -y postgresql15

# Install build tools (for native modules)
sudo dnf groupinstall -y "Development Tools"
sudo dnf install -y python3
```

---

## Step 2: Start and Enable Services

```bash
# Start Nginx
sudo systemctl start nginx
sudo systemctl enable nginx

# Verify Nginx is running
sudo systemctl status nginx
```

---

## Step 3: Configure Firewall (if using firewalld)

```bash
# Check if firewalld is running
sudo systemctl status firewalld

# If running, allow ports
sudo firewall-cmd --permanent --add-service=http
sudo firewall-cmd --permanent --add-service=https
sudo firewall-cmd --permanent --add-service=ssh
sudo firewall-cmd --reload

# Or disable firewalld if using Security Groups (recommended)
sudo systemctl stop firewalld
sudo systemctl disable firewalld
```

**Note**: AWS Security Groups handle firewall rules, so you can disable firewalld.

---

## Step 4: Deploy Backend Code

```bash
# Clone repository
cd /home/ec2-user
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

## Step 5: Configure Nginx Reverse Proxy

```bash
# Create Nginx configuration
sudo nano /etc/nginx/conf.d/arcanefi-api.conf
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

**Test and restart Nginx:**
```bash
# Test Nginx configuration
sudo nginx -t

# Restart Nginx
sudo systemctl restart nginx

# Verify Nginx is running
sudo systemctl status nginx
```

---

## Step 6: Obtain SSL Certificate with Let's Encrypt

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

**Set up auto-renewal cron job (if not already configured):**
```bash
# Certbot usually sets this up automatically, but verify:
sudo systemctl status certbot.timer
```

---

## Step 7: Install TypeScript and ts-node (if needed)

```bash
# Install TypeScript globally (if using ts-node)
sudo npm install -g typescript ts-node

# Or install locally in project
cd /home/ec2-user/AcaneFi/backend
npm install --save-dev typescript ts-node @types/node
```

---

## Step 8: Start Backend with PM2

```bash
# Navigate to backend directory
cd /home/ec2-user/AcaneFi/backend

# Option 1: Use ecosystem.config.js
pm2 start ecosystem.config.js

# Option 2: Start directly
pm2 start src/index.ts --name arcanefi-api --interpreter ts-node

# Save PM2 configuration
pm2 save

# Setup PM2 to start on boot
pm2 startup
# Follow the command it outputs (usually: sudo env PATH=... pm2 startup systemd -u ec2-user --hp /home/ec2-user)
```

**PM2 Commands:**
```bash
pm2 list              # View running processes
pm2 logs arcanefi-api # View logs
pm2 restart arcanefi-api # Restart
pm2 stop arcanefi-api    # Stop
pm2 delete arcanefi-api  # Remove
pm2 monit              # Monitor dashboard
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
  api.arcane.tachyon.pe → 13.234.67.38
  ```

---

## Troubleshooting

### Backend not starting:
```bash
# Check logs
pm2 logs arcanefi-api

# Check if port is in use
sudo lsof -i :3002

# Check environment variables
cd /home/ec2-user/AcaneFi/backend
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
sudo cat /etc/nginx/conf.d/arcanefi-api.conf
```

### Permission issues:
```bash
# Ensure ec2-user owns the project directory
sudo chown -R ec2-user:ec2-user /home/ec2-user/AcaneFi
```

---

## Key Differences: Amazon Linux 2023 vs Ubuntu

| Task | Ubuntu | Amazon Linux 2023 |
|------|--------|-------------------|
| Package Manager | `apt` | `dnf` or `yum` |
| Service Manager | `systemctl` | `systemctl` (same) |
| Default User | `ubuntu` | `ec2-user` |
| Nginx Config | `/etc/nginx/sites-available/` | `/etc/nginx/conf.d/` |
| Node.js Install | NodeSource deb | NodeSource rpm |

---

## Quick Reference Commands

```bash
# Update system
sudo dnf update -y

# Install package
sudo dnf install -y <package>

# Start service
sudo systemctl start <service>
sudo systemctl enable <service>

# Check service status
sudo systemctl status <service>

# View logs
sudo journalctl -u <service> -f
```

---

## Next Steps

1. ✅ Install dependencies with `dnf`
2. ✅ Configure Nginx
3. ✅ Obtain SSL certificate
4. ✅ Start backend with PM2
5. ✅ Test API at `https://api.arcane.tachyon.pe`

**Test your API:**
```bash
curl https://api.arcane.tachyon.pe/health
curl https://api.arcane.tachyon.pe/api/tee/register-trader
```

