import { useState, useEffect } from 'react';
import { useAccount, useChainId, useSwitchChain } from 'wagmi';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { baseSepolia } from 'wagmi/chains';
import { cctpApi, rariApi } from '../lib/api';

interface RariDeposit {
  id: string;
  userAddress: string;
  amount: string;
  amountFormatted: string;
  nonce: string;
  sourceChainId: string;
  depositTxHash: string;
  createdAt: string;
  redeemed: boolean;
}

interface CCTPDeposit {
  id: string;
  userAddress: string;
  transactionHash: string;
  sourceDomain: number;
  sourceChainId: number;
  sourceChainName: string;
  createdAt: string;
  redeemed: boolean;
  attestation?: {
    message: string;
    attestation: string;
    status: string;
  };
}

type SourceChain = 'ethereum-sepolia' | 'rari';

interface ChainOption {
  value: SourceChain;
  label: string;
  type: 'cctp' | 'rari';
  chainId: number;
  sourceDomain?: number; // For CCTP
}

const CHAIN_OPTIONS: ChainOption[] = [
  {
    value: 'ethereum-sepolia',
    label: 'Ethereum Sepolia (CCTP)',
    type: 'cctp',
    chainId: 11155111,
    sourceDomain: 0,
  },
  {
    value: 'rari',
    label: 'Rari Testnet',
    type: 'rari',
    chainId: 1918988905,
  },
];

