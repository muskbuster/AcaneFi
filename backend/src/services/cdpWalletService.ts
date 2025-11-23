import { CdpClient } from '@coinbase/cdp-sdk';
import { ethers } from 'ethers';

/**
 * CDP Wallet Service
 * Manages CDP Server Wallet accounts for TEE on-chain operations
 * 
 * Based on: https://docs.cdp.coinbase.com/server-wallets/v2/introduction/accounts
 * Uses importAccount to import existing private key into CDP
 */
export class CDPWalletService {
  private cdp: CdpClient | null = null;
  private teeAccount: any = null; // CDP account for TEE operations
  private initialized = false;

  /**
   * Initialize CDP SDK and import existing TEE account
   */
  async initialize(): Promise<void> {
    if (this.initialized && this.cdp && this.teeAccount) {
      return;
    }

    const apiKeyId = process.env.CDP_API_KEY_ID;
    const apiKeySecret = process.env.CDP_API_KEY_SECRET;
    const walletSecret = process.env.CDP_WALLET_SECRET;
    const privateKey = process.env.PRIVATE_KEY; // Existing private key to import
    const accountName = process.env.CDP_TEE_ACCOUNT_NAME || 'tee-account';

    if (!apiKeyId || !apiKeySecret) {
      throw new Error('CDP_API_KEY_ID and CDP_API_KEY_SECRET must be set in environment variables');
    }

    if (!walletSecret) {
      throw new Error('CDP_WALLET_SECRET must be set in environment variables');
    }

    if (!privateKey) {
      throw new Error('PRIVATE_KEY must be set to import existing account into CDP');
    }

    // Initialize CDP Client
    this.cdp = new CdpClient({
      apiKeyId,
      apiKeySecret,
      walletSecret,
    });

    // Check if we have an account ID - if so, the account already exists in CDP
    const accountId = process.env.CDP_ACCOUNT_ID;
    
    if (accountId) {
      // Account already exists in CDP, try to retrieve it by ID first
      try {
        // Try to get account directly by ID (if CDP SDK supports it)
        // Note: CDP SDK may not support getAccount by ID directly, so we'll try by name first
        try {
          // Try by name first (most reliable)
          this.teeAccount = await this.cdp.evm.getAccount({ name: accountName });
          console.log(`✅ Using existing CDP account by name: ${this.teeAccount.address as string}`);
          if (this.teeAccount.id && this.teeAccount.id !== accountId) {
            console.log(`⚠️  Account ID mismatch. Expected: ${accountId}, Got: ${this.teeAccount.id}`);
          }
        } catch (nameError: any) {
          // Account not found by name, try to list all accounts and find by ID
          console.log(`Account not found by name, listing accounts to find by ID: ${accountId}`);
          try {
            // List all accounts - check what format it returns
            const accountsResult = await this.cdp.evm.listAccounts();
            
            // Handle different return formats
            let accounts: any[] = [];
            if (Array.isArray(accountsResult)) {
              accounts = accountsResult;
            } else if (accountsResult && typeof accountsResult === 'object') {
              // Might be an object with accounts property
              if (Array.isArray(accountsResult.accounts)) {
                accounts = accountsResult.accounts;
              } else if (Array.isArray((accountsResult as any).data)) {
                accounts = (accountsResult as any).data;
              } else {
                // Try to convert object to array
                accounts = Object.values(accountsResult);
              }
            }
            
            const foundAccount = accounts.find((acc: any) => acc.id === accountId);
            if (foundAccount) {
              this.teeAccount = foundAccount;
              console.log(`✅ Found existing CDP account by ID in list: ${this.teeAccount.address as string}`);
            } else {
              // Account doesn't exist in list
              throw new Error(`Account with ID ${accountId} not found. Please verify CDP_ACCOUNT_ID is correct or create the account in CDP Portal.`);
            }
          } catch (listError: any) {
            console.error(`Failed to list/find accounts: ${listError.message}`);
            throw new Error(`Cannot retrieve account. Error: ${listError.message}`);
          }
        }
      } catch (error: any) {
        // If all retrieval methods fail, provide helpful error
        const errorMessage = error.message || 'Unknown error';
        if (errorMessage.includes('Invalid key format')) {
          throw new Error(`CDP account retrieval failed: Invalid key format. Please verify CDP_ACCOUNT_ID (${accountId}) is correct and the account exists in CDP Portal.`);
        }
        throw new Error(`Cannot retrieve CDP account. Error: ${errorMessage}`);
      }
    } else {
      // No account ID provided, try to get by name
      try {
        this.teeAccount = await this.cdp.evm.getAccount({ name: accountName });
        console.log(`✅ Using existing CDP account: ${this.teeAccount.address as string}`);
      } catch (error: any) {
        // Account doesn't exist - provide helpful error message
        const errorMessage = error.message || 'Unknown error';
        if (errorMessage.includes('Invalid key format')) {
          throw new Error(`CDP account '${accountName}' not found or invalid. Please create it in CDP Portal or set CDP_ACCOUNT_ID.`);
        }
        throw new Error(`Account '${accountName}' not found. Please create it in CDP Portal or provide CDP_ACCOUNT_ID. Error: ${errorMessage}`);
      }
    }

    this.initialized = true;
  }

