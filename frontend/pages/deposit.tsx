import { useState, useEffect } from 'react';
import { useAccount, useChainId, useSwitchChain, useWriteContract, useWaitForTransactionReceipt, useReadContract, useBalance, usePublicClient } from 'wagmi';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { parseUnits, formatUnits } from 'viem';
import { teeApi, cctpApi, rariApi } from '../lib/api';
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

type DepositMethod = 'cctp' | 'rari';
type DepositStep = 'approve' | 'deposit' | 'attestation' | 'complete' | 'received';

// Rari Testnet Chain ID
const RARI_CHAIN_ID = 1918988905;

export default function Deposit() {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const { switchChain } = useSwitchChain();
  const router = useRouter();
  const publicClient = usePublicClient();
  
  // Deposit method selection
  const [depositMethod, setDepositMethod] = useState<DepositMethod>('cctp');
  
  // Common state
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
  const [depositSubmitted, setDepositSubmitted] = useState(false); // Track if deposit was actually submitted
  
  // Rari-specific state
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

  // Get chain and addresses based on method
  const getCurrentChain = () => {
    if (depositMethod === 'rari') return 'rari';
    if (chainId === baseSepolia.id) return 'base-sepolia';
    if (chainId === sepolia.id) return 'ethereum-sepolia';
    return 'ethereum-sepolia';
  };

  const chain = getCurrentChain();
  const usdcAddress = depositMethod === 'rari' 
    ? (process.env.NEXT_PUBLIC_MOCK_USDC_RARI as `0x${string}`)
    : getUSDCAddress(chain);
  const tokenMessengerAddress = chainId === sepolia.id && depositMethod === 'cctp' 
    ? getCCTPTokenMessengerAddress(chain) 
    : null;

  // Check USDC balance (for CCTP)
  const { data: usdcBalance } = useBalance({
    address: address,
    token: usdcAddress,
    chainId: chainId,
    query: {
      enabled: !!address && !!usdcAddress && depositMethod === 'cctp',
      refetchInterval: 5000,
    },
  });

  // Check approval allowance (for CCTP on sepolia)
  const { data: allowance } = useReadContract({
    address: usdcAddress,
    abi: USDC_ABI,
    functionName: 'allowance',
    args: address && tokenMessengerAddress ? [address, tokenMessengerAddress] : undefined,
    chainId: chainId,
    query: {
      enabled: !!address && !!tokenMessengerAddress && !!usdcAddress && chainId === sepolia.id && depositMethod === 'cctp',
      refetchInterval: 5000,
    },
  });

  // Generate nonce for Rari on mount
  useEffect(() => {
    if (depositMethod === 'rari') {
      const timestamp = BigInt(Math.floor(Date.now() / 1000));
      const nonceValue = (timestamp + 1000000n).toString();
      setNonce(nonceValue);
      console.log('📝 Generated nonce:', nonceValue);
    }
  }, [depositMethod]);

  useEffect(() => {
    loadTraders();
  }, []);

  // Reset form when method changes
  useEffect(() => {
    setStep('approve');
    setError('');
    setApproveTxHash('');
    setDepositTxHash('');
    setAttestation(null);
    setSelectedTrader(null);
    setAmount('');
    setCurrentTxType(null);
    setDepositSubmitted(false);
  }, [depositMethod]);

  // Handle write contract errors
  useEffect(() => {
    if (isWriteError && writeError) {
      console.error('Write contract error:', writeError);
      const errorMessage = writeError.message || '';
      if (!errorMessage.includes('metamask-sdk.api.cx.metamask.io')) {
        setError(writeError.message || 'Transaction failed. Please try again.');
      }
      setLoading(false);
      setCurrentTxType(null);
    }
  }, [isWriteError, writeError]);

  // Handle approval success
  useEffect(() => {
    if (isApproveSuccess && step === 'approve') {
      setStep('deposit');
      setLoading(false);
      // Clear any previous deposit state when approval succeeds (new flow starting)
      setDepositTxHash('');
      setDepositSubmitted(false);
    }
  }, [isApproveSuccess, step]);

  // Track transaction hashes based on current transaction type
  useEffect(() => {
    if (txHash) {
      if (currentTxType === 'approve') {
        setApproveTxHash(txHash);
        console.log('✅ Approval transaction hash:', txHash);
        // Clear deposit hash when approval is submitted (new flow starting)
        setDepositTxHash('');
        setDepositSubmitted(false);
      } else if (currentTxType === 'deposit') {
        setDepositTxHash(txHash);
        setDepositSubmitted(true); // Mark that deposit was actually submitted
        console.log('✅ Deposit transaction hash:', txHash);
        // Reset currentTxType after setting hash
        setCurrentTxType(null);
      }
    }
  }, [txHash, currentTxType]);

  // Handle deposit success - CCTP flow
  // Only proceed if deposit was actually submitted and confirmed
  useEffect(() => {
    if (depositMethod === 'cctp' && isDepositSuccess && step === 'deposit' && depositTxHash && depositSubmitted) {
      console.log('✅ CCTP Deposit transaction confirmed:', depositTxHash);
      console.log('📋 Deposit was actually submitted and confirmed');
      setLoading(false);
      
      // Store CCTP deposit in backend
      if (address && depositTxHash && amount) {
        const depositAmount = parseUnits(amount, 6);
        const sourceDomain = chainId === sepolia.id ? 0 : 6; // Ethereum Sepolia = 0, Base Sepolia = 6
        
        cctpApi.storeDeposit({
          userAddress: address,
          transactionHash: depositTxHash,
          sourceDomain: sourceDomain,
          sourceChainId: chainId,
          sourceChainName: chainId === sepolia.id ? 'Ethereum Sepolia' : 'Base Sepolia',
        }).then(() => {
          console.log('✅ CCTP deposit stored in backend');
          setStep('attestation');
        }).catch((err) => {
          console.error('Failed to store CCTP deposit:', err);
          setStep('attestation');
        });
      } else {
        console.warn('⚠️  Missing data for CCTP deposit storage, but moving to attestation');
        setStep('attestation');
      }
    }
  }, [isDepositSuccess, step, depositTxHash, address, amount, depositMethod, chainId, depositSubmitted]);

  // Handle deposit success - Rari flow
  // Only proceed if deposit was actually submitted and confirmed
  useEffect(() => {
    if (depositMethod === 'rari' && isDepositSuccess && step === 'deposit' && depositTxHash && depositSubmitted) {
      console.log('✅ Rari Deposit transaction confirmed:', depositTxHash);
      console.log('📋 Deposit was actually submitted and confirmed');
      console.log('📋 Current state:', { nonce, amount, address });
      setLoading(false);
      
      // Ensure nonce is set
      let finalNonce = nonce;
      if (!finalNonce || finalNonce === '') {
        const timestamp = BigInt(Math.floor(Date.now() / 1000));
        finalNonce = (timestamp + 1000000n).toString();
        setNonce(finalNonce);
        console.log('📝 Generated nonce on-the-fly:', finalNonce);
      }
      
      if (!amount || amount === '') {
        console.error('⚠️  Amount is missing');
        setError('Amount is missing. Please refresh and try again.');
        setLoading(false);
        return;
      }
      
      // Store Rari deposit in backend
      if (address && depositTxHash && finalNonce && amount) {
        const depositAmount = parseUnits(amount, 6);
        rariApi.storeDeposit({
          userAddress: address,
          amount: depositAmount.toString(),
          amountFormatted: amount,
          nonce: finalNonce,
          sourceChainId: RARI_CHAIN_ID.toString(),
          depositTxHash,
        }).then(() => {
          console.log('✅ Rari deposit stored in backend');
          setStep('attestation');
          setTimeout(() => {
            fetchAttestation();
          }, 100);
        }).catch((err) => {
          console.error('Failed to store Rari deposit:', err);
          setStep('attestation');
          setTimeout(() => {
            fetchAttestation();
          }, 100);
        });
      } else {
        console.error('⚠️  Missing required data for deposit storage');
        setError('Missing required data. Please refresh and try again.');
        setLoading(false);
      }
    }
  }, [isDepositSuccess, step, depositTxHash, address, nonce, amount, depositMethod, depositSubmitted]);

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

    // Validate amount
    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      setError('Amount must be greater than 0');
      return;
    }

    // Check balance for CCTP
    if (depositMethod === 'cctp' && (!usdcBalance || usdcBalance.value < parseUnits(amount, 6))) {
      setError(`Insufficient USDC balance. You have ${usdcBalance ? formatUnits(usdcBalance.value, 6) : '0'} USDC, but need ${amount} USDC.`);
      return;
    }

    // Check chain for Rari
    if (depositMethod === 'rari' && chainId !== RARI_CHAIN_ID) {
      setError(`Please switch to Rari Testnet (Chain ID: ${RARI_CHAIN_ID})`);
      try {
        switchChain?.({ chainId: RARI_CHAIN_ID });
      } catch (switchErr) {
        console.error('Failed to switch chain:', switchErr);
      }
      return;
    }

    // Check chain for CCTP
    if (depositMethod === 'cctp' && chainId !== sepolia.id && chainId !== baseSepolia.id) {
      setError('Please switch to Ethereum Sepolia or Base Sepolia');
      try {
        switchChain?.({ chainId: sepolia.id });
      } catch (switchErr) {
        console.error('Failed to switch chain:', switchErr);
      }
      return;
    }

    setError('');
    setLoading(true);
    resetWriteContract();

    try {
      const depositAmount = parseUnits(amount, 6);
      let spenderAddress: `0x${string}`;

      if (depositMethod === 'rari') {
        const vaultAddress = await getUnifiedVaultAddress('rari');
        if (!vaultAddress || vaultAddress === '0x0000000000000000000000000000000000000000') {
          setError('UnifiedVault not deployed on Rari');
          setLoading(false);
          return;
        }
        spenderAddress = vaultAddress;
      } else {
        // CCTP flow
        if (chainId === sepolia.id) {
          spenderAddress = getCCTPTokenMessengerAddress(chain);
        } else {
          const vaultAddress = await getUnifiedVaultAddress(chain);
          if (!vaultAddress || vaultAddress === '0x0000000000000000000000000000000000000000') {
            setError('UnifiedVault not deployed on this chain');
            setLoading(false);
            return;
          }
          spenderAddress = vaultAddress;
        }
      }

      console.log('📝 Approving:', {
        method: depositMethod,
        token: usdcAddress,
        spender: spenderAddress,
        amount: depositAmount.toString(),
      });

      setCurrentTxType('approve');
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

    // Validate amount
    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      setError('Amount must be greater than 0');
      return;
    }

    // Check balance for CCTP
    if (depositMethod === 'cctp') {
      const depositAmount = parseUnits(amount, 6);
      if (!usdcBalance || usdcBalance.value < depositAmount) {
        setError(`Insufficient USDC balance. You have ${usdcBalance ? formatUnits(usdcBalance.value, 6) : '0'} USDC, but need ${amount} USDC.`);
        return;
      }

      // Check approval for sepolia (CCTP)
      if (chainId === sepolia.id) {
        if (!allowance || allowance < depositAmount) {
          setError(`Insufficient approval. Please approve USDC first.`);
          return;
        }
      }
    }

    // Check chain for Rari
    if (depositMethod === 'rari') {
      if (chainId !== RARI_CHAIN_ID) {
        setError(`Please switch to Rari Testnet (Chain ID: ${RARI_CHAIN_ID})`);
        try {
          switchChain?.({ chainId: RARI_CHAIN_ID });
        } catch (switchErr) {
          console.error('Failed to switch chain:', switchErr);
        }
        return;
      }

      if (step !== 'deposit') {
        setError('Please complete the approval step first');
        return;
      }

      // Check allowance for Rari
      if (publicClient && address) {
        try {
          const vaultAddress = await getUnifiedVaultAddress('rari');
          const usdcAddress = process.env.NEXT_PUBLIC_MOCK_USDC_RARI as `0x${string}`;
          if (vaultAddress && usdcAddress) {
            const allowance = await publicClient.readContract({
              address: usdcAddress,
              abi: USDC_ABI,
              functionName: 'allowance',
              args: [address, vaultAddress],
            });
            const depositAmount = parseUnits(amount, 6);
            if (allowance < depositAmount) {
              setError(`Insufficient allowance. Please approve first.`);
              return;
            }
          }
        } catch (allowanceErr) {
          console.warn('Could not check allowance:', allowanceErr);
        }
      }
    }

    setError('');
    setLoading(true);
    resetWriteContract();

    try {
      const depositAmount = parseUnits(amount, 6);

      if (depositMethod === 'rari') {
        // Rari deposit flow
        const vaultAddress = await getUnifiedVaultAddress('rari');
        if (!vaultAddress || vaultAddress === '0x0000000000000000000000000000000000000000') {
          setError('UnifiedVault not deployed on Rari');
          setLoading(false);
          return;
        }

        console.log('📝 Depositing MockUSDC on Rari:', {
          traderId: selectedTrader,
          amount: depositAmount.toString(),
          vault: vaultAddress,
        });

        setCurrentTxType('deposit');
        try {
          writeContract({
            address: vaultAddress,
            abi: UNIFIED_VAULT_ABI,
            functionName: 'depositRari',
            args: [BigInt(selectedTrader), depositAmount],
          });
        } catch (writeErr: any) {
          console.error('Write contract error:', writeErr);
          if (!writeErr.message?.includes('metamask-sdk.api.cx.metamask.io')) {
            setError(writeErr.message || 'Failed to submit deposit transaction');
          }
          setLoading(false);
        }
      } else {
        // CCTP deposit flow
        if (chainId === sepolia.id) {
          // CCTP deposit from Ethereum Sepolia
          const tokenMessengerAddress = getCCTPTokenMessengerAddress(chain);
          const BASE_SEPOLIA_DOMAIN = 6;
          const teeWallet = (process.env.NEXT_PUBLIC_TEE_WALLET_ADDRESS || '0x0000000000000000000000000000000000000000') as `0x${string}`;
          if (teeWallet === '0x0000000000000000000000000000000000000000') {
            setError('TEE wallet address not configured');
            setLoading(false);
            return;
          }
          const mintRecipient = addressToBytes32(teeWallet);
          const destinationCaller = '0x0000000000000000000000000000000000000000000000000000000000000000' as `0x${string}`;
          const maxFee = parseUnits('0.1', 6);
          const minFinalityThreshold = 1000;

          console.log('📤 Calling TokenMessenger.depositForBurn');
          setCurrentTxType('deposit');
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
          } catch (writeErr: any) {
            console.error('Write contract error:', writeErr);
            setError(writeErr.message || 'Failed to submit deposit transaction');
            setLoading(false);
          }
        } else if (chainId === baseSepolia.id) {
          // Direct deposit on Base Sepolia
          const vaultAddress = await getUnifiedVaultAddress(chain);
          if (!vaultAddress || vaultAddress === '0x0000000000000000000000000000000000000000') {
            setError('UnifiedVault not deployed on this chain');
            setLoading(false);
            return;
          }

          const maxFee = parseUnits('0.1', 6);
          const minFinalityThreshold = 1000;

          setCurrentTxType('deposit');
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
      }
    } catch (err: any) {
      console.error('Deposit error:', err);
      setError(err.message || 'Failed to deposit');
      setLoading(false);
    }
  };

  const fetchAttestation = async () => {
    if (depositMethod === 'cctp') {
      // CCTP attestation flow
      if (!depositTxHash) return;

      setFetchingAttestation(true);
      setError('');

      try {
        const ETHEREUM_SEPOLIA_DOMAIN = 0;
        const result = await cctpApi.pollAttestation(
          ETHEREUM_SEPOLIA_DOMAIN,
          depositTxHash,
          60,
          5000
        );

        setAttestation(result);
        setStep('complete');
      } catch (err: any) {
        console.error('Attestation error:', err);
        setError(err.message || 'Failed to fetch attestation. You can try again later.');
      } finally {
        setFetchingAttestation(false);
      }
    } else {
      // Rari attestation flow
      let finalNonce = nonce;
      if (!finalNonce || finalNonce === '') {
        const timestamp = BigInt(Math.floor(Date.now() / 1000));
        finalNonce = (timestamp + 1000000n).toString();
        setNonce(finalNonce);
        console.log('📝 Generated nonce in fetchAttestation:', finalNonce);
      }
      
      if (!amount || !finalNonce) {
        setError('Missing required data. Please ensure deposit completed successfully.');
        setFetchingAttestation(false);
        return;
      }

      setFetchingAttestation(true);
      setError('');

      try {
        const depositAmount = parseUnits(amount, 6);
        const amountInWei = depositAmount.toString();
        
        const result = await rariApi.getAttestation(amountInWei, finalNonce);

        if (result.success && result.attestation) {
          setAttestation(result.attestation);
          setStep('complete');
        } else {
          setError(result.error || 'Failed to get attestation');
        }
      } catch (err: any) {
        console.error('Attestation error:', err);
        setError(err.response?.data?.error || err.message || 'Failed to fetch attestation');
      } finally {
        setFetchingAttestation(false);
      }
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

          {/* Deposit Method Selection */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Deposit Method
            </label>
            <select
              value={depositMethod}
              onChange={(e) => setDepositMethod(e.target.value as DepositMethod)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={step !== 'approve'}
            >
              <option value="cctp">CCTP (Ethereum Sepolia → Base Sepolia)</option>
              <option value="rari">Rari (Rari Testnet → Base Sepolia)</option>
            </select>
            <p className="text-xs text-gray-500 mt-1">
              {depositMethod === 'cctp' 
                ? 'Uses Circle CCTP for cross-chain USDC transfer'
                : 'Uses custom attestation flow for chains without CCTP'}
            </p>
          </div>

          {/* Chain Status */}
          {depositMethod === 'cctp' && (
            <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm font-medium text-blue-800 mb-2">
                Current Chain: <span className="font-bold">
                  {chainId === sepolia.id ? 'Ethereum Sepolia ✅' : chainId === baseSepolia.id ? 'Base Sepolia ✅' : `Chain ID ${chainId} (Switch to Ethereum Sepolia or Base Sepolia)`}
                </span>
              </p>
              <div className="flex gap-2">
                {chainId !== sepolia.id && (
                  <button
                    onClick={() => switchChain?.({ chainId: sepolia.id })}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 text-sm"
                    disabled={loading}
                  >
                    Switch to Ethereum Sepolia
                  </button>
                )}
                {chainId !== baseSepolia.id && (
                  <button
                    onClick={() => switchChain?.({ chainId: baseSepolia.id })}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 text-sm"
                    disabled={loading}
                  >
                    Switch to Base Sepolia
                  </button>
                )}
              </div>
              <p className="text-xs text-blue-700 mt-2">
                {chainId === sepolia.id && 'Deposit via CCTP → Base Sepolia'}
                {chainId === baseSepolia.id && 'Direct deposit on Base Sepolia'}
              </p>
            </div>
          )}

          {depositMethod === 'rari' && (
            <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm font-medium text-blue-800 mb-2">
                Current Chain: <span className="font-bold">
                  {chainId === RARI_CHAIN_ID ? 'Rari Testnet ✅' : `Chain ID ${chainId} (Switch to Rari Testnet)`}
                </span>
              </p>
              {chainId !== RARI_CHAIN_ID && (
                <button
                  onClick={() => switchChain?.({ chainId: RARI_CHAIN_ID })}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 text-sm"
                  disabled={loading}
                >
                  Switch to Rari Testnet
                </button>
              )}
              {chainId === RARI_CHAIN_ID && (
                <p className="text-sm text-green-700 mt-2">✅ Connected to Rari Testnet - Ready to deposit</p>
              )}
            </div>
          )}

          {/* Attestation Status */}
          {step === 'attestation' && (
            <div className="bg-yellow-50 border border-yellow-200 text-yellow-700 px-4 py-3 rounded mb-6">
              <p className="font-bold">
                {depositMethod === 'cctp' ? '⏳ Waiting for CCTP attestation...' : '⏳ Getting Rari attestation...'}
              </p>
              {depositTxHash && (
                <p className="mt-2 text-sm">
                  Transaction: <a 
                    href={depositMethod === 'rari' 
                      ? `https://rari-testnet.calderachain.xyz/tx/${depositTxHash}`
                      : `https://sepolia.etherscan.io/tx/${depositTxHash}`}
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="underline"
                  >
                    {depositTxHash.substring(0, 20)}...
                  </a>
                </p>
              )}
              {depositMethod === 'rari' && nonce && (
                <div className="mt-2 p-2 bg-white border border-yellow-300 rounded">
                  <p className="text-xs font-semibold text-gray-700 mb-1">Save this nonce for receiving on Base Sepolia:</p>
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
                <p className="mt-2 text-sm">
                  {depositMethod === 'cctp' ? 'Fetching attestation from Circle API...' : 'Fetching attestation from TEE API...'}
                </p>
              )}
              {depositMethod === 'rari' && !fetchingAttestation && (
                <button
                  onClick={fetchAttestation}
                  disabled={!depositTxHash || !nonce}
                  className="mt-2 px-4 py-2 bg-yellow-600 text-white rounded hover:bg-yellow-700 disabled:opacity-50 text-sm"
                >
                  Fetch Attestation
                </button>
              )}
            </div>
          )}

          {/* Complete Status */}
          {step === 'complete' && attestation && (
            <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded mb-6">
              <p className="font-bold">✅ Attestation received!</p>
              <div className="mt-2 space-y-2">
                <p className="text-sm mb-2">Ready to receive USDC on Base Sepolia</p>
                {depositMethod === 'rari' && nonce && (
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
                )}
                <div className="flex gap-2">
                  <Link
                    href="/receive"
                    className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                  >
                    Go to Receive Page
                  </Link>
                </div>
              </div>
            </div>
          )}

          <div className="space-y-6">
            {/* Trader Selection */}
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
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
            </div>

            {/* Amount Input */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Amount ({depositMethod === 'rari' ? 'MockUSDC' : 'USDC'})
              </label>
              <input
                type="number"
                required
                min="0"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="0.00"
                disabled={step !== 'approve'}
              />
              {depositMethod === 'cctp' && usdcBalance && (
                <p className="text-xs text-gray-500 mt-1">
                  Balance: {formatUnits(usdcBalance.value, 6)} USDC
                </p>
              )}
            </div>

            {/* Action Buttons */}
            {step === 'approve' && (
              <button
                onClick={handleApprove}
                disabled={loading || isPending || !selectedTrader || !amount || 
                  (depositMethod === 'cctp' && chainId !== sepolia.id && chainId !== baseSepolia.id) ||
                  (depositMethod === 'rari' && chainId !== RARI_CHAIN_ID)}
                className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
              >
                {loading || isPending ? 'Approving...' : `1. Approve ${depositMethod === 'rari' ? 'MockUSDC' : 'USDC'}`}
              </button>
            )}

            {step === 'deposit' && (
              <>
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <p className="text-sm text-green-800">✅ {depositMethod === 'rari' ? 'MockUSDC' : 'USDC'} Approved</p>
                </div>
                <button
                  onClick={handleDeposit}
                  disabled={loading || isPending}
                  className="w-full px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition disabled:opacity-50"
                >
                  {loading || isPending ? 'Processing...' : 
                    depositMethod === 'cctp' 
                      ? (chainId === sepolia.id ? '2. Deposit via CCTP' : '2. Deposit USDC')
                      : '2. Deposit MockUSDC on Rari'}
                </button>
              </>
            )}

            {step === 'attestation' && depositMethod === 'cctp' && !fetchingAttestation && (
              <button
                onClick={fetchAttestation}
                disabled={!depositTxHash}
                className="w-full px-6 py-3 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition disabled:opacity-50"
              >
                Fetch Attestation
              </button>
            )}

            {/* Info Box */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-800">
                <strong>Note:</strong>
                {depositMethod === 'cctp' && chainId === sepolia.id && (
                  <> Deposits from Ethereum Sepolia use CCTP. After deposit, go to{' '}
                    <Link href="/receive" className="underline">Receive</Link> page to complete the flow.
                  </>
                )}
                {depositMethod === 'cctp' && chainId === baseSepolia.id && (
                  <> Direct deposits on Base Sepolia. You'll receive OFT vault shares.</>
                )}
                {depositMethod === 'rari' && (
                  <> Rari deposits use custom attestation. After deposit, get attestation and go to{' '}
                    <Link href="/receive" className="underline">Receive</Link> page to complete the flow.
                  </>
                )}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
