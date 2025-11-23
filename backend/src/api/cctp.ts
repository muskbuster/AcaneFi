import { Router } from 'express';
import { cctpService } from '../services/cctpService.js';

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

