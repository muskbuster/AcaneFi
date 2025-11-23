import type { AppProps } from 'next/app';
import { WagmiProvider } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RainbowKitProvider } from '@rainbow-me/rainbowkit';
import { baseSepolia } from 'wagmi/chains';
import { Space_Grotesk, Inter, JetBrains_Mono } from 'next/font/google';
import { config } from '../lib/wallet';
import '@rainbow-me/rainbowkit/styles.css';
import '../styles/globals.css';

const spaceGrotesk = Space_Grotesk({
  variable: '--font-heading',
  subsets: ['latin'],
  display: 'swap',
  weight: ['400', '500', '600', '700'],
});

const inter = Inter({
  variable: '--font-body',
  subsets: ['latin'],
  display: 'swap',
});

const jetBrainsMono = JetBrains_Mono({
  variable: '--font-mono',
  subsets: ['latin'],
  display: 'swap',
  weight: ['400', '500'],
});

const queryClient = new QueryClient();

export default function App({ Component, pageProps }: AppProps) {
  return (
    <div className={`${spaceGrotesk.variable} ${inter.variable} ${jetBrainsMono.variable} font-body`}>
      <WagmiProvider config={config}>
        <QueryClientProvider client={queryClient}>
          <RainbowKitProvider
            modalSize="compact"
            initialChain={baseSepolia}
          >
            <Component {...pageProps} />
          </RainbowKitProvider>
        </QueryClientProvider>
      </WagmiProvider>
    </div>
  );
}

