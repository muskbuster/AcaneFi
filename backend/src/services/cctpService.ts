/**
 * CCTP Service
 * Handles Circle's Cross-Chain Transfer Protocol for USDC bridging
 * Based on: https://developers.circle.com/cctp
 */

export interface CCTPConfig {
  tokenMessenger: string;
  messageTransmitter: string;
  tokenMinter: string;
  domain: number;
}

export class CCTPService {
  private configs: Record<string, CCTPConfig> = {
    'arc': {
      tokenMessenger: '0x8FE6B999Dc680CcFDD5Bf7EB0974218be2542DAA',
      messageTransmitter: '0xE737e5cEBEEBa77EFE34D4aa090756590b1CE275',
      tokenMinter: '0xb43db544E2c27092c107639Ad201b3dEfAbcF192',
      domain: 26, // Arc Testnet
    },
    'base-sepolia': {
      tokenMessenger: '0x8FE6B999Dc680CcFDD5Bf7EB0974218be2542DAA',
      messageTransmitter: '0xE737e5cEBEEBa77EFE34D4aa090756590b1CE275',
      tokenMinter: '0xb43db544E2c27092c107639Ad201b3dEfAbcF192',
      domain: 6, // Base Sepolia
    },
    'ethereum-sepolia': {
      tokenMessenger: '0x8FE6B999Dc680CcFDD5Bf7EB0974218be2542DAA',
      messageTransmitter: '0xE737e5cEBEEBa77EFE34D4aa090756590b1CE275',
      tokenMinter: '0xb43db544E2c27092c107639Ad201b3dEfAbcF192',
      domain: 0, // Ethereum Sepolia domain
    },
  };

  private attestationServiceUrl = 'https://iris-api-sandbox.circle.com/v2/messages';

  /**
   * Get CCTP config for a chain
   */
  getConfig(chain: string): CCTPConfig | null {
    return this.configs[chain] || null;
  }

  /**
   * Check if CCTP is supported on a chain
   */
  isSupported(chain: string): boolean {
    return chain in this.configs && this.configs[chain].tokenMessenger !== '';
  }

  // Note: Users interact directly with TokenMessenger.depositForBurn()
  // No service method needed - handled by frontend/contracts

  /**
   * Fetch attestation from Circle's Attestation Service
   * Based on: https://developers.circle.com/cctp/transfer-usdc-on-testnet-from-ethereum-to-avalanche
   * API: GET /v2/messages/{domain}?transactionHash={hash}
   */
  async fetchAttestation(
    sourceDomain: number,
    transactionHash: string
  ): Promise<{
    message: string;
    attestation: string;
    status: 'pending' | 'complete' | 'failed';
  }> {
    try {
      const url = `${this.attestationServiceUrl}/${sourceDomain}?transactionHash=${transactionHash}`;
      const response = await fetch(url);
      
      if (response.status === 404) {
        return {
          message: '',
          attestation: '',
          status: 'pending',
        };
      }

      if (!response.ok) {
        throw new Error(`Attestation API error: ${response.status}`);
      }

      const data = await response.json() as any;
      const messageData = data.messages?.[0];
      
      if (!messageData) {
        return {
          message: '',
          attestation: '',
          status: 'pending',
        };
      }

      return {
        message: messageData.message || '',
        attestation: messageData.attestation || '',
        status: messageData.status === 'complete' ? 'complete' : 'pending',
      };
    } catch (error) {
      console.error('Attestation fetch error:', error);
      return {
        message: '',
        attestation: '',
        status: 'pending',
      };
    }
  }

