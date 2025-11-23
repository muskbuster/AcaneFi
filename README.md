# ArcaneFi - Cross-Chain Copy Trading Platform

A cross-chain, non-custodial copy trading platform built for ETHGlobal Buenos Aires hackathon.

## Architecture

- **Cross-chain vault system** using LayerZero OFT for vault shares
- **TEE-secured trading execution** with proper access control
- **Circle Gateway** for unified USDC balance management
- **CDP Trade API** integration (mocked trading for demo)

## Project Structure

```
arcanefi/
├── contracts/          # Smart contracts (Solidity)
├── backend/            # Node.js/TypeScript backend services
├── frontend/           # Next.js frontend
└── database/           # Database migrations and schema
```

## Setup

1. Install dependencies:
```bash
npm run install:all
```

2. Set up environment variables (see `.env.example` files in each directory)

3. Run database migrations:
```bash
cd database && npm run migrate
```

4. Start backend:
```bash
npm run dev:backend
```

5. Start frontend:
```bash
npm run dev:frontend
```

## Key Features

- Trader registration with TEE validation
- Cross-chain deposits via Circle Gateway
- OFT vault shares for cross-chain transfers
- Mock trading execution with PnL tracking
- Real-time position monitoring

