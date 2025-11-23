# CCTP Contract Addresses

## Testnet Addresses

All testnet chains use the **same contract addresses**:

| Contract | Address | Description |
|----------|---------|-------------|
| **TokenMessengerV2** | `0x8FE6B999Dc680CcFDD5Bf7EB0974218be2542DAA` | Entrypoint for crosschain USDC transfer |
| **MessageTransmitterV2** | `0xE737e5cEBEEBa77EFE34D4aa090756590b1CE275` | Generic message passing |
| **TokenMinterV2** | `0xb43db544E2c27092c107639Ad201b3dEfAbcF192` | Responsible for minting and burning USDC |
| **MessageV2** | `0xbaC0179bB358A8936169a63408C8481D582390C4` | Helper functions for crosschain transfers |

## Domain IDs

| Chain | Domain ID |
|-------|-----------|
| Ethereum Sepolia | 0 |
| Base Sepolia | 6 |
| Arc Testnet | 26 |

## Supported Testnet Chains

- Ethereum Sepolia (Domain 0)
- Avalanche Fuji (Domain 1)
- OP Sepolia (Domain 2)
- Arbitrum Sepolia (Domain 3)
- Base Sepolia (Domain 6)
- Polygon PoS Amoy (Domain 7)
- Unichain Sepolia (Domain 10)
- Linea Sepolia (Domain 11)
- Codex Testnet (Domain 12)
- Sonic Testnet (Domain 13)
- World Chain Sepolia (Domain 14)
- Monad Testnet (Domain 15)
- Sei Testnet (Domain 16)
- XDC Apothem (Domain 18)
- HyperEVM Testnet (Domain 19)
- Ink Testnet (Domain 21)
- Plume Testnet (Domain 22)
- **Arc Testnet (Domain 26)** ✅

## Usage in Contracts

```solidity
// All testnet chains use the same addresses
address constant TOKEN_MESSENGER = 0x8FE6B999Dc680CcFDD5Bf7EB0974218be2542DAA;
address constant MESSAGE_TRANSMITTER = 0xE737e5cEBEEBa77EFE34D4aa090756590b1CE275;
address constant TOKEN_MINTER = 0xb43db544E2c27092c107639Ad201b3dEfAbcF192;
```

## Reference

- Official CCTP Documentation: https://developers.circle.com/cctp
- Contract Source: https://github.com/circlefin/evm-cctp-contracts

