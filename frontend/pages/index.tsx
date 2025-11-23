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
    <div className="min-h-screen bg-background">
      <Header />
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Hero Section */}
        <header className="mb-16 text-center">
          <h1 className="text-6xl md:text-7xl font-bold text-foreground mb-6 font-heading">
            ArcaneFi
          </h1>
          <p className="text-2xl md:text-3xl text-muted-foreground mb-4 font-medium">
            Cross-Chain Social Trading Platform
          </p>
          <p className="text-lg text-muted-foreground max-w-3xl mx-auto mb-8">
            Allocate capital to traders without giving them custody. Traders upload strategy logic into a Trusted Execution Environment (TEE) that executes trades on their behalf using pooled vault liquidity.
          </p>
        </header>

        {/* Key Features */}
        <section className="mb-16">
          <h2 className="text-3xl font-bold text-foreground mb-8 text-center font-heading">Key Features</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-card rounded-lg shadow-lg p-6 border border-border">
              <div className="text-3xl mb-4">🔒</div>
              <h3 className="text-xl font-bold text-card-foreground mb-3 font-heading">Non-Custodial</h3>
              <p className="text-muted-foreground">
                Traders never have custody of your funds. The TEE enforces that traders cannot withdraw user funds - only execute trades according to pre-approved rules.
              </p>
            </div>
            <div className="bg-card rounded-lg shadow-lg p-6 border border-border">
              <div className="text-3xl mb-4">🌐</div>
              <h3 className="text-xl font-bold text-card-foreground mb-3 font-heading">Cross-Chain</h3>
              <p className="text-muted-foreground">
                Deposit from Ethereum Sepolia, Base Sepolia, Arc, or Rari. Funds are bridged to Base Sepolia where all trading execution happens.
              </p>
            </div>
            <div className="bg-card rounded-lg shadow-lg p-6 border border-border">
              <div className="text-3xl mb-4">⚡</div>
              <h3 className="text-xl font-bold text-card-foreground mb-3 font-heading">TEE Security</h3>
              <p className="text-muted-foreground">
                Trading instructions are executed in a Trusted Execution Environment. Traders cannot deviate from submitted strategy logic - all trades are rules-based.
              </p>
            </div>
          </div>
        </section>

        {/* Concept Section */}
        <section className="mb-16 bg-card rounded-lg shadow-lg p-8 border border-border">
          <h2 className="text-3xl font-bold text-card-foreground mb-6 font-heading">How It Works</h2>
          <div className="space-y-6">
            <div>
              <h3 className="text-xl font-bold text-card-foreground mb-3 font-heading">Strategy Renting</h3>
              <p className="text-muted-foreground mb-4">
                ArcaneFi enables "strategy renting" - users bet on traders, and traders get scalable capital without revealing alpha or risking custodial liability. Retail users deposit liquidity into pooled vaults tied to specific traders.
              </p>
            </div>
            <div>
              <h3 className="text-xl font-bold text-card-foreground mb-3 font-heading">TEE Execution</h3>
              <p className="text-muted-foreground mb-4">
                Traders don't touch user wallets directly. Instead, they upload trading instructions, signals, or strategy logic into a TEE. The TEE owns a dedicated trading account and is the only entity allowed to submit trades. It receives real-time inputs (market data, trader signals, risk parameters) and executes trades on integrated exchanges strictly according to pre-approved rules.
              </p>
            </div>
            <div>
              <h3 className="text-xl font-bold text-card-foreground mb-3 font-heading">On-Chain Transparency</h3>
              <p className="text-muted-foreground">
                All positions, PnL, and fee distributions are logged and broadcast on-chain for transparent accounting. Risk limits like max leverage, stop-loss, exposure caps, and withdrawal constraints are enforced automatically. The platform uses on-chain contracts as the source of truth - no database required.
              </p>
            </div>
          </div>
        </section>

        {/* Cross-Chain Flow */}
        <section className="mb-16">
          <h2 className="text-3xl font-bold text-foreground mb-8 text-center font-heading">Cross-Chain Deposit Flow</h2>
          <div className="bg-card rounded-lg shadow-lg p-8 border border-border">
            <div className="space-y-6">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">1</div>
                <div>
                  <h3 className="font-bold text-card-foreground mb-2">User Deposits USDC</h3>
                  <p className="text-muted-foreground">Deposit from any supported chain (Ethereum Sepolia, Base Sepolia, Arc, or Rari)</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">2</div>
                <div>
                  <h3 className="font-bold text-card-foreground mb-2">Cross-Chain Bridge</h3>
                  <p className="text-muted-foreground">
                    CCTP (Circle Cross-Chain Transfer Protocol) for chains with native USDC support, or custom attestation flow for chains without CCTP (like Rari)
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">3</div>
                <div>
                  <h3 className="font-bold text-card-foreground mb-2">Attestation Generation</h3>
                  <p className="text-muted-foreground">CCTP attestation from Circle or TEE-signed attestation for Rari deposits</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">4</div>
                <div>
                  <h3 className="font-bold text-card-foreground mb-2">USDC Received on Base Sepolia</h3>
                  <p className="text-muted-foreground">USDC is minted/received on Base Sepolia to TEE wallet using CDP Server Wallets</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">5</div>
                <div>
                  <h3 className="font-bold text-card-foreground mb-2">Trading Execution</h3>
                  <p className="text-muted-foreground">All trading happens on Base Sepolia using TEE wallet funds. TEE executes trades on integrated exchanges (HyperLiquid) according to trader-submitted strategy logic</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Position Creation Flow */}
        <section className="mb-16">
          <h2 className="text-3xl font-bold text-foreground mb-8 text-center font-heading">Position Creation Flow</h2>
          <div className="bg-card rounded-lg shadow-lg p-8 border border-border">
            <div className="space-y-6">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-accent text-accent-foreground flex items-center justify-center font-bold">1</div>
                <div>
                  <h3 className="font-bold text-card-foreground mb-2">Trader Signs Message</h3>
                  <p className="text-muted-foreground">Trader signs a message with their private key as attestation</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-accent text-accent-foreground flex items-center justify-center font-bold">2</div>
                <div>
                  <h3 className="font-bold text-card-foreground mb-2">TEE Verification</h3>
                  <p className="text-muted-foreground">TEE API verifies the signature and checks trader registration on-chain (VaultFactory)</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-accent text-accent-foreground flex items-center justify-center font-bold">3</div>
                <div>
                  <h3 className="font-bold text-card-foreground mb-2">Strategy Validation</h3>
                  <p className="text-muted-foreground">TEE validates the trading instruction against pre-approved strategy rules</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-accent text-accent-foreground flex items-center justify-center font-bold">4</div>
                <div>
                  <h3 className="font-bold text-card-foreground mb-2">Market Data & Risk Checks</h3>
                  <p className="text-muted-foreground">TEE fetches current market data (prices from CoinGecko) and checks risk limits (leverage, exposure caps, stop-loss)</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-accent text-accent-foreground flex items-center justify-center font-bold">5</div>
                <div>
                  <h3 className="font-bold text-card-foreground mb-2">Trade Execution</h3>
                  <p className="text-muted-foreground">TEE wallet (CDP wallet) executes the trade on the integrated exchange. Position is created and logged on-chain with transparent accounting</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Supported Chains */}
        <section className="mb-16">
          <h2 className="text-3xl font-bold text-foreground mb-8 text-center font-heading">Supported Chains</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-card rounded-lg shadow-lg p-6 border border-border text-center">
              <h3 className="font-bold text-card-foreground mb-2">Base Sepolia</h3>
              <p className="text-sm text-muted-foreground">Primary trading chain</p>
            </div>
            <div className="bg-card rounded-lg shadow-lg p-6 border border-border text-center">
              <h3 className="font-bold text-card-foreground mb-2">Ethereum Sepolia</h3>
              <p className="text-sm text-muted-foreground">CCTP supported</p>
            </div>
            <div className="bg-card rounded-lg shadow-lg p-6 border border-border text-center">
              <h3 className="font-bold text-card-foreground mb-2">Arc Testnet</h3>
              <p className="text-sm text-muted-foreground">CCTP supported</p>
            </div>
            <div className="bg-card rounded-lg shadow-lg p-6 border border-border text-center">
              <h3 className="font-bold text-card-foreground mb-2">Rari Testnet</h3>
              <p className="text-sm text-muted-foreground">Custom attestation</p>
            </div>
          </div>
        </section>

        {/* Available Traders */}
        <section className="mb-16">
          <h2 className="text-3xl font-bold text-foreground mb-8 text-center font-heading">Available Traders</h2>
          {loading ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
          ) : traders.length === 0 ? (
            <div className="text-center py-12 bg-card rounded-lg shadow border border-border">
              <p className="text-muted-foreground mb-4">No traders registered yet.</p>
              {isConnected && (
                <Link
                  href="/trader/register"
                  className="inline-block px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition"
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
                  className="bg-card rounded-lg shadow-lg p-6 hover:shadow-xl transition border border-border"
                >
                  <h3 className="text-xl font-bold text-card-foreground mb-2 font-heading">
                    {trader.name}
                  </h3>
                  <p className="text-muted-foreground text-sm mb-4 line-clamp-2">
                    {trader.strategyDescription}
                  </p>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">
                      Fee: {trader.performanceFee}%
                    </span>
                    <span className="text-sm text-primary font-semibold">
                      View Details →
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>

        {/* Security & Technology */}
        <section className="mb-16 bg-card rounded-lg shadow-lg p-8 border border-border">
          <h2 className="text-3xl font-bold text-card-foreground mb-6 font-heading">Security & Technology</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-xl font-bold text-card-foreground mb-3 font-heading">CDP Server Wallets v2</h3>
              <p className="text-muted-foreground">
                All TEE operations use Coinbase Developer Platform Server Wallets with keys stored in secure enclaves. Private keys never leave secure enclaves.
              </p>
            </div>
            <div>
              <h3 className="text-xl font-bold text-card-foreground mb-3 font-heading">On-Chain State</h3>
              <p className="text-muted-foreground">
                Trader registration, deposits, and positions are tracked on-chain via VaultFactory and UnifiedVault contracts. No database required - all state is stored on-chain.
              </p>
            </div>
            <div>
              <h3 className="text-xl font-bold text-card-foreground mb-3 font-heading">Rules-Based Execution</h3>
              <p className="text-muted-foreground">
                The TEE enforces that traders cannot deviate from their submitted strategy logic. It only executes trades that match pre-approved rules.
              </p>
            </div>
            <div>
              <h3 className="text-xl font-bold text-card-foreground mb-3 font-heading">Transparent Accounting</h3>
              <p className="text-muted-foreground">
                All positions, PnL, and fee distributions are logged and broadcast on-chain. Traders earn performance fees, while users earn proportional returns based on vault share allocation.
              </p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

