import { useState } from 'react';
import { useAccount, useChainId } from 'wagmi';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { baseSepolia } from 'wagmi/chains';
import { cctpApi } from '../lib/api';
import Header from '../components/Header';

export default function ReceiveCCTP() {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const [transactionHash, setTransactionHash] = useState('');
  const [sourceDomain, setSourceDomain] = useState('0'); // Ethereum Sepolia = 0
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [attestation, setAttestation] = useState<any>(null);


  const handleFetchAttestation = async () => {
    if (!transactionHash || !sourceDomain) {
      setError('Please enter transaction hash and source domain');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Poll for attestation
      const result = await cctpApi.pollAttestation(
        parseInt(sourceDomain),
        transactionHash,
        30, // max attempts
        5000 // 5 second intervals
      );

      setAttestation(result);
      alert('Attestation retrieved! You can now complete the mint.');
    } catch (err: any) {
      console.error('Attestation error:', err);
      setError(err.message || 'Failed to fetch attestation');
    } finally {
      setLoading(false);
    }
  };

  const handleReceiveUSDC = async () => {
    if (!attestation || !address) {
      setError('Please fetch attestation first');
      return;
    }

    if (chainId !== baseSepolia.id) {
      setError('Please switch to Base Sepolia first');
      return;
    }

    // Validate attestation structure
    if (!attestation.message || !attestation.attestation) {
      setError('Invalid attestation data. Please fetch attestation again.');
      console.error('Invalid attestation structure:', attestation);
      return;
    }

    // Validate hex strings
    if (typeof attestation.message !== 'string' || typeof attestation.attestation !== 'string') {
      setError('Attestation message and attestation must be strings');
      console.error('Invalid attestation types:', {
        messageType: typeof attestation.message,
        attestationType: typeof attestation.attestation,
      });
      return;
    }

    if (!attestation.message.startsWith('0x') || !attestation.attestation.startsWith('0x')) {
      setError('Attestation message and attestation must be hex strings starting with 0x');
      return;
    }

    setLoading(true);
    setError('');

    try {
      console.log('📤 Receiving USDC with attestation:', {
        message: attestation.message.substring(0, 30) + '...',
        attestation: attestation.attestation.substring(0, 30) + '...',
        messageLength: attestation.message.length,
        attestationLength: attestation.attestation.length,
      });

      // Use API endpoint which uses CDP wallet
      const result = await cctpApi.receiveBridgedUSDC(
        attestation.message,
        attestation.attestation
      );

      console.log('✅ Receive result:', result);

      if (result.success) {
        alert(`USDC received successfully! Transaction: ${result.transactionHash}`);
        setTransactionHash('');
        setAttestation(null);
      } else {
        setError(result.error || 'Failed to receive USDC');
      }
    } catch (err: any) {
      console.error('❌ Receive error:', err);
      console.error('Error details:', {
        message: err.message,
        response: err.response?.data,
        status: err.response?.status,
      });
      setError(err.message || 'Failed to receive USDC');
    } finally {
      setLoading(false);
    }
  };

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="bg-card rounded-lg shadow-lg p-8 text-center border border-border">
          <h2 className="text-2xl font-bold mb-4 text-card-foreground font-heading">Connect Your Wallet</h2>
          <p className="text-muted-foreground mb-6">Please connect your wallet to receive bridged USDC</p>
          <ConnectButton />
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
          <h1 className="text-3xl font-bold text-card-foreground mb-6 font-heading">Receive CCTP Deposit</h1>

          {error && (
            <div className="bg-destructive/10 border border-destructive text-destructive px-4 py-3 rounded mb-6">
              {error}
            </div>
          )}

          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-card-foreground mb-2">
                Source Domain (Ethereum Sepolia = 0)
              </label>
              <input
                type="text"
                value={sourceDomain}
                onChange={(e) => setSourceDomain(e.target.value)}
                className="w-full px-4 py-2 border border-input bg-card text-card-foreground rounded-lg"
                placeholder="0"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-card-foreground mb-2">
                Burn Transaction Hash
              </label>
              <input
                type="text"
                value={transactionHash}
                onChange={(e) => setTransactionHash(e.target.value)}
                className="w-full px-4 py-2 border border-input bg-card text-card-foreground rounded-lg"
                placeholder="0x..."
              />
            </div>

            <button
              onClick={handleFetchAttestation}
              disabled={loading || !transactionHash}
              className="w-full px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition disabled:opacity-50"
            >
              {loading ? 'Fetching Attestation...' : 'Fetch Attestation'}
            </button>

            {attestation && (
              <>
                <div className="bg-accent/50 border border-border rounded-lg p-4">
                  <p className="text-sm text-accent-foreground">
                    ✅ Attestation retrieved! Status: {attestation.status}
                  </p>
                </div>

                <button
                  onClick={handleReceiveUSDC}
                  disabled={loading || chainId !== baseSepolia.id}
                  className="w-full px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition disabled:opacity-50"
                >
                  {chainId !== baseSepolia.id
                    ? 'Switch to Base Sepolia'
                    : 'Receive USDC on Base Sepolia'}
                </button>
              </>
            )}

            <div className="bg-accent/50 border border-border rounded-lg p-4">
              <p className="text-sm text-accent-foreground">
                <strong>Instructions:</strong>
                <br />
                1. Enter the transaction hash from your CCTP burn on Ethereum Sepolia
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
        </div>
      </div>
    </div>
  );
}