  /**
   * Poll for attestation (for Standard Transfer)
   * Fast Transfer uses soft finality, Standard Transfer uses hard finality
   * Based on CCTP docs: https://developers.circle.com/cctp/transfer-usdc-on-testnet-from-ethereum-to-avalanche
   */
  async pollForAttestation(
    sourceDomain: number,
    transactionHash: string,
    maxAttempts: number = 30,
    intervalMs: number = 5000
  ): Promise<{
    message: string;
    attestation: string;
  }> {
    for (let i = 0; i < maxAttempts; i++) {
      const result = await this.fetchAttestation(sourceDomain, transactionHash);
      
      if (result.status === 'complete' && result.attestation && result.message) {
        return {
          message: result.message,
          attestation: result.attestation,
        };
      }

      if (result.status === 'failed') {
        throw new Error('Attestation failed');
      }

      console.log(`Waiting for attestation... (attempt ${i + 1}/${maxAttempts})`);
      // Wait before next attempt
      await new Promise((resolve) => setTimeout(resolve, intervalMs));
    }

    throw new Error('Attestation timeout');
  }

  /**
   * Get CCTP contract addresses for frontend
   * Users interact directly with CCTP contracts - no TEE needed
   */
  getContractAddresses(chain: string): {
    tokenMessenger: string;
    messageTransmitter: string;
    usdc: string;
  } | null {
    const config = this.getConfig(chain);
    if (!config) return null;

    // USDC addresses (testnet)
    const usdcAddresses: Record<string, string> = {
      'arc': '0x3600000000000000000000000000000000000000', // Arc USDC (ERC-20 interface, 6 decimals)
      'ethereum-sepolia': '0x1c7d4b196cb0c7b01d743fbc6116a902379c7238',
      'base-sepolia': process.env.USDC_BASE_SEPOLIA || '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
    };

    return {
      tokenMessenger: config.tokenMessenger,
      messageTransmitter: config.messageTransmitter,
      usdc: usdcAddresses[chain] || '',
    };
  }

  /**
   * Get domain ID for a chain
   */
  getDomain(chain: string): number {
    const config = this.getConfig(chain);
    return config?.domain || 0;
  }

  /**
   * Get supported chains
   */
  getSupportedChains(): string[] {
    return Object.keys(this.configs).filter((chain) => this.isSupported(chain));
  }

