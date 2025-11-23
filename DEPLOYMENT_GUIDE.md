# Deployment Guide

## Environment Setup

### 1. Backend Environment

```bash
cd backend
cp env.example .env
# Edit .env with your values
```

**Required values:**
- `PRIVATE_KEY=7cf73cff18de223ccfc1188c034f639768a90fd628393d0538fdb54d62b64695`
- `RPC_ETHEREUM_SEPOLIA=https://sepolia.gateway.tenderly.co`
- `RPC_BASE_SEPOLIA=https://sepolia.base.org`
- `RPC_ARC=https://rpc.testnet.arc.network`
- `TEE_WALLET_ADDRESS=<your-tee-wallet-on-base>`

### 2. Contracts Environment

```bash
cd contracts
cp .env.example .env
# .env already has private key and RPC endpoints
```

## Deployment Steps

### Step 1: Deploy to Ethereum Sepolia

```bash
cd contracts
npm run deploy:ethereum-sepolia
```

**Save the deployed addresses:**
- VaultFactory
- VaultShareOFT (OFT)
- UnifiedVault

### Step 2: Deploy to Base Sepolia

```bash
npm run deploy:base-sepolia
```

**Save the deployed addresses:**
- VaultFactory
- VaultShareOFT (OFT)
- UnifiedVault

### Step 3: Deploy to Arc Testnet

```bash
npm run deploy:arc
```

**Save the deployed addresses:**
- VaultFactory
- VaultShareOFT (OFT)
- UnifiedVault

### Step 4: Set LayerZero Peers

After deploying on all chains, set peers for cross-chain communication:

**On Ethereum Sepolia:**
```bash
OFT_ADDRESS=<ethereum-sepolia-oft-address> \
REMOTE_OFT_ADDRESS=<base-sepolia-oft-address> \
npx hardhat run scripts/set-peers.ts --network ethereum-sepolia
```

**On Base Sepolia:**
```bash
OFT_ADDRESS=<base-sepolia-oft-address> \
REMOTE_OFT_ADDRESS=<ethereum-sepolia-oft-address> \
npx hardhat run scripts/set-peers.ts --network base-sepolia
```

**On Arc:**
```bash
OFT_ADDRESS=<arc-oft-address> \
REMOTE_OFT_ADDRESS=<base-sepolia-oft-address> \
npx hardhat run scripts/set-peers.ts --network arc
```

## Contract Addresses Reference

### Ethereum Sepolia
- **USDC**: `0x1c7d4b196cb0c7b01d743fbc6116a902379c7238`
- **CCTP TokenMessenger**: `0x8FE6B999Dc680CcFDD5Bf7EB0974218be2542DAA`
- **CCTP MessageTransmitter**: `0xE737e5cEBEEBa77EFE34D4aa090756590b1CE275`
- **CCTP TokenMinter**: `0xb43db544E2c27092c107639Ad201b3dEfAbcF192`
- **CCTP Domain**: 0
- **LayerZero Endpoint**: `0x6EDCE65403992e310A62460808c4b910D972f10f`
- **LayerZero Endpoint ID**: 40161

### Base Sepolia
- **USDC**: `0x036CbD53842c5426634e7929541eC2318f3dCF7e`
- **CCTP TokenMessenger**: `0x8FE6B999Dc680CcFDD5Bf7EB0974218be2542DAA`
- **CCTP MessageTransmitter**: `0xE737e5cEBEEBa77EFE34D4aa090756590b1CE275`
- **CCTP TokenMinter**: `0xb43db544E2c27092c107639Ad201b3dEfAbcF192`
- **CCTP Domain**: 6
- **LayerZero Endpoint**: `0x6EDCE65403992e310A62460808c4b910D972f10f`
- **LayerZero Endpoint ID**: 40245

### Arc Testnet
- **USDC**: `0x3600000000000000000000000000000000000000` (ERC-20 interface, 6 decimals)
- **CCTP TokenMessenger**: `0x8FE6B999Dc680CcFDD5Bf7EB0974218be2542DAA`
- **CCTP MessageTransmitter**: `0xE737e5cEBEEBa77EFE34D4aa090756590b1CE275`
- **CCTP TokenMinter**: `0xb43db544E2c27092c107639Ad201b3dEfAbcF192`
- **CCTP Domain**: 26
- **Chain ID**: 5042002
- **RPC**: `https://rpc.testnet.arc.network`

**Note**: All testnet chains use the same CCTP contract addresses. Only the domain IDs differ.

## Testing

### Run LayerZero Flow Test

```bash
cd contracts
npm run test:layerzero
```

### Run CCTP Flow Test

```bash
npm run test:cctp
```

### Run All Tests

```bash
npm test
```

## Update Environment Variables

After deployment, update:

### Backend `.env`
```env
OFT_ADDRESS_ETHEREUM_SEPOLIA=<deployed-address>
OFT_ADDRESS_BASE_SEPOLIA=<deployed-address>
OFT_ADDRESS_ARC=<deployed-address>
```

### Frontend `.env.local`
```env
NEXT_PUBLIC_UNIFIED_VAULT_ETHEREUM_SEPOLIA=<deployed-address>
NEXT_PUBLIC_UNIFIED_VAULT_BASE_SEPOLIA=<deployed-address>
NEXT_PUBLIC_UNIFIED_VAULT_ARC=<deployed-address>
NEXT_PUBLIC_OFT_ETHEREUM_SEPOLIA=<deployed-address>
NEXT_PUBLIC_OFT_BASE_SEPOLIA=<deployed-address>
NEXT_PUBLIC_OFT_ARC=<deployed-address>
```

## Verification

1. **Check deployments** on block explorers:
   - Ethereum Sepolia: https://sepolia.etherscan.io
   - Base Sepolia: https://sepolia.basescan.org
   - Arc Testnet: https://testnet.arcscan.app

2. **Verify peers** are set correctly on all chains

3. **Test deposit flow**:
   - Deposit from Ethereum Sepolia → Base Sepolia via CCTP
   - Deposit from Arc → Base Sepolia via CCTP
   - Bridge shares between chains via LayerZero

