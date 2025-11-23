import express from 'express';
import { cdpWalletService } from '../services/cdpWalletService.js';
import { rariDepositStorage } from '../services/rariDepositStorage.js';
import { ethers } from 'ethers';

const rariRouter = express.Router();

/**
 * Get Rari attestation (mockup - signs message saying funds received on Rari)
 * GET /api/rari/attestation
 * 
 * Query params:
 * - amount: Amount of USDC received (in wei, 6 decimals)
 * - nonce: Unique nonce for this receipt
 * 
 * Returns:
 * {
 *   "success": true,
 *   "attestation": {
 *     "amount": "1000000",
 *     "nonce": "1",
 *     "sourceChainId": "1918988905",
 *     "signature": "0x...",
 *     "teeWallet": "0x..."
 *   }
 * }
 */
rariRouter.get('/attestation', async (req, res) => {
  try {
    const amount = req.query.amount as string;
    const nonce = req.query.nonce as string;

    if (!amount || !nonce) {
      return res.status(400).json({
        error: 'Missing required parameters',
        required: ['amount', 'nonce'],
        example: '/api/rari/attestation?amount=1000000&nonce=1'
      });
    }

    // Validate amount is a valid number
    const amountBigInt = BigInt(amount);
    if (amountBigInt <= 0n) {
      return res.status(400).json({
        error: 'Amount must be greater than 0'
      });
    }

    // Validate nonce is a valid number
    const nonceBigInt = BigInt(nonce);
    if (nonceBigInt < 0n) {
      return res.status(400).json({
        error: 'Nonce must be non-negative'
      });
    }

    // Rari chain ID
    const RARI_CHAIN_ID = 1918988905n;
    const BASE_SEPOLIA_CHAIN_ID = 84532n; // Destination chain

    // Initialize CDP wallet
    await cdpWalletService.initialize();
    const teeWalletAddress = await cdpWalletService.getTEEAddress();

    // Get UnifiedVault address on Base Sepolia (where we'll verify)
    const unifiedVaultAddress = process.env.UNIFIED_VAULT_BASE_SEPOLIA;
    if (!unifiedVaultAddress || unifiedVaultAddress === '0x0000000000000000000000000000000000000000') {
      return res.status(500).json({
        error: 'UNIFIED_VAULT_BASE_SEPOLIA not configured'
      });
    }

    // Create message hash (same format as contract expects)
    // Contract does: keccak256(abi.encodePacked(contractAddress, amount, nonce, sourceChainId, destinationChainId))
    // Then: MessageHashUtils.toEthSignedMessageHash(message)
    // So we need to sign the message hash with EIP-191 prefix
    
    // Create the message (bytes32 hash) - exactly as contract expects
    // Contract: keccak256(abi.encodePacked(contractAddress, amount, nonce, sourceChainId, destinationChainId))
    const message = ethers.keccak256(
      ethers.solidityPacked(
        ['address', 'uint256', 'uint256', 'uint256', 'uint256'],
        [
          unifiedVaultAddress,
          amountBigInt,
          nonceBigInt,
          RARI_CHAIN_ID,
          BASE_SEPOLIA_CHAIN_ID
        ]
      )
    );

    // Contract uses MessageHashUtils.toEthSignedMessageHash(message)
    // This does: keccak256("\x19Ethereum Signed Message:\n32" + message)
    // For bytes32, ethers.hashMessage() does exactly this when we pass bytes
    const messageHash = ethers.hashMessage(ethers.getBytes(message));

    // The contract expects: MessageHashUtils.toEthSignedMessageHash(message)
    // Which is: keccak256("\x19Ethereum Signed Message:\n32" + message)
    // 
    // CDP SDK's signMessage for strings does: keccak256("\x19Ethereum Signed Message:\n" + len + message)
    // For a hex string, CDP might handle it differently
    //
    // The issue: CDP signMessage adds EIP-191 prefix differently than MessageHashUtils.toEthSignedMessageHash
    // Solution: We need to sign the raw message (before EIP-191) and let CDP add the prefix
    // But CDP's prefix format might not match MessageHashUtils
    //
    // Alternative: Use ethers to manually create the exact hash and sign it
    // But we don't have direct access to the private key from CDP
    //
    // Best approach: Pass the message hash as a hex string to CDP
    // CDP should recognize it as bytes32 and add the correct prefix
    // If not, we may need to adjust the contract verification
    
    // Try using CDP's signMessage with the message hash
    // CDP should handle hex strings correctly
    const signature = await cdpWalletService.signMessageHash(message, 'base-sepolia');
    
    // Verify the signature locally to debug
    try {
      const recoveredAddress = ethers.recoverAddress(messageHash, signature);
      if (recoveredAddress.toLowerCase() !== teeWalletAddress.toLowerCase()) {
        console.warn(`⚠️  Signature verification mismatch:`);
        console.warn(`   Expected: ${teeWalletAddress}`);
        console.warn(`   Recovered: ${recoveredAddress}`);
        console.warn(`   Message: ${message}`);
        console.warn(`   MessageHash: ${messageHash}`);
        console.warn(`   This signature may not verify on-chain - CDP format may differ`);
      } else {
        console.log(`✅ Signature verified locally - should work on-chain`);
      }
    } catch (verifyError: any) {
      console.warn(`⚠️  Could not verify signature locally: ${verifyError.message}`);
    }

    console.log(`📝 Rari attestation generated:`);
    console.log(`   Amount: ${amountBigInt.toString()}`);
    console.log(`   Nonce: ${nonceBigInt.toString()}`);
    console.log(`   Source Chain ID: ${RARI_CHAIN_ID.toString()}`);
    console.log(`   Destination Chain ID: ${BASE_SEPOLIA_CHAIN_ID.toString()}`);
    console.log(`   TEE Wallet: ${teeWalletAddress}`);
    console.log(`   Signature: ${signature.substring(0, 20)}...`);

    res.json({
      success: true,
      attestation: {
        amount: amountBigInt.toString(),
        nonce: nonceBigInt.toString(),
        sourceChainId: RARI_CHAIN_ID.toString(),
        destinationChainId: BASE_SEPOLIA_CHAIN_ID.toString(),
        signature,
        teeWallet: teeWalletAddress,
        message, // Include for debugging
      },
      message: 'Attestation generated successfully. Use this to call receiveAttested on Base Sepolia.',
    });
  } catch (error: any) {
    console.error('Rari attestation error:', error);
    res.status(500).json({
      error: error.message || 'Failed to generate attestation',
      success: false
    });
  }
});