  /**
   * Receive bridged USDC on Base Sepolia using CDP wallet
   * Calls UnifiedVault.receiveBridgedUSDC on Base Sepolia
   * This is permissionless - anyone can call it
   * Uses CDP wallet for secure transaction signing in TEE
   */
  async receiveBridgedUSDC(
    message: string,
    attestation: string
  ): Promise<{
    success: boolean;
    transactionHash?: string;
    error?: string;
  }> {
    try {
      const { ethers } = await import('ethers');
      const { cdpWalletService } = await import('./cdpWalletService.js');
      
      // Get Base Sepolia UnifiedVault address
      const unifiedVaultAddress = process.env.UNIFIED_VAULT_BASE_SEPOLIA;
      
      if (!unifiedVaultAddress || unifiedVaultAddress === '0x0000000000000000000000000000000000000000') {
        throw new Error('UNIFIED_VAULT_BASE_SEPOLIA not configured');
      }

      // Get provider first (needed for both CDP and fallback)
      const provider = await cdpWalletService.getProvider('base-sepolia');

      // Initialize CDP wallet (with fallback to direct private key)
      let useCDP = true;
      let wallet: ethers.Wallet | null = null;
      let cdpWalletAddress: string;
      
      try {
        await cdpWalletService.initialize();
        cdpWalletAddress = await cdpWalletService.getTEEAddress();
        console.log(`Using CDP wallet: ${cdpWalletAddress}`);
      } catch (cdpError: any) {
        console.warn(`⚠️  CDP wallet initialization failed: ${cdpError.message}`);
        console.log(`Falling back to direct private key signing...`);
        
        // Fallback: Use private key directly
        const privateKey = process.env.PRIVATE_KEY || process.env.DEPLOYER_PRIVATE_KEY;
        if (!privateKey) {
          throw new Error('CDP wallet failed and no PRIVATE_KEY available for fallback');
        }
        
        useCDP = false;
        
        // Parse private key (handle hex or base64)
        try {
          const hexKey = privateKey.startsWith('0x') ? privateKey : '0x' + privateKey;
          if (hexKey.length === 66 && /^0x[0-9a-fA-F]{64}$/.test(hexKey)) {
            wallet = new ethers.Wallet(hexKey, provider);
          } else {
            throw new Error('Not a valid hex key');
          }
        } catch (keyError) {
          try {
            const decoded = Buffer.from(privateKey, 'base64');
            const hexKey = '0x' + decoded.toString('hex').slice(0, 64);
            wallet = new ethers.Wallet(hexKey, provider);
          } catch (e) {
            throw new Error('Invalid PRIVATE_KEY format - must be hex (64 chars) or base64');
          }
        }
        
        cdpWalletAddress = wallet.address;
        console.log(`Using direct private key wallet: ${cdpWalletAddress}`);
      }

      // UnifiedVault ABI (minimal - just receiveBridgedUSDC)
      const unifiedVaultABI = [
        {
          name: 'receiveBridgedUSDC',
          type: 'function',
          stateMutability: 'nonpayable',
          inputs: [
            { name: 'message', type: 'bytes' },
            { name: 'attestation', type: 'bytes' },
          ],
          outputs: [],
        },
      ];
      const unifiedVault = new ethers.Contract(
        unifiedVaultAddress,
        unifiedVaultABI,
        provider
      );

      // Convert hex strings to bytes
      const messageBytes = ethers.getBytes(message);
      const attestationBytes = ethers.getBytes(attestation);

      console.log(`Receiving bridged USDC on Base Sepolia using CDP wallet...`);
      console.log(`UnifiedVault: ${unifiedVaultAddress}`);
      console.log(`CDP Wallet: ${cdpWalletAddress}`);
      console.log(`Message: ${message.substring(0, 20)}...`);
      console.log(`Attestation: ${attestation.substring(0, 20)}...`);

      // Encode function call
      const receiveBridgedUSDCData = unifiedVault.interface.encodeFunctionData('receiveBridgedUSDC', [
        messageBytes,
        attestationBytes,
      ]);

      // Estimate gas first
      let gasEstimate: bigint;
      try {
        const gasEstimateResult = await provider.estimateGas({
          to: unifiedVaultAddress,
          data: receiveBridgedUSDCData,
          from: cdpWalletAddress,
        });
        gasEstimate = gasEstimateResult;
        console.log(`Estimated gas: ${gasEstimate.toString()}`);
      } catch (gasError: any) {
        console.error('Gas estimation failed:', gasError);
        throw new Error(`Gas estimation failed: ${gasError.message || 'Unknown error'}`);
      }

      // Send transaction using CDP wallet or direct wallet
      let transactionHash: string;
      
      if (useCDP) {
        // Use CDP wallet
        const txResult = await cdpWalletService.sendTransaction('base-sepolia', {
          to: unifiedVaultAddress,
          data: receiveBridgedUSDCData,
          gasLimit: gasEstimate * 120n / 100n, // Add 20% buffer
        });
        transactionHash = txResult.transactionHash;
      } else {
        // Use direct wallet
        if (!wallet) {
          throw new Error('Wallet not initialized for direct signing');
        }
        
        const tx = await wallet.sendTransaction({
          to: unifiedVaultAddress,
          data: receiveBridgedUSDCData,
          gasLimit: gasEstimate * 120n / 100n, // Add 20% buffer
        });
        
        const receipt = await tx.wait();
        if (!receipt) {
          throw new Error('Transaction receipt not found');
        }
        transactionHash = receipt.hash;
      }

      console.log(`✅ USDC received on Base Sepolia`);
      console.log(`Transaction hash: ${transactionHash}`);

      return {
        success: true,
        transactionHash: transactionHash,
      };
    } catch (error: any) {
      console.error('Receive bridged USDC error:', error);
      return {
        success: false,
        error: error.message || 'Failed to receive bridged USDC',
      };
    }
  }
}

export const cctpService = new CCTPService();

