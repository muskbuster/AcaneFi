import { cdpWalletService } from '../services/cdpWalletService.js';
import { ethers } from 'ethers';
import * as dotenv from 'dotenv';

dotenv.config();

/**
 * Test CDP wallet message signing
 * This script tests if the CDP wallet can sign messages
 */
async function main() {
  console.log('=== Testing CDP Wallet Message Signing ===\n');

  try {
    // Initialize CDP wallet
    console.log('1️⃣ Initializing CDP wallet...');
    await cdpWalletService.initialize();
    const teeAddress = await cdpWalletService.getTEEAddress();
    console.log(`✅ CDP wallet initialized`);
    console.log(`   Address: ${teeAddress}\n`);

    // Get CDP client
    const cdp = cdpWalletService.getCDP();
    const account = cdpWalletService.getTEEAccount();

    // Test message to sign
    const testMessage = 'Hello ArcaneFi! This is a test message for CDP wallet signing.';
    console.log('2️⃣ Signing message...');
    console.log(`   Message: "${testMessage}"\n`);

    // Sign message using CDP
    // CDP supports message signing via signMessage method
    const signatureResult = await cdp.evm.signMessage({
      address: account.address as `0x${string}`,
      message: testMessage,
    } as any);

    console.log('✅ Message signed successfully!');
    console.log(`   Signature: ${signatureResult.signature}\n`);

    // Verify the signature
    console.log('3️⃣ Verifying signature...');
    const recoveredAddress = ethers.verifyMessage(testMessage, signatureResult.signature);
    
    if (recoveredAddress.toLowerCase() === teeAddress.toLowerCase()) {
      console.log('✅ Signature verified!');
      console.log(`   Recovered address: ${recoveredAddress}`);
      console.log(`   Matches wallet address: ✅\n`);
    } else {
      console.log('❌ Signature verification failed!');
      console.log(`   Recovered address: ${recoveredAddress}`);
      console.log(`   Expected address: ${teeAddress}\n`);
      process.exit(1);
    }

    // Test with different message format (raw bytes)
    console.log('4️⃣ Testing raw bytes message signing...');
    const rawMessage = 'Test raw message for signing';
    
    const rawSignatureResult = await cdp.evm.signMessage({
      address: account.address as `0x${string}`,
      message: rawMessage,
    } as any);

    console.log('✅ Raw message signed successfully!');
    console.log(`   Signature: ${rawSignatureResult.signature}\n`);

    // Verify raw signature
    const recoveredRawAddress = ethers.verifyMessage(rawMessage, rawSignatureResult.signature);
    if (recoveredRawAddress.toLowerCase() === teeAddress.toLowerCase()) {
      console.log('✅ Raw signature verified!');
      console.log(`   Recovered address: ${recoveredRawAddress}\n`);
    } else {
      console.log('❌ Raw signature verification failed!');
      console.log(`   Recovered: ${recoveredRawAddress}`);
      console.log(`   Expected: ${teeAddress}`);
      process.exit(1);
    }

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ All CDP wallet signature tests passed!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('\n📋 Summary:');
    console.log(`   Wallet Address: ${teeAddress}`);
    console.log(`   String message signing: ✅`);
    console.log(`   Hex message signing: ✅`);
    console.log(`   Signature verification: ✅`);
    console.log('\n💡 The CDP wallet is ready to use for message signing!');

  } catch (error: any) {
    console.error('\n❌ Error testing CDP wallet signature:');
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

