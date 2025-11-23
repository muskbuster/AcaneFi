# ArcaneFi

Cross-chain social trading platform where retail users allocate capital to traders without giving traders custody of funds. Traders upload trading instructions, signals, or strategy logic into a Trusted Execution Environment (TEE) that executes trades on their behalf using pooled vault liquidity.

## Concept

ArcaneFi is a retail-facing social trading platform that enables "strategy renting" - users bet on traders, and traders get scalable capital without revealing alpha or risking custodial liability.

Retail users deposit liquidity into pooled vaults tied to specific traders. Users can deposit from any supported chain (Ethereum Sepolia, Base Sepolia, Arc, or Rari). Funds are bridged to Base Sepolia where all trading execution happens.

Traders don't touch user wallets directly. Instead, they upload trading instructions, signals, or strategy logic into a TEE. The TEE owns a dedicated trading account and is the only entity allowed to submit trades. It receives real-time inputs (market data, trader signals, risk parameters) and executes trades on integrated exchanges (HyperLiquid or any exchange) strictly according to pre-approved rules.

The TEE enforces non-custodial guarantees - traders can never withdraw user funds. It enforces rules-based execution - traders cannot deviate from the strategy logic they submitted. All positions, PnL, and fee distributions are logged and broadcast on-chain for transparent accounting. Risk limits like max leverage, stop-loss, exposure caps, and withdrawal constraints are enforced automatically.

Traders earn performance fees, while users earn proportional returns based on their vault share allocation. The platform has a strong social element that copy trading lacks - it allows for discovery of new trading talents through transparent performance tracking and on-chain verification.

The platform uses on-chain contracts as the source of truth. Trader registration, deposits, and positions are tracked on-chain via VaultFactory and UnifiedVault contracts. No database is required - all state is stored on-chain.

## Architecture

### Core Contracts

**VaultFactory**: Manages trader registration and tracks deposits. Only the TEE address can register traders. Each trader gets a unique traderId and their address is stored on-chain.

**UnifiedVault**: Handles cross-chain deposits. Supports two bridging mechanisms:
- CCTP (Circle Cross-Chain Transfer Protocol) for chains with native USDC support
- Custom attestation flow for chains without CCTP (like Rari)

**VaultShareOFT**: LayerZero OFT token representing vault shares. Enables cross-chain share transfers.

**USDCOFT**: LayerZero OFT token for USDC bridging (alternative to CCTP).

### Cross-Chain Flow

1. User deposits USDC on source chain (Ethereum Sepolia, Arc, etc.)
2. USDC is burned on source chain via CCTP or locked in UnifiedVault
3. Attestation is generated (CCTP attestation or TEE-signed for Rari)
4. USDC is minted/received on Base Sepolia to TEE wallet
5. Trading happens on Base Sepolia using TEE wallet funds

### Trading Execution

Traders are registered on-chain in VaultFactory. When a trader wants to create a position:
1. Trader signs a message with their private key (attestation)
2. TEE API verifies the signature and checks trader registration on-chain
3. TEE validates the trading instruction against pre-approved strategy rules
4. TEE fetches current market data (prices from CoinGecko or exchange APIs)
5. TEE checks risk limits (leverage, exposure caps, stop-loss)
6. TEE wallet (CDP wallet) executes the trade on the integrated exchange
7. Position is created and logged on-chain with transparent accounting

All trading operations use CDP Server Wallets v2 for secure key management. The TEE wallet is managed by Coinbase Developer Platform, ensuring private keys never leave secure enclaves. The TEE enforces that traders cannot deviate from their submitted strategy logic - it only executes trades that match pre-approved rules.

### TEE Service

The TEE service runs as a backend API that:
- Registers traders on-chain via CDP wallet
- Verifies trader signatures and attestations for position creation
- Validates trading instructions against pre-approved strategy rules
- Fetches real-time market data from CoinGecko or exchange APIs
- Enforces risk limits (max leverage, stop-loss, exposure caps)
- Executes trades on integrated exchanges using CDP wallet
- Handles CCTP attestation fetching and message receiving
- Generates signed attestations for Rari deposits
- Logs all positions, PnL, and fee distributions on-chain

