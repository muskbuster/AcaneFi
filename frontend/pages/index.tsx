import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import Link from 'next/link';
import { teeApi } from '../lib/api';
import Header from '../components/Header';

interface Trader {
  id: number;
  address: string;
  traderId: number;
  name: string;
  strategyDescription: string;
  performanceFee: number;
  registeredAt: string;
}

export default function Home() {
  const { address, isConnected } = useAccount();
  const [traders, setTraders] = useState<Trader[]>([]);
  const [loading, setLoading] = useState(true);
  const [userTrader, setUserTrader] = useState<Trader | null>(null);

  useEffect(() => {
    loadTraders();
  }, [address]);

  const loadTraders = async () => {
    try {
      const response = await teeApi.getAllTraders();
      const allTraders = response.traders || [];
      setTraders(allTraders);
      
      // Check if connected wallet is a registered trader
      if (address && allTraders.length > 0) {
        const trader = allTraders.find(
          (t: Trader) => t.address.toLowerCase() === address.toLowerCase()
        );
        setUserTrader(trader || null);
      } else {
        setUserTrader(null);
      }
    } catch (error) {
      console.error('Failed to load traders:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <Header />
      <div className="container mx-auto px-4 py-8">
        <header className="mb-12 text-center">
          <h1 className="text-5xl font-bold text-gray-900 mb-4">
            ArcaneFi
          </h1>
          <p className="text-xl text-gray-600 mb-8">
            Cross-Chain Social Trading Platform
          </p>
          {isConnected && (
            <div className="flex justify-center gap-4 flex-wrap">
              {userTrader ? (
                <Link
                  href={`/trader/${userTrader.traderId}`}
                  className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition font-semibold"
                >
                  🎯 My Trader Dashboard
                </Link>
              ) : (
                <Link
                  href="/trader/register"
                  className="px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition"
                >
                  Register as Trader
                </Link>
              )}
              <Link
                href="/deposit"
                className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
              >
                Deposit to Trader
              </Link>
              <Link
                href="/bridge-shares"
                className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition"
              >
                Bridge Shares
              </Link>
              <Link
                href="/receive"
                className="px-6 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition"
              >
                Receive
              </Link>
            </div>
          )}
        </header>

        <section className="mb-12">
          <h2 className="text-3xl font-bold text-gray-900 mb-6">Available Traders</h2>
          {loading ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
            </div>
          ) : traders.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-lg shadow">
              <p className="text-gray-600">No traders registered yet.</p>
              {isConnected && (
                <Link
                  href="/trader/register"
                  className="mt-4 inline-block px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition"
                >
                  Be the first trader!
                </Link>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {traders.map((trader) => (
                <Link
                  key={trader.id}
                  href={`/trader/${trader.traderId}`}
                  className="bg-white rounded-lg shadow-lg p-6 hover:shadow-xl transition"
                >
                  <h3 className="text-xl font-bold text-gray-900 mb-2">
                    {trader.name}
                  </h3>
                  <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                    {trader.strategyDescription}
                  </p>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-500">
                      Fee: {trader.performanceFee}%
                    </span>
                    <span className="text-sm text-primary-600 font-semibold">
                      View Details →
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>

        <section className="bg-white rounded-lg shadow-lg p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">How It Works</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="text-4xl mb-4">1️⃣</div>
              <h3 className="font-bold text-lg mb-2">Register as Trader</h3>
              <p className="text-gray-600">
                Traders register with TEE and get a unique trader ID
              </p>
            </div>
            <div className="text-center">
              <div className="text-4xl mb-4">2️⃣</div>
              <h3 className="font-bold text-lg mb-2">Users Deposit</h3>
              <p className="text-gray-600">
                Users deposit USDC to copy trade with registered traders
              </p>
            </div>
            <div className="text-center">
              <div className="text-4xl mb-4">3️⃣</div>
              <h3 className="font-bold text-lg mb-2">Cross-Chain Trading</h3>
              <p className="text-gray-600">
                Trade across multiple chains with unified balance management
              </p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

