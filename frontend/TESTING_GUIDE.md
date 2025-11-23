# ArcaneFi Frontend Testing Guide

## Setup

1. **Install dependencies:**
```bash
cd frontend
npm install
```

2. **Environment is already configured** with production API and contract addresses in `.env`

3. **Start development server:**
```bash
npm run dev
```

Frontend will be available at `http://localhost:3000`

## End-to-End Flow Testing

### 1. Trader Registration Flow

**Path:** `/trader/register`

1. Connect wallet (MetaMask recommended)
2. Fill in trader details:
   - Name
   - Strategy Description
   - Performance Fee (%)
3. Click "Register Trader"
4. Wait for on-chain registration
5. You'll be redirected to your trader dashboard

**Expected Result:** Trader registered on-chain in VaultFactory, assigned a unique traderId

---

### 2. CCTP Deposit Flow (Ethereum Sepolia → Base Sepolia)

**Path:** `/deposit`

1. Connect wallet
2. Switch to **Ethereum Sepolia** network
3. Select a trader from dropdown
4. Enter deposit amount (USDC)
5. Click "1. Approve USDC" (approve TokenMessenger)
6. Wait for approval confirmation
7. Click "2. Deposit via CCTP"
8. Wait for transaction confirmation
9. Note the transaction hash
10. Go to `/receive-cctp` or trader dashboard
11. Enter transaction hash
12. Click "Fetch Attestation" (waits for Circle attestation)
13. Switch to **Base Sepolia** network
14. Click "Receive USDC on Base Sepolia"
15. USDC will be minted to TEE wallet on Base Sepolia

**Expected Result:** USDC burned on Ethereum Sepolia, minted to TEE wallet on Base Sepolia

---

### 3. Direct Deposit Flow (Base Sepolia)

**Path:** `/deposit`

1. Connect wallet
2. Switch to **Base Sepolia** network
3. Select a trader from dropdown
4. Enter deposit amount (USDC)
5. Click "1. Approve USDC" (approve UnifiedVault)
6. Wait for approval confirmation
7. Click "2. Deposit USDC"
8. Wait for transaction confirmation

**Expected Result:** USDC deposited directly to UnifiedVault on Base Sepolia

---

### 4. Rari Deposit Flow (Rari → Base Sepolia)

**Path:** `/deposit-rari`

1. Connect wallet
2. Switch to **Rari Testnet** network (add if needed: https://rari-testnet.calderachain.xyz)
3. Select a trader from dropdown
4. Enter deposit amount (MockUSDC)
5. Click "1. Approve MockUSDC" (approve UnifiedVault)
6. Wait for approval confirmation
7. Click "2. Deposit MockUSDC on Rari"
8. Wait for transaction confirmation
9. Attestation will be fetched automatically
10. Switch to **Base Sepolia** network
11. Click "Receive USDC on Base Sepolia"
12. USDC will be transferred to TEE wallet on Base Sepolia

**Expected Result:** MockUSDC locked on Rari, USDC transferred to TEE wallet on Base Sepolia

---

### 5. Position Creation Flow (Trader Only)

**Path:** `/trader/[traderId]` (must be the trader owner)

1. Connect wallet with trader address
2. Navigate to your trader dashboard
3. Scroll to "Create Position" section
4. Select token type (ETH, WBTC, or ZEC)
5. Enter amount in USDC
6. Click "Create Position"
7. Sign the message in wallet
8. Wait for TEE API to:
   - Verify trader registration
   - Fetch price from CoinGecko
   - Update MockUniswap price
   - Execute swap via CDP wallet
9. Position will be created and tokens minted to TEE wallet

**Expected Result:** USDC swapped for selected token, tokens held in TEE wallet

---

### 6. Receive CCTP Flow (Standalone)

**Path:** `/receive-cctp`

1. Connect wallet
2. Switch to **Base Sepolia** network
3. Enter CCTP burn transaction hash (from Ethereum Sepolia)
4. Enter source domain (0 for Ethereum Sepolia)
5. Click "Fetch Attestation"
6. Wait for Circle attestation (may take 1-2 minutes)
7. Click "Receive USDC on Base Sepolia"
8. USDC will be minted to TEE wallet

**Expected Result:** USDC received on Base Sepolia from CCTP deposit

---

## Testing Checklist

- [ ] Trader registration works
- [ ] CCTP deposit from Ethereum Sepolia works
- [ ] CCTP receive on Base Sepolia works
- [ ] Direct deposit on Base Sepolia works
- [ ] Rari deposit works
- [ ] Rari receive on Base Sepolia works
- [ ] Position creation works (trader only)
- [ ] TEE wallet balance updates correctly
- [ ] All API calls use production endpoint
- [ ] All contract addresses are correct

## Network Configuration

**Ethereum Sepolia:**
- Chain ID: 11155111
- RPC: https://ethereum-sepolia.public.blastapi.io
- USDC: 0x1c7d4b196cb0c7b01d743fbc6116a902379c7238

**Base Sepolia:**
- Chain ID: 84532
- RPC: https://sepolia.base.org
- USDC: 0x036CbD53842c5426634e7929541eC2318f3dCF7e

**Rari Testnet:**
- Chain ID: 1918988905
- RPC: https://rari-testnet.calderachain.xyz/http
- MockUSDC: 0xec690C24B7451B85B6167a06292e49B5DA822fBE

## Troubleshooting

**Issue:** "UnifiedVault not deployed on this chain"
- **Solution:** Check `.env` file has correct contract addresses

**Issue:** "TEE wallet address not configured"
- **Solution:** Ensure `NEXT_PUBLIC_TEE_WALLET_ADDRESS` is set in `.env`

**Issue:** "Failed to fetch attestation"
- **Solution:** Wait longer (CCTP attestations can take 1-2 minutes)

**Issue:** "Only the trader can create positions"
- **Solution:** Make sure you're connected with the trader's wallet address

**Issue:** "Insufficient USDC balance"
- **Solution:** Get testnet USDC from faucets or transfer from another wallet

## API Endpoints Used

- Production API: `https://api.arcane.tachyon.pe`
- `/api/tee/register-trader` - Register trader
- `/api/tee/create-position` - Create position
- `/api/cctp/receive` - Receive CCTP deposit
- `/api/rari/attestation` - Get Rari attestation
- `/api/tee/verify-rari-deposit` - Verify and receive Rari deposit

