import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { sepolia, baseSepolia } from 'wagmi/chains';

// Configure chains for ArcaneFi
export const config = getDefaultConfig({
  appName: 'ArcaneFi',
  projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || 'your-project-id',
  chains: [sepolia, baseSepolia],
  ssr: true,
});

