import { useState } from 'react';
import { useAccount, useChainId, useSwitchChain } from 'wagmi';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { baseSepolia } from 'wagmi/chains';
import { rariApi } from '../lib/api';
import Header from '../components/Header';

// Rari Testnet Chain ID
const RARI_CHAIN_ID = 1918988905;

export default function ReceiveRari() {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const { switchChain } = useSwitchChain();
  const [amount, setAmount] = useState('');
  const [nonce, setNonce] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [attestation, setAttestation] = useState<any>(null);
  const [receiving, setReceiving] = useState(false);

  const handleGetAttestation = async () => {
    if (!amount || !nonce) {
      setError('Please enter amount and nonce');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const depositAmount = parseFloat(amount);
      if (isNaN(depositAmount) || depositAmount <= 0) {
        setError('Amount must be a positive number');
        setLoading(false);
        return;
      }

      // Convert to wei (6 decimals for USDC)
      const amountInWei = BigInt(Math.floor(depositAmount * 1000000)).toString();

      const result = await rariApi.getAttestation(amountInWei, nonce);

      if (result.success) {
        setAttestation(result.attestation);
        alert('Attestation retrieved! You can now receive USDC on Base Sepolia.');
      } else {
        setError(result.error || 'Failed to get attestation');
      }
    } catch (err: any) {
      console.error('Attestation error:', err);
      setError(err.message || 'Failed to fetch attestation');
    } finally {
      setLoading(false);
    }
  };

  const handleReceiveUSDC = async () => {
    if (!attestation || !amount || !nonce) {
      setError('Please get attestation first');
      return;
    }

    if (chainId !== baseSepolia.id) {
      setError('Please switch to Base Sepolia first');
      try {
        switchChain?.({ chainId: baseSepolia.id });
      } catch (switchErr) {
        console.error('Failed to switch chain:', switchErr);
      }
      return;
    }

    setReceiving(true);
    setError('');

    try {
      // Convert to wei (6 decimals for USDC)
      const amountInWei = BigInt(Math.floor(parseFloat(amount) * 1000000)).toString();

      const result = await rariApi.verifyAndReceive({
        amount: amountInWei,
        nonce,
        sourceChainId: RARI_CHAIN_ID.toString(),
        signature: attestation.signature,
      });

      if (result.success) {
        alert(`USDC received successfully! Transaction: ${result.transactionHash}`);
        // Reset form
        setAmount('');
        setNonce('');
        setAttestation(null);
      } else {
        setError(result.error || 'Failed to receive USDC');
      }
    } catch (err: any) {
      console.error('Receive error:', err);
      setError(err.message || 'Failed to receive USDC');
    } finally {
      setReceiving(false);
    }
  };

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="flex items-center justify-center min-h-[calc(100vh-80px)]">
          <div className="bg-card rounded-lg shadow-lg p-8 text-center border border-border">
            <h2 className="text-2xl font-bold mb-4 text-card-foreground font-heading">Connect Your Wallet</h2>
            <p className="text-muted-foreground mb-6">Please connect your wallet to receive Rari deposits</p>
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
          <h1 className="text-3xl font-bold text-card-foreground mb-6 font-heading">Receive Rari Deposit</h1>

          {error && (
            <div className="bg-destructive/10 border border-destructive text-destructive px-4 py-3 rounded mb-6">
              {error}
            </div>
          )}

          {/* Chain Status and Switcher */}
          <div className="mb-6 p-4 bg-accent/50 rounded-lg border border-border">
            <p className="text-sm font-medium text-accent-foreground mb-2">
              Current Chain: <span className="font-bold">{chainId === baseSepolia.id ? 'Base Sepolia ✅' : `Chain ID ${chainId} (Switch to Base Sepolia)`}</span>
            </p>
            {chainId !== baseSepolia.id && (
              <button
                onClick={() => switchChain?.({ chainId: baseSepolia.id })}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition disabled:opacity-50"
                disabled={loading || receiving}
              >
                Switch to Base Sepolia
              </button>
            )}
            {chainId === baseSepolia.id && (
              <p className="text-sm text-primary mt-2">✅ Connected to Base Sepolia - Ready to receive USDC</p>
            )}
          </div>

          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-card-foreground mb-2">
                Amount (USDC)
              </label>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full px-4 py-2 border border-input bg-card text-card-foreground rounded-lg"
                placeholder="1.0"
                step="0.01"
                min="0"
                disabled={!!attestation}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-card-foreground mb-2">
                Nonce
              </label>
              <input
                type="text"
                value={nonce}
                onChange={(e) => setNonce(e.target.value)}
                className="w-full px-4 py-2 border border-input bg-card text-card-foreground rounded-lg"
                placeholder="Enter nonce from deposit"
                disabled={!!attestation}
              />
            </div>

            {!attestation ? (
              <button
                onClick={handleGetAttestation}
                disabled={loading || !amount || !nonce}
                className="w-full px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition disabled:opacity-50"
              >
                {loading ? 'Getting Attestation...' : 'Get Attestation'}
              </button>
            ) : (
              <>
                <div className="bg-accent/50 border border-border rounded-lg p-4">
                  <p className="text-sm text-accent-foreground">
                    ✅ Attestation retrieved!
                  </p>
                  <p className="text-xs text-muted-foreground mt-2">
                    Amount: {amount} USDC
                    <br />
                    Nonce: {nonce}
                    <br />
                    Source Chain: Rari Testnet ({RARI_CHAIN_ID})
                  </p>
                </div>

                <button
                  onClick={handleReceiveUSDC}
                  disabled={receiving || chainId !== baseSepolia.id}
                  className="w-full px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition disabled:opacity-50"
                >
                  {chainId !== baseSepolia.id
                    ? 'Switch to Base Sepolia to Receive'
                    : receiving
                    ? 'Receiving USDC...'
                    : 'Receive USDC on Base Sepolia'}
                </button>
              </>
            )}

            <div className="bg-accent/50 border border-border rounded-lg p-4">
              <p className="text-sm text-accent-foreground">
                <strong>Instructions:</strong>
                <br />
                1. Enter the amount and nonce from your Rari deposit
                <br />
                2. Click "Get Attestation" to retrieve TEE signature
                <br />
                3. Switch to Base Sepolia and click "Receive USDC"
                <br />
                4. USDC will be transferred to TEE wallet on Base Sepolia
              </p>
            </div>
          </div>
        </div>
        </div>
      </div>
    </div>
  );
}