export default function Receive() {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const { switchChain } = useSwitchChain();
  
  const [sourceChain, setSourceChain] = useState<SourceChain>('ethereum-sepolia');
  const [transactionHash, setTransactionHash] = useState('');
  const [amount, setAmount] = useState('');
  const [nonce, setNonce] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [attestation, setAttestation] = useState<any>(null);
  const [receiving, setReceiving] = useState(false);
  const [rariDeposits, setRariDeposits] = useState<RariDeposit[]>([]);
  const [cctpDeposits, setCctpDeposits] = useState<CCTPDeposit[]>([]);
  const [selectedDeposit, setSelectedDeposit] = useState<RariDeposit | CCTPDeposit | null>(null);
  const [loadingDeposits, setLoadingDeposits] = useState(false);

  const selectedChain = CHAIN_OPTIONS.find(c => c.value === sourceChain)!;
  const isCCTP = selectedChain.type === 'cctp';

  // Load unredeemed deposits when user is connected
  useEffect(() => {
    if (isConnected && address) {
      if (isCCTP) {
        loadCCTPDeposits();
      } else {
        loadRariDeposits();
      }
    }
  }, [isConnected, address, isCCTP]);

  const loadRariDeposits = async () => {
    if (!address) return;
    
    setLoadingDeposits(true);
    try {
      const result = await rariApi.getUnredeemedDeposits(address);
      if (result.success) {
        setRariDeposits(result.deposits || []);
      }
    } catch (err) {
      console.error('Failed to load Rari deposits:', err);
    } finally {
      setLoadingDeposits(false);
    }
  };

  const loadCCTPDeposits = async () => {
    if (!address) return;
    
    setLoadingDeposits(true);
    try {
      const result = await cctpApi.getUnredeemedDeposits(address);
      if (result.success) {
        setCctpDeposits(result.deposits || []);
      }
    } catch (err) {
      console.error('Failed to load CCTP deposits:', err);
    } finally {
      setLoadingDeposits(false);
    }
  };

  const handleSelectDeposit = (deposit: RariDeposit | CCTPDeposit) => {
    setSelectedDeposit(deposit);
    if ('nonce' in deposit) {
      // Rari deposit
      setAmount(deposit.amountFormatted);
      setNonce(deposit.nonce);
    } else {
      // CCTP deposit
      setTransactionHash(deposit.transactionHash);
      // If attestation already exists, use it
      if (deposit.attestation) {
        setAttestation(deposit.attestation);
      }
    }
    setError('');
  };

  // Reset form when chain changes
  const handleChainChange = (newChain: SourceChain) => {
    setSourceChain(newChain);
    setTransactionHash('');
    setAmount('');
    setNonce('');
    setAttestation(null);
    setError('');
    setSelectedDeposit(null);
    // Reload deposits for the new chain
    if (isConnected && address) {
      if (newChain === 'ethereum-sepolia') {
        loadCCTPDeposits();
      } else {
        loadRariDeposits();
      }
    }
  };

  const handleFetchAttestation = async () => {
    setLoading(true);
    setError('');

    try {
      if (isCCTP) {
        // CCTP flow: fetch attestation from Circle API
        if (!transactionHash) {
          setError('Please enter transaction hash');
          setLoading(false);
          return;
        }

        const sourceDomain = selectedChain.sourceDomain!;
        const result = await cctpApi.pollAttestation(
          sourceDomain,
          transactionHash,
          30, // max attempts
          5000 // 5 second intervals
        );

        setAttestation(result);
        
        // Update attestation in backend storage if deposit exists
        if (selectedDeposit && 'transactionHash' in selectedDeposit) {
          try {
            await cctpApi.updateAttestation({
              id: selectedDeposit.id,
              attestation: result,
            });
          } catch (err) {
            console.error('Failed to update attestation in storage:', err);
          }
        }
        
        alert('Attestation retrieved! You can now receive USDC on Base Sepolia.');
      } else {
        // Rari flow: get attestation from backend
        if (!amount || !nonce) {
          setError('Please enter amount and nonce');
          setLoading(false);
          return;
        }

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
      }
    } catch (err: any) {
      console.error('Attestation error:', err);
      setError(err.message || 'Failed to fetch attestation');
    } finally {
      setLoading(false);
    }
  };

  const handleReceiveUSDC = async () => {
    if (!attestation) {
      setError('Please fetch attestation first');
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
      if (isCCTP) {
        // CCTP receive flow
        // Validate attestation structure
        if (!attestation.message || !attestation.attestation) {
          setError('Invalid attestation data. Please fetch attestation again.');
          console.error('Invalid attestation structure:', attestation);
          setReceiving(false);
          return;
        }

        // Validate hex strings
        if (typeof attestation.message !== 'string' || typeof attestation.attestation !== 'string') {
          setError('Attestation message and attestation must be strings');
          setReceiving(false);
          return;
        }

        if (!attestation.message.startsWith('0x') || !attestation.attestation.startsWith('0x')) {
          setError('Attestation message and attestation must be hex strings starting with 0x');
          setReceiving(false);
          return;
        }

        console.log('📤 Receiving USDC with CCTP attestation:', {
          message: attestation.message.substring(0, 30) + '...',
          attestation: attestation.attestation.substring(0, 30) + '...',
        });

        const result = await cctpApi.receiveBridgedUSDC(
          attestation.message,
          attestation.attestation
        );

        if (result.success) {
          const txHash = result.transactionHash;
          
          if (!txHash) {
            console.warn('Transaction hash not found in result:', result);
            setError('Transaction completed but hash not available');
            setReceiving(false);
            return;
          }

          // Delete deposit from storage after successful receive
          if (selectedDeposit && 'transactionHash' in selectedDeposit) {
            try {
              await cctpApi.markAsRedeemed({
                id: selectedDeposit.id,
                redeemTxHash: txHash,
              });
              // Reload deposits list
              await loadCCTPDeposits();
            } catch (err) {
              console.error('Failed to mark deposit as redeemed:', err);
            }
          } else if (transactionHash) {
            // Try to mark by transaction hash if we have it
            try {
              await cctpApi.markAsRedeemed({
                transactionHash,
                userAddress: address,
                redeemTxHash: txHash,
              });
              await loadCCTPDeposits();
            } catch (err) {
              console.error('Failed to mark deposit as redeemed:', err);
            }
          }

          alert(`USDC received successfully! Transaction: ${txHash}`);
          // Reset form
          setTransactionHash('');
          setAttestation(null);
          setSelectedDeposit(null);
        } else {
          setError(result.error || 'Failed to receive USDC');
        }
      } else {
        // Rari receive flow
        if (!amount || !nonce) {
          setError('Please enter amount and nonce');
          setReceiving(false);
          return;
        }

        // Convert to wei (6 decimals for USDC)
        const amountInWei = BigInt(Math.floor(parseFloat(amount) * 1000000)).toString();

        const result = await rariApi.verifyAndReceive({
          amount: amountInWei,
          nonce,
          sourceChainId: selectedChain.chainId.toString(),
          signature: attestation.signature,
        });

        if (result.success) {
          const txHash = result.transactionHash || result.deposit?.transactionHash;
          
          if (!txHash) {
            console.warn('Transaction hash not found in result:', result);
            setError('Transaction completed but hash not available');
            setReceiving(false);
            return;
          }

          // Mark deposit as redeemed in backend
          if (selectedDeposit) {
            try {
              await rariApi.markAsRedeemed({
                id: selectedDeposit.id,
                redeemTxHash: txHash,
              });
              // Reload deposits list
              await loadRariDeposits();
            } catch (err) {
              console.error('Failed to mark deposit as redeemed:', err);
            }
          } else if (nonce) {
            // Try to mark by nonce if we have it
            try {
              await rariApi.markAsRedeemed({
                nonce,
                userAddress: address,
                redeemTxHash: txHash,
              });
              await loadRariDeposits();
            } catch (err) {
              console.error('Failed to mark deposit as redeemed:', err);
            }
          }

          alert(`USDC received successfully! Transaction: ${txHash}`);
          // Reset form
          setAmount('');
          setNonce('');
          setAttestation(null);
          setSelectedDeposit(null);
        } else {
          setError(result.error || 'Failed to receive USDC');
        }
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
          <h1 className="text-3xl font-bold text-gray-900 mb-6">Receive Deposit</h1>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
              {error}
            </div>
          )}

          {/* Chain Status and Switcher */}
          <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <p className="text-sm font-medium text-blue-800 mb-2">
              Current Chain: <span className="font-bold">{chainId === baseSepolia.id ? 'Base Sepolia ✅' : `Chain ID ${chainId} (Switch to Base Sepolia)`}</span>
            </p>
            {chainId !== baseSepolia.id && (
              <button
                onClick={() => switchChain?.({ chainId: baseSepolia.id })}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
                disabled={loading || receiving}
              >
                Switch to Base Sepolia
              </button>
            )}
            {chainId === baseSepolia.id && (
              <p className="text-sm text-green-700 mt-2">✅ Connected to Base Sepolia - Ready to receive USDC</p>
            )}
          </div>

          <div className="space-y-6">
            {/* Source Chain Dropdown */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Source Chain
              </label>
              <select
                value={sourceChain}
                onChange={(e) => handleChainChange(e.target.value as SourceChain)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={!!attestation}
              >
                {CHAIN_OPTIONS.map((chain) => (
                  <option key={chain.value} value={chain.value}>
                    {chain.label}
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-500 mt-1">
                {isCCTP 
                  ? 'CCTP: Enter the transaction hash from your deposit'
                  : 'Rari: Enter the amount and nonce from your deposit'}
              </p>
            </div>

            {/* CCTP Inputs */}
            {isCCTP && (
              <>
                {/* Unredeemed CCTP Deposits List */}
                {cctpDeposits.length > 0 && !attestation && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <p className="text-sm font-semibold text-blue-900 mb-3">
                      📋 Your Unredeemed CCTP Deposits ({cctpDeposits.length})
                    </p>
                    <div className="space-y-2 max-h-60 overflow-y-auto">
                      {cctpDeposits.map((deposit) => (
                        <button
                          key={deposit.id}
                          onClick={() => handleSelectDeposit(deposit)}
                          className={`w-full text-left p-3 rounded border transition ${
                            selectedDeposit?.id === deposit.id
                              ? 'bg-blue-100 border-blue-400'
                              : 'bg-white border-gray-300 hover:border-blue-300'
                          }`}
                        >
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="font-semibold text-sm">
                                {deposit.sourceChainName}
                              </p>
                              <p className="text-xs text-gray-600 mt-1">
                                TX: {deposit.transactionHash.substring(0, 20)}...
                              </p>
                              <p className="text-xs text-gray-500 mt-1">
                                {new Date(deposit.createdAt).toLocaleString()}
                              </p>
                              {deposit.attestation && (
                                <p className="text-xs text-green-600 mt-1">
                                  ✅ Attestation ready
                                </p>
                              )}
                            </div>
                            <a
                              href={`https://sepolia.etherscan.io/tx/${deposit.transactionHash}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-blue-600 hover:underline"
                              onClick={(e) => e.stopPropagation()}
                            >
                              View TX
                            </a>
                          </div>
                        </button>
                      ))}
                    </div>
                    <button
                      onClick={loadCCTPDeposits}
                      disabled={loadingDeposits}
                      className="mt-3 text-xs text-blue-600 hover:underline"
                    >
                      {loadingDeposits ? 'Refreshing...' : '🔄 Refresh List'}
                    </button>
                  </div>
                )}

                {cctpDeposits.length === 0 && !loadingDeposits && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                    <p className="text-sm text-yellow-800">
                      No unredeemed CCTP deposits found. Make a deposit first, or enter transaction hash manually below.
                    </p>
                  </div>
                )}

                <div className="text-sm font-medium text-gray-700 mb-2">
                  {selectedDeposit && 'transactionHash' in selectedDeposit ? 'Selected Deposit Details' : 'Or Enter Manually'}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Burn Transaction Hash
                  </label>
                  <input
                    type="text"
                    value={transactionHash}
                    onChange={(e) => {
                      setTransactionHash(e.target.value);
                      setSelectedDeposit(null);
                    }}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="0x..."
                    disabled={!!attestation}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Transaction hash from your CCTP deposit on {selectedChain.label}
                  </p>
                </div>
              </>
            )}

            {/* Rari Inputs */}
            {!isCCTP && (
              <>
                {/* Unredeemed Deposits List */}
                {rariDeposits.length > 0 && !attestation && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <p className="text-sm font-semibold text-blue-900 mb-3">
                      📋 Your Unredeemed Deposits ({rariDeposits.length})
                    </p>
                    <div className="space-y-2 max-h-60 overflow-y-auto">
                      {rariDeposits.map((deposit) => (
                        <button
                          key={deposit.id}
                          onClick={() => handleSelectDeposit(deposit)}
                          className={`w-full text-left p-3 rounded border transition ${
                            selectedDeposit?.id === deposit.id
                              ? 'bg-blue-100 border-blue-400'
                              : 'bg-white border-gray-300 hover:border-blue-300'
                          }`}
                        >
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="font-semibold text-sm">
                                {deposit.amountFormatted} USDC
                              </p>
                              <p className="text-xs text-gray-600 mt-1">
                                Nonce: {deposit.nonce.substring(0, 20)}...
                              </p>
                              <p className="text-xs text-gray-500 mt-1">
                                {new Date(deposit.createdAt).toLocaleString()}
                              </p>
                            </div>
                            <a
                              href={`https://rari-testnet.calderachain.xyz/tx/${deposit.depositTxHash}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-blue-600 hover:underline"
                              onClick={(e) => e.stopPropagation()}
                            >
                              View TX
                            </a>
                          </div>
                        </button>
                      ))}
                    </div>
                    <button
                      onClick={loadRariDeposits}
                      disabled={loadingDeposits}
                      className="mt-3 text-xs text-blue-600 hover:underline"
                    >
                      {loadingDeposits ? 'Refreshing...' : '🔄 Refresh List'}
                    </button>
                  </div>
                )}

                {rariDeposits.length === 0 && !loadingDeposits && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                    <p className="text-sm text-yellow-800">
                      No unredeemed deposits found. Make a deposit first, or enter details manually below.
                    </p>
                  </div>
                )}

                <div className="text-sm font-medium text-gray-700 mb-2">
                  {selectedDeposit ? 'Selected Deposit Details' : 'Or Enter Manually'}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Amount (USDC)
                  </label>
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => {
                      setAmount(e.target.value);
                      setSelectedDeposit(null);
                    }}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="1.0"
                    step="0.01"
                    min="0"
                    disabled={!!attestation}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nonce
                  </label>
                  <input
                    type="text"
                    value={nonce}
                    onChange={(e) => {
                      setNonce(e.target.value);
                      setSelectedDeposit(null);
                    }}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter nonce from deposit"
                    disabled={!!attestation}
                  />
                </div>
              </>
            )}

            {/* Fetch Attestation Button */}
            {!attestation && (
              <button
                onClick={handleFetchAttestation}
                disabled={
                  loading ||
                  (isCCTP ? !transactionHash : !amount || !nonce) ||
                  chainId !== baseSepolia.id
                }
                className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
              >
                {loading
                  ? 'Fetching Attestation...'
                  : isCCTP
                  ? 'Fetch CCTP Attestation'
                  : 'Get Rari Attestation'}
              </button>
            )}

            {/* Attestation Retrieved */}
            {attestation && (
              <>
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <p className="text-sm text-green-800 font-bold">
                    ✅ Attestation retrieved!
                  </p>
                  {isCCTP && (
                    <p className="text-xs text-green-700 mt-2">
                      Status: {attestation.status || 'complete'}
                      <br />
                      Source: {selectedChain.label}
                    </p>
                  )}
                  {!isCCTP && (
                    <p className="text-xs text-green-700 mt-2">
                      Amount: {amount} USDC
                      <br />
                      Nonce: {nonce}
                      <br />
                      Source Chain: {selectedChain.label}
                    </p>
                  )}
                </div>

                <button
                  onClick={handleReceiveUSDC}
                  disabled={receiving || chainId !== baseSepolia.id}
                  className="w-full px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition disabled:opacity-50"
                >
                  {chainId !== baseSepolia.id
                    ? 'Switch to Base Sepolia to Receive'
                    : receiving
                    ? 'Receiving USDC...'
                    : 'Receive USDC on Base Sepolia'}
                </button>
              </>
            )}

            {/* Instructions */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-800 font-bold mb-2">Instructions:</p>
              {isCCTP ? (
                <ol className="text-sm text-blue-800 list-decimal list-inside space-y-1">
                  <li>Select "Ethereum Sepolia (CCTP)" as source chain</li>
                  <li>Enter the transaction hash from your CCTP deposit</li>
                  <li>Click "Fetch CCTP Attestation" to retrieve from Circle API</li>
                  <li>Switch to Base Sepolia and click "Receive USDC"</li>
                  <li>USDC will be minted to TEE wallet on Base Sepolia</li>
                </ol>
              ) : (
                <>
                  <ol className="text-sm text-blue-800 list-decimal list-inside space-y-1 mb-3">
                    <li>Select "Rari Testnet" as source chain</li>
                    <li>Enter the amount and nonce from your Rari deposit</li>
                    <li>Click "Get Rari Attestation" to retrieve TEE signature</li>
                    <li>Switch to Base Sepolia and click "Receive USDC"</li>
                    <li>USDC will be transferred to TEE wallet on Base Sepolia</li>
                  </ol>
                  <div className="bg-yellow-50 border border-yellow-300 rounded p-3 mt-3">
                    <p className="text-xs font-semibold text-yellow-900 mb-1">📋 Where to find the Nonce:</p>
                    <p className="text-xs text-yellow-800">
                      After completing a Rari deposit, the nonce is displayed on the deposit page. 
                      Look for the "Nonce" field in the success message after your deposit transaction completes. 
                      You can copy it using the "Copy" button, or it's shown in the green success box.
                    </p>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

