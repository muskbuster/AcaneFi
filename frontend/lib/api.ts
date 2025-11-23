import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.arcane.tachyon.pe';

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// TEE API
export const teeApi = {
  registerTrader: async (data: {
    address: string;
    name: string;
    strategyDescription?: string;
    performanceFee: number;
  }) => {
    const response = await api.post('/api/tee/register-trader', data);
    return response.data;
  },

  validateDeposit: async (traderId: number) => {
    const response = await api.get(`/api/tee/validate-deposit/${traderId}`);
    return response.data;
  },

  submitSignal: async (
    traderId: number,
    signature: string,
    address: string,
    data: {
      signalType: 'LONG' | 'SHORT';
      asset: string;
      size: number;
      price?: number;
    }
  ) => {
    const response = await api.post(
      '/api/tee/submit-signal',
      data,
      {
        headers: {
          'x-trader-id': traderId.toString(),
          'x-signature': signature,
          'x-address': address,
        },
      }
    );
    return response.data;
  },

  getAllTraders: async () => {
    const response = await api.get('/api/tee/traders');
    return response.data;
  },

  getTrader: async (traderId: number) => {
    const response = await api.get(`/api/tee/traders/${traderId}`);
    return response.data;
  },

  getTraderSignals: async (traderId: number) => {
    const response = await api.get(`/api/tee/traders/${traderId}/signals`);
    return response.data;
  },

  createPosition: async (data: {
    traderId: number;
    traderAddress: string;
    signature: string;
    tokenType: 'ETH' | 'WBTC' | 'ZEC';
    amountIn: string;
  }) => {
    const response = await api.post('/api/tee/create-position', data);
    return response.data;
  },
};

// Trade API
export const tradeApi = {
  getPositions: async (traderId: number) => {
    const response = await api.get(`/api/trade/positions/${traderId}`);
    return response.data;
  },

  updatePrices: async () => {
    const response = await api.post('/api/trade/update-prices');
    return response.data;
  },

  closePosition: async (positionId: number, traderId: number, signature: string) => {
    const response = await api.post(
      `/api/trade/close-position/${positionId}`,
      {},
      {
        headers: {
          'x-trader-id': traderId.toString(),
          'x-signature': signature,
        },
      }
    );
    return response.data;
  },
};

// Circle API removed - using CCTP directly

// LayerZero API
// Configuration only - frontend handles transactions directly with OFT contracts
// Based on: https://docs.layerzero.network/v2/developers/evm/oft/quickstart
export const layerzeroApi = {
  getConfig: async (chain: string) => {
    const response = await api.get(`/api/layerzero/config/${chain}`);
    return response.data;
  },

  getEndpoint: async (chain: string) => {
    const response = await api.get(`/api/layerzero/endpoint/${chain}`);
    return response.data; // Returns: { chain, endpoint, endpointId, chainId }
  },

  getOFTAddress: async (chain: string) => {
    const response = await api.get(`/api/layerzero/oft/${chain}`);
    return response.data;
  },

  getPeerAddress: async (localChain: string, remoteChain: string) => {
    const response = await api.get('/api/layerzero/peer', {
      params: { localChain, remoteChain },
    });
    return response.data;
  },

  getSupportedChains: async () => {
    const response = await api.get('/api/layerzero/chains');
    return response.data;
  },

  // Note: Fee estimation done via OFT contract's quote() function
  // Call the contract directly, not this API
};

