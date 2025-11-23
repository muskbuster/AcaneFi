# LayerZero Configuration

Configuration from [LayerZero V2 Deployments - Testnet](https://docs.layerzero.network/v2/deployments/deployed-contracts?stages=testnet)

## Supported Chains

### Ethereum Sepolia Testnet
- **EndpointV2 Address**: `0x6EDCE65403992e310A62460808c4b910D972f10f`
- **Endpoint ID (eid)**: `40161`
- **Chain ID**: `11155111`
- **RPC**: Use your preferred Sepolia RPC

### Base Sepolia Testnet
- **EndpointV2 Address**: `0x6EDCE65403992e310A62460808c4b910D972f10f`
- **Endpoint ID (eid)**: `40245`
- **Chain ID**: `84532`
- **RPC**: Use your preferred Base Sepolia RPC

## Important Notes

1. **Endpoint ID vs Chain ID**: 
   - Endpoint ID (eid) is used in LayerZero `send()` calls
   - Chain ID is the blockchain's native chain ID
   - They are different values!

2. **Endpoint Addresses**: 
   - Both testnets use the same EndpointV2 address
   - This is correct - LayerZero uses the same endpoint contract across testnets

3. **OFT Contract Addresses**:
   - Set after deploying your OFT contracts
   - Use `OFT_ADDRESS_ETHEREUM_SEPOLIA` and `OFT_ADDRESS_BASE_SEPOLIA` env vars

## Usage in Code

```typescript
// Get configuration
const config = await layerzeroApi.getConfig('base-sepolia');
// Returns: {
//   chain: 'base-sepolia',
//   endpoint: '0x6EDCE65403992e310A62460808c4b910D972f10f',
//   endpointId: 40245,
//   chainId: 84532,
//   oftAddress: '...' (if set)
// }

// Use endpointId in send() calls
await oftContract.send(
  config.endpointId,  // Use endpointId, not chainId!
  recipientBytes32,
  amount,
  ...
);
```

## References

- [LayerZero V2 Deployments](https://docs.layerzero.network/v2/deployments/deployed-contracts?stages=testnet)
- [LayerZero OFT Quickstart](https://docs.layerzero.network/v2/developers/evm/oft/quickstart)