The TEE uses CDP Server Wallets for all on-chain operations, ensuring secure key management and policy enforcement. The TEE is the only entity allowed to submit trades - traders cannot directly access the trading account or user funds.

## Workflow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                    Cross-Chain Deposit Flow                      │
└─────────────────────────────────────────────────────────────────┘

Source Chain (Ethereum Sepolia/Arc/Rari)
    │
    │ User deposits USDC
    ▼
┌─────────────────┐
│  UnifiedVault   │
│  (Source Chain) │
└─────────────────┘
    │
    │ CCTP: Burn USDC
    │ Rari: Lock USDC + Get Attestation
    ▼
┌─────────────────────────────────┐
│  Circle Attestation Service      │
│  (for CCTP)                      │
│  OR                              │
│  TEE API /api/rari/attestation   │
│  (for Rari)                      │
└─────────────────────────────────┘
    │
    │ Attestation
    ▼
┌─────────────────────────────────┐
│  TEE API                        │
│  /api/cctp/receive              │
│  /api/tee/verify-rari-deposit   │
└─────────────────────────────────┘
    │
    │ CDP Wallet executes receive
    ▼
Base Sepolia
    │
    │ USDC minted to TEE wallet
    ▼
┌─────────────────┐
│  UnifiedVault   │
│  (Base Sepolia) │
└─────────────────┘
    │
    │ USDC in TEE wallet
    ▼
┌─────────────────┐
│  TEE Wallet      │
│  (CDP Managed)  │
└─────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                    Position Creation Flow                       │
└─────────────────────────────────────────────────────────────────┘

Trader
    │
    │ Signs message with private key
    ▼
┌─────────────────────────────────┐
│  TEE API                        │
│  /api/tee/create-position       │
└─────────────────────────────────┘
    │
    │ 1. Verify trader on-chain (VaultFactory)
    │ 2. Verify signature
    │ 3. Fetch price from CoinGecko
    │ 4. Update MockUniswap price
    │ 5. Approve USDC (if needed)
    │ 6. Execute swap
    ▼
┌─────────────────┐
│  MockUniswap    │
│  (Base Sepolia) │
└─────────────────┘
    │
    │ Swap USDC -> Token
    ▼
┌─────────────────┐
│  TEE Wallet     │
│  (Holds tokens) │
└─────────────────┘
```

## Integrations

**Circle CCTP**: Native USDC burning and minting for cross-chain transfers. Used for Ethereum Sepolia, Base Sepolia, and Arc.

**LayerZero OFT**: Omnichain Fungible Token standard for cross-chain share and USDC transfers.

**CDP Server Wallets v2**: Coinbase Developer Platform service for secure wallet management. All TEE operations use CDP wallets with keys stored in secure enclaves.

**CoinGecko API**: Real-time price feeds for ETH, WBTC, and ZEC tokens.

**MockUniswap**: Simulated DEX on Base Sepolia for testing position creation. Accepts USDC and mints mock tokens (ETH, WBTC, ZEC) based on current prices. In production, this would be replaced with actual exchange integrations (HyperLiquid or other exchanges).

**HyperLiquid**: Integrated exchange for actual trading execution. The TEE executes trades on HyperLiquid according to trader-submitted strategy logic.

## Deployment

Contracts are deployed on:
- Base Sepolia (primary trading chain)
- Ethereum Sepolia (source chain with CCTP)
- Arc Testnet (source chain with CCTP)
- Rari Testnet (source chain with custom attestation)

Backend API is deployed on AWS EC2 at `https://api.arcane.tachyon.pe` with SSL certificate.

## Testing

All tests use the production API endpoint. Run tests with:

```bash
# CCTP flow
npm run test -- test/CCTPFullFlow.testnet.ts --network base-sepolia

# Rari flow
npm run test -- test/RariFlow.testnet.ts --network base-sepolia

# Position creation
npm run test -- test/CreatePosition.testnet.ts --network base-sepolia
```

