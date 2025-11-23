import { ConnectButton } from '@rainbow-me/rainbowkit';
import Link from 'next/link';
import { useAccount } from 'wagmi';
import { useState, useEffect } from 'react';
import { teeApi } from '../lib/api';

interface Trader {
  id: number;
  address: string;
  traderId: number;
  name: string;
  strategyDescription: string;
  performanceFee: number;
  registeredAt: string;
}

export default function Header() {
  const { address, isConnected } = useAccount();
  const [userTrader, setUserTrader] = useState<Trader | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isConnected && address) {
      loadUserTrader();
    } else {
      setUserTrader(null);
    }
  }, [address, isConnected]);

  const loadUserTrader = async () => {
    if (!address) return;
    setLoading(true);
    try {
      const response = await teeApi.getAllTraders();
      const allTraders = response.traders || [];
      if (allTraders.length > 0) {
        const trader = allTraders.find(
          (t: Trader) => t.address.toLowerCase() === address.toLowerCase()
        );
        setUserTrader(trader || null);
      } else {
        setUserTrader(null);
      }
    } catch (error) {
      console.error('Failed to load trader:', error);
      setUserTrader(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <header className="bg-card shadow-sm border-b border-border sticky top-0 z-50 relative">
      <div className="container mx-auto px-4 py-4">
        <div className="flex justify-between items-center">
          <Link href="/" className="text-2xl font-bold text-card-foreground font-heading hover:text-primary transition cursor-pointer">
            ArcaneFi
          </Link>
          <div className="flex items-center gap-4 relative z-10">
            <nav className="flex gap-2 items-center flex-wrap relative z-10">
              {isConnected ? (
                <>
                  {userTrader ? (
                    <Link
                      href={`/trader/${userTrader.traderId}`}
                      className="px-4 py-2 text-muted-foreground hover:text-primary transition font-medium cursor-pointer"
                    >
                     Dashboard
                    </Link>
                  ) : (
                    <Link
                      href="/trader/register"
                      className="px-4 py-2 text-muted-foreground hover:text-primary transition font-medium cursor-pointer"
                    >
                      Register
                    </Link>
                  )}
                  <Link
                    href="/deposit"
                    className="px-4 py-2 text-muted-foreground hover:text-primary transition font-medium cursor-pointer"
                  >
                    Deposit
                  </Link>
                  <Link
                    href="/bridge-shares"
                    className="px-4 py-2 text-muted-foreground hover:text-primary transition font-medium cursor-pointer"
                  >
                    Bridge
                  </Link>
                  <Link
                    href="/receive"
                    className="px-4 py-2 text-muted-foreground hover:text-primary transition font-medium cursor-pointer"
                  >
                    Receive
                  </Link>
                  <Link
                    href="/mint-mockusdc"
                    className="px-4 py-2 text-muted-foreground hover:text-primary transition font-medium cursor-pointer"
                  >
                    Mint USDC
                  </Link>
                  <a
                    href="https://faucet.circle.com/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 py-2 text-muted-foreground hover:text-primary transition font-medium cursor-pointer"
                  >
                    USDC Faucet
                  </a>
                </>
              ) : (
                <>
                  <Link
                    href="/deposit"
                    className="px-4 py-2 text-muted-foreground hover:text-primary transition font-medium cursor-pointer"
                  >
                    Deposit
                  </Link>
                  <Link
                    href="/bridge-shares"
                    className="px-4 py-2 text-muted-foreground hover:text-primary transition font-medium cursor-pointer"
                  >
                    Bridge
                  </Link>
                  <Link
                    href="/receive"
                    className="px-4 py-2 text-muted-foreground hover:text-primary transition font-medium cursor-pointer"
                  >
                    Receive
                  </Link>
                  <Link
                    href="/mint-mockusdc"
                    className="px-4 py-2 text-muted-foreground hover:text-primary transition font-medium cursor-pointer"
                  >
                    Mint USDC
                  </Link>
                  <a
                    href="https://faucet.circle.com/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 py-2 text-muted-foreground hover:text-primary transition font-medium cursor-pointer"
                  >
                    USDC Faucet
                  </a>
                </>
              )}
            </nav>
            <ConnectButton />
          </div>
        </div>
      </div>
    </header>
  );
}

