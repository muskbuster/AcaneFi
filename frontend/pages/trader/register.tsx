import { useState } from 'react';
import { useAccount, useSignMessage } from 'wagmi';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useRouter } from 'next/router';
import { teeApi } from '../../lib/api';

export default function TraderRegister() {
  const { address, isConnected } = useAccount();
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: '',
    strategyDescription: '',
    performanceFee: '20',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const { signMessageAsync } = useSignMessage();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isConnected || !address) {
      setError('Please connect your wallet');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Register trader via TEE (backend calls VaultFactory contract)
      const result = await teeApi.registerTrader({
        address,
        name: formData.name,
        strategyDescription: formData.strategyDescription,
        performanceFee: parseFloat(formData.performanceFee),
      });

      if (result.success) {
        // Show success message with transaction hash if available
        const successMessage = result.transactionHash
          ? `Trader registered successfully!\n\nTrader ID: ${result.traderId}\nTransaction: ${result.transactionHash}\n\nView on BaseScan: https://sepolia.basescan.org/tx/${result.transactionHash}`
          : `Trader registered successfully!\n\nTrader ID: ${result.traderId}`;
        
        console.log('✅ Trader registered:', result);
        if (result.transactionHash) {
          console.log('   Transaction:', result.transactionHash);
          console.log('   BaseScan:', `https://sepolia.basescan.org/tx/${result.transactionHash}`);
        }
        
        // Show success alert
        alert(successMessage);
        
        // Navigate to trader page
        router.push(`/trader/${result.traderId}`);
      } else {
        setError(result.error || 'Registration failed');
      }
    } catch (err: any) {
      console.error('Registration error:', err);
      const errorMessage = err.response?.data?.error || err.message || 'Failed to register trader';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-lg p-8 text-center">
          <h2 className="text-2xl font-bold mb-4">Connect Your Wallet</h2>
          <p className="text-gray-600 mb-6">Please connect your wallet to register as a trader</p>
          <ConnectButton />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-12">
      <div className="container mx-auto px-4 max-w-2xl">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-6">Register as Trader</h1>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
              <strong>Error:</strong> {error}
            </div>
          )}
          
          {loading && (
            <div className="bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded mb-6">
              Registering trader on-chain... This may take a few moments.
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Trader Name
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="e.g., Alpha Trader"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Strategy Description
              </label>
              <textarea
                required
                value={formData.strategyDescription}
                onChange={(e) =>
                  setFormData({ ...formData, strategyDescription: e.target.value })
                }
                rows={4}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="Describe your trading strategy..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Performance Fee (%)
              </label>
              <input
                type="number"
                required
                min="0"
                max="100"
                value={formData.performanceFee}
                onChange={(e) =>
                  setFormData({ ...formData, performanceFee: e.target.value })
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-800">
                <strong>Note:</strong> Registration requires TEE validation. Your trader ID will be
                assigned upon successful registration.
              </p>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Registering...' : 'Register Trader'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

