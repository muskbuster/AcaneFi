import { Router } from 'express';
import { cctpService } from '../services/cctpService.js';
import { cctpDepositStorage } from '../services/rariDepositStorage.js';

export const cctpRouter = Router();

// Check if CCTP is supported on a chain
cctpRouter.get('/supported/:chain', async (req, res) => {
  try {
    const chain = req.params.chain;
    const supported = cctpService.isSupported(chain);
    const config = cctpService.getConfig(chain);

    res.json({
      chain,
      supported,
      config: supported ? {
        domain: config?.domain,
        tokenMessenger: config?.tokenMessenger,
      } : null,
    });
  } catch (error) {
    console.error('CCTP check error:', error);
    res.status(500).json({ error: 'Failed to check CCTP support' });
  }
});

// Note: Users interact directly with CCTP contracts for burning
// No backend endpoint needed - frontend calls TokenMessenger.depositForBurn directly

// Fetch attestation (using transaction hash and domain)
cctpRouter.get('/attestation', async (req, res) => {
  try {
    const { sourceDomain, transactionHash } = req.query;

    if (!sourceDomain || !transactionHash) {
      return res.status(400).json({ error: 'Missing sourceDomain or transactionHash' });
    }

    const result = await cctpService.fetchAttestation(
      parseInt(sourceDomain as string),
      transactionHash as string
    );

    res.json(result);
  } catch (error) {
    console.error('Attestation fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch attestation' });
  }
});

// Poll for attestation
cctpRouter.post('/poll-attestation', async (req, res) => {
  try {
    const { sourceDomain, transactionHash, maxAttempts, intervalMs } = req.body;

    if (!sourceDomain || !transactionHash) {
      return res.status(400).json({ error: 'Missing sourceDomain or transactionHash' });
    }

    const result = await cctpService.pollForAttestation(
      parseInt(sourceDomain),
      transactionHash,
      maxAttempts || 30,
      intervalMs || 5000
    );

    res.json({
      success: true,
      ...result,
    });
  } catch (error: any) {
    console.error('Attestation poll error:', error);
    res.status(500).json({ error: error.message || 'Failed to poll attestation' });
  }
});

// Get contract addresses for a chain (for frontend to interact directly)
cctpRouter.get('/contracts/:chain', async (req, res) => {
  try {
    const chain = req.params.chain;
    const addresses = cctpService.getContractAddresses(chain);

    if (!addresses) {
      return res.status(404).json({ error: 'Chain not supported' });
    }

    res.json({
      chain,
      ...addresses,
      domain: cctpService.getDomain(chain),
    });
  } catch (error) {
    console.error('Get contracts error:', error);
    res.status(500).json({ error: 'Failed to get contract addresses' });
  }
});

// Get supported chains
cctpRouter.get('/chains', async (req, res) => {
  try {
    const chains = cctpService.getSupportedChains();
    const chainsWithConfig = chains.map((chain) => ({
      chain,
      domain: cctpService.getDomain(chain),
      config: cctpService.getConfig(chain),
    }));

    res.json({ chains: chainsWithConfig });
  } catch (error) {
    console.error('Get chains error:', error);
    res.status(500).json({ error: 'Failed to get chains' });
  }
});

/**
 * Receive bridged USDC on Base Sepolia
 * POST /api/cctp/receive
 * 
 * This endpoint can be called by anyone (trader or depositer) to receive
 * bridged USDC on Base Sepolia. It calls UnifiedVault.receiveBridgedUSDC
 * which is permissionless via CCTP.
 * 
 * Body:
 * {
 *   "message": "0x...",      // CCTP message (hex string)
 *   "attestation": "0x..."  // CCTP attestation (hex string)
 * }
 */
cctpRouter.post('/receive', async (req, res) => {
  try {
    const { message, attestation } = req.body;

    if (!message || !attestation) {
      return res.status(400).json({ 
        error: 'Missing message or attestation',
        required: ['message', 'attestation']
      });
    }

    // Validate hex strings
    if (!message.startsWith('0x') || !attestation.startsWith('0x')) {
      return res.status(400).json({ 
        error: 'Message and attestation must be hex strings starting with 0x'
      });
    }

    console.log(`📥 Receiving bridged USDC request`);
    console.log(`   Message: ${message.substring(0, 30)}...`);
    console.log(`   Attestation: ${attestation.substring(0, 30)}...`);

    // Call service to receive USDC
    const result = await cctpService.receiveBridgedUSDC(message, attestation);

    if (!result.success) {
      return res.status(500).json({ 
        error: result.error || 'Failed to receive bridged USDC',
        success: false
      });
    }

    res.json({
      success: true,
      transactionHash: result.transactionHash,
      message: 'USDC received on Base Sepolia',
      explorer: `https://sepolia.basescan.org/tx/${result.transactionHash}`,
    });
  } catch (error: any) {
    console.error('Receive USDC error:', error);
    res.status(500).json({ 
      error: error.message || 'Failed to receive bridged USDC',
      success: false
    });
  }
});

/**
 * Store CCTP deposit information
 * POST /api/cctp/deposit
 * 
 * Body:
 * {
 *   "userAddress": "0x...",
 *   "transactionHash": "0x...",
 *   "sourceDomain": 0,
 *   "sourceChainId": 11155111,
 *   "sourceChainName": "Ethereum Sepolia"
 * }
 */
