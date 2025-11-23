# Faucets Required for ArcaneFi

Based on the architecture where trading happens on **Base** and users deposit on other chains (Arc, Base Sepolia, Arbitrum Sepolia), here are the faucets you'll need:

## ✅ Confirmed: CCTP Supports Arc

According to [Arc Network documentation](https://docs.arc.network/arc/references/contract-addresses), CCTP is fully supported on Arc Testnet with domain ID **26**.

## Required Faucets

### 1. **Arc Testnet USDC** ⭐ REQUIRED
- **Faucet**: [Circle Faucet](https://faucet.circle.com/)
- **Network**: Arc Testnet
- **Token**: USDC
- **Why**: Users deposit USDC on Arc, which gets bridged to Base via CCTP
- **Contract Address**: `0x3600000000000000000000000000000000000000` (native USDC, 18 decimals)
- **ERC-20 Interface**: Same address (6 decimals for ERC-20 calls)

### 2. **Base Sepolia USDC** ⭐ REQUIRED
- **Faucet**: [Circle Faucet](https://faucet.circle.com/)
- **Network**: Base Sepolia
- **Token**: USDC
- **Why**: Trading happens on Base, TEE wallet needs USDC for CDP Trade API
- **Note**: This is where all trading occurs via CDP Trade API

### 3. **Base Sepolia ETH** ⭐ REQUIRED
- **Faucet**: [Base Sepolia Faucet](https://www.coinbase.com/faucets/base-ethereum-goerli-faucet) or [Alchemy Base Sepolia Faucet](https://sepoliafaucet.com/)
- **Network**: Base Sepolia
- **Token**: ETH (for gas)
- **Why**: TEE wallet needs ETH for gas fees on Base

### 4. **Arbitrum Sepolia USDC** (Optional)
- **Faucet**: [Circle Faucet](https://faucet.circle.com/)
- **Network**: Arbitrum Sepolia
- **Token**: USDC
- **Why**: If you want to support Arbitrum Sepolia as a deposit chain

### 5. **Arbitrum Sepolia ETH** (Optional)
- **Faucet**: [Arbitrum Sepolia Faucet](https://faucet.quicknode.com/arbitrum/sepolia)
- **Network**: Arbitrum Sepolia
- **Token**: ETH (for gas)
- **Why**: Gas fees for Arbitrum Sepolia transactions

## CCTP Contract Addresses

### Arc Testnet (Domain 26)
- **TokenMessengerV2**: `0x8FE6B999Dc680CcFDD5Bf7EB0974218be2542DAA`
- **MessageTransmitterV2**: `0xE737e5cEBEEBa77EFE34D4aa090756590b1CE275`
- **TokenMinterV2**: `0xb43db544E2c27092c107639Ad201b3dEfAbcF192`
- **MessageV2**: `0xbaC0179bB358A8936169a63408C8481D582390C4`

### Base Sepolia (Domain 6)
- Check [Circle CCTP Documentation](https://developers.circle.com/cctp) for latest addresses
- Or use the contract addresses from Circle's official docs

## Recommended Setup Order

1. **Get Base Sepolia USDC** - This is critical since all trading happens here
2. **Get Base Sepolia ETH** - For gas fees on Base
3. **Get Arc Testnet USDC** - For testing deposits from Arc
4. **Get Arc Testnet ETH** - For gas fees on Arc (if needed)

## Testing Flow

1. **User deposits on Arc**:
   - User needs Arc Testnet USDC
   - User needs Arc Testnet ETH (for gas)

2. **CCTP bridges to Base**:
   - USDC is burned on Arc
   - Attestation is fetched from Circle
   - USDC is minted on Base to TEE wallet

3. **Trading on Base**:
   - TEE wallet uses USDC on Base for CDP Trade API
   - All trades execute on Base

## Important Notes

- **Arc USDC**: Uses 18 decimals natively, but 6 decimals for ERC-20 interface calls
- **CCTP Fast Transfer**: Can complete in under 30 seconds (soft finality)
- **CCTP Standard Transfer**: Takes 15-19 minutes (hard finality)
- **TEE Wallet**: Must be funded on Base Sepolia for trading

## Environment Variables to Set

```env
# CCTP Base Sepolia (get from Circle docs)
CCTP_BASE_TOKEN_MESSENGER=
CCTP_BASE_MESSAGE_TRANSMITTER=
CCTP_BASE_TOKEN_MINTER=

# TEE Wallet Address (on Base)
TEE_WALLET_ADDRESS=

# CDP Trade API (for trading on Base)
CDP_API_KEY=
CDP_API_SECRET=
```