// CCTP API
// Based on: https://developers.circle.com/cctp/transfer-usdc-on-testnet-from-ethereum-to-avalanche
// Users interact directly with CCTP contracts - no TEE needed
export const cctpApi = {
  checkSupported: async (chain: string) => {
    const response = await api.get(`/api/cctp/supported/${chain}`);
    return response.data;
  },

  getContracts: async (chain: string) => {
    const response = await api.get(`/api/cctp/contracts/${chain}`);
    return response.data;
  },

  fetchAttestation: async (sourceDomain: number, transactionHash: string) => {
    const response = await api.get('/api/cctp/attestation', {
      params: { sourceDomain, transactionHash },
    });
    return response.data;
  },

  pollAttestation: async (
    sourceDomain: number,
    transactionHash: string,
    maxAttempts?: number,
    intervalMs?: number
  ) => {
    // Call Circle's API directly (following test pattern)
    const ATTESTATION_API_URL = "https://iris-api-sandbox.circle.com/v2/messages";
    const maxRetries = maxAttempts || 60; // 5 minutes max
    const retryInterval = intervalMs || 5000; // 5 seconds

    for (let i = 0; i < maxRetries; i++) {
      try {
        const url = `${ATTESTATION_API_URL}/${sourceDomain}?transactionHash=${transactionHash}`;
        const response = await axios.get(url);
        
        if (response.status === 404) {
          console.log(`⏳ Waiting for attestation... (attempt ${i + 1}/${maxRetries})`);
          if (i < maxRetries - 1) {
            await new Promise(resolve => setTimeout(resolve, retryInterval));
          }
          continue;
        }

        if (response.data?.messages?.[0]?.status === "complete") {
          const messageData = response.data.messages[0];
          console.log(`✅ Attestation retrieved successfully!`);
          return {
            message: messageData.message,
            attestation: messageData.attestation,
            status: 'complete',
          };
        }

        if (response.data?.messages?.[0]?.status === "pending") {
          console.log(`⏳ Attestation pending... (attempt ${i + 1}/${maxRetries})`);
        }
      } catch (error: any) {
        if (error.response?.status === 404) {
          console.log(`⏳ Waiting for attestation... (attempt ${i + 1}/${maxRetries})`);
        } else if (error.response?.status === 400) {
          console.error(`❌ Bad request: ${error.response?.data?.message || error.message}`);
          throw new Error(`Invalid request: ${error.response?.data?.message || 'Check transaction hash and source domain'}`);
        } else {
          console.log(`⚠️  Error: ${error.message}`);
          // Don't throw on network errors, just retry
        }
      }

      if (i < maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, retryInterval));
      }
    }

    throw new Error(`Attestation not found after ${maxRetries} attempts`);
  },

  getSupportedChains: async () => {
    const response = await api.get('/api/cctp/chains');
    return response.data;
  },

  /**
   * Receive bridged USDC on Base Sepolia
   * Calls backend endpoint which calls UnifiedVault.receiveBridgedUSDC
   */
  /**
   * Store CCTP deposit information in backend
   */
  storeDeposit: async (data: {
    userAddress: string;
    transactionHash: string;
    sourceDomain: number;
    sourceChainId: number;
    sourceChainName: string;
  }) => {
    const response = await api.post('/api/cctp/deposit', data);
    return response.data;
  },

  /**
   * Get unredeemed CCTP deposits for a user
   */
  getUnredeemedDeposits: async (userAddress: string) => {
    const response = await api.get('/api/cctp/deposits', {
      params: { userAddress },
    });
    return response.data;
  },

  /**
   * Update attestation for a deposit
   */
  updateAttestation: async (data: {
    id?: string;
    transactionHash?: string;
    userAddress?: string;
    attestation: {
      message: string;
      attestation: string;
      status: string;
    };
  }) => {
    const response = await api.post('/api/cctp/attestation', data);
    return response.data;
  },

  /**
   * Mark deposit as redeemed (and delete from storage)
   */
  markAsRedeemed: async (data: {
    id?: string;
    transactionHash?: string;
    userAddress?: string;
    redeemTxHash: string;
  }) => {
    const response = await api.post('/api/cctp/redeem', data);
    return response.data;
  },

  receiveBridgedUSDC: async (message: string, attestation: string) => {
    // Validate inputs
    if (!message || !attestation) {
      throw new Error('Message and attestation are required');
    }
    
    if (typeof message !== 'string' || typeof attestation !== 'string') {
      throw new Error('Message and attestation must be strings');
    }
    
    if (!message.startsWith('0x') || !attestation.startsWith('0x')) {
      throw new Error('Message and attestation must be hex strings starting with 0x');
    }

    console.log('📤 Calling receiveBridgedUSDC API:', {
      message: message.substring(0, 30) + '...',
      attestation: attestation.substring(0, 30) + '...',
      messageLength: message.length,
      attestationLength: attestation.length,
    });

    try {
      const response = await api.post('/api/cctp/receive', {
        message,
        attestation,
      }, {
        timeout: 60000, // 60 second timeout (same as test)
      });
      
      console.log('✅ Receive API response:', response.data);
      return response.data;
    } catch (error: any) {
      console.error('❌ Receive API error:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        statusText: error.response?.statusText,
      });
      
      // Provide more detailed error message
      if (error.response?.data?.error) {
        throw new Error(error.response.data.error);
      }
      
      if (error.response?.status === 500) {
        throw new Error(`Server error: ${error.response?.data?.error || error.message || 'Failed to receive USDC'}`);
      }
      
      throw error;
    }
  },
};

// Rari API
export const rariApi = {
  getAttestation: async (amount: string, nonce: string) => {
    const response = await api.get('/api/rari/attestation', {
      params: { amount, nonce },
    });
    return response.data;
  },

  verifyAndReceive: async (data: {
    amount: string;
    nonce: string;
    sourceChainId: string;
    signature: string;
  }) => {
    const response = await api.post('/api/tee/verify-rari-deposit', data);
    return response.data;
  },

  /**
   * Store deposit information in backend
   */
  storeDeposit: async (data: {
    userAddress: string;
    amount: string; // in wei
    amountFormatted: string; // human readable
    nonce: string;
    sourceChainId: string;
    depositTxHash: string;
  }) => {
    const response = await api.post('/api/rari/deposit', data);
    return response.data;
  },

  /**
   * Get unredeemed deposits for a user
   */
  getUnredeemedDeposits: async (userAddress: string) => {
    const response = await api.get('/api/rari/deposits', {
      params: { userAddress },
    });
    return response.data;
  },

  /**
   * Mark deposit as redeemed
   */
  markAsRedeemed: async (data: {
    id?: string;
    nonce?: string;
    userAddress?: string;
    redeemTxHash: string;
  }) => {
    const response = await api.post('/api/rari/redeem', data);
    return response.data;
  },
};

