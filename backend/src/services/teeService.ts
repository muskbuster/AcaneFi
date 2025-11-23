import { Trader, Signal } from '../types/index.js';

export class TEEService {
  /**
   * Register a new trader (on-chain only)
   */
  async registerTrader(
    address: string,
    name: string,
    strategyDescription: string,
    performanceFee: number
  ): Promise<{ traderId: number; trader: Trader }> {
    const { ethers } = await import('ethers');
    const { cdpWalletService } = await import('./cdpWalletService.js');

    // Step 1: Register trader on-chain in VaultFactory
    const unifiedVaultAddress = process.env.UNIFIED_VAULT_BASE_SEPOLIA;
    if (!unifiedVaultAddress || unifiedVaultAddress === '0x0000000000000000000000000000000000000000') {
      throw new Error('UNIFIED_VAULT_BASE_SEPOLIA not configured');
    }

    await cdpWalletService.initialize();
    const provider = await cdpWalletService.getProvider('base-sepolia');
    const teeWalletAddress = await cdpWalletService.getTEEAddress();

    // Get VaultFactory address from UnifiedVault
    const unifiedVaultABI = [
      {
        name: 'vaultFactory',
        type: 'function',
        stateMutability: 'view',
        inputs: [],
        outputs: [{ name: '', type: 'address' }],
      },
    ];

    const unifiedVault = new ethers.Contract(
      unifiedVaultAddress,
      unifiedVaultABI,
      provider
    );

    const vaultFactoryAddress = await unifiedVault.vaultFactory();
    if (!vaultFactoryAddress || vaultFactoryAddress === ethers.ZeroAddress) {
      throw new Error('VaultFactory not configured in UnifiedVault');
    }

    // VaultFactory ABI for registerTrader
    const vaultFactoryABI = [
      {
        name: 'registerTrader',
        type: 'function',
        stateMutability: 'nonpayable',
        inputs: [{ name: 'trader', type: 'address' }],
        outputs: [{ name: 'traderId', type: 'uint256' }],
      },
      {
        name: 'getTraderAddress',
        type: 'function',
        stateMutability: 'view',
        inputs: [{ name: 'traderId', type: 'uint256' }],
        outputs: [{ name: '', type: 'address' }],
      },
      {
        name: 'isTraderRegistered',
        type: 'function',
        stateMutability: 'view',
        inputs: [{ name: 'trader', type: 'address' }],
        outputs: [{ name: '', type: 'bool' }],
      },
    ];

    const vaultFactory = new ethers.Contract(
      vaultFactoryAddress,
      vaultFactoryABI,
      provider
    );

    // Check if trader is already registered
    const isAlreadyRegistered = await vaultFactory.isTraderRegistered(address);
    let traderId: number | undefined;

    if (isAlreadyRegistered) {
      // Get existing trader ID by checking addresses
      console.log('⚠️  Trader already registered on-chain, finding traderId...');
      for (let id = 1; id <= 100; id++) {
        const traderAddr = await vaultFactory.getTraderAddress(id);
        if (traderAddr.toLowerCase() === address.toLowerCase()) {
          traderId = id;
          console.log(`✅ Found existing traderId: ${traderId}`);
          break;
        }
      }
      if (!traderId) {
        throw new Error('Trader registered on-chain but could not find traderId');
      }
    } else {
      // Register trader on-chain using CDP wallet (TEE wallet)
      console.log(`📝 Registering trader on-chain in VaultFactory...`);
      const registerData = vaultFactory.interface.encodeFunctionData('registerTrader', [address]);

      try {
        const txResult = await cdpWalletService.sendTransaction('base-sepolia', {
          to: vaultFactoryAddress,
          data: registerData,
        });

        console.log(`✅ Trader registered on-chain: ${txResult.transactionHash}`);
        
        // Wait for transaction to be mined
        await new Promise(resolve => setTimeout(resolve, 3000));

        // Get the traderId by checking which traderId now has this address
        // We'll need to check traderId 1, 2, 3, etc. until we find it
        // Or we can parse it from events, but for simplicity, let's check sequentially
        for (let id = 1; id <= 100; id++) {
          const traderAddr = await vaultFactory.getTraderAddress(id);
          if (traderAddr.toLowerCase() === address.toLowerCase()) {
            traderId = id;
            break;
          }
        }

        if (!traderId) {
          throw new Error('Failed to retrieve traderId after registration');
        }
      } catch (error: any) {
        if (error.message?.includes('already registered') || error.message?.includes('already has ID')) {
          // Trader already registered, find the traderId
          for (let id = 1; id <= 100; id++) {
            const traderAddr = await vaultFactory.getTraderAddress(id);
            if (traderAddr.toLowerCase() === address.toLowerCase()) {
              traderId = id;
              break;
            }
          }
          if (!traderId) {
            throw new Error('Trader already registered but could not find traderId');
          }
        } else {
          throw error;
        }
      }
    }

    // Return trader info (on-chain is source of truth, no DB needed)
    if (!traderId) {
      throw new Error('traderId not set after on-chain registration');
    }

    const trader: Trader = {
      id: traderId, // Use traderId as id
      address: address.toLowerCase(),
      traderId,
      name,
      strategyDescription,
      performanceFee,
      registeredAt: new Date(),
    };

    return { traderId, trader };
  }

