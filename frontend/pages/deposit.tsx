import { useState, useEffect } from 'react';
import { useAccount, useChainId, useSwitchChain, useWriteContract, useWaitForTransactionReceipt, useReadContract, useBalance } from 'wagmi';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { parseUnits, formatUnits } from 'viem';
import { teeApi, cctpApi } from '../lib/api';
import { sepolia, baseSepolia } from 'wagmi/chains';
import { 
  getUnifiedVaultAddress, 
  getUSDCAddress,
  getCCTPTokenMessengerAddress,
  addressToBytes32,
  UNIFIED_VAULT_ABI,
  USDC_ABI,
  CCTP_TOKEN_MESSENGER_ABI,
} from '../lib/contracts';

interface Trader {
  id: number;
  address: string;
  traderId: number;
  name: string;
  strategyDescription: string;
  performanceFee: number;
}

type DepositStep = 'approve' | 'deposit' | 'complete' | 'attestation' | 'received';

export default function Deposit() {
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
  const [currentTxType, setCurrentTxType] = useState<'approve' | 'deposit' | null>(null);

  const { writeContract, data: txHash, error: writeError, isError: isWriteError, reset: resetWriteContract } = useWriteContract();
  
  // Separate hooks for approval and deposit transactions
  const { isLoading: isApprovePending, isSuccess: isApproveSuccess } = useWaitForTransactionReceipt({ 
    hash: approveTxHash ? approveTxHash as `0x${string}` : undefined 
  });
  const { isLoading: isDepositPending, isSuccess: isDepositSuccess } = useWaitForTransactionReceipt({ 
    hash: depositTxHash ? depositTxHash as `0x${string}` : undefined 
  });

  const isPending = isApprovePending || isDepositPending;

  // Get chain and addresses
  const chain = chainId === baseSepolia.id ? 'base-sepolia' : 'ethereum-sepolia';
  const usdcAddress = getUSDCAddress(chain);
  const tokenMessengerAddress = chainId === sepolia.id ? getCCTPTokenMessengerAddress(chain) : null;

  // Check USDC balance
  const { data: usdcBalance } = useBalance({
    address: address,
    token: usdcAddress,
    chainId: chainId,
    query: {
      enabled: !!address && !!usdcAddress,
      refetchInterval: 5000,
    },
  });

  // Check approval allowance (for sepolia - CCTP)
  const { data: allowance } = useReadContract({
    address: usdcAddress,
    abi: USDC_ABI,
    functionName: 'allowance',
    args: address && tokenMessengerAddress ? [address, tokenMessengerAddress] : undefined,
    chainId: chainId,
    query: {
      enabled: !!address && !!tokenMessengerAddress && !!usdcAddress && chainId === sepolia.id,
      refetchInterval: 5000,
    },
  });

  useEffect(() => {
    loadTraders();
  }, []);

  // Handle write contract errors
  useEffect(() => {
    if (isWriteError && writeError) {
      console.error('Write contract error:', writeError);
      setError(writeError.message || 'Transaction failed. Please try again.');
      setLoading(false);
      setCurrentTxType(null);
      // Reset the write contract state after a delay
      setTimeout(() => {
        resetWriteContract();
      }, 3000);
    }
  }, [isWriteError, writeError, resetWriteContract]);

  // Track transaction hash based on current transaction type
  useEffect(() => {
    if (txHash && currentTxType) {
      if (currentTxType === 'approve') {
        setApproveTxHash(txHash);
        setCurrentTxType(null); // Reset after capturing
      } else if (currentTxType === 'deposit') {
        setDepositTxHash(txHash);
        setCurrentTxType(null); // Reset after capturing
      }
    }
  }, [txHash, currentTxType]);

  // Handle approval success
  useEffect(() => {
    if (isApproveSuccess && approveTxHash) {
      setStep('deposit');
      setLoading(false);
    }
  }, [isApproveSuccess, approveTxHash]);

  // Handle deposit/burn success - only fetch attestation after deposit succeeds
  useEffect(() => {
    if (isDepositSuccess && depositTxHash) {
      setLoading(false);
      if (chainId === sepolia.id) {
        // CCTP deposit - store in backend and fetch attestation after burn transaction
        if (address) {
          cctpApi.storeDeposit({
            userAddress: address,
            transactionHash: depositTxHash,
            sourceDomain: 0, // Ethereum Sepolia
            sourceChainId: sepolia.id,
            sourceChainName: 'Ethereum Sepolia',
          }).then(() => {
            console.log('✅ CCTP deposit stored in backend');
          }).catch((err) => {
            console.error('Failed to store CCTP deposit:', err);
            // Don't block the flow if storage fails
          });
        }
        setStep('attestation');
      } else {
        // Direct deposit on Base Sepolia
        setStep('complete');
      }
    }
  }, [isDepositSuccess, depositTxHash, chainId, address]);

  // Fetch attestation when step changes to 'attestation' and we have a deposit tx hash
  useEffect(() => {
    if (step === 'attestation' && depositTxHash && !attestation && !fetchingAttestation) {
      fetchAttestation();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, depositTxHash]);

  const loadTraders = async () => {
    try {
      const response = await teeApi.getAllTraders();
      setTraders(response.traders || []);
    } catch (error) {
      console.error('Failed to load traders:', error);
    }
  };

  const getCurrentChain = () => {
    if (chainId === baseSepolia.id) return 'base-sepolia';
    if (chainId === sepolia.id) return 'ethereum-sepolia';
    return 'ethereum-sepolia';
  };

  const handleApprove = async () => {
    if (!isConnected || !address || !selectedTrader || !amount) {
      setError('Please fill in all fields');
      return;
    }

    // Check balance first
    if (!usdcBalance || usdcBalance.value < parseUnits(amount, 6)) {
      setError(`Insufficient USDC balance. You have ${usdcBalance ? formatUnits(usdcBalance.value, 6) : '0'} USDC, but need ${amount} USDC.`);
      return;
    }

    // Reset any previous errors
    setError('');
    setLoading(true);
    resetWriteContract(); // Reset write contract state

    try {
      const chain = getCurrentChain();
      const usdcAddress = getUSDCAddress(chain);
      const depositAmount = parseUnits(amount, 6);

      // For CCTP deposits, approve TokenMessenger; for direct deposits, approve UnifiedVault
      let spenderAddress: `0x${string}`;
      if (chainId === sepolia.id) {
        // CCTP deposit - approve TokenMessenger
        spenderAddress = getCCTPTokenMessengerAddress(chain);
      } else {
        // Direct deposit - approve UnifiedVault
        const vaultAddress = await getUnifiedVaultAddress(chain);
        if (!vaultAddress || vaultAddress === '0x0000000000000000000000000000000000000000') {
          setError('UnifiedVault not deployed on this chain');
          setLoading(false);
          return;
        }
        spenderAddress = vaultAddress;
      }

      console.log('📝 Approving USDC:', {
        token: usdcAddress,
        spender: spenderAddress,
        amount: depositAmount.toString(),
        amountFormatted: amount,
      });

      setCurrentTxType('approve'); // Mark that we're submitting an approval
      try {
        writeContract({
          address: usdcAddress,
          abi: USDC_ABI,
          functionName: 'approve',
          args: [spenderAddress, depositAmount],
        });
      } catch (writeErr: any) {
        console.error('Write contract error:', writeErr);
        setError(writeErr.message || 'Failed to submit approval transaction');
        setLoading(false);
      }
    } catch (err: any) {
      console.error('Approve error:', err);
      setError(err.message || 'Failed to approve');
      setLoading(false);
    }
  };

  const handleDeposit = async () => {
    if (!isConnected || !address || !selectedTrader || !amount) {
      setError('Please fill in all fields');
      return;
    }

    // Check balance
    const depositAmount = parseUnits(amount, 6);
    if (!usdcBalance || usdcBalance.value < depositAmount) {
      setError(`Insufficient USDC balance. You have ${usdcBalance ? formatUnits(usdcBalance.value, 6) : '0'} USDC, but need ${amount} USDC.`);
      return;
    }

    // Check approval for sepolia (CCTP) - following test pattern
    if (chainId === sepolia.id) {
      if (!allowance || allowance < depositAmount) {
        setError(`Insufficient approval for TokenMessenger. Please approve USDC first. Current allowance: ${allowance ? formatUnits(allowance, 6) : '0'} USDC, needed: ${amount} USDC`);
        return;
      }
      console.log('✅ TokenMessenger approval verified:', {
        allowance: formatUnits(allowance, 6),
        needed: amount,
        sufficient: allowance >= depositAmount,
      });
    }

    // Reset any previous errors
    setError('');
    setLoading(true);
    resetWriteContract(); // Reset write contract state

    try {
      const chain = getCurrentChain();
      
      // Trader validation is done on-chain - no need to call backend
      // The trader list already comes from on-chain, so if it's in the list, it's valid

      const maxFee = parseUnits('0.1', 6);
      const minFinalityThreshold = 1000; // Fast transfer

      console.log('📝 Depositing USDC:', {
        chain: chain,
        chainId: chainId,
        traderId: selectedTrader,
        amount: depositAmount.toString(),
        amountFormatted: amount,
      });

      if (chainId === sepolia.id) {
        // CCTP deposit from Ethereum Sepolia - call TokenMessenger directly
        const usdcAddress = getUSDCAddress(chain);
        const tokenMessengerAddress = getCCTPTokenMessengerAddress(chain);
        const BASE_SEPOLIA_DOMAIN = 6;
        
        // Get TEE wallet address from environment
        const teeWallet = (process.env.NEXT_PUBLIC_TEE_WALLET_ADDRESS || '0x0000000000000000000000000000000000000000') as `0x${string}`;
        if (teeWallet === '0x0000000000000000000000000000000000000000') {
          setError('TEE wallet address not configured');
          setLoading(false);
          return;
        }
        const mintRecipient = addressToBytes32(teeWallet as `0x${string}`);
        const destinationCaller = '0x0000000000000000000000000000000000000000000000000000000000000000' as `0x${string}`;

        // Approve TokenMessenger if needed
        const usdcContract = {
          address: usdcAddress,
          abi: USDC_ABI,
        };
        
        // Following test pattern: Call TokenMessenger.depositForBurn directly
        console.log('\n📤 Calling TokenMessenger.depositForBurn (following test pattern):');
        console.log('   Amount:', formatUnits(depositAmount, 6), 'USDC');
        console.log('   Destination Domain:', BASE_SEPOLIA_DOMAIN, '(Base Sepolia)');
        console.log('   Mint Recipient (TEE):', teeWallet);
        console.log('   Mint Recipient (bytes32):', mintRecipient);
        console.log('   Burn Token:', usdcAddress);
        console.log('   Max Fee:', formatUnits(maxFee, 6), 'USDC');
        console.log('   Min Finality Threshold:', minFinalityThreshold);
        
        setCurrentTxType('deposit'); // Mark that we're submitting a deposit/burn
        try {
          writeContract({
            address: tokenMessengerAddress,
            abi: CCTP_TOKEN_MESSENGER_ABI,
            functionName: 'depositForBurn',
            args: [
              depositAmount,
              BASE_SEPOLIA_DOMAIN,
              mintRecipient,
              usdcAddress,
              destinationCaller,
              maxFee,
              minFinalityThreshold,
            ],
          });
          console.log('✅ Transaction submitted to wallet');
        } catch (writeErr: any) {
          console.error('❌ Write contract error:', writeErr);
          console.error('   Error details:', {
            message: writeErr.message,
            reason: writeErr.reason,
            data: writeErr.data,
            code: writeErr.code,
          });
          setError(writeErr.message || writeErr.reason || 'Failed to submit deposit transaction');
          setLoading(false);
        }
      } else if (chainId === baseSepolia.id) {
        // Direct deposit on Base Sepolia - deposit directly to UnifiedVault
        const vaultAddress = await getUnifiedVaultAddress(chain);
        if (!vaultAddress || vaultAddress === '0x0000000000000000000000000000000000000000') {
          setError('UnifiedVault not deployed on this chain');
          setLoading(false);
          return;
        }

        // Direct deposit on Base Sepolia - no bridging needed
        setCurrentTxType('deposit'); // Mark that we're submitting a deposit
        try {
          writeContract({
            address: vaultAddress,
            abi: UNIFIED_VAULT_ABI,
            functionName: 'depositViaCCTP',
            args: [BigInt(selectedTrader), depositAmount, maxFee, minFinalityThreshold],
          });
        } catch (writeErr: any) {
          console.error('Write contract error:', writeErr);
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
    if (!depositTxHash) return;

    setFetchingAttestation(true);
    setError('');

    try {
      const ETHEREUM_SEPOLIA_DOMAIN = 0;
      const result = await cctpApi.pollAttestation(
        ETHEREUM_SEPOLIA_DOMAIN,
        depositTxHash,
        60, // max attempts (5 minutes)
        5000 // 5 second intervals
      );

      setAttestation(result);
      setStep('complete');
    } catch (err: any) {
      console.error('Attestation error:', err);
      setError(err.message || 'Failed to fetch attestation. You can try again later.');
    } finally {
      setFetchingAttestation(false);
    }
  };

  const handleReceiveUSDC = async () => {
    if (!attestation || !address) {
      setError('Please wait for attestation');
      return;
    }

    if (chainId !== baseSepolia.id) {
      setError('Please switch to Base Sepolia to receive USDC');
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
      return;
    }

    if (!attestation.message.startsWith('0x') || !attestation.attestation.startsWith('0x')) {
      setError('Attestation message and attestation must be hex strings starting with 0x');
      return;
    }

    setReceiving(true);
    setError('');

    try {
      console.log('📤 Receiving USDC with attestation:', {
        message: attestation.message.substring(0, 30) + '...',
        attestation: attestation.attestation.substring(0, 30) + '...',
        messageLength: attestation.message.length,
        attestationLength: attestation.attestation.length,
      });

      const result = await cctpApi.receiveBridgedUSDC(
        attestation.message,
        attestation.attestation
      );

      console.log('✅ Receive result:', result);

      if (result.success) {
        setStep('received');
        alert(`USDC received successfully! Transaction: ${result.transactionHash}`);
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
      setReceiving(false);
    }
  };

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-lg p-8 text-center">
          <h2 className="text-2xl font-bold mb-4">Connect Your Wallet</h2>
          <p className="text-gray-600 mb-6">Please connect your wallet to make a deposit</p>
          <ConnectButton />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-12">
      <div className="container mx-auto px-4 max-w-2xl">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-6">Deposit to Trader</h1>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
              {error}
            </div>
          )}

          {step === 'attestation' && (
            <div className="bg-yellow-50 border border-yellow-200 text-yellow-700 px-4 py-3 rounded mb-6">
              <p className="font-bold">⏳ Waiting for CCTP attestation...</p>
              {depositTxHash && (
                <p className="mt-2 text-sm">
                  Transaction: <a href={`https://sepolia.etherscan.io/tx/${depositTxHash}`} target="_blank" rel="noopener noreferrer" className="underline">{depositTxHash.substring(0, 20)}...</a>
                </p>
              )}
              {fetchingAttestation && (
                <p className="mt-2 text-sm">Fetching attestation from Circle API...</p>
              )}
            </div>
          )}

          {step === 'complete' && attestation && (
            <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded mb-6">
              <p className="font-bold">✅ Attestation received!</p>
              {chainId === baseSepolia.id ? (
                <div className="mt-2">
                  <p className="text-sm mb-2">Ready to receive USDC on Base Sepolia</p>
                  <button
                    onClick={handleReceiveUSDC}
                    disabled={receiving}
                    className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
                  >
                    {receiving ? 'Receiving...' : 'Receive USDC'}
                  </button>
                </div>
              ) : (
                <p className="mt-2 text-sm">
                  Switch to Base Sepolia to receive USDC, or go to{' '}
                  <Link href="/receive" className="underline">Receive</Link> page
                </p>
              )}
            </div>
          )}

          {step === 'received' && (
            <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded mb-6">
              <p className="font-bold">✅ USDC received successfully on Base Sepolia!</p>
              <p className="mt-2 text-sm">Your deposit has been completed.</p>
            </div>
          )}

          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Chain
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
              <p className="text-sm text-gray-500 mt-2">
                {chainId === sepolia.id && 'Deposit via CCTP → Base Sepolia'}
                {chainId === baseSepolia.id && 'Direct deposit on Base Sepolia'}
              </p>
            </div>

            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="block text-sm font-medium text-gray-700">
                  Select Trader
                </label>
                <button
                  type="button"
                  onClick={loadTraders}
                  disabled={loading}
                  className="text-sm text-blue-600 hover:text-blue-800 underline disabled:opacity-50"
                >
                  Refresh
                </button>
              </div>
              <select
                required
                value={selectedTrader || ''}
                onChange={(e) => setSelectedTrader(parseInt(e.target.value))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                disabled={step !== 'approve'}
              >
                <option value="">-- Select a trader --</option>
                {traders.length === 0 ? (
                  <option value="" disabled>No traders available</option>
                ) : (
                  traders.map((trader) => (
                    <option key={trader.id} value={trader.traderId}>
                      {trader.name} (ID: {trader.traderId}, Fee: {trader.performanceFee}%)
                    </option>
                  ))
                )}
              </select>
              {traders.length > 0 && (
                <p className="text-xs text-gray-500 mt-1">
                  {traders.length} trader{traders.length !== 1 ? 's' : ''} available
                </p>
              )}
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
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="0.00"
                disabled={step !== 'approve'}
              />
            </div>

            {step === 'approve' && (
              <button
                onClick={handleApprove}
                disabled={loading || isPending || !selectedTrader || !amount}
                className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
              >
                {loading || isPending ? 'Approving...' : '1. Approve USDC'}
              </button>
            )}

            {step === 'deposit' && (
              <>
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <p className="text-sm text-green-800">✅ USDC Approved</p>
                </div>
                <button
                  onClick={handleDeposit}
                  disabled={loading || isPending}
                  className="w-full px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition disabled:opacity-50"
                >
                  {loading || isPending ? 'Processing...' : chainId === sepolia.id ? '2. Deposit via CCTP' : '2. Deposit USDC'}
                </button>
              </>
            )}

            {step === 'attestation' && !fetchingAttestation && (
              <button
                onClick={fetchAttestation}
                disabled={!depositTxHash}
                className="w-full px-6 py-3 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition disabled:opacity-50"
              >
                Fetch Attestation
              </button>
            )}

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-800">
                <strong>Note:</strong>
                {chainId === sepolia.id && (
                  <>
                    {' '}Deposits from Ethereum Sepolia use CCTP. After deposit, go to{' '}
                    <Link href="/receive" className="underline">Receive</Link> page.
                  </>
                )}
                {chainId === baseSepolia.id && (
                  <> Direct deposits on Base Sepolia. You'll receive OFT vault shares.</>
                )}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
