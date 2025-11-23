import { useState, useEffect } from 'react';
import { useAccount, useSignMessage } from 'wagmi';
import { teeApi } from '../lib/api';
import { parseUnits } from 'viem';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface CreatePositionFormProps {
  traderId: number;
  traderAddress: string;
  onSuccess?: () => void;
}

interface PriceData {
  time: string;
  price: number;
}

// CoinGecko token ID mapping
const TOKEN_IDS: Record<'ETH' | 'WBTC' | 'ZEC', string> = {
  ETH: 'ethereum',
  WBTC: 'wrapped-bitcoin',
  ZEC: 'zcash',
};

export default function CreatePositionForm({ traderId, traderAddress, onSuccess }: CreatePositionFormProps) {
  const { address, isConnected } = useAccount();
  const { signMessageAsync } = useSignMessage();
  const [tokenType, setTokenType] = useState<'ETH' | 'WBTC' | 'ZEC'>('ETH');
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [priceData, setPriceData] = useState<PriceData[]>([]);
  const [currentPrice, setCurrentPrice] = useState<number | null>(null);
  const [loadingPrice, setLoadingPrice] = useState(false);

  // Fetch price data from CoinGecko
  useEffect(() => {
    const fetchPriceData = async () => {
      setLoadingPrice(true);
      try {
        const tokenId = TOKEN_IDS[tokenType];
        
        // Fetch current price
        const currentPriceResponse = await fetch(
          `https://api.coingecko.com/api/v3/simple/price?ids=${tokenId}&vs_currencies=usd`
        );
        if (currentPriceResponse.ok) {
          const currentData = await currentPriceResponse.json();
          const price = currentData[tokenId]?.usd;
          if (price) {
            setCurrentPrice(price);
          }
        }

        // Fetch historical price data (last 7 days)
        const endTime = Math.floor(Date.now() / 1000);
        const startTime = endTime - 7 * 24 * 60 * 60; // 7 days ago
        
        const historyResponse = await fetch(
          `https://api.coingecko.com/api/v3/coins/${tokenId}/market_chart/range?vs_currency=usd&from=${startTime}&to=${endTime}`
        );
        
        if (historyResponse.ok) {
          const historyData = await historyResponse.json();
          if (historyData.prices && Array.isArray(historyData.prices)) {
            // Format data for chart (sample every 6 hours to reduce data points)
            const formattedData: PriceData[] = historyData.prices
              .filter((_: any, index: number) => index % 4 === 0) // Sample every 4th point (6 hours)
              .map(([timestamp, price]: [number, number]) => ({
                time: new Date(timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
                price: Number(price.toFixed(2)),
              }));
            setPriceData(formattedData);
          }
        }
      } catch (err) {
        console.error('Failed to fetch price data:', err);
        setError('Failed to load price data');
      } finally {
        setLoadingPrice(false);
      }
    };

    fetchPriceData();
    // Refresh price data every 30 seconds
    const interval = setInterval(fetchPriceData, 30000);
    return () => clearInterval(interval);
  }, [tokenType]);

  const handleCreatePosition = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isConnected || !address || address.toLowerCase() !== traderAddress.toLowerCase()) {
      setError('Only the trader can create positions');
      return;
    }

    if (!amount || parseFloat(amount) <= 0) {
      setError('Please enter a valid amount');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Sign message for attestation
      const message = `ArcaneFi: Create position for trader ${traderId}`;
      const signature = await signMessageAsync({ message });

      // Call TEE API to create position
      const result = await teeApi.createPosition({
        traderId,
        traderAddress,
        signature,
        tokenType,
        amountIn: parseUnits(amount, 6).toString(), // USDC has 6 decimals
      });

      if (result.success) {
        alert(`Position created successfully! Transaction: ${result.transactionHash}`);
        setAmount('');
        if (onSuccess) {
          onSuccess();
        }
      } else {
        setError(result.error || 'Failed to create position');
      }
    } catch (err: any) {
      console.error('Create position error:', err);
      setError(err.response?.data?.error || err.message || 'Failed to create position');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Price Chart Section */}
      <div className="bg-card border border-border rounded-lg p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-card-foreground font-heading">
            {tokenType} Price Chart (7 Days)
          </h3>
          {currentPrice !== null && (
            <div className="text-right">
              <p className="text-sm text-muted-foreground">Current Price</p>
              <p className="text-2xl font-bold text-primary">
                ${currentPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>
          )}
        </div>
        
        {loadingPrice ? (
          <div className="h-64 flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : priceData.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={priceData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis 
                dataKey="time" 
                tick={{ fontSize: 12, fill: 'var(--muted-foreground)' }}
                interval="preserveStartEnd"
              />
              <YAxis 
                tick={{ fontSize: 12, fill: 'var(--muted-foreground)' }}
                domain={['auto', 'auto']}
                tickFormatter={(value) => `$${value.toLocaleString()}`}
              />
              <Tooltip 
                formatter={(value: number) => [`$${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 'Price']}
                labelStyle={{ color: 'var(--card-foreground)' }}
                contentStyle={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)', borderRadius: '8px', color: 'var(--card-foreground)' }}
              />
              <Line 
                type="monotone" 
                dataKey="price" 
                stroke="var(--primary)" 
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-64 flex items-center justify-center text-muted-foreground">
            No price data available
          </div>
        )}
      </div>

      {/* Position Creation Form */}
      <form onSubmit={handleCreatePosition} className="space-y-4">
        {error && (
          <div className="bg-destructive/10 border border-destructive text-destructive px-4 py-3 rounded">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-card-foreground mb-2">
              Token Type
            </label>
            <select
              value={tokenType}
              onChange={(e) => {
                setTokenType(e.target.value as 'ETH' | 'WBTC' | 'ZEC');
                setPriceData([]); // Clear old data when switching tokens
              }}
              className="w-full px-4 py-2 border border-input bg-card text-card-foreground rounded-lg focus:ring-2 focus:ring-ring focus:border-transparent"
            >
              <option value="ETH" className="bg-card text-card-foreground">ETH (Ethereum)</option>
              <option value="WBTC" className="bg-card text-card-foreground">WBTC (Wrapped Bitcoin)</option>
              <option value="ZEC" className="bg-card text-card-foreground">ZEC (Zcash)</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-card-foreground mb-2">
              Amount (USDC)
            </label>
            <input
              type="number"
              required
              min="0"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full px-4 py-2 border border-input bg-card text-card-foreground rounded-lg focus:ring-2 focus:ring-ring focus:border-transparent"
              placeholder="0.00"
            />
            {currentPrice !== null && amount && parseFloat(amount) > 0 && (
              <p className="text-xs text-muted-foreground mt-1">
                ≈ {(parseFloat(amount) / currentPrice).toFixed(6)} {tokenType}
              </p>
            )}
          </div>
        </div>

        <div className="bg-accent/50 border border-border rounded-lg p-4">
          <p className="text-sm text-accent-foreground">
            <strong>Note:</strong> The TEE will fetch current prices from CoinGecko, update the MockUniswap contract,
            and execute the swap using the TEE wallet (CDP wallet). You need to sign a message to verify you are the trader.
          </p>
        </div>

        <button
          type="submit"
          disabled={loading || !amount || loadingPrice}
          className="w-full px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Creating Position...' : 'Create Position'}
        </button>
      </form>
    </div>
  );
}