  /**
   * Validate if trader exists (check on-chain)
   */
  async validateTrader(traderId: number): Promise<Trader | null> {
    const { ethers } = await import('ethers');
    const { cdpWalletService } = await import('./cdpWalletService.js');

    try {
      const unifiedVaultAddress = process.env.UNIFIED_VAULT_BASE_SEPOLIA;
      if (!unifiedVaultAddress) {
        return null;
      }

      await cdpWalletService.initialize();
      const provider = await cdpWalletService.getProvider('base-sepolia');

      const unifiedVaultABI = [
        {
          name: 'vaultFactory',
          type: 'function',
          stateMutability: 'view',
          inputs: [],
          outputs: [{ name: '', type: 'address' }],
        },
      ];

      const unifiedVault = new ethers.Contract(
        unifiedVaultAddress,
        unifiedVaultABI,
        provider
      );

      const vaultFactoryAddress = await unifiedVault.vaultFactory();
      if (!vaultFactoryAddress || vaultFactoryAddress === ethers.ZeroAddress) {
        return null;
      }

      const vaultFactoryABI = [
        {
          name: 'getTraderAddress',
          type: 'function',
          stateMutability: 'view',
          inputs: [{ name: 'traderId', type: 'uint256' }],
          outputs: [{ name: '', type: 'address' }],
        },
        {
          name: 'isTraderRegistered',
          type: 'function',
          stateMutability: 'view',
          inputs: [{ name: 'trader', type: 'address' }],
          outputs: [{ name: '', type: 'bool' }],
        },
      ];

      const vaultFactory = new ethers.Contract(
        vaultFactoryAddress,
        vaultFactoryABI,
        provider
      );

      const traderAddress = await vaultFactory.getTraderAddress(traderId);
      if (!traderAddress || traderAddress === ethers.ZeroAddress) {
        return null;
      }

      const isRegistered = await vaultFactory.isTraderRegistered(traderAddress);
      if (!isRegistered) {
        return null;
      }

      // Return minimal trader info (on-chain is source of truth)
      return {
        id: traderId,
        address: traderAddress.toLowerCase(),
        traderId,
        name: '', // Not stored on-chain
        strategyDescription: '', // Not stored on-chain
        performanceFee: 0, // Not stored on-chain
        registeredAt: new Date(),
      };
    } catch (error) {
      console.error('Error validating trader on-chain:', error);
      return null;
    }
  }

  /**
   * Validate deposit permission
   */
  async validateDeposit(traderId: number): Promise<{
    valid: boolean;
    trader?: Trader;
    error?: string;
  }> {
    const trader = await this.validateTrader(traderId);

    if (!trader) {
      return {
        valid: false,
        error: 'Trader not registered',
      };
    }

    return {
      valid: true,
      trader,
    };
  }