/**
 * Store Rari deposit information
 * POST /api/rari/deposit
 * 
 * Body:
 * {
 *   "userAddress": "0x...",
 *   "amount": "1000000", // Amount in wei (6 decimals)
 *   "amountFormatted": "1.0", // Human readable amount
 *   "nonce": "1234567890",
 *   "sourceChainId": "1918988905",
 *   "depositTxHash": "0x..."
 * }
 */
rariRouter.post('/deposit', async (req, res) => {
  try {
    const { userAddress, amount, amountFormatted, nonce, sourceChainId, depositTxHash } = req.body;

    if (!userAddress || !amount || !nonce || !depositTxHash) {
      return res.status(400).json({
        error: 'Missing required fields',
        required: ['userAddress', 'amount', 'nonce', 'depositTxHash'],
      });
    }

    // Validate userAddress format
    if (!/^0x[a-fA-F0-9]{40}$/.test(userAddress)) {
      return res.status(400).json({
        error: 'Invalid user address format',
      });
    }

    // Check if deposit with this nonce already exists
    const existing = rariDepositStorage.getDepositByNonce(nonce, userAddress);
    if (existing) {
      return res.status(409).json({
        error: 'Deposit with this nonce already exists',
        deposit: existing,
      });
    }

    const deposit = rariDepositStorage.storeDeposit({
      userAddress,
      amount,
      amountFormatted: amountFormatted || ethers.formatUnits(amount, 6),
      nonce,
      sourceChainId: sourceChainId || '1918988905',
      depositTxHash,
    });

    res.json({
      success: true,
      deposit,
      message: 'Deposit stored successfully',
    });
  } catch (error: any) {
    console.error('Store Rari deposit error:', error);
    res.status(500).json({
      error: error.message || 'Failed to store deposit',
      success: false,
    });
  }
});

/**
 * Get unredeemed deposits for a user
 * GET /api/rari/deposits?userAddress=0x...
 */
rariRouter.get('/deposits', async (req, res) => {
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

    const deposits = rariDepositStorage.getUnredeemedDeposits(userAddress);

    res.json({
      success: true,
      deposits,
      count: deposits.length,
    });
  } catch (error: any) {
    console.error('Get Rari deposits error:', error);
    res.status(500).json({
      error: error.message || 'Failed to get deposits',
      success: false,
    });
  }
});

/**
 * Get all unredeemed deposits (admin/any user)
 * GET /api/rari/deposits/all
 */
rariRouter.get('/deposits/all', async (req, res) => {
  try {
    const deposits = rariDepositStorage.getAllUnredeemedDeposits();

    res.json({
      success: true,
      deposits,
      count: deposits.length,
    });
  } catch (error: any) {
    console.error('Get all Rari deposits error:', error);
    res.status(500).json({
      error: error.message || 'Failed to get deposits',
      success: false,
    });
  }
});

/**
 * Mark deposit as redeemed
 * POST /api/rari/redeem
 * 
 * Body:
 * {
 *   "id": "deposit-id" or "nonce": "1234567890",
 *   "userAddress": "0x...", // Optional if using nonce
 *   "redeemTxHash": "0x..."
 * }
 */
rariRouter.post('/redeem', async (req, res) => {
  try {
    const { id, nonce, userAddress, redeemTxHash } = req.body;

    if (!redeemTxHash) {
      return res.status(400).json({
        error: 'redeemTxHash is required',
      });
    }

    let deposit;
    if (id) {
      deposit = rariDepositStorage.markAsRedeemed(id, redeemTxHash);
    } else if (nonce) {
      deposit = rariDepositStorage.markAsRedeemedByNonce(nonce, redeemTxHash, userAddress);
    } else {
      return res.status(400).json({
        error: 'Either id or nonce is required',
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
      message: 'Deposit marked as redeemed',
    });
  } catch (error: any) {
    console.error('Mark Rari deposit as redeemed error:', error);
    res.status(500).json({
      error: error.message || 'Failed to mark deposit as redeemed',
      success: false,
    });
  }
});

export { rariRouter };

