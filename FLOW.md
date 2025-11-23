# ArcaneFi Cross-Chain Flow

## Architecture Overview

**Key Principle**: All trading happens on **Base Sepolia** via CDP Trade API. Users can deposit from multiple chains (Arc, Base Sepolia, Arbitrum Sepolia), and deposits are bridged to Base using **CCTP** (Circle's Cross-Chain Transfer Protocol).

## Deposit Flow

### 1. User Initiates Deposit (Source Chain)

**Supported Source Chains:**
- Arc Testnet (Domain 26) ✅ CCTP Supported
- Base Sepolia (Domain 6) ✅ CCTP Supported  
- Arbitrum Sepolia ✅ CCTP Supported (if configured)

**Process:**
1. User connects wallet on source chain
2. User selects trader and enters USDC amount
3. User approves USDC transfer to CCTPBridge contract
4. Frontend calls `/api/cctp/burn` to initiate burn

### 2. CCTP Burn on Source Chain

**On Source Chain (e.g., Arc):**
```
User Wallet → CCTPBridge Contract → TokenMessengerV2
```

1. User's USDC is transferred to CCTPBridge contract
2. Contract calls `TokenMessengerV2.depositForBurn()`
3. USDC is burned on source chain
4. Cross-chain message is created
5. Nonce and message hash are returned

**CCTP Contracts on Arc:**
- TokenMessengerV2: `0x8FE6B999Dc680CcFDD5Bf7EB0974218be2542DAA`
- MessageTransmitterV2: `0xE737e5cEBEEBa77EFE34D4aa090756590b1CE275`

### 3. Attestation (Circle's Attestation Service)

**Two Transfer Types:**

**Fast Transfer** (Recommended):
- Uses soft finality (~30 seconds)
- Backed by Circle's Fast Transfer Allowance
- Ideal for low-latency use cases

**Standard Transfer**:
- Uses hard finality (15-19 minutes)
- More secure, longer wait time

**Process:**
1. Backend polls Circle's Attestation Service
2. Endpoint: `https://iris-api-sandbox.circle.com/attestations/{messageHash}`
3. Once attestation is available, proceed to mint

### 4. Mint on Base (Destination Chain)

**On Base Sepolia:**
```
CCTP Message + Attestation → MessageTransmitterV2 → TokenMinterV2 → TEE Wallet
```

1. TEE service receives attestation
2. TEE service calls `CCTPBridge.receiveBridgedUSDC()` on Base
3. Contract calls `MessageTransmitterV2.receiveMessage()`
4. USDC is minted to TEE wallet address on Base
5. Deposit is recorded in database

**TEE Wallet:**
- Address: Set in `TEE_WALLET_ADDRESS` env variable
- This wallet holds all bridged USDC
- Used for CDP Trade API trading

### 5. Trading Execution (Base Only)

**All trading happens on Base:**
1. Trader submits signal via frontend
2. TEE validates signal and trader authentication
3. TEE wallet (on Base) executes trade via CDP Trade API
4. Position is created and tracked
5. PnL calculated in real-time

**CDP Trade API:**
- All trades execute from TEE wallet on Base
- No cross-chain trading needed
- Unified liquidity on Base

## Withdrawal Flow

### 1. User Requests Withdrawal

1. User burns OFT vault shares
2. Withdrawal amount calculated based on shares
3. USDC transferred from TEE wallet to user

### 2. Cross-Chain Withdrawal (Optional)

If user wants to withdraw to a different chain:
1. User specifies destination chain
2. CCTP burn initiated on Base
3. USDC minted on destination chain
4. User receives USDC on their preferred chain

## Key Components

### Smart Contracts

1. **CCTPBridge.sol** (Deployed on each source chain)
   - Handles USDC burn on source chain
   - Receives and mints USDC on Base

2. **VaultFactory.sol** (Deployed on Base)
   - Manages trader deposits
   - Tracks TVL per trader

3. **VaultShareOFT.sol** (Deployed on Base)
   - Mints vault shares for deposits
   - Can be bridged via LayerZero if needed

### Backend Services

1. **CCTP Service**
   - Manages CCTP burn/mint flow
   - Polls for attestations
   - Handles Fast/Standard transfers

2. **TEE Service**
   - Validates deposits
   - Manages TEE wallet
   - Executes trades via CDP API

3. **Trade Service**
   - Executes trades on Base
   - Tracks positions
   - Calculates PnL

## CCTP Domain IDs

- **Arc Testnet**: 26
- **Base Sepolia**: 6
- **Arbitrum Sepolia**: (check Circle docs)
- **Ethereum Sepolia**: 0

## Benefits of This Architecture

1. **Unified Trading**: All trades on one chain (Base) = simpler execution
2. **Capital Efficiency**: No liquidity pools needed, native burn/mint
3. **Fast Transfers**: CCTP Fast Transfer completes in ~30 seconds
4. **Trust Minimized**: Circle's attestation service, no bridge hacks
5. **Multi-Chain Access**: Users can deposit from any supported chain

## Testing Checklist

- [ ] Get Arc Testnet USDC from Circle Faucet
- [ ] Get Base Sepolia USDC for TEE wallet
- [ ] Get Base Sepolia ETH for gas
- [ ] Deploy CCTPBridge on Arc Testnet
- [ ] Deploy CCTPBridge on Base Sepolia
- [ ] Configure TEE wallet address
- [ ] Test deposit from Arc → Base
- [ ] Verify USDC arrives at TEE wallet
- [ ] Test trading execution on Base
- [ ] Test withdrawal flow

## References

- [CCTP Documentation](https://developers.circle.com/cctp)
- [Arc Network Contract Addresses](https://docs.arc.network/arc/references/contract-addresses)
- [CDP Trade API](https://docs.cdp.coinbase.com/trade-api/quickstart)

