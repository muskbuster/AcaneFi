import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

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
    const response = await api.post('/api/cctp/poll-attestation', {
      sourceDomain,
      transactionHash,
      maxAttempts,
      intervalMs,
    });
    return response.data;
  },

  getSupportedChains: async () => {
    const response = await api.get('/api/cctp/chains');
    return response.data;
  },

  /**
   * Receive bridged USDC on Base Sepolia
   * Calls backend endpoint which calls UnifiedVault.receiveBridgedUSDC
   */
  receiveBridgedUSDC: async (message: string, attestation: string) => {
    const response = await api.post('/api/cctp/receive', {
      message,
      attestation,
    });
    return response.data;
  },
};

