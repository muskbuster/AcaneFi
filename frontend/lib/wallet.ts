import { createConfig, http } from 'wagmi';
import { sepolia, baseSepolia } from 'wagmi/chains';
import { defineChain } from 'viem';
import { metaMask, injected, walletConnect } from 'wagmi/connectors';

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
const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || '';

export const chains = [sepolia, baseSepolia, rariTestnet, arcTestnet] as const;

// Configure wallets - MetaMask first to ensure it appears
// Using wagmi connectors directly for better compatibility
export const config = createConfig({
  chains,
  connectors: [
    metaMask(), // MetaMask connector - should appear first
    injected(), // Generic injected wallet (for other wallets like Phantom, etc.)
    ...(projectId && projectId !== 'your-project-id' ? [walletConnect({ projectId })] : []),
  ],
  transports: {
    [sepolia.id]: http(),
    [baseSepolia.id]: http(),
    [rariTestnet.id]: http(),
    [arcTestnet.id]: http(),
  },
  ssr: true,
});

