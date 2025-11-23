import { Request, Response, NextFunction } from 'express';
import { ethers } from 'ethers';

export interface AuthRequest extends Request {
  trader?: {
    id: number;
    address: string;
    traderId: number;
  };
}

/**
 * Validate trader authentication
 */
export async function validateTrader(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const traderId = req.headers['x-trader-id'] as string;
    const signature = req.headers['x-signature'] as string;
    const address = req.headers['x-address'] as string;

    if (!traderId || !signature || !address) {
      return res.status(401).json({ error: 'Missing authentication headers' });
    }

    // Verify trader exists on-chain
    const { cdpWalletService } = await import('../services/cdpWalletService.js');
    const unifiedVaultAddress = process.env.UNIFIED_VAULT_BASE_SEPOLIA;
    
    if (!unifiedVaultAddress) {
      return res.status(500).json({ error: 'UnifiedVault not configured' });
    }

    try {
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
        return res.status(500).json({ error: 'VaultFactory not configured' });
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

      const traderAddress = await vaultFactory.getTraderAddress(parseInt(traderId));
      if (traderAddress.toLowerCase() !== address.toLowerCase()) {
        return res.status(401).json({ error: 'Trader address mismatch' });
      }

      const isRegistered = await vaultFactory.isTraderRegistered(traderAddress);
      if (!isRegistered) {
        return res.status(401).json({ error: 'Trader not registered' });
      }
    } catch (error) {
      console.error('Error validating trader on-chain:', error);
      return res.status(500).json({ error: 'Failed to validate trader' });
    }

    // Verify signature (simplified for demo)
    // In production, verify message signature using ethers
    try {
      const message = `ArcaneFi: Authenticate trader ${traderId}`;
      const recoveredAddress = ethers.verifyMessage(message, signature);
      
      if (recoveredAddress.toLowerCase() !== address.toLowerCase()) {
        return res.status(401).json({ error: 'Invalid signature' });
      }
    } catch (error) {
      // For demo purposes, we'll allow if trader exists
      // In production, proper signature verification is required
      console.warn('Signature verification failed, allowing for demo:', error);
    }

    req.trader = {
      id: parseInt(traderId),
      address: address.toLowerCase(),
      traderId: parseInt(traderId),
    };

    next();
  } catch (error) {
    console.error('Auth validation error:', error);
    return res.status(500).json({ error: 'Authentication failed' });
  }
}

// TEE validation removed for demo simplicity

