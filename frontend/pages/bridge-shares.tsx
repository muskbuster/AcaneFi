import { useState, useEffect } from 'react';
import { useAccount, useChainId, useSwitchChain } from 'wagmi';
import { useWriteContract, useWaitForTransactionReceipt, useReadContract } from 'wagmi';
import { parseUnits, formatUnits, Address } from 'viem';
import { sepolia, baseSepolia } from 'wagmi/chains';
import { layerzeroApi } from '../lib/api';
import { getOFTAddress, OFT_ABI, addressToBytes32 } from '../lib/contracts';

export default function BridgeShares() {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const { switchChain } = useSwitchChain();
  const [shares, setShares] = useState('');
  const [destinationChain, setDestinationChain] = useState<'ethereum-sepolia' | 'base-sepolia'>('base-sepolia');
  const [oftAddress, setOftAddress] = useState<Address | null>(null);
  const [fee, setFee] = useState<bigint | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const { writeContract, data: txHash } = useWriteContract();
  const { isLoading: isPending } = useWaitForTransactionReceipt({ hash: txHash });

  useEffect(() => {
    loadOFTAddress();
  }, [chainId]);

  useEffect(() => {
    if (shares && oftAddress && destinationChain) {
      estimateFee();
    }
  }, [shares, oftAddress, destinationChain]);

  const loadOFTAddress = async () => {
    const chain = chainId === baseSepolia.id ? 'base-sepolia' : 'ethereum-sepolia';
    const address = await getOFTAddress(chain);
    setOftAddress(address);
  };

  const estimateFee = async () => {
    if (!oftAddress || !shares || !address) return;

    try {
      const dstConfig = await layerzeroApi.getConfig(destinationChain);
      const dstEid = dstConfig.endpointId;
      const recipientBytes32 = addressToBytes32(address as Address);

      // Estimate fee via contract
      // Note: This would need the full contract read
      // For now, set a placeholder
      setFee(parseUnits('0.001', 18)); // Estimate 0.001 ETH
    } catch (error) {
      console.error('Fee estimation error:', error);
    }
  };

  const handleBridge = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isConnected || !address || !oftAddress) {
      setError('Please connect your wallet');
      return;
    }

    if (!shares || parseFloat(shares) <= 0) {
      setError('Please enter a valid amount');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const dstConfig = await layerzeroApi.getConfig(destinationChain);
      const dstEid = dstConfig.endpointId;
      const recipientBytes32 = addressToBytes32(address as Address);
      const sharesAmount = parseUnits(shares, 18); // Assuming 18 decimals

      // Approve OFT first (if needed)
      // Then call send()
      writeContract({
        address: oftAddress,
        abi: OFT_ABI,
        functionName: 'send',
        args: [
          {
            dstEid,
            to: recipientBytes32,
            amountLD: sharesAmount,
            minAmountLD: sharesAmount,
          },
          {
            nativeFee: fee || BigInt(0),
            lzTokenFee: BigInt(0),
          },
          address, // refundTo
        ],
        value: fee || BigInt(0),
      });

      alert('Share bridging initiated! Shares will arrive on destination chain automatically.');
    } catch (err: any) {
      console.error('Bridge error:', err);
      setError(err.message || 'Failed to bridge shares');
    } finally {
      setLoading(false);
    }
  };

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-lg p-8 text-center">
          <h2 className="text-2xl font-bold mb-4">Connect Your Wallet</h2>
          <p className="text-gray-600">Please connect your wallet to bridge shares</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-12">
      <div className="container mx-auto px-4 max-w-2xl">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-6">Bridge Vault Shares</h1>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
              {error}
            </div>
          )}

          <form onSubmit={handleBridge} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Source Chain
              </label>
              <div className="flex gap-4">
                <button
                  type="button"
                  onClick={() => switchChain?.({ chainId: sepolia.id })}
                  className={`px-4 py-2 rounded-lg ${
                    chainId === sepolia.id
                      ? 'bg-primary-600 text-white'
                      : 'bg-gray-200 text-gray-700'
                  }`}
                >
                  Ethereum Sepolia
                </button>
                <button
                  type="button"
                  onClick={() => switchChain?.({ chainId: baseSepolia.id })}
                  className={`px-4 py-2 rounded-lg ${
                    chainId === baseSepolia.id
                      ? 'bg-primary-600 text-white'
                      : 'bg-gray-200 text-gray-700'
                  }`}
                >
                  Base Sepolia
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Destination Chain
              </label>
              <select
                value={destinationChain}
                onChange={(e) => setDestinationChain(e.target.value as 'ethereum-sepolia' | 'base-sepolia')}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
              >
                <option value="base-sepolia">Base Sepolia</option>
                <option value="ethereum-sepolia">Ethereum Sepolia</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Amount (Shares)
              </label>
              <input
                type="number"
                required
                min="0"
                step="0.000001"
                value={shares}
                onChange={(e) => setShares(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                placeholder="0.0"
              />
            </div>

            {fee && (
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-sm text-gray-600">
                  Estimated Fee: {formatUnits(fee, 18)} ETH
                </p>
              </div>
            )}

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-800">
                <strong>Note:</strong> Shares will be burned on source chain and minted on destination chain automatically via LayerZero.
              </p>
            </div>

            <button
              type="submit"
              disabled={loading || isPending || !oftAddress}
              className="w-full px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading || isPending ? 'Processing...' : 'Bridge Shares'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

