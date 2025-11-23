import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAccount, useSignMessage, useChainId, useSwitchChain, useReadContract } from 'wagmi';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { teeApi, tradeApi, cctpApi } from '../../lib/api';
import { baseSepolia } from 'wagmi/chains';
import { getUSDCAddress, USDC_ABI } from '../../lib/contracts';
import { formatUnits, parseUnits } from 'viem';
import CreatePositionForm from '../../components/CreatePositionForm';
import Header from '../../components/Header';

interface Trader {
  id: number;
  address: string;
  traderId: number;
  name: string;
  strategyDescription: string;
  performanceFee: number;
}

interface Position {
  id: number;
  traderId: number;
  positionType: 'LONG' | 'SHORT';
  size: number;
  entryPrice: number;
  currentPrice: number;
  pnl: number;
  status: string;
}

export default function TraderDashboard() {
  const router = useRouter();
  const { traderId } = router.query;
  const { address, isConnected } = useAccount();
  const { signMessageAsync } = useSignMessage();

  const [trader, setTrader] = useState<Trader | null>(null);
  const [positions, setPositions] = useState<Position[]>([]);
  const [signals, setSignals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [signalForm, setSignalForm] = useState({
    signalType: 'LONG' as 'LONG' | 'SHORT',
    asset: '',
    size: '',
    price: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [cctpTransactionHash, setCctpTransactionHash] = useState('');
  const [cctpAttestation, setCctpAttestation] = useState<any>(null);
  const [fetchingAttestation, setFetchingAttestation] = useState(false);
  const [receivingCCTP, setReceivingCCTP] = useState(false);
  const [teeBalance, setTeeBalance] = useState<string>('0');
  const chainId = useChainId();
  const { switchChain } = useSwitchChain();

  // Read TEE wallet USDC balance on Base Sepolia
  const teeWalletAddress = (process.env.NEXT_PUBLIC_TEE_WALLET_ADDRESS || '0x0000000000000000000000000000000000000000') as `0x${string}`;
  const { data: balanceData } = useReadContract({
    address: getUSDCAddress('base-sepolia'),
    abi: USDC_ABI,
    functionName: 'balanceOf',
    args: [teeWalletAddress as `0x${string}`],
    chainId: baseSepolia.id,
    query: {
      enabled: !!teeWalletAddress && teeWalletAddress !== '0x0000000000000000000000000000000000000000',
      refetchInterval: 10000, // Refetch every 10 seconds
    },
  });

  useEffect(() => {
    if (traderId) {
      loadData();
      const interval = setInterval(() => {
        loadPositions();
      }, 5000); // Update every 5 seconds
      return () => clearInterval(interval);
    }
  }, [traderId]);

  useEffect(() => {
    if (balanceData) {
      setTeeBalance(formatUnits(balanceData as bigint, 6));
    }
  }, [balanceData]);

  const loadData = async () => {
    if (!traderId) return;
    setLoading(true);
    try {
      const [traderRes, positionsRes, signalsRes] = await Promise.all([
        teeApi.getTrader(Number(traderId)),
        tradeApi.getPositions(Number(traderId)),
        teeApi.getTraderSignals(Number(traderId)),
      ]);
      setTrader(traderRes.trader);
      setPositions(positionsRes.positions || []);
      setSignals(signalsRes.signals || []);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadPositions = async () => {
    if (!traderId) return;
    try {
      await tradeApi.updatePrices();
      const positionsRes = await tradeApi.getPositions(Number(traderId));
      setPositions(positionsRes.positions || []);
    } catch (error) {
      console.error('Failed to update positions:', error);
    }
  };

  const handleSubmitSignal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isConnected || !address || !trader) {
      alert('Please connect your wallet');
      return;
    }

    setSubmitting(true);
    try {
      const message = `ArcaneFi: Submit signal for trader ${trader.traderId}`;
      const signature = await signMessageAsync({ message });

      await teeApi.submitSignal(trader.traderId, signature, address, {
        signalType: signalForm.signalType,
        asset: signalForm.asset,
        size: parseFloat(signalForm.size),
        price: signalForm.price ? parseFloat(signalForm.price) : undefined,
      });

      // Reset form
      setSignalForm({
        signalType: 'LONG',
        asset: '',
        size: '',
        price: '',
      });

      // Reload data
      loadData();
      alert('Signal submitted successfully!');
    } catch (error: any) {
      console.error('Submit signal error:', error);
      alert(error.response?.data?.error || 'Failed to submit signal');
    } finally {
      setSubmitting(false);
    }
  };

  const isTraderOwner = isConnected && trader && address?.toLowerCase() === trader.address.toLowerCase();

  const handleFetchCCTPAttestation = async () => {
    if (!cctpTransactionHash) {
      alert('Please enter a transaction hash');
      return;
    }

    setFetchingAttestation(true);
    try {
      const ETHEREUM_SEPOLIA_DOMAIN = 0;
      const result = await cctpApi.pollAttestation(
        ETHEREUM_SEPOLIA_DOMAIN,
        cctpTransactionHash,
        60, // max attempts
        5000 // 5 second intervals
      );

      setCctpAttestation(result);
      alert('Attestation retrieved! You can now receive USDC.');
    } catch (err: any) {
      console.error('Attestation error:', err);
      alert(err.message || 'Failed to fetch attestation');
    } finally {
      setFetchingAttestation(false);
    }
  };

  const handleReceiveCCTP = async () => {
    if (!cctpAttestation) {
      alert('Please fetch attestation first');
      return;
    }

    if (chainId !== baseSepolia.id) {
      alert('Please switch to Base Sepolia');
      switchChain?.({ chainId: baseSepolia.id });
      return;
    }

    setReceivingCCTP(true);
    try {
      const result = await cctpApi.receiveBridgedUSDC(
        cctpAttestation.message,
        cctpAttestation.attestation
      );

      if (result.success) {
        alert(`USDC received successfully! Transaction: ${result.transactionHash}`);
        setCctpTransactionHash('');
        setCctpAttestation(null);
        // Reload data to update balance
        setTimeout(() => {
          window.location.reload();
        }, 2000);
      } else {
        alert(result.error || 'Failed to receive USDC');
      }
    } catch (err: any) {
      console.error('Receive error:', err);
      alert(err.message || 'Failed to receive USDC');
    } finally {
      setReceivingCCTP(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  if (!trader) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="bg-card rounded-lg shadow-lg p-8 text-center border border-border">
          <h2 className="text-2xl font-bold mb-4 text-card-foreground font-heading">Trader Not Found</h2>
          <button
            onClick={() => router.push('/')}
            className="px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90"
          >
            Go Home
          </button>
        </div>
      </div>
    );
  }

  const totalPnl = positions.reduce((sum, pos) => sum + pos.pnl, 0);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="container mx-auto px-4 max-w-6xl py-12">
        <div className="bg-card rounded-lg shadow-lg p-8 mb-6 border border-border">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h1 className="text-3xl font-bold text-card-foreground mb-2 font-heading">{trader.name}</h1>
              <p className="text-muted-foreground">{trader.strategyDescription}</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-muted-foreground">Performance Fee</p>
              <p className="text-2xl font-bold text-primary">{trader.performanceFee}%</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-accent/50 rounded-lg p-4 border border-border">
              <p className="text-sm text-muted-foreground">Total Positions</p>
              <p className="text-2xl font-bold text-card-foreground">{positions.length}</p>
            </div>
            <div className="bg-accent/50 rounded-lg p-4 border border-border">
              <p className="text-sm text-muted-foreground">Total PnL</p>
              <p className={`text-2xl font-bold ${totalPnl >= 0 ? 'text-primary' : 'text-destructive'}`}>
                ${totalPnl.toFixed(2)}
              </p>
            </div>
            <div className="bg-accent/50 rounded-lg p-4 border border-border">
              <p className="text-sm text-muted-foreground">Trader ID</p>
              <p className="text-2xl font-bold text-card-foreground">#{trader.traderId}</p>
            </div>
            <div className="bg-accent/50 rounded-lg p-4 border border-border">
              <p className="text-sm text-muted-foreground">TEE Wallet Balance</p>
              <p className="text-2xl font-bold text-primary">{teeBalance} USDC</p>
            </div>
          </div>
        </div>

        {/* CCTP Receive Section - Available to all users */}
        <div className="bg-card rounded-lg shadow-lg p-8 mb-6 border border-border">
          <h2 className="text-2xl font-bold text-card-foreground mb-4 font-heading">Receive CCTP Deposit</h2>
          <p className="text-muted-foreground mb-4">
            Complete CCTP deposits from Ethereum Sepolia to Base Sepolia. Enter the burn transaction hash to fetch attestation and receive USDC.
          </p>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-card-foreground mb-2">
                CCTP Burn Transaction Hash (Ethereum Sepolia)
              </label>
              <input
                type="text"
                value={cctpTransactionHash}
                onChange={(e) => setCctpTransactionHash(e.target.value)}
                className="w-full px-4 py-2 border border-input bg-card text-card-foreground rounded-lg"
                placeholder="0x..."
                disabled={!!cctpAttestation}
              />
            </div>

            {!cctpAttestation && (
              <button
                onClick={handleFetchCCTPAttestation}
                disabled={fetchingAttestation || !cctpTransactionHash}
                className="px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition disabled:opacity-50"
              >
                {fetchingAttestation ? 'Fetching Attestation...' : 'Fetch Attestation'}
              </button>
            )}

            {cctpAttestation && (
              <>
                <div className="bg-accent/50 border border-border rounded-lg p-4">
                  <p className="text-sm text-accent-foreground">
                    ✅ Attestation retrieved! Status: {cctpAttestation.status}
                  </p>
                </div>
                <button
                  onClick={handleReceiveCCTP}
                  disabled={receivingCCTP || chainId !== baseSepolia.id}
                  className="px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition disabled:opacity-50"
                >
                  {chainId !== baseSepolia.id
                    ? 'Switch to Base Sepolia to Receive'
                    : receivingCCTP
                    ? 'Receiving USDC...'
                    : 'Receive USDC on Base Sepolia'}
                </button>
              </>
            )}

            <div className="bg-accent/50 border border-border rounded-lg p-4">
              <p className="text-sm text-blue-800">
                <strong>Instructions:</strong>
                <br />
                1. Enter the transaction hash from a CCTP burn on Ethereum Sepolia
                <br />
                2. Click "Fetch Attestation" to retrieve from Circle API
                <br />
                3. Switch to Base Sepolia and click "Receive USDC"
                <br />
                4. USDC will be minted to TEE wallet on Base Sepolia
              </p>
            </div>
          </div>
        </div>

        {isTraderOwner && (
          <>
        <div className="bg-card rounded-lg shadow-lg p-8 mb-6 border border-border">
          <h2 className="text-2xl font-bold text-card-foreground mb-4 font-heading">Create Position</h2>
              <CreatePositionForm traderId={trader.traderId} traderAddress={trader.address} onSuccess={loadData} />
            </div>
        <div className="bg-card rounded-lg shadow-lg p-8 mb-6 border border-border">
          <h2 className="text-2xl font-bold text-card-foreground mb-4 font-heading">Submit Trading Signal</h2>
              <form onSubmit={handleSubmitSignal} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-card-foreground mb-2">
                    Signal Type
                  </label>
                  <select
                    value={signalForm.signalType}
                    onChange={(e) =>
                      setSignalForm({ ...signalForm, signalType: e.target.value as 'LONG' | 'SHORT' })
                    }
                    className="w-full px-4 py-2 border border-input bg-card text-card-foreground rounded-lg"
                  >
                    <option value="LONG" className="bg-card text-card-foreground">LONG</option>
                    <option value="SHORT" className="bg-card text-card-foreground">SHORT</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-card-foreground mb-2">Asset</label>
                  <input
                    type="text"
                    required
                    value={signalForm.asset}
                    onChange={(e) => setSignalForm({ ...signalForm, asset: e.target.value })}
                    className="w-full px-4 py-2 border border-input bg-card text-card-foreground rounded-lg"
                    placeholder="e.g., ETH"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-card-foreground mb-2">Size</label>
                  <input
                    type="number"
                    required
                    min="0"
                    value={signalForm.size}
                    onChange={(e) => setSignalForm({ ...signalForm, size: e.target.value })}
                    className="w-full px-4 py-2 border border-input bg-card text-card-foreground rounded-lg"
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-card-foreground mb-2">
                    Price (optional)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={signalForm.price}
                    onChange={(e) => setSignalForm({ ...signalForm, price: e.target.value })}
                    className="w-full px-4 py-2 border border-input bg-card text-card-foreground rounded-lg"
                    placeholder="0.00"
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={submitting}
                className="px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50"
              >
                {submitting ? 'Submitting...' : 'Submit Signal'}
              </button>
            </form>
          </div>
          </>
        )}

        <div className="bg-card rounded-lg shadow-lg p-8 border border-border">
          <h2 className="text-2xl font-bold text-card-foreground mb-4 font-heading">Open Positions</h2>
          {positions.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">No open positions</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-2 text-card-foreground">Type</th>
                    <th className="text-left py-2 text-card-foreground">Asset</th>
                    <th className="text-right py-2 text-card-foreground">Size</th>
                    <th className="text-right py-2 text-card-foreground">Entry Price</th>
                    <th className="text-right py-2 text-card-foreground">Current Price</th>
                    <th className="text-right py-2 text-card-foreground">PnL</th>
                  </tr>
                </thead>
                <tbody>
                  {positions.map((position) => (
                    <tr key={position.id} className="border-b border-border">
                      <td className="py-2">
                        <span
                          className={`px-2 py-1 rounded ${
                            position.positionType === 'LONG'
                              ? 'bg-accent/50 text-primary'
                              : 'bg-destructive/10 text-destructive'
                          }`}
                        >
                          {position.positionType}
                        </span>
                      </td>
                      <td className="py-2 text-card-foreground">-</td>
                      <td className="text-right py-2 text-card-foreground">${position.size.toFixed(2)}</td>
                      <td className="text-right py-2 text-card-foreground">${position.entryPrice.toFixed(2)}</td>
                      <td className="text-right py-2 text-card-foreground">${position.currentPrice.toFixed(2)}</td>
                      <td
                        className={`text-right py-2 font-bold ${
                          position.pnl >= 0 ? 'text-primary' : 'text-destructive'
                        }`}
                      >
                        ${position.pnl.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

