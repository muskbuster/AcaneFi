# LayerZero OFT Flow - Direct Frontend/Contract Interaction

Based on [LayerZero OFT Quickstart](https://docs.layerzero.network/v2/developers/evm/oft/quickstart), all transactions happen via frontend and contracts. **No backend mocking** - real transactions only.

## Architecture

- **Backend**: Provides configuration only (endpoints, chain IDs, contract addresses)
- **Frontend**: Interacts directly with OFT contracts using LayerZero SDK
- **Contracts**: Handle all send/receive logic via LayerZero OApp
- **TEE**: Only handles trader permissions for trading platform (not bridging)

## Flow Overview

1. **User deposits** → Receives OFT vault shares on source chain
2. **User calls `send()`** on OFT contract to bridge shares
3. **LayerZero handles** cross-chain message passing
4. **Shares arrive** on destination chain automatically

## Step-by-Step Process

### 1. Get Configuration (Backend API)

```typescript
// Get OFT contract address and endpoint for a chain
const config = await layerzeroApi.getConfig('base-sepolia');
// Returns: { chain, endpoint, chainId, oftAddress }
```

### 2. Approve OFT (Frontend)

User approves OFT contract to spend their shares:

```typescript
await oftContract.approve(oftAddress, sharesAmount);
```

### 3. Send Shares (Frontend → OFT Contract)

User calls `send()` directly on OFT contract:

```typescript
// Using viem/ethers
await oftContract.send(
  dstEid,           // Destination chain endpoint ID
  to,               // Recipient address (bytes32)
  amount,           // Amount to send
  refundTo,         // Address to refund native gas
  extraOptions,     // Additional options
  composeMsg        // Optional composed message
);
```

**Key Parameters:**
- `dstEid`: Destination chain endpoint ID (from config)
- `to`: Recipient address in bytes32 format
- `amount`: Amount of shares to send

### 4. Fee Estimation (Frontend → OFT Contract)

Query fee directly from OFT contract:

```typescript
const fees = await oftContract.quote(
  dstEid,           // Destination chain endpoint ID
  sendParam,        // Send parameters
  false,            // payInLzToken
  extraOptions,     // Additional options
  composeMsg        // Optional composed message
);

// Returns: { nativeFee, lzTokenFee }
```

### 5. Receive Shares (Automatic)

LayerZero automatically handles receiving on destination chain. No user action needed.

## API Endpoints (Configuration Only)

### Get Configuration
```
GET /api/layerzero/config/:chain
```

Returns:
```json
{
  "chain": "base-sepolia",
  "endpoint": "0x...",
  "chainId": 84532,
  "oftAddress": "0x..."
}
```

### Get OFT Address
```
GET /api/layerzero/oft/:chain
```

### Get Peer Address (for setting peers)
```
GET /api/layerzero/peer?localChain=base-sepolia&remoteChain=arc
```

### Get Supported Chains
```
GET /api/layerzero/chains
```

## Frontend Integration

```typescript
import { createPublicClient, http } from 'viem';
import { baseSepolia } from 'viem/chains';

// 1. Get configuration
const config = await layerzeroApi.getConfig('base-sepolia');

// 2. Create client
const client = createPublicClient({
  chain: baseSepolia,
  transport: http(),
});

// 3. Get OFT contract
const oftContract = {
  address: config.oftAddress,
  abi: OFT_ABI, // LayerZero OFT ABI
};

// 4. Estimate fee
const fees = await client.readContract({
  ...oftContract,
  functionName: 'quote',
  args: [
    dstEid,        // Destination endpoint ID
    sendParam,     // Send parameters
    false,         // payInLzToken
    '0x',          // extraOptions
    '0x',          // composeMsg
  ],
});

// 5. Send shares
const tx = await client.writeContract({
  ...oftContract,
  functionName: 'send',
  args: [
    dstEid,        // Destination endpoint ID
    recipientBytes32,
    amount,
    refundTo,
    '0x',          // extraOptions
    '0x',          // composeMsg
  ],
  value: fees.nativeFee, // Pay native fee
});
```

## Chain Endpoint IDs (eid)

From [LayerZero V2 Deployments](https://docs.layerzero.network/v2/deployments/deployed-contracts?stages=testnet):

- **Ethereum Sepolia**: 40161
- **Base Sepolia**: 40245

**Note**: Endpoint IDs (eid) are different from chain IDs. Use `endpointId` in LayerZero `send()` calls.

## Setting Peers (After Deployment)

After deploying OFT on each chain, set peers:

```typescript
// On Ethereum Sepolia
await oftContract.setPeer(
  40245,                      // Base Sepolia endpoint ID (eid)
  peerAddress                 // From getPeerAddress API
);

// On Base Sepolia
await oftContract.setPeer(
  40161,                      // Ethereum Sepolia endpoint ID (eid)
  peerAddress                 // From getPeerAddress API
);
```

## Key Points

1. ✅ **No Backend Mocking** - All transactions are real
2. ✅ **Direct Contract Interaction** - Frontend calls OFT contracts directly
3. ✅ **Fee Estimation** - Done via contract's `quote()` function
4. ✅ **Automatic Receiving** - LayerZero handles receive automatically
5. ✅ **TEE Not Involved** - TEE only handles trader permissions, not bridging

## Environment Variables

```env
# LayerZero Endpoints (from official deployments)
LZ_ENDPOINT_ETHEREUM_SEPOLIA=0x6EDCE65403992e310A62460808c4b910D972f10f
LZ_ENDPOINT_BASE_SEPOLIA=0x6EDCE65403992e310A62460808c4b910D972f10f

# OFT Contract Addresses (set after deployment)
OFT_ADDRESS_ETHEREUM_SEPOLIA=
OFT_ADDRESS_BASE_SEPOLIA=
```

## References

- [LayerZero OFT Quickstart](https://docs.layerzero.network/v2/developers/evm/oft/quickstart)
- [LayerZero OApp Documentation](https://docs.layerzero.network/v2/developers/evm/oapp)

