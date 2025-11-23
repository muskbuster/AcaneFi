import { useState } from 'react';
import { useAccount, useSignMessage } from 'wagmi';
import { teeApi } from '../lib/api';
import { parseUnits } from 'viem';

interface CreatePositionFormProps {
  traderId: number;
  traderAddress: string;
  onSuccess?: () => void;
}

export default function CreatePositionForm({ traderId, traderAddress, onSuccess }: CreatePositionFormProps) {
  const { address, isConnected } = useAccount();
  const { signMessageAsync } = useSignMessage();
  const [tokenType, setTokenType] = useState<'ETH' | 'WBTC' | 'ZEC'>('ETH');
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

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
    <form onSubmit={handleCreatePosition} className="space-y-4">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Token Type
          </label>
          <select
            value={tokenType}
            onChange={(e) => setTokenType(e.target.value as 'ETH' | 'WBTC' | 'ZEC')}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg"
          >
            <option value="ETH">ETH</option>
            <option value="WBTC">WBTC</option>
            <option value="ZEC">ZEC</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Amount (USDC)
          </label>
          <input
            type="number"
            required
            min="0"
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg"
            placeholder="0.00"
          />
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm text-blue-800">
          <strong>Note:</strong> The TEE will fetch current prices from CoinGecko, update the MockUniswap contract,
          and execute the swap using the TEE wallet (CDP wallet). You need to sign a message to verify you are the trader.
        </p>
      </div>

      <button
        type="submit"
        disabled={loading || !amount}
        className="w-full px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
      >
        {loading ? 'Creating Position...' : 'Create Position'}
      </button>
    </form>
  );
}

