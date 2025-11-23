/**
 * LayerZero Service
 * Configuration only - frontend/contracts handle all transactions
 * Based on: https://docs.layerzero.network/v2/developers/evm/oft/quickstart
 */

export interface LayerZeroConfig {
  endpoint: string; // EndpointV2 contract address
  endpointId: number; // LayerZero endpoint ID (eid) - different from chain ID
  chainId: number; // Blockchain chain ID
  oftAddress?: string; // OFT contract address on this chain (set after deployment)
}

export class LayerZeroService {
  // Configuration from: https://docs.layerzero.network/v2/deployments/deployed-contracts?stages=testnet
  private configs: Record<string, LayerZeroConfig> = {
    'ethereum-sepolia': {
      // EndpointV2 address for Ethereum Sepolia Testnet
      endpoint: process.env.LZ_ENDPOINT_ETHEREUM_SEPOLIA || '0x6EDCE65403992e310A62460808c4b910D972f10f',
      endpointId: 40161, // LayerZero endpoint ID for Ethereum Sepolia
      chainId: 11155111, // Ethereum Sepolia chain ID
      oftAddress: process.env.OFT_ADDRESS_ETHEREUM_SEPOLIA || '',
    },
    'base-sepolia': {
      // EndpointV2 address for Base Sepolia Testnet
      endpoint: process.env.LZ_ENDPOINT_BASE_SEPOLIA || '0x6EDCE65403992e310A62460808c4b910D972f10f',
      endpointId: 40245, // LayerZero endpoint ID for Base Sepolia
      chainId: 84532, // Base Sepolia chain ID
      oftAddress: process.env.OFT_ADDRESS_BASE_SEPOLIA || '',
    },
    'arc': {
      // EndpointV2 address for Arc Testnet (check LayerZero docs for actual address)
      endpoint: process.env.LZ_ENDPOINT_ARC || '0x0000000000000000000000000000000000000000',
      endpointId: 0, // Set actual Arc endpoint ID from LayerZero docs
      chainId: 5042002, // Arc Testnet chain ID
      oftAddress: process.env.OFT_ADDRESS_ARC || '',
    },
  };

  /**
   * Get LayerZero configuration for a chain
   */
  getConfig(chain: string): LayerZeroConfig | null {
    return this.configs[chain] || null;
  }

  /**
   * Get LayerZero endpoint for a chain
   */
  getEndpoint(chain: string): string {
    return this.configs[chain]?.endpoint || '0x0000000000000000000000000000000000000000';
  }

  /**
   * Get LayerZero endpoint ID (eid) for a chain
   * This is different from chain ID - used in LayerZero send() calls
   */
  getEndpointId(chain: string): number {
    return this.configs[chain]?.endpointId || 0;
  }

  /**
   * Get blockchain chain ID for a chain
   */
  getChainId(chain: string): number {
    return this.configs[chain]?.chainId || 0;
  }

  /**
   * Get OFT contract address for a chain
   */
  getOFTAddress(chain: string): string {
    return this.configs[chain]?.oftAddress || '';
  }

  /**
   * Get all supported chains
   */
  getSupportedChains(): string[] {
    return Object.keys(this.configs);
  }

  /**
   * Get peer address for OFT (used when setting peers)
   * Format: remoteOFTAddress (20 bytes) + localOFTAddress (20 bytes) as bytes32
   */
  getPeerAddress(localChain: string, remoteChain: string): string {
    const localOFT = this.getOFTAddress(localChain);
    const remoteOFT = this.getOFTAddress(remoteChain);
    
    if (!localOFT || !remoteOFT) {
      return '0x0000000000000000000000000000000000000000000000000000000000000000';
    }

    // Remove 0x prefix and pad to 64 chars (32 bytes)
    const remote = remoteOFT.slice(2).padStart(64, '0');
    const local = localOFT.slice(2).padStart(64, '0');
    
    return `0x${remote}${local}`;
  }
}

export const layerZeroService = new LayerZeroService();

