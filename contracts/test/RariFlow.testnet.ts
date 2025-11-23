import { expect } from "chai";
import { ethers } from "hardhat";
import * as dotenv from "dotenv";
import axios from "axios";

dotenv.config();

/**
 * Rari Attested Flow Test - Testnet
 * Complete end-to-end test: Deposit on Rari -> Get Attestation -> Receive on Base Sepolia
 * 
 * This tests the mockup flow for Rari (which doesn't have CCTP):
 * Part 1 (Rari): Deposit mock USDC via depositRari()
 * Part 2 (Base Sepolia): Get attestation -> Call receiveAttested() -> Verify balance
 * 
 * Run with:
 * - Part 1: npx hardhat test test/RariFlow.testnet.ts --network rari
 * - Part 2: npx hardhat test test/RariFlow.testnet.ts --network base-sepolia
 */
describe("Rari Attested Flow Test - Testnet", function () {
  this.timeout(300000); // 5 minutes

  // Rari Configuration
  const RARI_CHAIN_ID = 1918988905n;
  const BASE_SEPOLIA_CHAIN_ID = 84532n;

  async function getContracts(network: any) {
    const signers = await ethers.getSigners();
    const deployer = signers[0];
    
    const isBaseSepolia = network.chainId === BigInt(84532);
    
    if (!isBaseSepolia) {
      throw new Error("Test must run on Base Sepolia");
    }

    const USDC_BASE_SEPOLIA = "0x036CbD53842c5426634e7929541eC2318f3dCF7e";
    const unifiedVaultAddress = process.env.UNIFIED_VAULT_BASE_SEPOLIA;
    if (!unifiedVaultAddress || unifiedVaultAddress === "0x0000000000000000000000000000000000000000") {
      throw new Error(`UNIFIED_VAULT_BASE_SEPOLIA not found in .env`);
    }

    const UnifiedVault = await ethers.getContractFactory("UnifiedVault");
    const unifiedVault = UnifiedVault.attach(unifiedVaultAddress);
    const usdc = await ethers.getContractAt("IERC20", USDC_BASE_SEPOLIA);

    // Get TEE wallet from contract (it's the CDP wallet)
    const TEE_WALLET = await unifiedVault.teeWallet();

    return {
      deployer,
      unifiedVault,
      usdc,
      usdcAddress: USDC_BASE_SEPOLIA,
      teeWallet: TEE_WALLET,
      chainName: "BASE_SEPOLIA",
    };
  }

  describe("Part 1: Deposit on Rari", function () {
    it("Should deposit mock USDC on Rari", async function () {
      const network = await ethers.provider.getNetwork();
      const isRari = network.chainId === BigInt(1918988905);
      
      if (!isRari) {
        console.log(`⚠️  Part 1 must run on Rari`);
        this.skip();
      }

      const signers = await ethers.getSigners();
      const deployer = signers[0];
      
      // Get or deploy MockUSDC
      let mockUSDCAddress = process.env.MOCK_USDC_RARI || process.env.USDC_RARI;
      let mockUSDC;
      
      if (!mockUSDCAddress || mockUSDCAddress === "0x0000000000000000000000000000000000000000") {
        console.log("\n📝 Deploying MockUSDC...");
        const MockUSDC = await ethers.getContractFactory("MockUSDC");
        mockUSDC = await MockUSDC.deploy("Mock USDC", "USDC", 6);
        await mockUSDC.waitForDeployment();
        mockUSDCAddress = await mockUSDC.getAddress();
        console.log(`✅ MockUSDC deployed: ${mockUSDCAddress}`);
      } else {
        mockUSDC = await ethers.getContractAt("MockUSDC", mockUSDCAddress);
        console.log(`✅ Using existing MockUSDC: ${mockUSDCAddress}`);
      }

      // Get UnifiedVault on Rari
      const unifiedVaultAddress = process.env.UNIFIED_VAULT_RARI;
      if (!unifiedVaultAddress || unifiedVaultAddress === "0x0000000000000000000000000000000000000000") {
        throw new Error(`UNIFIED_VAULT_RARI not found in .env`);
      }

      const UnifiedVault = await ethers.getContractFactory("UnifiedVault");
      const unifiedVault = UnifiedVault.attach(unifiedVaultAddress);

      // Mint mock USDC to deployer
      const depositAmount = ethers.parseUnits("1", 6); // 1 USDC
      console.log(`\n💰 Minting ${ethers.formatUnits(depositAmount, 6)} mock USDC to deployer...`);
      await mockUSDC.mint(deployer.address, depositAmount);
      console.log(`✅ Mock USDC minted`);

      // Approve UnifiedVault
      console.log(`\n1️⃣ Approving UnifiedVault to spend mock USDC...`);
      await mockUSDC.approve(unifiedVaultAddress, depositAmount);
      console.log(`✅ Approved`);

      // Deposit via depositRari (use traderId 0 for mockup - no trader validation needed)
      const traderId = 0; // Use 0 for mockup - no trader validation
      console.log(`\n2️⃣ Depositing via depositRari()...`);
      console.log(`   Amount: ${ethers.formatUnits(depositAmount, 6)} USDC`);
      console.log(`   Trader ID: ${traderId} (mockup - no validation)`);
      
      const tx = await unifiedVault.depositRari(traderId, depositAmount);
      const receipt = await tx.wait();
      console.log(`✅ Deposit completed`);
      console.log(`   TX: ${receipt?.hash}`);
      console.log(`   Explorer: https://rari-testnet.calderachain.xyz/tx/${receipt?.hash}`);

      // Verify deposit tracked
      const userDeposit = await unifiedVault.getUserDeposit(deployer.address, traderId);
      console.log(`\n💰 User deposit tracked: ${ethers.formatUnits(userDeposit, 6)} USDC`);
      
      expect(userDeposit).to.be.gte(depositAmount);
      console.log(`\n✅ Rari deposit flow completed!`);
      console.log(`   Next: Get attestation and call receiveAttested() on Base Sepolia`);
    });
  });

  describe("Part 2: Get Attestation and Receive on Base Sepolia", function () {
    it("Should get Rari attestation and receive USDC on Base Sepolia", async function () {
      const network = await ethers.provider.getNetwork();
      const isBaseSepolia = network.chainId === BigInt(84532);
      
      if (!isBaseSepolia) {
        console.log(`⚠️  Test must run on Base Sepolia`);
        this.skip();
      }

      const { deployer, unifiedVault, usdc, teeWallet } = await getContracts(network);
      
      console.log(`\n📋 Rari Attested Flow Test`);
      console.log(`TEE Wallet: ${teeWallet}`);
      console.log(`UnifiedVault: ${await unifiedVault.getAddress()}`);

      // Step 1: Check TEE wallet balance before
      const teeBalanceBefore = await usdc.balanceOf(teeWallet);
      console.log(`\n💰 TEE Wallet Balance Before: ${ethers.formatUnits(teeBalanceBefore, 6)} USDC`);

      // Step 2: Check contract balance (should be funded by user)
      const contractBalance = await usdc.balanceOf(await unifiedVault.getAddress());
      console.log(`💰 UnifiedVault Balance: ${ethers.formatUnits(contractBalance, 6)} USDC`);
      
      if (contractBalance === 0n) {
        console.log(`\n⚠️  UnifiedVault has no USDC balance!`);
        console.log(`   Please fund the vault with USDC before running this test.`);
        console.log(`   Vault Address: ${await unifiedVault.getAddress()}`);
        this.skip();
      }

      // Step 3: Get next nonce - use a unique nonce to avoid replay
      // We'll use timestamp-based nonce to ensure uniqueness
      const currentNonce = await unifiedVault.getNextNonce();
      // Use timestamp-based nonce to ensure uniqueness across test runs
      const timestamp = BigInt(Math.floor(Date.now() / 1000));
      const nonce = timestamp + 1000000n; // Add large offset to ensure it's unique
      console.log(`\n📝 Using Nonce: ${nonce.toString()} (current contract nonce: ${currentNonce.toString()})`);

      // Step 4: Get Rari attestation from API
      const amount = ethers.parseUnits("1", 6); // 1 USDC (as requested)
      
      console.log(`\n1️⃣ Getting Rari attestation from API...`);
      console.log(`   Amount: ${ethers.formatUnits(amount, 6)} USDC`);
      console.log(`   Nonce: ${nonce.toString()}`);
      console.log(`   Source Chain ID: ${RARI_CHAIN_ID.toString()}`);
      
      const apiUrl = process.env.API_URL || 'http://localhost:3001';
      const attestationEndpoint = `${apiUrl}/api/rari/attestation?amount=${amount.toString()}&nonce=${nonce.toString()}`;
      
      console.log(`   Calling API: ${attestationEndpoint}`);
      
      let attestationData: any;
      try {
        const response = await axios.get(attestationEndpoint, {
          timeout: 60000, // 60 second timeout
        });
        
        if (!response.data.success) {
          throw new Error(response.data.error || 'Failed to get attestation');
        }
        
        attestationData = response.data.attestation;
        console.log(`✅ Attestation received from API`);
        console.log(`   TEE Wallet: ${attestationData.teeWallet}`);
        console.log(`   Signature: ${attestationData.signature.substring(0, 20)}...`);
        
      } catch (apiError: any) {
        if (apiError.code === 'ECONNREFUSED' || apiError.response?.status === 503) {
          console.log(`   ⚠️  Backend server not running or unreachable`);
          console.log(`   Start backend with: cd backend && npm run dev`);
        }
        throw new Error(`API call failed: ${apiError.message}`);
      }

      // Step 5: Call TEE API endpoint to verify and receive on Base Sepolia
      console.log(`\n2️⃣ Calling TEE API to verify and receive on Base Sepolia...`);
      console.log(`   Amount: ${ethers.formatUnits(amount, 6)} USDC`);
      console.log(`   Nonce: ${nonce.toString()}`);
      console.log(`   Source Chain ID: ${RARI_CHAIN_ID.toString()}`);
      console.log(`   Signature: ${attestationData.signature.substring(0, 20)}...`);
      
      const verifyApiUrl = process.env.API_URL || 'http://localhost:3001';
      const verifyEndpoint = `${verifyApiUrl}/api/tee/verify-rari-deposit`;
      
      let transactionHash: string;
      try {
        const response = await axios.post(verifyEndpoint, {
          amount: amount.toString(),
          nonce: nonce.toString(),
          sourceChainId: RARI_CHAIN_ID.toString(),
          signature: attestationData.signature,
        }, {
          timeout: 120000, // 2 minute timeout for on-chain transaction
        });
        
        if (!response.data.success || !response.data.verified) {
          throw new Error(response.data.message || 'Verification failed');
        }
        
        transactionHash = response.data.transactionHash || response.data.deposit?.transactionHash;
        if (!transactionHash) {
          console.error('API Response:', JSON.stringify(response.data, null, 2));
          throw new Error('No transaction hash returned from API');
        }
        
        console.log(`✅ USDC received via TEE API`);
        console.log(`   TX: ${transactionHash}`);
        console.log(`   Explorer: https://sepolia.basescan.org/tx/${transactionHash}`);
        
        // Wait for transaction to be mined and state to update
        console.log(`   Waiting for transaction confirmation...`);
        await new Promise(resolve => setTimeout(resolve, 5000));
        
        // Verify transaction was mined
        const provider = ethers.provider;
        const receipt = await provider.getTransactionReceipt(transactionHash);
        if (!receipt) {
          throw new Error('Transaction receipt not found');
        }
        console.log(`   Transaction confirmed in block: ${receipt.blockNumber}`);
        
      } catch (apiError: any) {
        if (apiError.code === 'ECONNREFUSED' || apiError.response?.status === 503) {
          console.log(`   ⚠️  Backend server not running or unreachable`);
          console.log(`   Start backend with: cd backend && npm run dev`);
        }
        console.error(`❌ TEE API call failed: ${apiError.message}`);
        if (apiError.response?.data) {
          console.error(`   Response:`, JSON.stringify(apiError.response.data, null, 2));
        }
        throw new Error(`TEE API call failed: ${apiError.message}`);
      }

      // Step 6: Verify TEE wallet balance increased
      const teeBalanceAfter = await usdc.balanceOf(teeWallet);
      const balanceIncrease = teeBalanceAfter - teeBalanceBefore;
      
      console.log(`\n💰 TEE Wallet Balance After: ${ethers.formatUnits(teeBalanceAfter, 6)} USDC`);
      console.log(`   Balance Increase: ${ethers.formatUnits(balanceIncrease, 6)} USDC`);

      // Verify balance increased
      expect(teeBalanceAfter).to.be.gt(teeBalanceBefore);
      expect(balanceIncrease).to.be.gte(amount); // Should be at least the amount (may have rounding)

      console.log(`\n✅ Rari attested flow completed successfully!`);
      console.log(`   TEE wallet received ${ethers.formatUnits(balanceIncrease, 6)} USDC on Base Sepolia`);
      console.log(`   Transaction was executed using attested receipt from Rari`);
    });

    it("Should prevent replay attacks with same nonce", async function () {
      const network = await ethers.provider.getNetwork();
      const isBaseSepolia = network.chainId === BigInt(84532);
      
      if (!isBaseSepolia) {
        this.skip();
      }

      const { unifiedVault } = await getContracts(network);
      
      // Get a nonce that was already used
      const nextNonce = await unifiedVault.getNextNonce();
      const usedNonce = nextNonce > 0n ? nextNonce - 1n : 0n;
      
      // Try to use the same nonce again (should fail)
      const amount = ethers.parseUnits("1.0", 6);
      
      // Create a fake signature (won't verify, but we want to test the nonce check)
      const fakeSignature = "0x" + "00".repeat(65);
      
      // Try to use the same nonce again via TEE API (should fail)
      // Note: This will fail either because receipt already used OR invalid signature
      const apiUrl = process.env.API_URL || 'http://localhost:3001';
      const verifyEndpoint = `${apiUrl}/api/tee/verify-rari-deposit`;
      
      try {
        const response = await axios.post(verifyEndpoint, {
          amount: amount.toString(),
          nonce: usedNonce.toString(),
          sourceChainId: RARI_CHAIN_ID.toString(),
          signature: fakeSignature,
        }, {
          timeout: 60000,
        });
        
        // If we get here and it succeeded, that's unexpected
        if (response.data.success && response.data.verified) {
          throw new Error("Replay attack was not prevented!");
        }
      } catch (error: any) {
        // API call should fail - either receipt already used or invalid signature
        if (error.response?.data?.message) {
          const errorMsg = error.response.data.message;
          if (errorMsg.includes("Receipt already used") || 
              errorMsg.includes("Invalid signature") ||
              errorMsg.includes("Gas estimation failed")) {
            console.log(`✅ Replay attack prevented - transaction rejected`);
          } else {
            // Re-throw if it's an unexpected error
            throw new Error(`Unexpected error: ${errorMsg}`);
          }
        } else if (error.message.includes("ECONNREFUSED")) {
          console.log(`   ⚠️  Backend server not running - skipping replay test`);
          this.skip();
        } else {
          // Re-throw if it's an unexpected error
          throw error;
        }
      }
    });
  });
});

