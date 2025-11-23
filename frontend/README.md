# ArcaneFi Frontend

Next.js frontend for ArcaneFi cross-chain social trading platform.

## Setup

1. Install dependencies:
```bash
npm install
```

2. Create `.env` file from `env.example`:
```bash
cp env.example .env
```

3. Update `.env` with your configuration:
```env
# API URL (production)
NEXT_PUBLIC_API_URL=https://api.arcane.tachyon.pe

# Wallet Connect Project ID (get from https://cloud.walletconnect.com)
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your-project-id

# Contract Addresses (set after deployment)
NEXT_PUBLIC_UNIFIED_VAULT_ETHEREUM_SEPOLIA=0xe9167Bf4aB30E4BA79ee901f89281261B0021e4C
NEXT_PUBLIC_UNIFIED_VAULT_BASE_SEPOLIA=0x45789e1C1c3c7bE6950355dbCAaBB5647e1bc8f2
NEXT_PUBLIC_UNIFIED_VAULT_ARC=

# TEE Wallet Address (on Base Sepolia - where trading happens)
NEXT_PUBLIC_TEE_WALLET_ADDRESS=0x278258D222028BDbC165684923443FE10BFD4b95
```

## Run Development Server

```bash
npm run dev
```

The frontend will be available at `http://localhost:3000`

## Build for Production

```bash
npm run build
npm start
```

## Available Pages

- `/` - Home page with trader list
- `/trader/register` - Register as a trader
- `/trader/[traderId]` - Trader dashboard (create positions, view stats)
- `/deposit` - Deposit USDC to a trader (CCTP or direct)
- `/receive-cctp` - Receive bridged USDC from CCTP deposits
- `/bridge-shares` - Bridge vault shares across chains

## Features

- **Trader Registration**: Register on-chain via TEE
- **Cross-Chain Deposits**: Deposit USDC from Ethereum Sepolia (CCTP) or Base Sepolia (direct)
- **Position Creation**: Traders can create positions via TEE API
- **CCTP Receive**: Complete CCTP deposits by receiving USDC on Base Sepolia
- **Real-time Balance**: View TEE wallet balance on Base Sepolia

## Requirements

- Node.js 18+ 
- Wallet (MetaMask recommended)
- Testnet USDC on Ethereum Sepolia or Base Sepolia

