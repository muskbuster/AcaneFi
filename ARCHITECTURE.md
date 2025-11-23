# ArcaneFi Architecture

## Overview

ArcaneFi is a cross-chain, non-custodial copy trading platform that enables users to follow and copy trades from registered traders across multiple blockchain networks.

## Core Components

### 1. Smart Contracts

#### VaultFactory.sol
- **Purpose**: Core vault management and trader registration
- **Key Features**:
  - Trader registration (TEE-only)
  - Deposit/withdrawal management
  - TVL tracking per trader
  - Integration with OFT vault shares

#### VaultShareOFT.sol
- **Purpose**: Cross-chain vault shares using LayerZero OFT
- **Key Features**:
  - ERC20 token representing vault shares
  - Mint/burn functionality
  - Cross-chain transfer capability (LayerZero integration)
  - Per-trader share tracking

#### UnifiedBalanceVault.sol
- **Purpose**: Circle Gateway integration for unified USDC management
- **Key Features**:
  - Cross-chain balance tracking
  - Unified balance view
  - Programmatic rebalancing

### 2. Backend Services

#### TEE Service
- **Purpose**: Trusted Execution Environment simulation
- **Responsibilities**:
  - Trader registration and validation
  - Deposit permission validation
  - Trading signal submission and validation
  - Access control enforcement

#### Trade Service
- **Purpose**: Trading execution and position management
- **Responsibilities**:
  - Mock trade execution (for demo)
  - Position tracking
  - PnL calculation
  - Price simulation

#### Circle Gateway Service
- **Purpose**: Unified balance management across chains
- **Responsibilities**:
  - Unified balance queries
  - Cross-chain transfers
  - Chain-specific balance tracking

#### LayerZero Service
- **Purpose**: Cross-chain communication configuration
- **Responsibilities**:
  - Endpoint management
  - Fee estimation
  - Trusted remote path configuration

### 3. Frontend

#### Pages
- **Home (`/`)**: Browse available traders
- **Trader Registration (`/trader/register`)**: Register as a trader
- **Deposit (`/deposit`)**: Deposit USDC to copy trade
- **Trader Dashboard (`/trader/[traderId]`)**: View trader performance and submit signals

#### Key Features
- Wallet connection (RainbowKit/Wagmi)
- Real-time position updates
- Cross-chain chain switching
- Trader signal submission

## Access Control Architecture

### TEE Registration System

1. **Trader Registration Flow**:
   ```
   Trader → Frontend → TEE API → Database
   ```
   - Only TEE service can register traders
   - Assigns unique traderId
   - Stores trader metadata

2. **Deposit Permission Flow**:
   ```
   User → Frontend → TEE Validation → Smart Contract
   ```
   - TEE validates trader exists
   - User can only deposit to registered traders
   - Smart contract enforces permissions

3. **Trading Signal Flow**:
   ```
   Trader → Frontend → Signature → TEE Validation → Trade Execution
   ```
   - Trader signs message
   - TEE validates traderId and signature
   - Signal queued for execution

## Data Flow

### Deposit Flow
1. User selects trader and chain
2. Frontend validates trader via TEE API
3. User approves USDC transfer
4. Circle Gateway handles cross-chain transfer
5. VaultFactory records deposit
6. VaultShareOFT mints shares
7. Shares can be bridged via LayerZero

### Trading Flow
1. Trader submits signal (LONG/SHORT)
2. TEE validates trader authentication
3. Signal stored in database
4. Trade service executes mock trade
5. Position created with entry price
6. Prices update periodically (simulated)
7. PnL calculated in real-time

### Withdrawal Flow
1. User burns OFT shares
2. VaultFactory processes withdrawal
3. USDC transferred back to user
4. Can withdraw to any chain via Circle Gateway

## Database Schema

### Traders Table
- Stores trader registration information
- Links wallet address to traderId
- Tracks performance fee and strategy

### Deposits Table
- Records all user deposits
- Tracks chain-specific deposits
- Links to traders table

### Positions Table
- Tracks open/closed positions
- Stores entry/current prices
- Calculates PnL

### Signals Table
- Stores trading signals
- Tracks signal status (pending/executed/rejected)
- Links to traders table

## Security Considerations

### Access Control
- TEE-only trader registration
- Signature-based trader authentication
- Deposit validation before execution

### Smart Contract Security
- Ownable pattern for admin functions
- SafeERC20 for token transfers
- Input validation on all functions

### API Security
- JWT tokens for authentication
- TEE secret for internal endpoints
- Signature verification for trader actions

## Integration Points

### Circle Gateway
- Unified balance API
- Cross-chain transfer API
- Wallet management

### LayerZero
- OFT contract deployment
- Endpoint configuration
- Cross-chain message passing

### CDP Trade API (Mocked)
- Trade execution simulation
- Position management
- PnL calculation

## Demo Limitations

For the hackathon demo:
- Trading is mocked (no real execution)
- Circle Gateway uses mock responses
- LayerZero OFT is partially implemented
- No real blockchain transactions for trades

## Production Considerations

1. **Full LayerZero Integration**:
   - Complete OFT implementation
   - Configure all trusted remotes
   - Test cross-chain transfers

2. **Real Circle Gateway**:
   - Integrate actual API
   - Handle webhooks
   - Implement proper error handling

3. **CDP Trade API**:
   - Real trade execution
   - Order management
   - Risk controls

4. **Security Enhancements**:
   - Full signature verification
   - Rate limiting
   - Input sanitization
   - Audit smart contracts

5. **Scalability**:
   - Database indexing
   - Caching layer
   - Load balancing
   - Monitoring and logging

