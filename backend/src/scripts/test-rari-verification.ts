/**
 * Test script for Rari deposit verification endpoint
 * 
 * Usage:
 *   npm run test:rari-verification
 * 
 * Or directly:
 *   npx ts-node src/scripts/test-rari-verification.ts
 */

import axios from 'axios';

const API_URL = process.env.API_URL || 'http://localhost:3001';

async function testRariVerification() {
  console.log('🧪 Testing Rari Deposit Verification Endpoint\n');

  // Test data (from a real Rari deposit)
  const testData = {
    amount: '1000000', // 1 USDC (6 decimals)
    nonce: '1001',
    sourceChainId: '1918988905', // Rari chain ID
    signature: '0xb03ebdd5acdb5551e5...', // Example signature (truncated)
  };

  console.log('📋 Test Data:');
  console.log(`   Amount: ${testData.amount} (${parseInt(testData.amount) / 1e6} USDC)`);
  console.log(`   Nonce: ${testData.nonce}`);
  console.log(`   Source Chain ID: ${testData.sourceChainId}`);
  console.log(`   Signature: ${testData.signature.substring(0, 20)}...\n`);

  try {
    console.log(`📡 Calling POST ${API_URL}/api/tee/verify-rari-deposit...`);
    const response = await axios.post(`${API_URL}/api/tee/verify-rari-deposit`, testData, {
      timeout: 30000,
    });

    console.log('✅ Response received:');
    console.log(JSON.stringify(response.data, null, 2));

    if (response.data.success && response.data.verified) {
      console.log('\n✅ Verification successful!');
      console.log(`   Deposit verified: ${response.data.deposit ? 'Yes' : 'No'}`);
      console.log(`   Message: ${response.data.message}`);
    } else {
      console.log('\n❌ Verification failed');
      console.log(`   Message: ${response.data.message}`);
    }
  } catch (error: any) {
    if (error.response) {
      console.error('❌ API Error:');
      console.error(`   Status: ${error.response.status}`);
      console.error(`   Data:`, JSON.stringify(error.response.data, null, 2));
    } else if (error.code === 'ECONNREFUSED') {
      console.error('❌ Connection refused. Is the backend server running?');
      console.error(`   Start with: cd backend && npm run dev`);
    } else {
      console.error('❌ Error:', error.message);
    }
    process.exit(1);
  }
}

testRariVerification().catch(console.error);

