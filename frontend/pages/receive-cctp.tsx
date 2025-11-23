import { useState } from 'react';
import { useAccount, useChainId } from 'wagmi';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { baseSepolia } from 'wagmi/chains';
import { cctpApi } from '../lib/api';

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
      setError('Please switch to Base Sepolia');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Use API endpoint which uses CDP wallet
      const result = await cctpApi.receiveBridgedUSDC(
        attestation.message,
        attestation.attestation
      );

      if (result.success) {
        alert(`USDC received successfully! Transaction: ${result.transactionHash}`);
        setTransactionHash('');
        setAttestation(null);
      } else {
        setError(result.error || 'Failed to receive USDC');
      }
    } catch (err: any) {
      console.error('Receive error:', err);
      setError(err.message || 'Failed to receive USDC');
    } finally {
      setLoading(false);
    }
  };

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-lg p-8 text-center">
          <h2 className="text-2xl font-bold mb-4">Connect Your Wallet</h2>
          <p className="text-gray-600 mb-6">Please connect your wallet to receive bridged USDC</p>
          <ConnectButton />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-12">
      <div className="container mx-auto px-4 max-w-2xl">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-6">Receive CCTP Deposit</h1>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
              {error}
            </div>
          )}

          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Source Domain (Ethereum Sepolia = 0)
              </label>
              <input
                type="text"
                value={sourceDomain}
                onChange={(e) => setSourceDomain(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                placeholder="0"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Burn Transaction Hash
              </label>
              <input
                type="text"
                value={transactionHash}
                onChange={(e) => setTransactionHash(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                placeholder="0x..."
              />
            </div>

            <button
              onClick={handleFetchAttestation}
              disabled={loading || !transactionHash}
              className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
            >
              {loading ? 'Fetching Attestation...' : 'Fetch Attestation'}
            </button>

            {attestation && (
              <>
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <p className="text-sm text-green-800">
                    ✅ Attestation retrieved! Status: {attestation.status}
                  </p>
                </div>

                <button
                  onClick={handleReceiveUSDC}
                  disabled={loading || chainId !== baseSepolia.id}
                  className="w-full px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition disabled:opacity-50"
                >
                  {chainId !== baseSepolia.id
                    ? 'Switch to Base Sepolia'
                    : 'Receive USDC on Base Sepolia'}
                </button>
              </>
            )}

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-800">
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
  );
}

