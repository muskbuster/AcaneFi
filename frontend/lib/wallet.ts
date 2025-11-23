import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { sepolia, baseSepolia } from 'wagmi/chains';
import { defineChain } from 'viem';
import type { Config } from 'wagmi';

// Custom chain definitions using viem
const rariTestnet = defineChain({
  id: 1918988905,
  name: 'Rari Testnet',
  network: 'rari-testnet',
  nativeCurrency: {
    decimals: 18,
    name: 'Ether',
    symbol: 'ETH',
  },
  rpcUrls: {
    default: {
      http: ['https://rari-testnet.calderachain.xyz/http'],
    },
    public: {
      http: ['https://rari-testnet.calderachain.xyz/http'],
    },
  },
  blockExplorers: {
    default: {
      name: 'Rari Explorer',
      url: 'https://rari-testnet.calderachain.xyz',
    },
  },
  testnet: true,
});

const arcTestnet = defineChain({
  id: 5042002,
  name: 'Arc Testnet',
  network: 'arc-testnet',
  nativeCurrency: {
    decimals: 18,
    name: 'Ether',
    symbol: 'ETH',
  },
  rpcUrls: {
    default: {
      http: ['https://rpc.testnet.arc.network'],
    },
    public: {
      http: ['https://rpc.testnet.arc.network'],
    },
  },
  blockExplorers: {
    default: {
      name: 'Arc Explorer',
      url: 'https://explorer.testnet.arc.network',
    },
  },
  testnet: true,
});

// Configure chains for ArcaneFi
export const chains = [sepolia, baseSepolia, rariTestnet, arcTestnet] as const;

// Use getDefaultConfig from RainbowKit - automatically includes MetaMask and other wallets
const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || 'wallet-connect';

export const config = getDefaultConfig({
  appName: 'ArcaneFi',
  projectId,
  chains,
  ssr: true,
}) as Config;

