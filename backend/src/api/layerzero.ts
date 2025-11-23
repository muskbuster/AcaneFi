import { Router } from 'express';
import { layerZeroService } from '../services/layerzeroService.js';

export const layerzeroRouter = Router();

/**
 * LayerZero API - Configuration only
 * Frontend/contracts handle all transactions directly
 * Based on: https://docs.layerzero.network/v2/developers/evm/oft/quickstart
 */

// Get LayerZero configuration for a chain
layerzeroRouter.get('/config/:chain', async (req, res) => {
  try {
    const chain = req.params.chain;
    const config = layerZeroService.getConfig(chain);

    if (!config) {
      return res.status(404).json({ error: 'Chain not supported' });
    }

    res.json({
      chain,
      ...config,
    });
  } catch (error) {
    console.error('Get config error:', error);
    res.status(500).json({ error: 'Failed to get config' });
  }
});

// Get LayerZero endpoint for a chain (legacy endpoint)
layerzeroRouter.get('/endpoint/:chain', async (req, res) => {
  try {
    const chain = req.params.chain;
    const endpoint = layerZeroService.getEndpoint(chain);
    const endpointId = layerZeroService.getEndpointId(chain);
    const chainId = layerZeroService.getChainId(chain);

    res.json({
      chain,
      endpoint,
      endpointId,
      chainId,
    });
  } catch (error) {
    console.error('Get endpoint error:', error);
    res.status(500).json({ error: 'Failed to get endpoint' });
  }
});

// Get OFT contract address for a chain
layerzeroRouter.get('/oft/:chain', async (req, res) => {
  try {
    const chain = req.params.chain;
    const oftAddress = layerZeroService.getOFTAddress(chain);
    const endpointId = layerZeroService.getEndpointId(chain);
    const chainId = layerZeroService.getChainId(chain);

    if (!oftAddress) {
      return res.status(404).json({ error: 'OFT not deployed on this chain' });
    }

    res.json({
      chain,
      oftAddress,
      endpointId,
      chainId,
    });
  } catch (error) {
    console.error('Get OFT error:', error);
    res.status(500).json({ error: 'Failed to get OFT address' });
  }
});

// Get peer address for setting OFT peers
layerzeroRouter.get('/peer', async (req, res) => {
  try {
    const { localChain, remoteChain } = req.query;

    if (!localChain || !remoteChain) {
      return res.status(400).json({ error: 'Missing localChain or remoteChain' });
    }

    const peerAddress = layerZeroService.getPeerAddress(
      localChain as string,
      remoteChain as string
    );

    res.json({
      localChain,
      remoteChain,
      peerAddress,
    });
  } catch (error) {
    console.error('Get peer error:', error);
    res.status(500).json({ error: 'Failed to get peer address' });
  }
});

// Get all supported chains
layerzeroRouter.get('/chains', async (req, res) => {
  try {
    const chains = layerZeroService.getSupportedChains();
    const chainsWithConfig = chains.map((chain) => ({
      chain,
      ...layerZeroService.getConfig(chain),
    }));

    res.json({ chains: chainsWithConfig });
  } catch (error) {
    console.error('Get chains error:', error);
    res.status(500).json({ error: 'Failed to get chains' });
  }
});

// Note: Fee estimation is done via OFT contract's quote() function
// Frontend should call the contract directly, not this API

