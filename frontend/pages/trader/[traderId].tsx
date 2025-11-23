import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAccount, useSignMessage, useChainId, useSwitchChain, useReadContract } from 'wagmi';
import { teeApi, tradeApi, cctpApi } from '../../lib/api';
import { baseSepolia } from 'wagmi/chains';
import { getUSDCAddress, USDC_ABI, getUnifiedVaultAddress, UNIFIED_VAULT_ABI } from '../../lib/contracts';
import { formatUnits } from 'viem';

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
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </div>
      </div>
    );
  }

  if (!trader) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-lg p-8 text-center">
          <h2 className="text-2xl font-bold mb-4">Trader Not Found</h2>
          <button
            onClick={() => router.push('/')}
            className="px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
          >
            Go Home
          </button>
        </div>
      </div>
    );
  }

  const totalPnl = positions.reduce((sum, pos) => sum + pos.pnl, 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-12">
      <div className="container mx-auto px-4 max-w-6xl">
        <div className="bg-white rounded-lg shadow-lg p-8 mb-6">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">{trader.name}</h1>
              <p className="text-gray-600">{trader.strategyDescription}</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-500">Performance Fee</p>
              <p className="text-2xl font-bold text-primary-600">{trader.performanceFee}%</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-blue-50 rounded-lg p-4">
              <p className="text-sm text-gray-600">Total Positions</p>
              <p className="text-2xl font-bold">{positions.length}</p>
            </div>
            <div className="bg-green-50 rounded-lg p-4">
              <p className="text-sm text-gray-600">Total PnL</p>
              <p className={`text-2xl font-bold ${totalPnl >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                ${totalPnl.toFixed(2)}
              </p>
            </div>
            <div className="bg-purple-50 rounded-lg p-4">
              <p className="text-sm text-gray-600">Trader ID</p>
              <p className="text-2xl font-bold">#{trader.traderId}</p>
            </div>
            <div className="bg-yellow-50 rounded-lg p-4">
              <p className="text-sm text-gray-600">TEE Wallet Balance</p>
              <p className="text-2xl font-bold text-yellow-600">{teeBalance} USDC</p>
            </div>
          </div>
        </div>

        {/* CCTP Receive Section - Available to all users */}
        <div className="bg-white rounded-lg shadow-lg p-8 mb-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Receive CCTP Deposit</h2>
          <p className="text-gray-600 mb-4">
            Complete CCTP deposits from Ethereum Sepolia to Base Sepolia. Enter the burn transaction hash to fetch attestation and receive USDC.
          </p>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                CCTP Burn Transaction Hash (Ethereum Sepolia)
              </label>
              <input
                type="text"
                value={cctpTransactionHash}
                onChange={(e) => setCctpTransactionHash(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                placeholder="0x..."
                disabled={!!cctpAttestation}
              />
            </div>

            {!cctpAttestation && (
              <button
                onClick={handleFetchCCTPAttestation}
                disabled={fetchingAttestation || !cctpTransactionHash}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
              >
                {fetchingAttestation ? 'Fetching Attestation...' : 'Fetch Attestation'}
              </button>
            )}

            {cctpAttestation && (
              <>
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <p className="text-sm text-green-800">
                    ✅ Attestation retrieved! Status: {cctpAttestation.status}
                  </p>
                </div>
                <button
                  onClick={handleReceiveCCTP}
                  disabled={receivingCCTP || chainId !== baseSepolia.id}
                  className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition disabled:opacity-50"
                >
                  {chainId !== baseSepolia.id
                    ? 'Switch to Base Sepolia to Receive'
                    : receivingCCTP
                    ? 'Receiving USDC...'
                    : 'Receive USDC on Base Sepolia'}
                </button>
              </>
            )}

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
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
          <div className="bg-white rounded-lg shadow-lg p-8 mb-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Submit Trading Signal</h2>
            <form onSubmit={handleSubmitSignal} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Signal Type
                  </label>
                  <select
                    value={signalForm.signalType}
                    onChange={(e) =>
                      setSignalForm({ ...signalForm, signalType: e.target.value as 'LONG' | 'SHORT' })
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  >
                    <option value="LONG">LONG</option>
                    <option value="SHORT">SHORT</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Asset</label>
                  <input
                    type="text"
                    required
                    value={signalForm.asset}
                    onChange={(e) => setSignalForm({ ...signalForm, asset: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                    placeholder="e.g., ETH"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Size</label>
                  <input
                    type="number"
                    required
                    min="0"
                    value={signalForm.size}
                    onChange={(e) => setSignalForm({ ...signalForm, size: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Price (optional)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={signalForm.price}
                    onChange={(e) => setSignalForm({ ...signalForm, price: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                    placeholder="0.00"
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={submitting}
                className="px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
              >
                {submitting ? 'Submitting...' : 'Submit Signal'}
              </button>
            </form>
          </div>
        )}

        <div className="bg-white rounded-lg shadow-lg p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Open Positions</h2>
          {positions.length === 0 ? (
            <p className="text-gray-600 text-center py-8">No open positions</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2">Type</th>
                    <th className="text-left py-2">Asset</th>
                    <th className="text-right py-2">Size</th>
                    <th className="text-right py-2">Entry Price</th>
                    <th className="text-right py-2">Current Price</th>
                    <th className="text-right py-2">PnL</th>
                  </tr>
                </thead>
                <tbody>
                  {positions.map((position) => (
                    <tr key={position.id} className="border-b">
                      <td className="py-2">
                        <span
                          className={`px-2 py-1 rounded ${
                            position.positionType === 'LONG'
                              ? 'bg-green-100 text-green-800'
                              : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {position.positionType}
                        </span>
                      </td>
                      <td className="py-2">-</td>
                      <td className="text-right py-2">${position.size.toFixed(2)}</td>
                      <td className="text-right py-2">${position.entryPrice.toFixed(2)}</td>
                      <td className="text-right py-2">${position.currentPrice.toFixed(2)}</td>
                      <td
                        className={`text-right py-2 font-bold ${
                          position.pnl >= 0 ? 'text-green-600' : 'text-red-600'
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

