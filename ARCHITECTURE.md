# ArcaneFi Architecture and Workflow

## System Integration Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           ArcaneFi Platform                                  │
└─────────────────────────────────────────────────────────────────────────────┘

┌──────────────────┐      ┌──────────────────┐      ┌──────────────────┐
│ Ethereum Sepolia │      │   Base Sepolia   │      │   Rari Testnet   │
│                  │      │  (Trading Chain) │      │                  │
│                  │      │                  │      │                  │
│  UnifiedVault    │      │  UnifiedVault    │      │  UnifiedVault    │
│  VaultFactory    │      │  VaultFactory    │      │  VaultFactory    │
│  USDCOFT         │      │  MockUniswap     │      │  MockUSDC        │
│  VaultShareOFT   │      │  USDCOFT         │      │                  │
│                  │      │  VaultShareOFT   │      │                  │
└────────┬─────────┘      └────────┬─────────┘      └────────┬─────────┘
         │                        │                         │
         │                        │                         │
         │  CCTP Bridge           │                         │  Custom Attestation
         │  (Circle)              │                         │  (TEE Signed)
         │                        │                         │
         └────────────────────────┼─────────────────────────┘
                                  │
                                  │
                    ┌─────────────▼─────────────┐
                    │   TEE Backend API        │
                    │   (AWS EC2)              │
                    │                          │
                    │  - Trader Registration   │
                    │  - Position Creation     │
                    │  - CCTP Receive          │
                    │  - Rari Verification     │
                    │  - Price Fetching        │
                    └─────────────┬─────────────┘
                                  │
                    ┌─────────────┼─────────────┐
                    │             │             │
         ┌──────────▼───┐  ┌─────▼─────┐  ┌───▼────────┐
         │ CDP Wallets   │  │ CoinGecko  │  │ Circle     │
         │ (Coinbase)    │  │ API        │  │ CCTP       │
         │               │  │            │  │ Attestation│
         │ Secure Key    │  │ Price Data │  │ Service    │
         │ Management    │  │            │  │            │
         └───────────────┘  └────────────┘  └────────────┘
```

## Deposit Workflow

```
User on Source Chain
    │
    │ 1. Approve USDC to UnifiedVault
    │ 2. Call depositViaCCTP() or depositRari()
    ▼
UnifiedVault (Source Chain)
    │
    ├─ CCTP Flow:
    │  │
    │  │ 3. Burn USDC via TokenMessenger
    │  │ 4. Get attestation from Circle
    │  │ 5. Call TEE API /api/cctp/receive
    │  │
    │  └─► TEE API uses CDP wallet to call receiveBridgedUSDC()
    │
    └─ Rari Flow:
       │
       │ 3. Lock USDC in UnifiedVault
       │ 4. Call TEE API /api/rari/attestation (get signed message)
       │ 5. Call TEE API /api/tee/verify-rari-deposit
       │
       └─► TEE API uses CDP wallet to call receiveAttested()

Base Sepolia - UnifiedVault
    │
    │ 6. USDC minted/received to TEE wallet
    ▼
TEE Wallet (CDP Managed)
    │
    │ Funds ready for trading
    ▼
```

## Position Creation Workflow

```
Trader
    │
    │ 1. Upload trading instruction/signal/strategy logic
    │ 2. Sign message: "ArcaneFi: Create position for trader {id}"
    │ 3. Call TEE API /api/tee/create-position
    │    - traderId, traderAddress, signature, tokenType, amountIn
    ▼
TEE API
    │
    │ 4. Verify trader on-chain (VaultFactory.isTraderRegistered)
    │ 5. Verify signature (ECDSA.recover)
    │ 6. Validate trading instruction against pre-approved strategy rules
    │ 7. Check risk limits (leverage, exposure caps, stop-loss)
    │ 8. Fetch market data from CoinGecko or exchange API
    │ 9. Update MockUniswap.setPrice() (for testing)
    │ 10. Check TEE wallet balance (pooled vault liquidity)
    │ 11. Execute trade via CDP wallet on integrated exchange
    │ 12. Log position on-chain with transparent accounting
    ▼
Integrated Exchange (HyperLiquid/MockUniswap)
    │
    │ 13. Trade executed according to strategy rules
    │ 14. Position opened using pooled vault funds
    ▼
TEE Wallet (Pooled Vault)
    │
    │ Position created - PnL tracked on-chain
    │ Performance fees calculated and distributed
    ▼
```

## Trader Registration Workflow

```
Trader
    │
    │ 1. Call TEE API /api/tee/register-trader
    │    - address, name, strategyDescription, performanceFee
    ▼
TEE API
    │
    │ 2. Check if trader already registered on-chain
    │ 3. If not, call VaultFactory.registerTrader() via CDP wallet
    │ 4. Get traderId from on-chain registration
    │ 5. Return traderId and trader info
    ▼
VaultFactory (Base Sepolia)
    │
    │ Trader registered with unique traderId
    │ Address stored on-chain
    ▼
```

## Key Components

**VaultFactory**: On-chain trader registry. Stores trader addresses and IDs. Only TEE can register traders.

**UnifiedVault**: Cross-chain deposit handler. Supports CCTP (for Ethereum/Base/Arc) and custom attestation (for Rari).

**TEE API**: Backend service managing trader operations. Uses CDP wallets for all on-chain actions. Verifies traders on-chain before executing trades. Enforces non-custodial guarantees, rules-based execution, and risk limits. Logs all positions and PnL on-chain for transparent accounting.

**CDP Server Wallets**: Secure wallet management by Coinbase. Private keys stored in secure enclaves. Used for all TEE on-chain operations. The TEE owns the trading account - traders cannot directly access funds.

**MockUniswap**: Simulated DEX for testing. Accepts USDC, mints tokens based on prices fetched from CoinGecko. In production, replaced with actual exchange integrations (HyperLiquid or other exchanges).

**Pooled Vaults**: Vaults tied to specific traders where users deposit liquidity. The TEE uses pooled vault funds to execute trades. Users earn proportional returns based on their vault share allocation. Traders earn performance fees on profitable trades.