  /**
   * Submit trading signal (no-op, signals are handled on-chain via positions)
   */
  async submitSignal(
    traderId: number,
    signalType: 'LONG' | 'SHORT',
    asset: string,
    size: number,
    price?: number
  ): Promise<Signal> {
    // Validate trader exists
    const trader = await this.validateTrader(traderId);
    if (!trader) {
      throw new Error('Trader not registered');
    }

    // Validate signal parameters
    if (size <= 0) {
      throw new Error('Invalid signal size');
    }

    if (signalType !== 'LONG' && signalType !== 'SHORT') {
      throw new Error('Invalid signal type');
    }

    // Return mock signal (signals are handled on-chain via createPosition)
    return {
      id: Date.now(),
      traderId,
      signalType,
      asset,
      size,
      price,
      status: 'pending',
      createdAt: new Date(),
    };
  }

  /**
   * Get all registered traders from on-chain VaultFactory
   */
  async getAllTraders(): Promise<Trader[]> {
    const { ethers } = await import('ethers');
    const { cdpWalletService } = await import('./cdpWalletService.js');

    try {
      const unifiedVaultAddress = process.env.UNIFIED_VAULT_BASE_SEPOLIA;
      console.log('🔍 Getting traders - UnifiedVault:', unifiedVaultAddress);
      
      if (!unifiedVaultAddress || unifiedVaultAddress === '0x0000000000000000000000000000000000000000') {
        console.error('❌ UNIFIED_VAULT_BASE_SEPOLIA not configured');
        return [];
      }

      await cdpWalletService.initialize();
      const provider = await cdpWalletService.getProvider('base-sepolia');
      console.log('✅ Provider initialized');

      // Get VaultFactory address from UnifiedVault
      const unifiedVaultABI = [
        {
          name: 'vaultFactory',
          type: 'function',
          stateMutability: 'view',
          inputs: [],
          outputs: [{ name: '', type: 'address' }],
        },
      ];

      const unifiedVault = new ethers.Contract(
        unifiedVaultAddress,
        unifiedVaultABI,
        provider
      );

      const vaultFactoryAddress = await unifiedVault.vaultFactory();
      console.log('✅ VaultFactory address:', vaultFactoryAddress);
      
      if (!vaultFactoryAddress || vaultFactoryAddress === ethers.ZeroAddress) {
        console.error('❌ VaultFactory not configured in UnifiedVault');
        return [];
      }

      // VaultFactory ABI
      const vaultFactoryABI = [
        {
          name: 'nextTraderId',
          type: 'function',
          stateMutability: 'view',
          inputs: [],
          outputs: [{ name: '', type: 'uint256' }],
        },
        {
          name: 'getTraderAddress',
          type: 'function',
          stateMutability: 'view',
          inputs: [{ name: 'traderId', type: 'uint256' }],
          outputs: [{ name: '', type: 'address' }],
        },
        {
          name: 'isTraderRegistered',
          type: 'function',
          stateMutability: 'view',
          inputs: [{ name: 'trader', type: 'address' }],
          outputs: [{ name: '', type: 'bool' }],
        },
      ];

      const vaultFactory = new ethers.Contract(
        vaultFactoryAddress,
        vaultFactoryABI,
        provider
      );

      // Get nextTraderId to know how many traders exist
      const nextTraderId = await vaultFactory.nextTraderId();
      const traderCount = Number(nextTraderId);
      console.log(`📊 Found ${traderCount} trader slots (nextTraderId: ${traderCount})`);

      if (traderCount === 0) {
        console.log('⚠️  No traders registered yet');
        return [];
      }

      // Query all traders from ID 1 to nextTraderId - 1
      const traders: Trader[] = [];
      for (let i = 1; i < traderCount; i++) {
        try {
          const traderAddress = await vaultFactory.getTraderAddress(i);
          if (traderAddress && traderAddress !== ethers.ZeroAddress) {
            const isRegistered = await vaultFactory.isTraderRegistered(traderAddress);
            console.log(`  Trader ${i}: ${traderAddress} (registered: ${isRegistered})`);
            if (isRegistered) {
              traders.push({
                id: i,
                address: traderAddress,
                traderId: i,
                name: `Trader ${i}`, // Default name since not stored on-chain
                strategyDescription: 'Registered trader', // Default description
                performanceFee: 0, // Default fee
                registeredAt: new Date(),
              });
            }
          }
        } catch (error) {
          // Skip invalid trader IDs
          console.warn(`⚠️  Failed to get trader ${i}:`, error);
        }
      }

      console.log(`✅ Returning ${traders.length} traders`);
      return traders;
    } catch (error: any) {
      console.error('❌ Failed to get all traders from on-chain:', error);
      console.error('   Error details:', error.message, error.stack);
      return [];
    }
  }

