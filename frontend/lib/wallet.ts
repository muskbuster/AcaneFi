import { createConfig, http } from 'wagmi';
import { sepolia, baseSepolia } from 'wagmi/chains';
import { metaMask, injected, walletConnect } from 'wagmi/connectors';

// Configure chains for ArcaneFi
const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || '';

export const config = createConfig({
  chains: [sepolia, baseSepolia],
  connectors: [
    metaMask(),
    injected(),
    ...(projectId && projectId !== 'your-project-id' ? [walletConnect({ projectId })] : []),
  ],
  transports: {
    [sepolia.id]: http(),
    [baseSepolia.id]: http(),
  },
  ssr: true,
});

