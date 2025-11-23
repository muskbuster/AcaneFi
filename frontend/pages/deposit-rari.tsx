import { useState, useEffect } from 'react';
import { useAccount, useChainId, useSwitchChain, useWriteContract, useWaitForTransactionReceipt, useReadContract } from 'wagmi';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { parseUnits, formatUnits } from 'viem';
import { teeApi, rariApi } from '../lib/api';
import { 
  getUnifiedVaultAddress, 
  getUSDCAddress,
  UNIFIED_VAULT_ABI,
  USDC_ABI,
} from '../lib/contracts';

interface Trader {
  id: number;
  address: string;
  traderId: number;
  name: string;
  strategyDescription: string;
  performanceFee: number;
}

type DepositStep = 'approve' | 'deposit' | 'attestation' | 'complete';

// Rari Testnet Chain ID (from contracts)
const RARI_CHAIN_ID = 1918988905;

export default function DepositRari() {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const { switchChain } = useSwitchChain();
  const router = useRouter();
  const [traders, setTraders] = useState<Trader[]>([]);
  const [selectedTrader, setSelectedTrader] = useState<number | null>(null);
  const [amount, setAmount] = useState('');
  const [step, setStep] = useState<DepositStep>('approve');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [approveTxHash, setApproveTxHash] = useState<string>('');
  const [depositTxHash, setDepositTxHash] = useState<string>('');
  const [attestation, setAttestation] = useState<any>(null);
  const [fetchingAttestation, setFetchingAttestation] = useState(false);
  const [receiving, setReceiving] = useState(false);
  const [nonce, setNonce] = useState<string>('');

  const { writeContract, data: txHash, error: writeError, isError: isWriteError, reset: resetWriteContract } = useWriteContract();
  
  // Separate hooks for approval and deposit transactions
  const { isLoading: isApprovePending, isSuccess: isApproveSuccess } = useWaitForTransactionReceipt({ 
    hash: approveTxHash ? approveTxHash as `0x${string}` : undefined 
  });
  const { isLoading: isDepositPending, isSuccess: isDepositSuccess } = useWaitForTransactionReceipt({ 
    hash: depositTxHash ? depositTxHash as `0x${string}` : undefined 
  });

  const isPending = isApprovePending || isDepositPending;

  // Read nonce from UnifiedVault on Rari
  const rariVaultAddress = process.env.NEXT_PUBLIC_UNIFIED_VAULT_RARI as `0x${string}`;
  const { data: nonceData } = useReadContract({
    address: rariVaultAddress,
    abi: [
      {
        name: 'nonceCounter',
        type: 'function',
        stateMutability: 'view',
        inputs: [],
        outputs: [{ name: '', type: 'uint256' }],
      },
    ],
    functionName: 'nonceCounter',
    query: {
      enabled: !!rariVaultAddress && rariVaultAddress !== '0x0000000000000000000000000000000000000000',
    },
  });

  useEffect(() => {
    loadTraders();
  }, []);

  useEffect(() => {
    if (nonceData) {
      // Use current nonce + timestamp for uniqueness
      const timestamp = Math.floor(Date.now() / 1000);
      setNonce((BigInt(nonceData as bigint) + BigInt(timestamp)).toString());
    }
  }, [nonceData]);

  useEffect(() => {
    if (isApproveSuccess && step === 'approve') {
      setStep('deposit');
      setLoading(false);
    } else if (isDepositSuccess && step === 'deposit') {
      setStep('attestation');
      setLoading(false);
      
      // Store deposit in backend
      if (address && depositTxHash && nonce && amount) {
        const depositAmount = parseUnits(amount, 6);
        rariApi.storeDeposit({
          userAddress: address,
          amount: depositAmount.toString(),
          amountFormatted: amount,
          nonce,
          sourceChainId: RARI_CHAIN_ID.toString(),
          depositTxHash,
        }).then(() => {
          console.log('✅ Deposit stored in backend');
        }).catch((err) => {
          console.error('Failed to store deposit:', err);
          // Don't block the flow if storage fails
        });
      }
      
      fetchAttestation();
    }
  }, [isApproveSuccess, isDepositSuccess, step, address, depositTxHash, nonce, amount]);

  // Handle write errors
  useEffect(() => {
    if (isWriteError && writeError) {
      console.error('Write contract error:', writeError);
      // Ignore MetaMask SDK errors (non-critical)
      const errorMessage = writeError.message || '';
      if (!errorMessage.includes('metamask-sdk.api.cx.metamask.io')) {
        setError(writeError.message || 'Transaction failed');
      }
      setLoading(false);
    }
  }, [isWriteError, writeError]);

  // Track transaction hashes based on current step
  useEffect(() => {
    if (txHash) {
      if (step === 'approve') {
        setApproveTxHash(txHash);
        console.log('✅ Approval transaction hash:', txHash);
      } else if (step === 'deposit') {
        setDepositTxHash(txHash);
        console.log('✅ Deposit transaction hash:', txHash);
      }
    }
  }, [txHash, step]);

  const loadTraders = async () => {
    try {
      const response = await teeApi.getAllTraders();
      setTraders(response.traders || []);
    } catch (error) {
      console.error('Failed to load traders:', error);
    }
  };

  const handleApprove = async () => {
    if (!isConnected || !address || !selectedTrader || !amount) {
      setError('Please fill in all fields');
      return;
    }

    // Check if user is on Rari testnet
    if (chainId !== RARI_CHAIN_ID) {
      setError(`Please switch to Rari Testnet (Chain ID: ${RARI_CHAIN_ID})`);
      try {
        switchChain?.({ chainId: RARI_CHAIN_ID });
      } catch (switchErr) {
        console.error('Failed to switch chain:', switchErr);
      }
      return;
    }

    setLoading(true);
    setError('');
    resetWriteContract(); // Reset write contract state

    try {
      // Note: Rari uses MockUSDC, address should be in env
      const usdcAddress = process.env.NEXT_PUBLIC_MOCK_USDC_RARI as `0x${string}`;
      if (!usdcAddress || usdcAddress === '0x0000000000000000000000000000000000000000') {
        setError('MockUSDC address not configured for Rari');
        setLoading(false);
        return;
      }

      const depositAmount = parseUnits(amount, 6);
      const vaultAddress = await getUnifiedVaultAddress('rari');
      if (!vaultAddress || vaultAddress === '0x0000000000000000000000000000000000000000') {
        setError('UnifiedVault not deployed on Rari');
        setLoading(false);
        return;
      }

      console.log('📝 Approving MockUSDC:', {
        token: usdcAddress,
        spender: vaultAddress,
        amount: depositAmount.toString(),
        amountFormatted: amount,
      });

      // Reset previous approval hash
      setApproveTxHash('');

      try {
        writeContract({
          address: usdcAddress,
          abi: USDC_ABI,
          functionName: 'approve',
          args: [vaultAddress, depositAmount],
        });
      } catch (writeErr: any) {
        console.error('Write contract error:', writeErr);
        // Ignore MetaMask SDK errors (non-critical background requests)
        if (!writeErr.message?.includes('metamask-sdk.api.cx.metamask.io')) {
          setError(writeErr.message || 'Failed to submit approval transaction');
          setLoading(false);
        }
      }
    } catch (err: any) {
      console.error('Approve error:', err);
      setError(err.message || 'Failed to approve');
      setLoading(false);
    }
  };

  const handleDeposit = async () => {
    if (!isConnected || !address || !selectedTrader || !amount || !nonce) {
      setError('Please fill in all fields');
      return;
    }

    // Check if user is on Rari testnet
    if (chainId !== RARI_CHAIN_ID) {
      setError(`Please switch to Rari Testnet (Chain ID: ${RARI_CHAIN_ID})`);
      try {
        switchChain?.({ chainId: RARI_CHAIN_ID });
      } catch (switchErr) {
        console.error('Failed to switch chain:', switchErr);
      }
      return;
    }

    setLoading(true);
    setError('');
    resetWriteContract(); // Reset write contract state

    try {
      const depositAmount = parseUnits(amount, 6);
      const vaultAddress = await getUnifiedVaultAddress('rari');
      if (!vaultAddress || vaultAddress === '0x0000000000000000000000000000000000000000') {
        setError('UnifiedVault not deployed on Rari');
        setLoading(false);
        return;
      }

      console.log('📝 Depositing MockUSDC:', {
        traderId: selectedTrader,
        amount: depositAmount.toString(),
        amountFormatted: amount,
        vault: vaultAddress,
      });

      // Reset previous deposit hash
      setDepositTxHash('');

      try {
        writeContract({
          address: vaultAddress,
          abi: UNIFIED_VAULT_ABI,
          functionName: 'depositRari',
          args: [BigInt(selectedTrader), depositAmount],
        });
      } catch (writeErr: any) {
        console.error('Write contract error:', writeErr);
        // Ignore MetaMask SDK errors (non-critical background requests)
        if (!writeErr.message?.includes('metamask-sdk.api.cx.metamask.io')) {
          setError(writeErr.message || 'Failed to submit deposit transaction');
          setLoading(false);
        }
      }
    } catch (err: any) {
      console.error('Deposit error:', err);
      setError(err.message || 'Failed to deposit');
      setLoading(false);
    }
  };

  const fetchAttestation = async () => {
    if (!amount || !nonce) return;

    setFetchingAttestation(true);
    setError('');

    try {
      const depositAmount = parseUnits(amount, 6).toString();
      const result = await rariApi.getAttestation(depositAmount, nonce);

      if (result.success) {
        setAttestation(result);
        setStep('complete');
      } else {
        setError(result.error || 'Failed to get attestation');
      }
    } catch (err: any) {
      console.error('Attestation error:', err);
      setError(err.message || 'Failed to fetch attestation');
    } finally {
      setFetchingAttestation(false);
    }
  };

  const handleReceiveUSDC = async () => {
    if (!attestation || !amount || !nonce) {
      setError('Please wait for attestation');
      return;
    }

    // Switch to Base Sepolia if needed
    const baseSepoliaId = 84532; // Base Sepolia
    if (chainId !== baseSepoliaId) {
      setError('Please switch to Base Sepolia to receive USDC');
      switchChain?.({ chainId: baseSepoliaId });
      return;
    }

    setReceiving(true);
    setError('');

    try {
      const result = await rariApi.verifyAndReceive({
        amount: parseUnits(amount, 6).toString(),
        nonce,
        sourceChainId: RARI_CHAIN_ID.toString(),
        signature: attestation.signature,
      });

      if (result.success) {
        alert(`USDC received successfully! Transaction: ${result.transactionHash}`);
        setStep('complete');
        // Reset form
        setAmount('');
        setSelectedTrader(null);
        setDepositTxHash('');
        setAttestation(null);
        setNonce('');
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
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-lg p-8 text-center">
          <h2 className="text-2xl font-bold mb-4">Connect Your Wallet</h2>
          <p className="text-gray-600 mb-6">Please connect your wallet to make a Rari deposit</p>
          <ConnectButton />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-12">
      <div className="container mx-auto px-4 max-w-2xl">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-6">Deposit via Rari</h1>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
              {error}
            </div>
          )}

          {step === 'attestation' && (
            <div className="bg-yellow-50 border border-yellow-200 text-yellow-700 px-4 py-3 rounded mb-6">
              <p className="font-bold">⏳ Getting Rari attestation...</p>
              {depositTxHash && (
                <p className="mt-2 text-sm">
                  Transaction: <a href={`https://rari-testnet.calderachain.xyz/tx/${depositTxHash}`} target="_blank" rel="noopener noreferrer" className="underline">{depositTxHash.substring(0, 20)}...</a>
                </p>
              )}
              {nonce && (
                <div className="mt-2 p-2 bg-white border border-yellow-300 rounded">
                  <p className="text-xs font-semibold text-gray-700 mb-1">Save this nonce for receiving:</p>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono break-all">{nonce}</span>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(nonce);
                        alert('Nonce copied to clipboard!');
                      }}
                      className="ml-2 px-2 py-1 text-xs bg-yellow-600 text-white rounded hover:bg-yellow-700"
                    >
                      Copy
                    </button>
                  </div>
                </div>
              )}
              {fetchingAttestation && (
                <p className="mt-2 text-sm">Fetching attestation from TEE API...</p>
              )}
            </div>
          )}

          {step === 'complete' && attestation && (
            <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded mb-6">
              <p className="font-bold">✅ Attestation received!</p>
              <div className="mt-2 space-y-2">
                <p className="text-sm mb-2">Ready to receive USDC on Base Sepolia</p>
                
                {/* Nonce Display - Make it prominent and copyable */}
                <div className="bg-white border border-green-300 rounded p-3 mb-2">
                  <p className="text-xs font-semibold text-gray-700 mb-1">Save this information for receiving:</p>
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-600">Amount:</span>
                      <span className="text-xs font-mono font-bold">{amount} USDC</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-600">Nonce:</span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono font-bold break-all">{nonce}</span>
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(nonce);
                            alert('Nonce copied to clipboard!');
                          }}
                          className="px-2 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700"
                        >
                          Copy
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={handleReceiveUSDC}
                    disabled={receiving || chainId !== 84532}
                    className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
                  >
                    {chainId !== 84532
                      ? 'Switch to Base Sepolia to Receive'
                      : receiving
                      ? 'Receiving...'
                      : 'Receive USDC on Base Sepolia'}
                  </button>
                  <Link
                    href="/receive"
                    className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                  >
                    Go to Receive Page
                  </Link>
                </div>
              </div>
            </div>
          )}

          <div className="space-y-6">
            {/* Chain Status and Switcher */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm font-medium text-blue-800 mb-2">
                Current Chain: <span className="font-bold">{chainId === RARI_CHAIN_ID ? 'Rari Testnet ✅' : `Chain ID ${chainId} (Switch to Rari Testnet)`}</span>
              </p>
              {chainId !== RARI_CHAIN_ID && (
                <button
                  onClick={() => switchChain?.({ chainId: RARI_CHAIN_ID })}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
                  disabled={loading}
                >
                  Switch to Rari Testnet
                </button>
              )}
              {chainId === RARI_CHAIN_ID && (
                <p className="text-sm text-green-700 mt-2">✅ Connected to Rari Testnet - Ready to deposit</p>
              )}
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-800">
                <strong>Rari Deposit Flow:</strong>
                <br />
                1. Deposit MockUSDC on Rari Testnet
                <br />
                2. Get attestation from TEE API
                <br />
                3. Switch to Base Sepolia and receive USDC
                <br />
                4. USDC will be transferred to TEE wallet on Base Sepolia
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Trader
              </label>
              <select
                required
                value={selectedTrader || ''}
                onChange={(e) => setSelectedTrader(parseInt(e.target.value))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                disabled={step !== 'approve'}
              >
                <option value="">-- Select a trader --</option>
                {traders.map((trader) => (
                  <option key={trader.id} value={trader.traderId}>
                    {trader.name} (Fee: {trader.performanceFee}%)
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Amount (MockUSDC)
              </label>
              <input
                type="number"
                required
                min="0"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="0.00"
                disabled={step !== 'approve'}
              />
            </div>

            {nonce && (
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-sm text-gray-600">
                  <strong>Nonce:</strong> {nonce}
                </p>
              </div>
            )}

            {step === 'approve' && (
              <button
                onClick={handleApprove}
                disabled={loading || isPending || !selectedTrader || !amount || chainId !== RARI_CHAIN_ID}
                className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
              >
                {chainId !== RARI_CHAIN_ID
                  ? 'Switch to Rari Testnet First'
                  : loading || isPending
                  ? 'Approving...'
                  : '1. Approve MockUSDC'}
              </button>
            )}

            {step === 'deposit' && (
              <>
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <p className="text-sm text-green-800">✅ MockUSDC Approved</p>
                </div>
                <button
                  onClick={handleDeposit}
                  disabled={loading || isPending || chainId !== RARI_CHAIN_ID}
                  className="w-full px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition disabled:opacity-50"
                >
                  {chainId !== RARI_CHAIN_ID
                    ? 'Switch to Rari Testnet First'
                    : loading || isPending
                    ? 'Processing...'
                    : '2. Deposit MockUSDC on Rari'}
                </button>
              </>
            )}

            {writeError && !writeError.message?.includes('metamask-sdk.api.cx.metamask.io') && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                <p className="text-sm font-medium">Transaction Error:</p>
                <p className="text-sm">{writeError.message || 'Unknown error'}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