  /**
   * Get trader by ID
   */
  async getTraderById(traderId: number): Promise<Trader | null> {
    return this.validateTrader(traderId);
  }

  /**
   * Get trader signals (returns empty - signals are handled on-chain via positions)
   */
  async getTraderSignals(traderId: number): Promise<Signal[]> {
    // Signals are handled on-chain via createPosition
    // To get signals, would need to query on-chain events
    // For now, return empty array
    return [];
  }


  /**
   * Verify and receive Rari deposit
   * Verifies the signature matches the TEE wallet and records the deposit
   */
  async verifyAndReceiveRariDeposit(
    amount: string,
    nonce: string,
    sourceChainId: string,
    signature: string
  ): Promise<{
    verified: boolean;
    deposit?: any;
    transactionHash?: string;
    message: string;
  }> {
    const { ethers } = await import('ethers');
    const { cdpWalletService } = await import('./cdpWalletService.js');

    // Initialize CDP wallet to get TEE address
    await cdpWalletService.initialize();
    const teeWalletAddress = await cdpWalletService.getTEEAddress();

    // Get UnifiedVault address on Base Sepolia
    const unifiedVaultAddress = process.env.UNIFIED_VAULT_BASE_SEPOLIA;
    if (!unifiedVaultAddress || unifiedVaultAddress === '0x0000000000000000000000000000000000000000') {
      throw new Error('UNIFIED_VAULT_BASE_SEPOLIA not configured');
    }

    // Parse values
    const amountBigInt = BigInt(amount);
    const nonceBigInt = BigInt(nonce);
    const sourceChainIdBigInt = BigInt(sourceChainId);
    const BASE_SEPOLIA_CHAIN_ID = BigInt(84532);

    // Recreate the message hash exactly as the contract does
    // Contract: keccak256(abi.encodePacked(contractAddress, amount, nonce, sourceChainId, destinationChainId))
    const message = ethers.keccak256(
      ethers.solidityPacked(
        ['address', 'uint256', 'uint256', 'uint256', 'uint256'],
        [
          unifiedVaultAddress,
          amountBigInt,
          nonceBigInt,
          sourceChainIdBigInt,
          BASE_SEPOLIA_CHAIN_ID
        ]
      )
    );

    // Contract uses EIP-191 format matching CDP SDK's signMessage for hex strings
    // Contract: keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n66", messageHex))
    // Where messageHex is the hex string representation of the bytes32 message
    const messageHex = message; // Already in hex format (0x...)
    // Use solidityPacked to match contract's abi.encodePacked
    const messageHash = ethers.keccak256(
      ethers.solidityPacked(
        ['string', 'string'],
        ['\x19Ethereum Signed Message:\n66', messageHex]
      )
    );

    // Verify signature using ECDSA recovery
    let recoveredAddress: string;
    try {
      recoveredAddress = ethers.recoverAddress(messageHash, signature);
    } catch (error: any) {
      return {
        verified: false,
        message: `Invalid signature format: ${error.message}`,
      };
    }

    // Check if signature matches TEE wallet
    if (recoveredAddress.toLowerCase() !== teeWalletAddress.toLowerCase()) {
      return {
        verified: false,
        message: `Signature does not match TEE wallet. Expected: ${teeWalletAddress}, Recovered: ${recoveredAddress}`,
      };
    }

    // Signature is valid - call receiveAttested() on Base Sepolia using CDP wallet
    console.log(`✅ Signature verified. Calling receiveAttested() on Base Sepolia...`);
    console.log(`   Amount: ${ethers.formatUnits(amountBigInt, 6)} USDC`);
    console.log(`   Nonce: ${nonceBigInt.toString()}`);
    console.log(`   Source Chain ID: ${sourceChainIdBigInt.toString()}`);
    console.log(`   TEE Wallet: ${teeWalletAddress}`);
    console.log(`   UnifiedVault: ${unifiedVaultAddress}`);

    // UnifiedVault ABI for receiveAttested
    const unifiedVaultABI = [
      {
        name: 'receiveAttested',
        type: 'function',
        stateMutability: 'nonpayable',
        inputs: [
          { name: 'amount', type: 'uint256' },
          { name: 'nonce', type: 'uint256' },
          { name: 'sourceChainId', type: 'uint256' },
          { name: 'signature', type: 'bytes' },
        ],
        outputs: [],
      },
    ];

    // Get provider and contract instance
    const provider = await cdpWalletService.getProvider('base-sepolia');
    const unifiedVault = new ethers.Contract(
      unifiedVaultAddress,
      unifiedVaultABI,
      provider
    );

    // Convert signature hex string to bytes
    const signatureBytes = ethers.getBytes(signature);

    // Encode function call
    const receiveAttestedData = unifiedVault.interface.encodeFunctionData('receiveAttested', [
      amountBigInt,
      nonceBigInt,
      sourceChainIdBigInt,
      signatureBytes,
    ]);

    // Estimate gas first
    let gasEstimate: bigint;
    try {
      const gasEstimateResult = await provider.estimateGas({
        to: unifiedVaultAddress,
        data: receiveAttestedData,
        from: teeWalletAddress,
      });
      gasEstimate = gasEstimateResult;
      console.log(`   Estimated gas: ${gasEstimate.toString()}`);
    } catch (gasError: any) {
      console.error('Gas estimation failed:', gasError);
      return {
        verified: false,
        message: `Gas estimation failed: ${gasError.message || 'Unknown error'}. The deposit may have already been received or the contract state is invalid.`,
      };
    }

    // Send transaction using CDP wallet
    let transactionHash: string;
    try {
      const txResult = await cdpWalletService.sendTransaction('base-sepolia', {
        to: unifiedVaultAddress,
        data: receiveAttestedData,
        gasLimit: gasEstimate * BigInt(120) / BigInt(100), // Add 20% buffer
      });
      transactionHash = txResult.transactionHash;
      console.log(`✅ Transaction sent: ${transactionHash}`);
    } catch (txError: any) {
      console.error('Transaction failed:', txError);
      return {
        verified: false,
        message: `Transaction failed: ${txError.message || 'Unknown error'}`,
      };
    }

    // Record the deposit
    const deposit = {
      amount: amountBigInt.toString(),
      nonce: nonceBigInt.toString(),
      sourceChainId: sourceChainIdBigInt.toString(),
      destinationChainId: BASE_SEPOLIA_CHAIN_ID.toString(),
      signature,
      teeWallet: teeWalletAddress,
      transactionHash,
      verifiedAt: new Date().toISOString(),
    };

    return {
      verified: true,
      deposit,
      message: 'Rari deposit verified and received successfully on-chain',
    };
  }