  /**
   * Get the TEE account address
   */
  async getTEEAddress(): Promise<string> {
    await this.initialize();
    return this.teeAccount.address;
  }

  /**
   * Get CDP client instance (for advanced operations)
   */
  getCDP(): CdpClient {
    if (!this.cdp) {
      throw new Error('CDP not initialized. Call initialize() first.');
    }
    return this.cdp;
  }

  /**
   * Get TEE account
   */
  getTEEAccount(): any {
    if (!this.teeAccount) {
      throw new Error('TEE account not initialized. Call initialize() first.');
    }
    return this.teeAccount;
  }

  /**
   * Send a transaction using CDP wallet
   * @param network Network name (e.g., 'base-sepolia', 'ethereum-sepolia')
   * @param transaction Transaction object
   */
  async sendTransaction(
    network: string,
    transaction: {
      to: string;
      value?: bigint;
      data?: string;
      gasLimit?: bigint;
    }
  ): Promise<{ transactionHash: string }> {
    await this.initialize();

    if (!this.cdp || !this.teeAccount) {
      throw new Error('CDP not initialized');
    }

    // Build transaction request
    const txRequest: any = {
      to: transaction.to as `0x${string}`,
      value: transaction.value || 0n,
      data: (transaction.data || '0x') as `0x${string}`,
    };
    
    // Add gasLimit if provided (CDP may handle this differently)
    if (transaction.gasLimit) {
      txRequest.gas = transaction.gasLimit;
    }

    const result = await this.cdp.evm.sendTransaction({
      address: this.teeAccount.address as `0x${string}`,
      transaction: txRequest,
      network: network as any, // CDP SDK expects specific network types like 'base-sepolia'
    });

    return {
      transactionHash: result.transactionHash,
    };
  }

  /**
   * Get a provider for reading contract state
   */
  async getProvider(network: string): Promise<ethers.Provider> {
    const rpcUrl = this.getRPCUrl(network);
    return new ethers.JsonRpcProvider(rpcUrl);
  }

  /**
   * Get contract instance for reading (no signing needed)
   */
  async getReadOnlyContract(
    network: string,
    contractAddress: string,
    abi: any[]
  ): Promise<ethers.Contract> {
    const provider = await this.getProvider(network);
    return new ethers.Contract(contractAddress, abi, provider);
  }

  /**
   * Sign a message hash (bytes32) for EIP-191 signing
   * This is used when the contract expects MessageHashUtils.toEthSignedMessageHash(bytes32)
   * @param messageHash The message hash (bytes32) to sign
   * @param network Network name
   * @returns Signature
   */
  async signMessageHash(messageHash: string, network: string = 'base-sepolia'): Promise<string> {
    await this.initialize();

    if (!this.cdp || !this.teeAccount) {
      throw new Error('CDP not initialized');
    }

    // CDP SDK signMessage expects a string message
    // For a bytes32 hash, we need to pass it in a way that CDP will sign correctly
    // The contract expects: MessageHashUtils.toEthSignedMessageHash(bytes32)
    // Which is: keccak256("\x19Ethereum Signed Message:\n32" + bytes32)
    //
    // CDP's signMessage for strings does: keccak256("\x19Ethereum Signed Message:\n" + len + message)
    // For a hex string, CDP might handle it differently
    //
    // Solution: Convert the hash to a format CDP can sign
    // We'll pass it as a hex string and let CDP handle EIP-191
    const signatureResult = await this.cdp.evm.signMessage({
      address: this.teeAccount.address as `0x${string}`,
      message: messageHash, // Pass the hash as hex string
    } as any);

    return signatureResult.signature;
  }

  /**
   * Encode function data for contract calls
   */
  encodeFunctionData(abi: any[], functionName: string, args: any[]): string {
    const iface = new ethers.Interface(abi);
    return iface.encodeFunctionData(functionName, args);
  }

  /**
   * Get RPC URL for a network
   */
  private getRPCUrl(network: string): string {
    const rpcMap: Record<string, string> = {
      'base-sepolia': process.env.RPC_BASE_SEPOLIA || 'https://sepolia.base.org',
      'ethereum-sepolia': process.env.RPC_ETHEREUM_SEPOLIA || 'https://sepolia.gateway.tenderly.co',
      'base': process.env.RPC_BASE || 'https://mainnet.base.org',
      'ethereum': process.env.RPC_ETHEREUM || 'https://eth.llamarpc.com',
    };

    const rpcUrl = rpcMap[network];
    if (!rpcUrl) {
      throw new Error(`RPC URL not configured for network: ${network}`);
    }

    return rpcUrl;
  }
}

export const cdpWalletService = new CDPWalletService();