cctpRouter.post('/deposit', async (req, res) => {
  try {
    const { userAddress, transactionHash, sourceDomain, sourceChainId, sourceChainName } = req.body;

    if (!userAddress || !transactionHash || sourceDomain === undefined) {
      return res.status(400).json({
        error: 'Missing required fields',
        required: ['userAddress', 'transactionHash', 'sourceDomain'],
      });
    }

    // Validate userAddress format
    if (!/^0x[a-fA-F0-9]{40}$/.test(userAddress)) {
      return res.status(400).json({
        error: 'Invalid user address format',
      });
    }

    // Validate transaction hash format
    if (!/^0x[a-fA-F0-9]{64}$/.test(transactionHash)) {
      return res.status(400).json({
        error: 'Invalid transaction hash format',
      });
    }

    // Check if deposit with this transaction hash already exists
    const existing = cctpDepositStorage.getDepositByTxHash(transactionHash, userAddress);
    if (existing) {
      return res.status(409).json({
        error: 'Deposit with this transaction hash already exists',
        deposit: existing,
      });
    }

    const deposit = cctpDepositStorage.storeDeposit({
      userAddress,
      transactionHash,
      sourceDomain: parseInt(sourceDomain),
      sourceChainId: sourceChainId || 11155111,
      sourceChainName: sourceChainName || 'Ethereum Sepolia',
    });

    res.json({
      success: true,
      deposit,
      message: 'Deposit stored successfully',
    });
  } catch (error: any) {
    console.error('Store CCTP deposit error:', error);
    res.status(500).json({
      error: error.message || 'Failed to store deposit',
      success: false,
    });
  }
});

/**
 * Get unredeemed CCTP deposits for a user
 * GET /api/cctp/deposits?userAddress=0x...
 */
cctpRouter.get('/deposits', async (req, res) => {
  try {
    const userAddress = req.query.userAddress as string;

    if (!userAddress) {
      return res.status(400).json({
        error: 'userAddress query parameter is required',
      });
    }

    // Validate userAddress format
    if (!/^0x[a-fA-F0-9]{40}$/.test(userAddress)) {
      return res.status(400).json({
        error: 'Invalid user address format',
      });
    }

    const deposits = cctpDepositStorage.getUnredeemedDeposits(userAddress);

    res.json({
      success: true,
      deposits,
      count: deposits.length,
    });
  } catch (error: any) {
    console.error('Get CCTP deposits error:', error);
    res.status(500).json({
      error: error.message || 'Failed to get deposits',
      success: false,
    });
  }
});

/**
 * Get all unredeemed CCTP deposits (admin/any user)
 * GET /api/cctp/deposits/all
 */
cctpRouter.get('/deposits/all', async (req, res) => {
  try {
    const deposits = cctpDepositStorage.getAllUnredeemedDeposits();

    res.json({
      success: true,
      deposits,
      count: deposits.length,
    });
  } catch (error: any) {
    console.error('Get all CCTP deposits error:', error);
    res.status(500).json({
      error: error.message || 'Failed to get deposits',
      success: false,
    });
  }
});

/**
 * Update attestation for a deposit
 * POST /api/cctp/attestation
 * 
 * Body:
 * {
 *   "id": "deposit-id" or "transactionHash": "0x...",
 *   "userAddress": "0x...", // Optional if using transactionHash
 *   "attestation": {
 *     "message": "0x...",
 *     "attestation": "0x...",
 *     "status": "complete"
 *   }
 * }
 */
cctpRouter.post('/attestation', async (req, res) => {
  try {
    const { id, transactionHash, userAddress, attestation } = req.body;

    if (!attestation || !attestation.message || !attestation.attestation) {
      return res.status(400).json({
        error: 'Attestation object with message and attestation is required',
      });
    }

    let deposit;
    if (id) {
      deposit = cctpDepositStorage.getDeposit(id);
      if (deposit) {
        deposit = cctpDepositStorage.updateAttestation(id, attestation);
      }
    } else if (transactionHash) {
      deposit = cctpDepositStorage.getDepositByTxHash(transactionHash, userAddress);
      if (deposit) {
        deposit = cctpDepositStorage.updateAttestation(deposit.id, attestation);
      }
    } else {
      return res.status(400).json({
        error: 'Either id or transactionHash is required',
      });
    }

    if (!deposit) {
      return res.status(404).json({
        error: 'Deposit not found',
      });
    }

    res.json({
      success: true,
      deposit,
      message: 'Attestation updated',
    });
  } catch (error: any) {
    console.error('Update CCTP attestation error:', error);
    res.status(500).json({
      error: error.message || 'Failed to update attestation',
      success: false,
    });
  }
});

/**
 * Mark CCTP deposit as redeemed (and delete from storage)
 * POST /api/cctp/redeem
 * 
 * Body:
 * {
 *   "id": "deposit-id" or "transactionHash": "0x...",
 *   "userAddress": "0x...", // Optional if using transactionHash
 *   "redeemTxHash": "0x..."
 * }
 */
cctpRouter.post('/redeem', async (req, res) => {
  try {
    const { id, transactionHash, userAddress, redeemTxHash } = req.body;

    if (!redeemTxHash) {
      return res.status(400).json({
        error: 'redeemTxHash is required',
      });
    }

    let deposit;
    if (id) {
      deposit = cctpDepositStorage.markAsRedeemed(id, redeemTxHash);
    } else if (transactionHash) {
      deposit = cctpDepositStorage.markAsRedeemedByTxHash(transactionHash, redeemTxHash, userAddress);
    } else {
      return res.status(400).json({
        error: 'Either id or transactionHash is required',
      });
    }

    if (!deposit) {
      return res.status(404).json({
        error: 'Deposit not found',
      });
    }

    res.json({
      success: true,
      deposit,
      message: 'Deposit marked as redeemed and deleted from storage',
    });
  } catch (error: any) {
    console.error('Mark CCTP deposit as redeemed error:', error);
    res.status(500).json({
      error: error.message || 'Failed to mark deposit as redeemed',
      success: false,
    });
  }
});

