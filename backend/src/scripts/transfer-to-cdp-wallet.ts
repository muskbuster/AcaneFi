import { ethers } from 'ethers';
import { cdpWalletService } from '../services/cdpWalletService.js';
import * as dotenv from 'dotenv';

dotenv.config();

/**
 * Transfer USDC and ETH from main wallet to CDP wallet
 * This funds the CDP wallet for on-chain operations
 */
async function main() {
  console.log('=== Transferring Funds to CDP Wallet ===\n');

  try {
    // Get CDP wallet address
    console.log('1️⃣ Getting CDP wallet address...');
    await cdpWalletService.initialize();
    const cdpWalletAddress = await cdpWalletService.getTEEAddress();
    console.log(`✅ CDP Wallet Address: ${cdpWalletAddress}\n`);

    // Get main wallet from private key
    // Allow MAIN_WALLET_PRIVATE_KEY for a different funding wallet
    // Otherwise use PRIVATE_KEY (which is the CDP import key)
    const mainPrivateKey = process.env.MAIN_WALLET_PRIVATE_KEY || process.env.PRIVATE_KEY;
    if (!mainPrivateKey) {
      throw new Error('MAIN_WALLET_PRIVATE_KEY or PRIVATE_KEY not set in environment');
    }
    
    console.log('📋 Using wallet for funding transfers...\n');

    // Decode private key - handle both hex and base64 formats
    let privateKeyHex = mainPrivateKey;
    if (!mainPrivateKey.startsWith('0x')) {
      // Try base64 first
      try {
        const decoded = Buffer.from(mainPrivateKey, 'base64');
        if (decoded.length === 32) {
          // Perfect 32-byte key
          privateKeyHex = `0x${decoded.toString('hex')}`;
          console.log('✅ Decoded base64 private key (32 bytes)\n');
        } else if (decoded.length > 32) {
          // Take first 32 bytes
          const key32 = decoded.slice(0, 32);
          privateKeyHex = `0x${key32.toString('hex')}`;
          console.log(`✅ Decoded base64 private key (using first 32 bytes from ${decoded.length} bytes)\n`);
        } else {
          // Too short, try as hex string instead
          privateKeyHex = `0x${mainPrivateKey}`;
          console.log(`⚠️  Base64 decode too short, trying as hex\n`);
        }
      } catch {
        // Not base64, use as hex
        privateKeyHex = `0x${mainPrivateKey}`;
        console.log('✅ Using private key as hex format\n');
      }
    }

    // Validate private key is 32 bytes (64 hex chars)
    if (privateKeyHex.length !== 66 || !/^0x[0-9a-fA-F]{64}$/.test(privateKeyHex)) {
      throw new Error(`Invalid private key format. Expected 32-byte hex (64 hex chars), got: ${privateKeyHex.length - 2} chars. Key: ${privateKeyHex.substring(0, 20)}...`);
    }

    // Determine network (base-sepolia or ethereum-sepolia)
    const targetNetwork = process.env.TRANSFER_NETWORK || 'base-sepolia';
    const isBaseSepolia = targetNetwork === 'base-sepolia';
    const rpcUrl = isBaseSepolia 
      ? (process.env.RPC_BASE_SEPOLIA || 'https://sepolia.base.org')
      : (process.env.RPC_ETHEREUM_SEPOLIA || 'https://rpc.sepolia.org' || 'https://sepolia.gateway.tenderly.co');
    
    console.log(`📋 Target Network: ${targetNetwork}\n`);
    
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const mainWallet = new ethers.Wallet(privateKeyHex, provider);

    console.log('2️⃣ Main Wallet Info:');
    console.log(`   Address: ${mainWallet.address}`);
    
    // Check balances
    const mainEthBalance = await provider.getBalance(mainWallet.address);
    const mainEthBalanceFormatted = ethers.formatEther(mainEthBalance);
    console.log(`   ETH Balance: ${mainEthBalanceFormatted} ETH`);

    // USDC addresses (different for each network)
    const USDC_ADDRESS = isBaseSepolia 
      ? '0x036CbD53842c5426634e7929541eC2318f3dCF7e' // Base Sepolia
      : '0x1c7d4b196cb0c7b01d743fbc6116a902379c7238'; // Ethereum Sepolia
    const usdcAbi = [
      'function balanceOf(address) view returns (uint256)',
      'function decimals() view returns (uint8)',
      'function transfer(address to, uint256 amount) returns (bool)',
    ];
    const usdcContract = new ethers.Contract(USDC_ADDRESS, usdcAbi, provider);
    
    const mainUsdcBalance = await usdcContract.balanceOf(mainWallet.address);
    const usdcDecimals = await usdcContract.decimals();
    const mainUsdcBalanceFormatted = ethers.formatUnits(mainUsdcBalance, usdcDecimals);
    console.log(`   USDC Balance: ${mainUsdcBalanceFormatted} USDC\n`);

    // Check CDP wallet balances
    console.log('3️⃣ CDP Wallet Balances:');
    const cdpEthBalance = await provider.getBalance(cdpWalletAddress);
    const cdpEthBalanceFormatted = ethers.formatEther(cdpEthBalance);
    console.log(`   ETH Balance: ${cdpEthBalanceFormatted} ETH`);

    const cdpUsdcBalance = await usdcContract.balanceOf(cdpWalletAddress);
    const cdpUsdcBalanceFormatted = ethers.formatUnits(cdpUsdcBalance, usdcDecimals);
    console.log(`   USDC Balance: ${cdpUsdcBalanceFormatted} USDC\n`);

    // Transfer amounts (adjustable via env or use defaults)
    const ethAmount = process.env.TRANSFER_ETH_AMOUNT || '0.01';
    const usdcAmount = process.env.TRANSFER_USDC_AMOUNT || '10';
    const ethToTransfer = ethers.parseEther(ethAmount);
    const usdcToTransfer = ethers.parseUnits(usdcAmount, usdcDecimals);

    console.log('4️⃣ Transferring funds...');
    console.log(`   ETH: ${ethers.formatEther(ethToTransfer)} ETH`);
    console.log(`   USDC: ${ethers.formatUnits(usdcToTransfer, usdcDecimals)} USDC\n`);

    // Check if main wallet has enough funds
    if (mainEthBalance < ethToTransfer) {
      throw new Error(`Insufficient ETH. Need ${ethers.formatEther(ethToTransfer)} ETH, have ${mainEthBalanceFormatted} ETH`);
    }

    if (mainUsdcBalance < usdcToTransfer) {
      throw new Error(`Insufficient USDC. Need ${ethers.formatUnits(usdcToTransfer, usdcDecimals)} USDC, have ${mainUsdcBalanceFormatted} USDC`);
    }

    // Transfer ETH
    console.log('   Transferring ETH...');
    const ethTx = await mainWallet.sendTransaction({
      to: cdpWalletAddress,
      value: ethToTransfer,
    });
    console.log(`   ✅ ETH transfer sent: ${ethTx.hash}`);
    const ethReceipt = await ethTx.wait();
    console.log(`   ✅ ETH transfer confirmed in block: ${ethReceipt?.blockNumber}\n`);

    // Transfer USDC
    console.log('   Transferring USDC...');
    const usdcContractWithSigner = usdcContract.connect(mainWallet);
    const usdcTx = await usdcContractWithSigner.transfer(cdpWalletAddress, usdcToTransfer);
    console.log(`   ✅ USDC transfer sent: ${usdcTx.hash}`);
    const usdcReceipt = await usdcTx.wait();
    console.log(`   ✅ USDC transfer confirmed in block: ${usdcReceipt?.blockNumber}\n`);

    // Verify final balances (wait a moment for state to update)
    console.log('5️⃣ Verifying final balances...');
    await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds for state update
    
    const finalCdpEthBalance = await provider.getBalance(cdpWalletAddress);
    const finalCdpUsdcBalance = await usdcContract.balanceOf(cdpWalletAddress);
    
    console.log(`   CDP Wallet ETH: ${ethers.formatEther(finalCdpEthBalance)} ETH`);
    console.log(`   CDP Wallet USDC: ${ethers.formatUnits(finalCdpUsdcBalance, usdcDecimals)} USDC\n`);

    const explorerBase = isBaseSepolia 
      ? 'https://sepolia.basescan.org'
      : 'https://sepolia.etherscan.io';
    
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ Transfer Complete!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`\n📋 Transaction Hashes:`);
    console.log(`   Network: ${targetNetwork}`);
    console.log(`   ETH: ${explorerBase}/tx/${ethTx.hash}`);
    console.log(`   USDC: ${explorerBase}/tx/${usdcTx.hash}`);
    console.log(`\n💡 CDP wallet is now funded on ${targetNetwork} and ready for on-chain operations!`);

  } catch (error: any) {
    console.error('\n❌ Error transferring funds:');
    console.error(`   ${error.message}`);
    if (error.stack) {
      console.error(`\n   Stack trace:\n${error.stack}`);
    }
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

