import { useState } from 'react';
import { useAccount, useSignMessage } from 'wagmi';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useRouter } from 'next/router';
import { teeApi } from '../../lib/api';
import Header from '../../components/Header';

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
      <div className="min-h-screen bg-background">
        <Header />
        <div className="flex items-center justify-center min-h-[calc(100vh-80px)]">
          <div className="bg-card rounded-lg shadow-lg p-8 text-center border border-border">
            <h2 className="text-2xl font-bold mb-4 text-card-foreground font-heading">Connect Your Wallet</h2>
            <p className="text-muted-foreground mb-6">Please connect your wallet to register as a trader</p>
            <ConnectButton />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="py-12">
      <div className="container mx-auto px-4 max-w-2xl">
        <div className="bg-card rounded-lg shadow-lg p-8 border border-border">
          <h1 className="text-3xl font-bold text-card-foreground mb-6 font-heading">Register as Trader</h1>

          {error && (
            <div className="bg-destructive/10 border border-destructive text-destructive px-4 py-3 rounded mb-6">
              <strong>Error:</strong> {error}
            </div>
          )}
          
          {loading && (
            <div className="bg-accent/50 border border-border text-accent-foreground px-4 py-3 rounded mb-6">
              Registering trader on-chain... This may take a few moments.
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-card-foreground mb-2">
                Trader Name
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-4 py-2 border border-input bg-card text-card-foreground rounded-lg focus:ring-2 focus:ring-ring focus:border-transparent"
                placeholder="e.g., Alpha Trader"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-card-foreground mb-2">
                Strategy Description
              </label>
              <textarea
                required
                value={formData.strategyDescription}
                onChange={(e) =>
                  setFormData({ ...formData, strategyDescription: e.target.value })
                }
                rows={4}
                className="w-full px-4 py-2 border border-input bg-card text-card-foreground rounded-lg focus:ring-2 focus:ring-ring focus:border-transparent"
                placeholder="Describe your trading strategy..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-card-foreground mb-2">
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
                className="w-full px-4 py-2 border border-input bg-card text-card-foreground rounded-lg focus:ring-2 focus:ring-ring focus:border-transparent"
              />
            </div>

            <div className="bg-accent/50 border border-border rounded-lg p-4">
              <p className="text-sm text-accent-foreground">
                <strong>Note:</strong> Registration requires TEE validation. Your trader ID will be
                assigned upon successful registration.
              </p>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Registering...' : 'Register Trader'}
            </button>
          </form>
        </div>
        </div>
      </div>
    </div>
  );
}

