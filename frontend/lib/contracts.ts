import { Address } from 'viem';
import { cctpApi, layerzeroApi } from './api';

// Contract ABIs (simplified - use full ABIs in production)
export const UNIFIED_VAULT_ABI = [
  {
    name: 'depositViaCCTP',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'traderId', type: 'uint256' },
      { name: 'amount', type: 'uint256' },
      { name: 'maxFee', type: 'uint256' },
      { name: 'minFinalityThreshold', type: 'uint32' },
    ],
    outputs: [],
  },
  {
    name: 'depositRari',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'traderId', type: 'uint256' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [],
  },
  {
    name: 'receiveBridgedUSDC',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'message', type: 'bytes' },
      { name: 'attestation', type: 'bytes' },
    ],
    outputs: [{ name: 'success', type: 'bool' }],
  },
] as const;

export const OFT_ABI = [
  {
    name: 'send',
    type: 'function',
    stateMutability: 'payable',
    inputs: [
      {
        name: '_sendParam',
        type: 'tuple',
        components: [
          { name: 'dstEid', type: 'uint32' },
          { name: 'to', type: 'bytes32' },
          { name: 'amountLD', type: 'uint256' },
          { name: 'minAmountLD', type: 'uint256' },
        ],
      },
      {
        name: '_fee',
        type: 'tuple',
        components: [
          { name: 'nativeFee', type: 'uint256' },
          { name: 'lzTokenFee', type: 'uint256' },
        ],
      },
      { name: '_refundTo', type: 'address' },
    ],
    outputs: [{ name: 'guid', type: 'bytes32' }],
  },
  {
    name: 'quote',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      {
        name: '_sendParam',
        type: 'tuple',
        components: [
          { name: 'dstEid', type: 'uint32' },
          { name: 'to', type: 'bytes32' },
          { name: 'amountLD', type: 'uint256' },
          { name: 'minAmountLD', type: 'uint256' },
        ],
      },
      { name: '_payInLzToken', type: 'bool' },
      { name: '_extraOptions', type: 'bytes' },
      { name: '_composeMsg', type: 'bytes' },
    ],
    outputs: [
      {
        name: 'fee',
        type: 'tuple',
        components: [
          { name: 'nativeFee', type: 'uint256' },
          { name: 'lzTokenFee', type: 'uint256' },
        ],
      },
    ],
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
] as const;

export const USDC_ABI = [
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
    name: 'decimals',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint8' }],
  },
  {
    name: 'balanceOf',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
] as const;

// CCTP TokenMessenger ABI (for direct contract interaction)
export const CCTP_TOKEN_MESSENGER_ABI = [
  {
    name: 'depositForBurn',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'amount', type: 'uint256' },
      { name: 'destinationDomain', type: 'uint32' },
      { name: 'mintRecipient', type: 'bytes32' },
      { name: 'burnToken', type: 'address' },
      { name: 'destinationCaller', type: 'bytes32' },
      { name: 'maxFee', type: 'uint256' },
      { name: 'minFinalityThreshold', type: 'uint32' },
    ],
    outputs: [{ name: 'nonce', type: 'uint64' }],
  },
] as const;

/**
 * Get UnifiedVault contract address for a chain
 */
export async function getUnifiedVaultAddress(chain: string): Promise<Address | null> {
  try {
    // In production, get from backend API or environment
    const addresses: Record<string, Address> = {
      'ethereum-sepolia': process.env.NEXT_PUBLIC_UNIFIED_VAULT_ETHEREUM_SEPOLIA as Address || '0x0000000000000000000000000000000000000000',
      'base-sepolia': process.env.NEXT_PUBLIC_UNIFIED_VAULT_BASE_SEPOLIA as Address || '0x0000000000000000000000000000000000000000',
      'arc': process.env.NEXT_PUBLIC_UNIFIED_VAULT_ARC as Address || '0x0000000000000000000000000000000000000000',
      'rari': process.env.NEXT_PUBLIC_UNIFIED_VAULT_RARI as Address || '0x0000000000000000000000000000000000000000',
    };
    return addresses[chain] || null;
  } catch (error) {
    console.error('Failed to get UnifiedVault address:', error);
    return null;
  }
}

/**
 * Get USDC address for a chain
 */
export function getUSDCAddress(chain: string): Address {
  const addresses: Record<string, Address> = {
    'ethereum-sepolia': '0x1c7d4b196cb0c7b01d743fbc6116a902379c7238',
    'base-sepolia': '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
  };
  return addresses[chain] || '0x0000000000000000000000000000000000000000';
}

/**
 * Get CCTP contract addresses
 */
export async function getCCTPContracts(chain: string) {
  return await cctpApi.getContracts(chain);
}

/**
 * Get LayerZero OFT address
 */
export async function getOFTAddress(chain: string): Promise<Address | null> {
  try {
    const response = await layerzeroApi.getOFTAddress(chain);
    return response.oftAddress || null;
  } catch (error) {
    console.error('Failed to get OFT address:', error);
    return null;
  }
}

/**
 * Convert address to bytes32 for LayerZero and CCTP
 */
export function addressToBytes32(address: Address): `0x${string}` {
  return `0x000000000000000000000000${address.slice(2)}` as `0x${string}`;
}

/**
 * Get CCTP TokenMessenger address for a chain
 */
export function getCCTPTokenMessengerAddress(chain: string): Address {
  // CCTP testnet addresses (same for all testnet chains)
  const addresses: Record<string, Address> = {
    'ethereum-sepolia': '0x8FE6B999Dc680CcFDD5Bf7EB0974218be2542DAA',
    'base-sepolia': '0x8FE6B999Dc680CcFDD5Bf7EB0974218be2542DAA',
    'arc': '0x8FE6B999Dc680CcFDD5Bf7EB0974218be2542DAA',
  };
  return addresses[chain] || '0x0000000000000000000000000000000000000000';
}

