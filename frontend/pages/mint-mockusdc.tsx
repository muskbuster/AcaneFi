import { useState, useEffect } from 'react';
import { useAccount, useChainId, useSwitchChain, useWriteContract, useWaitForTransactionReceipt, useReadContract } from 'wagmi';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { parseUnits, formatUnits } from 'viem';
import Header from '../components/Header';

const RARI_CHAIN_ID = 1918988905;
const MOCK_USDC_RARI = process.env.NEXT_PUBLIC_MOCK_USDC_RARI as `0x${string}` || '0xec690C24B7451B85B6167a06292e49B5DA822fBE';

const MOCK_USDC_ABI = [
  {
    name: 'mint',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'to', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [],
  },
  {
    name: 'balanceOf',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'decimals',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint8' }],
  },
] as const;

export default function MintMockUSDC() {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const { switchChain } = useSwitchChain();
  const [amount, setAmount] = useState('100');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const { writeContract, data: txHash } = useWriteContract();
  const { isLoading: isPending, isSuccess } = useWaitForTransactionReceipt({ hash: txHash });

  const { data: balance, refetch: refetchBalance } = useReadContract({
    address: MOCK_USDC_RARI,
    abi: MOCK_USDC_ABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    chainId: RARI_CHAIN_ID,
    query: {
      enabled: !!address && chainId === RARI_CHAIN_ID,
    },
  });

  // Reset loading state when transaction completes
  useEffect(() => {
    if (isSuccess || (txHash && !isPending)) {
      setLoading(false);
      if (isSuccess) {
        refetchBalance();
        setAmount('100'); // Reset to default
      }
    }
  }, [isSuccess, isPending, txHash, refetchBalance]);

  const handleMint = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isConnected || !address) {
      setError('Please connect your wallet');
      return;
    }

    if (chainId !== RARI_CHAIN_ID) {
      setError('Please switch to Rari Testnet');
      switchChain?.({ chainId: RARI_CHAIN_ID });
      return;
    }

    if (!amount || parseFloat(amount) <= 0) {
      setError('Please enter a valid amount');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // MockUSDC uses 6 decimals (like real USDC)
      // Contract: function mint(address to, uint256 amount) external
      const amountInWei = parseUnits(amount, 6);

      writeContract({
        address: MOCK_USDC_RARI,
        abi: MOCK_USDC_ABI,
        functionName: 'mint',
        args: [address, amountInWei],
        chainId: RARI_CHAIN_ID,
      });
    } catch (err: any) {
      console.error('Mint error:', err);
      setError(err.message || 'Failed to mint MockUSDC');
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
            <p className="text-muted-foreground mb-6">Please connect your wallet to mint MockUSDC</p>
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
            <h1 className="text-3xl font-bold text-card-foreground mb-6 font-heading">Mint MockUSDC (Rari Testnet)</h1>

            {error && (
              <div className="bg-destructive/10 border border-destructive text-destructive px-4 py-3 rounded mb-6">
                {error}
              </div>
            )}

            {isSuccess && (
              <div className="bg-accent/50 border border-border text-accent-foreground px-4 py-3 rounded mb-6">
                ✅ MockUSDC minted successfully! Transaction: {txHash && `${txHash.slice(0, 10)}...${txHash.slice(-8)}`}
              </div>
            )}

            {/* Chain Status */}
            <div className="mb-6 bg-accent/50 border border-border rounded-lg p-4">
              <p className="text-sm font-medium text-accent-foreground mb-2">
                Current Chain: <span className="font-bold">
                  {chainId === RARI_CHAIN_ID ? 'Rari Testnet ✅' : `Chain ID ${chainId} (Switch to Rari Testnet)`}
                </span>
              </p>
              {chainId !== RARI_CHAIN_ID && (
                <button
                  onClick={() => switchChain?.({ chainId: RARI_CHAIN_ID })}
                  className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition disabled:opacity-50 text-sm"
                  disabled={loading || isPending}
                >
                  Switch to Rari Testnet
                </button>
              )}
              {chainId === RARI_CHAIN_ID && (
                <p className="text-sm text-primary mt-2">✅ Connected to Rari Testnet - Ready to mint</p>
              )}
            </div>

            {/* Balance Display */}
            {chainId === RARI_CHAIN_ID && balance !== undefined && (
              <div className="mb-6 bg-muted rounded-lg p-4">
                <p className="text-sm text-muted-foreground">
                  Your MockUSDC Balance: <span className="font-bold text-card-foreground">{formatUnits(balance, 6)} USDC</span>
                </p>
              </div>
            )}

            <form onSubmit={handleMint} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-card-foreground mb-2">
                  Amount to Mint (USDC)
                </label>
                <input
                  type="number"
                  required
                  min="0"
                  step="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full px-4 py-2 border border-input bg-card text-card-foreground rounded-lg focus:ring-2 focus:ring-ring focus:border-transparent"
                  placeholder="100.00"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  MockUSDC uses 6 decimals (like real USDC)
                </p>
              </div>

              <div className="bg-accent/50 border border-border rounded-lg p-4">
                <p className="text-sm text-accent-foreground">
                  <strong>Note:</strong> This mints MockUSDC on Rari Testnet for testing purposes. For real USDC on other testnets, use the{' '}
                  <a
                    href="https://faucet.circle.com/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline font-semibold"
                  >
                    Circle USDC Faucet
                  </a>
                  .
                </p>
              </div>

              <button
                type="submit"
                disabled={loading || isPending || chainId !== RARI_CHAIN_ID}
                className="w-full px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading || isPending ? 'Minting...' : 'Mint MockUSDC'}
              </button>
            </form>

            {/* Contract Info */}
            <div className="mt-6 pt-6 border-t border-border">
              <p className="text-xs text-muted-foreground">
                Contract Address: <span className="font-mono">{MOCK_USDC_RARI}</span>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