  /**
   * Create a trading position by swapping USDC for a token
   * Verifies trader attestation and executes swap using CDP wallet
   */
  async createPosition(
    traderId: number,
    traderAddress: string,
    signature: string,
    tokenType: 'ETH' | 'WBTC' | 'ZEC',
    amountIn: string // Amount of USDC to swap (6 decimals)
  ): Promise<{
    success: boolean;
    position?: any;
    transactionHash?: string;
    message: string;
  }> {
    const { ethers } = await import('ethers');
    const { cdpWalletService } = await import('./cdpWalletService.js');
    const { priceService } = await import('./priceService.js');

    // Step 1: Verify trader exists on-chain via VaultFactory
    // Get VaultFactory address from UnifiedVault
    const unifiedVaultAddress = process.env.UNIFIED_VAULT_BASE_SEPOLIA;
    if (!unifiedVaultAddress || unifiedVaultAddress === '0x0000000000000000000000000000000000000000') {
      return {
        success: false,
        message: 'UNIFIED_VAULT_BASE_SEPOLIA not configured',
      };
    }

    const provider = await cdpWalletService.getProvider('base-sepolia');
    
    // UnifiedVault ABI to get vaultFactory
    const unifiedVaultABI = [
      {
        name: 'vaultFactory',
        type: 'function',
        stateMutability: 'view',
        inputs: [],
        outputs: [{ name: '', type: 'address' }],
      },
    ];

    const unifiedVault = new ethers.Contract(
      unifiedVaultAddress,
      unifiedVaultABI,
      provider
    );

    // Get VaultFactory address
    const vaultFactoryAddress = await unifiedVault.vaultFactory();
    if (!vaultFactoryAddress || vaultFactoryAddress === ethers.ZeroAddress) {
      return {
        success: false,
        message: 'VaultFactory not configured in UnifiedVault',
      };
    }

    // VaultFactory ABI
    const vaultFactoryABI = [
      {
        name: 'getTraderAddress',
        type: 'function',
        stateMutability: 'view',
        inputs: [{ name: 'traderId', type: 'uint256' }],
        outputs: [{ name: '', type: 'address' }],
      },
      {
        name: 'isTraderRegistered',
        type: 'function',
        stateMutability: 'view',
        inputs: [{ name: 'trader', type: 'address' }],
        outputs: [{ name: '', type: 'bool' }],
      },
    ];

    const vaultFactory = new ethers.Contract(
      vaultFactoryAddress,
      vaultFactoryABI,
      provider
    );

    // Check if trader is registered on-chain
    const registeredTraderAddress = await vaultFactory.getTraderAddress(traderId);
    
    if (!registeredTraderAddress || registeredTraderAddress === ethers.ZeroAddress) {
      return {
        success: false,
        message: `Trader ID ${traderId} is not registered in VaultFactory`,
      };
    }

    // Verify trader address matches
    if (registeredTraderAddress.toLowerCase() !== traderAddress.toLowerCase()) {
      return {
        success: false,
        message: `Trader address mismatch. Expected: ${registeredTraderAddress}, Got: ${traderAddress}`,
      };
    }

    // Additional check: verify trader is registered
    const isRegistered = await vaultFactory.isTraderRegistered(registeredTraderAddress);
    if (!isRegistered) {
      return {
        success: false,
        message: 'Trader address is not registered in VaultFactory',
      };
    }

    console.log(`✅ Trader verified on-chain:`);
    console.log(`   Trader ID: ${traderId}`);
    console.log(`   Trader Address: ${registeredTraderAddress}`);
    console.log(`   VaultFactory: ${vaultFactoryAddress}`);

    // Step 2: Verify attestation signature (offchain)
    try {
      const message = `ArcaneFi: Create position for trader ${traderId}`;
      const recoveredAddress = ethers.verifyMessage(message, signature);
      
      if (recoveredAddress.toLowerCase() !== traderAddress.toLowerCase()) {
        return {
          success: false,
          message: 'Invalid attestation signature',
        };
      }
    } catch (error: any) {
      return {
        success: false,
        message: `Signature verification failed: ${error.message}`,
      };
    }

    // Step 3: Fetch current price from API
    let priceInUSDC: bigint;
    try {
      priceInUSDC = await priceService.getTokenPriceInUSDC(tokenType);
      console.log(`📊 Fetched ${tokenType} price: $${Number(priceInUSDC) / 1e6}`);
    } catch (error: any) {
      return {
        success: false,
        message: `Failed to fetch price: ${error.message}`,
      };
    }

    // Step 4: Get contract addresses
    const mockUniswapAddress = process.env.MOCK_UNISWAP_BASE_SEPOLIA;
    if (!mockUniswapAddress || mockUniswapAddress === '0x0000000000000000000000000000000000000000') {
      return {
        success: false,
        message: 'MOCK_UNISWAP_BASE_SEPOLIA not configured',
      };
    }

    // Step 5: Initialize CDP wallet
    await cdpWalletService.initialize();
    const teeWalletAddress = await cdpWalletService.getTEEAddress();

    // Step 6: Update price in contract (if needed) and execute swap
    
    // MockUniswap ABI
    const mockUniswapABI = [
      {
        name: 'setPrice',
        type: 'function',
        stateMutability: 'nonpayable',
        inputs: [
          { name: '_tokenType', type: 'uint8' }, // 0=ETH, 1=WBTC, 2=ZEC
          { name: '_price', type: 'uint256' },
        ],
        outputs: [],
      },
      {
        name: 'swapExactInputSingle',
        type: 'function',
        stateMutability: 'nonpayable',
        inputs: [
          { name: '_tokenType', type: 'uint8' },
          { name: '_amountIn', type: 'uint256' },
          { name: '_amountOutMin', type: 'uint256' },
        ],
        outputs: [{ name: 'amountOut', type: 'uint256' }],
      },
      {
        name: 'getQuote',
        type: 'function',
        stateMutability: 'view',
        inputs: [
          { name: '_tokenType', type: 'uint8' },
          { name: '_amountIn', type: 'uint256' },
        ],
        outputs: [{ name: 'amountOut', type: 'uint256' }],
      },
    ];

    const mockUniswap = new ethers.Contract(
      mockUniswapAddress,
      mockUniswapABI,
      provider
    );

    // Map token type to enum (0=ETH, 1=WBTC, 2=ZEC)
    const tokenTypeMap: Record<string, number> = {
      ETH: 0,
      WBTC: 1,
      ZEC: 2,
    };
    const tokenTypeEnum = tokenTypeMap[tokenType];

    // Step 7: Update price in contract
    const setPriceData = mockUniswap.interface.encodeFunctionData('setPrice', [
      tokenTypeEnum,
      priceInUSDC,
    ]);

    // Estimate gas for setPrice
    let setPriceGasEstimate: bigint | undefined;
    try {
      const gasEstimateResult = await provider.estimateGas({
        to: mockUniswapAddress,
        data: setPriceData,
        from: teeWalletAddress,
      });
      setPriceGasEstimate = gasEstimateResult;
    } catch (gasError: any) {
      console.warn('Gas estimation for setPrice failed, continuing with swap...');
    }

    // Set price transaction
    try {
      await cdpWalletService.sendTransaction('base-sepolia', {
        to: mockUniswapAddress,
        data: setPriceData,
        gasLimit: setPriceGasEstimate ? setPriceGasEstimate * BigInt(120) / BigInt(100) : undefined,
      });
      console.log(`✅ Updated ${tokenType} price in contract: $${Number(priceInUSDC) / 1e6}`);
    } catch (error: any) {
      console.warn(`⚠️  Failed to update price (may already be set): ${error.message}`);
    }

    // Step 8: Check TEE wallet USDC balance and approve if needed
    const USDC_BASE_SEPOLIA = "0x036CbD53842c5426634e7929541eC2318f3dCF7e";
    const usdc = new ethers.Contract(
      USDC_BASE_SEPOLIA,
      [
        {
          name: 'balanceOf',
          type: 'function',
          stateMutability: 'view',
          inputs: [{ name: 'account', type: 'address' }],
          outputs: [{ name: '', type: 'uint256' }],
        },
        {
          name: 'approve',
          type: 'function',
          stateMutability: 'nonpayable',
          inputs: [
            { name: 'spender', type: 'address' },
            { name: 'amount', type: 'uint256' },
          ],
          outputs: [{ name: '', type: 'bool' }],
        },
        {
          name: 'allowance',
          type: 'function',
          stateMutability: 'view',
          inputs: [
            { name: 'owner', type: 'address' },
            { name: 'spender', type: 'address' },
          ],
          outputs: [{ name: '', type: 'uint256' }],
        },
      ],
      provider
    );

    const amountInBigInt = BigInt(amountIn);
    const usdcBalance = await usdc.balanceOf(teeWalletAddress);
    console.log(`💰 TEE Wallet USDC Balance: ${ethers.formatUnits(usdcBalance, 6)} USDC`);

    if (usdcBalance < amountInBigInt) {
      return {
        success: false,
        message: `Insufficient USDC balance. TEE wallet has ${ethers.formatUnits(usdcBalance, 6)} USDC, needs ${ethers.formatUnits(amountInBigInt, 6)} USDC`,
      };
    }

    // Check and approve if needed
    const currentAllowance = await usdc.allowance(teeWalletAddress, mockUniswapAddress);
    if (currentAllowance < amountInBigInt) {
      console.log(`📝 Approving USDC from TEE wallet to MockUniswap...`);
      const approveData = usdc.interface.encodeFunctionData('approve', [
        mockUniswapAddress,
        amountInBigInt * BigInt(10), // Approve 10x for future swaps
      ]);

      try {
        await cdpWalletService.sendTransaction('base-sepolia', {
          to: USDC_BASE_SEPOLIA,
          data: approveData,
        });
        console.log(`✅ USDC approved from TEE wallet`);
      } catch (error: any) {
        return {
          success: false,
          message: `Failed to approve USDC: ${error.message}`,
        };
      }
    }

    // Step 9: Get quote for swap
    const quote = await mockUniswap.getQuote(tokenTypeEnum, amountInBigInt);
    const amountOutMin = quote * BigInt(95) / BigInt(100); // 5% slippage tolerance

    console.log(`💱 Swap Quote:`);
    console.log(`   Input: ${ethers.formatUnits(amountInBigInt, 6)} USDC`);
    console.log(`   Output: ${ethers.formatUnits(quote, 18)} ${tokenType}`);
    console.log(`   Min Output (5% slippage): ${ethers.formatUnits(amountOutMin, 18)} ${tokenType}`);

    // Step 10: Execute swap
    const swapData = mockUniswap.interface.encodeFunctionData('swapExactInputSingle', [
      tokenTypeEnum,
      amountInBigInt,
      amountOutMin,
    ]);

    // Estimate gas for swap
    let swapGasEstimate: bigint;
    try {
      const gasEstimateResult = await provider.estimateGas({
        to: mockUniswapAddress,
        data: swapData,
        from: teeWalletAddress,
      });
      swapGasEstimate = gasEstimateResult;
      console.log(`   Estimated gas: ${swapGasEstimate.toString()}`);
    } catch (gasError: any) {
      console.error('Gas estimation failed:', gasError);
      return {
        success: false,
        message: `Gas estimation failed: ${gasError.message || 'Unknown error'}`,
      };
    }

    // Send swap transaction
    let transactionHash: string;
    try {
      const txResult = await cdpWalletService.sendTransaction('base-sepolia', {
        to: mockUniswapAddress,
        data: swapData,
        gasLimit: swapGasEstimate * BigInt(120) / BigInt(100), // 20% buffer
      });
      transactionHash = txResult.transactionHash;
      console.log(`✅ Swap transaction sent: ${transactionHash}`);
    } catch (txError: any) {
      console.error('Swap transaction failed:', txError);
      return {
        success: false,
        message: `Swap transaction failed: ${txError.message || 'Unknown error'}`,
      };
    }

    // Step 11: Record position
    const position = {
      traderId,
      traderAddress,
      tokenType,
      amountIn: amountInBigInt.toString(),
      amountOut: quote.toString(),
      price: priceInUSDC.toString(),
      transactionHash,
      createdAt: new Date().toISOString(),
    };

    return {
      success: true,
      position,
      transactionHash,
      message: `Position created successfully: ${ethers.formatUnits(amountInBigInt, 6)} USDC -> ${ethers.formatUnits(quote, 18)} ${tokenType}`,
    };
  }
}

export const teeService = new TEEService();

