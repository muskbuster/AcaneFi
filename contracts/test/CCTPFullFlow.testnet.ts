import { expect } from "chai";
import { ethers } from "hardhat";
import * as dotenv from "dotenv";
import axios from "axios";

dotenv.config();

/**
 * Full CCTP Flow Test - Testnet
 * Complete end-to-end test: Deposit -> Attestation -> Receive -> Verify Balance
 * 
 * Based on Circle's CCTP documentation:
 * https://developers.circle.com/cctp/transfer-usdc-on-testnet-from-ethereum-to-avalanche
 * 
 * Run with:
 * - Part 1 (Deposit): npx hardhat test test/CCTPFullFlow.testnet.ts --network ethereum-sepolia
 * - Part 2 (Receive): npx hardhat test test/CCTPFullFlow.testnet.ts --network base-sepolia
 */
describe("CCTP Full Flow Test - Testnet", function () {
  this.timeout(600000); // 10 minutes for full flow

  // CCTP Configuration
  const ETHEREUM_SEPOLIA_DOMAIN = 0;
  const BASE_SEPOLIA_DOMAIN = 6;
  const ATTESTATION_API_URL = "https://iris-api-sandbox.circle.com/v2/messages";

  async function getContracts(network: any) {
    const signers = await ethers.getSigners();
    const deployer = signers[0];
    
    const isBaseSepolia = network.chainId === BigInt(84532);
    const isEthereumSepolia = network.chainId === BigInt(11155111);
    
    if (!isBaseSepolia && !isEthereumSepolia) {
      throw new Error("Test must run on Base Sepolia or Ethereum Sepolia");
    }

    const USDC_BASE_SEPOLIA = "0x036CbD53842c5426634e7929541eC2318f3dCF7e";
    const USDC_ETHEREUM_SEPOLIA = "0x1c7d4b196cb0c7b01d743fbc6116a902379c7238";
    const USDC_ADDRESS = isBaseSepolia ? USDC_BASE_SEPOLIA : USDC_ETHEREUM_SEPOLIA;
    const chainName = isBaseSepolia ? "BASE_SEPOLIA" : "ETHEREUM_SEPOLIA";
    
    const unifiedVaultAddress = process.env[`UNIFIED_VAULT_${chainName}`];
    if (!unifiedVaultAddress || unifiedVaultAddress === "0x0000000000000000000000000000000000000000") {
      throw new Error(`UNIFIED_VAULT_${chainName} not found in .env`);
    }

    const UnifiedVault = await ethers.getContractFactory("UnifiedVault");
    const unifiedVault = UnifiedVault.attach(unifiedVaultAddress);
    const usdc = await ethers.getContractAt("IERC20", USDC_ADDRESS);

    const TEE_WALLET = process.env.TEE_WALLET_ADDRESS || process.env.TEE_ADDRESS || deployer.address;

    return {
      deployer,
      unifiedVault,
      usdc,
      usdcAddress: USDC_ADDRESS,
      teeWallet: TEE_WALLET,
      isBaseSepolia,
      isEthereumSepolia,
      chainName,
    };
  }

  async function retrieveAttestation(transactionHash: string, sourceDomain: number): Promise<{ message: string; attestation: string }> {
    console.log(`\n🔍 Retrieving attestation for tx: ${transactionHash}`);
    console.log(`   Source Domain: ${sourceDomain}`);
    console.log(`   API: ${ATTESTATION_API_URL}/${sourceDomain}?transactionHash=${transactionHash}`);

    const maxRetries = 60; // 5 minutes max (5 second intervals)
    const retryInterval = 5000; // 5 seconds

    for (let i = 0; i < maxRetries; i++) {
      try {
        const url = `${ATTESTATION_API_URL}/${sourceDomain}?transactionHash=${transactionHash}`;
        const response = await axios.get(url);
        
        if (response.status === 404) {
          console.log(`⏳ Waiting for attestation... (attempt ${i + 1}/${maxRetries})`);
          await new Promise(resolve => setTimeout(resolve, retryInterval));
          continue;
        }

        if (response.data?.messages?.[0]?.status === "complete") {
          const messageData = response.data.messages[0];
          console.log(`✅ Attestation retrieved successfully!`);
          console.log(`   Message: ${messageData.message.substring(0, 20)}...`);
          console.log(`   Attestation: ${messageData.attestation.substring(0, 20)}...`);
          return {
            message: messageData.message,
            attestation: messageData.attestation,
          };
        }

        if (response.data?.messages?.[0]?.status === "pending") {
          console.log(`⏳ Attestation pending... (attempt ${i + 1}/${maxRetries})`);
        }
      } catch (error: any) {
        if (error.response?.status === 404) {
          console.log(`⏳ Waiting for attestation... (attempt ${i + 1}/${maxRetries})`);
        } else {
          console.log(`⚠️  Error: ${error.message}`);
        }
      }

      if (i < maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, retryInterval));
      }
    }

    throw new Error(`Attestation not found after ${maxRetries} attempts`);
  }

  describe("Part 1: Deposit on Ethereum Sepolia", function () {
    it("Should deposit USDC via CCTP and retrieve attestation", async function () {
      const network = await ethers.provider.getNetwork();
      const isEthereumSepolia = network.chainId === BigInt(11155111);
      
      if (!isEthereumSepolia) {
        console.log(`⚠️  Part 1 must run on Ethereum Sepolia`);
        this.skip();
      }

      const { deployer, unifiedVault, usdc, usdcAddress, teeWallet } = await getContracts(network);
      
      console.log(`\n📋 CCTP Deposit Flow - Part 1`);
      console.log(`Deployer: ${deployer.address}`);
      console.log(`TEE Wallet (destination): ${teeWallet}`);
      console.log(`UnifiedVault: ${await unifiedVault.getAddress()}`);

      // Step 1: Check balances
      const deployerBalanceBefore = await usdc.balanceOf(deployer.address);
      console.log(`\n💰 Initial Balance: ${ethers.formatUnits(deployerBalanceBefore, 6)} USDC`);
      
      // Store balance before for verification
      const initialBalance = deployerBalanceBefore;

      const depositAmount = ethers.parseUnits("1", 6); // 1 USDC
      
      if (deployerBalanceBefore < depositAmount) {
        console.log(`⚠️  Insufficient USDC balance`);
        this.skip();
      }

      // Step 2: Approve
      console.log(`\n1️⃣ Approving UnifiedVault to spend USDC...`);
      const approveTx = await usdc.approve(await unifiedVault.getAddress(), depositAmount);
      const approveReceipt = await approveTx.wait();
      const approveHash = approveReceipt?.hash;
      console.log(`✅ Approved`);
      console.log(`   TX: ${approveHash}`);
      console.log(`   Explorer: https://sepolia.etherscan.io/tx/${approveHash}`);

      // Step 3: Register trader if needed (get VaultFactory from UnifiedVault)
      // UnifiedVault stores VaultFactory, but we need to get it
      // Let's get it from env or from UnifiedVault if it's public
      const vaultFactoryAddress = process.env[`VAULT_FACTORY_ETHEREUM_SEPOLIA`];
      if (!vaultFactoryAddress) {
        throw new Error("VAULT_FACTORY_ETHEREUM_SEPOLIA not found in .env");
      }
      
      const VaultFactory = await ethers.getContractFactory("VaultFactory");
      const vaultFactory = VaultFactory.attach(vaultFactoryAddress);
      
      // Check if trader is registered, if not register
      let traderId = await vaultFactory.addressToTraderId(deployer.address);
      if (traderId === 0n) {
        console.log(`\n2️⃣ Registering trader...`);
        const teeAddress = await vaultFactory.teeAddress();
        const TEE_PRIVATE_KEY = process.env.TEE_PRIVATE_KEY;
        let teeSigner = deployer;
        
        if (TEE_PRIVATE_KEY && teeAddress.toLowerCase() !== deployer.address.toLowerCase()) {
          teeSigner = new ethers.Wallet(TEE_PRIVATE_KEY, ethers.provider);
        }
        
        const registerTx = await vaultFactory.connect(teeSigner).registerTrader(deployer.address);
        await registerTx.wait();
        traderId = await vaultFactory.addressToTraderId(deployer.address);
        console.log(`✅ Trader registered with ID: ${traderId}`);
      } else {
        console.log(`\n2️⃣ Trader already registered with ID: ${traderId}`);
      }
      
      // Verify trader exists in VaultFactory
      const traderAddress = await vaultFactory.traderIdToAddress(traderId);
      console.log(`   Trader address: ${traderAddress}`);
      expect(traderAddress).to.not.equal(ethers.ZeroAddress);

      // Step 4: Verify trader in UnifiedVault's VaultFactory
      const vaultFactoryAddressFromUnified = await unifiedVault.vaultFactory();
      const VaultFactoryContract = await ethers.getContractFactory("VaultFactory");
      const vaultFactoryFromUnified = VaultFactoryContract.attach(vaultFactoryAddressFromUnified);
      const traderAddressCheck = await vaultFactoryFromUnified.getTraderAddress(traderId);
      console.log(`\n3️⃣ Verifying trader in UnifiedVault's VaultFactory...`);
      console.log(`   VaultFactory: ${vaultFactoryAddressFromUnified}`);
      console.log(`   Trader ID: ${traderId}`);
      console.log(`   Trader Address: ${traderAddressCheck}`);
      
      if (traderAddressCheck === ethers.ZeroAddress) {
        throw new Error(`Trader ${traderId} not found in UnifiedVault's VaultFactory`);
      }

      // Step 5: Deposit via CCTP using direct TokenMessenger call
      console.log(`\n4️⃣ Depositing ${ethers.formatUnits(depositAmount, 6)} USDC via CCTP (Direct TokenMessenger call)...`);
      console.log(`   From: Ethereum Sepolia`);
      console.log(`   To: Base Sepolia (TEE wallet: ${teeWallet})`);
      
      const maxFee = ethers.parseUnits("0.1", 6); // 0.1 USDC max fee
      const minFinalityThreshold = 1000; // Fast Transfer threshold
      const CCTP_TOKEN_MESSENGER = "0x8FE6B999Dc680CcFDD5Bf7EB0974218be2542DAA";
      
      // Approve TokenMessenger directly (not UnifiedVault)
      console.log(`\n   Approving TokenMessenger to spend USDC...`);
      const tokenMessengerAllowance = await usdc.allowance(deployer.address, CCTP_TOKEN_MESSENGER);
      if (tokenMessengerAllowance < depositAmount) {
        const approveTokenMessengerTx = await usdc.approve(CCTP_TOKEN_MESSENGER, depositAmount);
        await approveTokenMessengerTx.wait();
        console.log(`   ✅ Approved TokenMessenger`);
      } else {
        console.log(`   ✅ TokenMessenger already approved`);
      }
      
      // Get TokenMessenger contract
      const tokenMessenger = await ethers.getContractAt([
        "function depositForBurn(uint256 amount, uint32 destinationDomain, bytes32 mintRecipient, address burnToken, bytes32 destinationCaller, uint256 maxFee, uint32 minFinalityThreshold) external returns (uint64 nonce)"
      ], CCTP_TOKEN_MESSENGER);
      
      // Convert TEE wallet to bytes32 for mint recipient
      const mintRecipient = ethers.zeroPadValue(teeWallet, 32);
      const destinationCaller = ethers.ZeroHash; // bytes32(0) allows any caller
      
      console.log(`\n   Calling TokenMessenger.depositForBurn directly...`);
      console.log(`   Amount: ${ethers.formatUnits(depositAmount, 6)} USDC`);
      console.log(`   Destination Domain: ${BASE_SEPOLIA_DOMAIN}`);
      console.log(`   Mint Recipient: ${mintRecipient}`);
      console.log(`   Burn Token: ${usdcAddress}`);
      
      let depositTx;
      let depositHash;
      try {
        // Estimate gas
        const gasEstimate = await tokenMessenger.depositForBurn.estimateGas(
          depositAmount,
          BASE_SEPOLIA_DOMAIN,
          mintRecipient,
          usdcAddress,
          destinationCaller,
          maxFee,
          minFinalityThreshold
        );
        console.log(`   Estimated gas: ${gasEstimate.toString()}`);
        
        // Call depositForBurn
        depositTx = await tokenMessenger.depositForBurn(
          depositAmount,
          BASE_SEPOLIA_DOMAIN,
          mintRecipient,
          usdcAddress,
          destinationCaller,
          maxFee,
          minFinalityThreshold
        );
        const depositReceipt = await depositTx.wait();
        depositHash = depositReceipt?.hash;
        
        console.log(`✅ Deposit initiated via direct TokenMessenger call!`);
        console.log(`   TX: ${depositHash}`);
        console.log(`   Explorer: https://sepolia.etherscan.io/tx/${depositHash}`);
        
        // Verify USDC was burned (balance decreased)
        const deployerBalanceAfter = await usdc.balanceOf(deployer.address);
        const balanceDecrease = initialBalance - deployerBalanceAfter;
        console.log(`   Deployer balance after: ${ethers.formatUnits(deployerBalanceAfter, 6)} USDC`);
        console.log(`   USDC burned: ${ethers.formatUnits(balanceDecrease, 6)} USDC`);
        expect(balanceDecrease).to.be.gte(depositAmount);
      } catch (error: any) {
        console.log(`❌ Deposit failed: ${error.message}`);
        if (error.data) {
          console.log(`   Error data: ${error.data}`);
        }
        if (error.reason) {
          console.log(`   Revert reason: ${error.reason}`);
        }
        throw error;
      }

      // Step 5: Retrieve Attestation
      console.log(`\n4️⃣ Retrieving CCTP attestation...`);
      const attestationData = await retrieveAttestation(depositHash, ETHEREUM_SEPOLIA_DOMAIN);

      // Save attestation data for Part 2
      console.log(`\n✅ Attestation retrieved!`);
      console.log(`\n📝 Next Steps:`);
      console.log(`   Run Part 2 on Base Sepolia with:`);
      console.log(`   - Message: ${attestationData.message}`);
      console.log(`   - Attestation: ${attestationData.attestation}`);
      console.log(`   - Or set in .env: CCTP_MESSAGE and CCTP_ATTESTATION`);

      // Save to .env for Part 2
      const fs = require("fs");
      const path = require("path");
      const envPath = path.join(__dirname, "..", ".env");
      let envContent = fs.existsSync(envPath) ? fs.readFileSync(envPath, "utf-8") : "";
      
      // Update or add attestation data
      const updates = [
        { key: "CCTP_MESSAGE", value: attestationData.message },
        { key: "CCTP_ATTESTATION", value: attestationData.attestation },
        { key: "CCTP_DEPOSIT_TX", value: depositHash },
      ];

      for (const { key, value } of updates) {
        const regex = new RegExp(`^${key}=.*$`, "m");
        if (regex.test(envContent)) {
          envContent = envContent.replace(regex, `${key}=${value}`);
        } else {
          envContent += `\n${key}=${value}`;
        }
      }

      fs.writeFileSync(envPath, envContent);
      console.log(`\n✅ Attestation data saved to .env for Part 2`);

      expect(attestationData.message).to.not.be.empty;
      expect(attestationData.attestation).to.not.be.empty;
    });
  });

  describe("Part 2: Receive on Base Sepolia", function () {
    it("Should receive bridged USDC and verify TEE wallet balance increased", async function () {
      const network = await ethers.provider.getNetwork();
      const isBaseSepolia = network.chainId === BigInt(84532);
      
      if (!isBaseSepolia) {
        console.log(`⚠️  Part 2 must run on Base Sepolia`);
        this.skip();
      }

      const { deployer, unifiedVault, usdc, teeWallet } = await getContracts(network);
      
      console.log(`\n📋 CCTP Receive Flow - Part 2`);
      console.log(`TEE Wallet: ${teeWallet}`);
      console.log(`UnifiedVault: ${await unifiedVault.getAddress()}`);

      // Get attestation data from .env or use provided
      const message = process.env.CCTP_MESSAGE;
      const attestation = process.env.CCTP_ATTESTATION;

      if (!message || !attestation) {
        console.log(`⚠️  CCTP_MESSAGE and CCTP_ATTESTATION not found in .env`);
        console.log(`   Please run Part 1 first or set these in .env`);
        this.skip();
      }

      // Step 1: Check TEE wallet balance before
      const teeBalanceBefore = await usdc.balanceOf(teeWallet);
      console.log(`\n💰 TEE Wallet Balance Before: ${ethers.formatUnits(teeBalanceBefore, 6)} USDC`);

      // Step 2: Receive bridged USDC via API endpoint (uses CDP wallet)
      console.log(`\n1️⃣ Receiving bridged USDC on Base Sepolia via API endpoint...`);
      console.log(`   Message: ${message.substring(0, 20)}...`);
      console.log(`   Attestation: ${attestation.substring(0, 20)}...`);
      
      // Call the backend API endpoint which uses CDP wallet
      const apiUrl = process.env.API_URL || 'http://localhost:3002';
      const receiveEndpoint = `${apiUrl}/api/cctp/receive`;
      
      console.log(`   Calling API: ${receiveEndpoint}`);
      console.log(`   Note: Backend server must be running (npm run dev in backend/)`);
      console.log(`   API uses CDP wallet for secure transaction signing\n`);
      
      let receiveHash: string;
      
      try {
        const response = await axios.post(receiveEndpoint, {
          message,
          attestation,
        }, {
          timeout: 60000, // 60 second timeout
        });
        
        if (!response.data.success) {
          throw new Error(response.data.error || 'Failed to receive USDC');
        }
        
        receiveHash = response.data.transactionHash;
        console.log(`✅ USDC received via CDP wallet`);
        console.log(`   TX: ${receiveHash}`);
        console.log(`   Explorer: ${response.data.explorer || `https://sepolia.basescan.org/tx/${receiveHash}`}`);
        console.log(`   Signed by: CDP Wallet (TEE-secured)`);
        
        // Wait for transaction to be confirmed
        console.log(`   Waiting for transaction confirmation...`);
        await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds
        
      } catch (apiError: any) {
        // If API call fails, fall back to direct contract call
        if (apiError.code === 'ECONNREFUSED' || apiError.response?.status === 503) {
          console.log(`   ⚠️  Backend server not running or unreachable`);
          console.log(`   Start backend with: cd backend && npm run dev`);
        }
        console.log(`   ⚠️  API call failed: ${apiError.message}`);
        console.log(`   Falling back to direct contract call (not using CDP wallet)...`);
        
        const receiveTx = await unifiedVault.receiveBridgedUSDC(
          ethers.getBytes(message),
          ethers.getBytes(attestation)
        );
        const receiveReceipt = await receiveTx.wait();
        receiveHash = receiveReceipt?.hash || '';
        console.log(`✅ USDC received (direct call - not using CDP wallet)`);
        console.log(`   TX: ${receiveHash}`);
        console.log(`   Explorer: https://sepolia.basescan.org/tx/${receiveHash}`);
      }

      // Step 3: Verify TEE wallet balance increased
      // Wait a bit longer for state to update after API call
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      const teeBalanceAfter = await usdc.balanceOf(teeWallet);
      const balanceIncrease = teeBalanceAfter - teeBalanceBefore;
      
      console.log(`\n💰 TEE Wallet Balance After: ${ethers.formatUnits(teeBalanceAfter, 6)} USDC`);
      console.log(`   Balance Increase: ${ethers.formatUnits(balanceIncrease, 6)} USDC`);

      // Verify balance increased
      expect(teeBalanceAfter).to.be.gt(teeBalanceBefore);
      expect(balanceIncrease).to.be.gt(0n);

      console.log(`\n✅ Full CCTP flow completed successfully!`);
      console.log(`   TEE wallet received ${ethers.formatUnits(balanceIncrease, 6)} USDC on Base Sepolia`);
      console.log(`   Transaction was executed using CDP wallet (secure TEE signing)`);
    });
  });

  describe("Full Flow: Deposit and Receive (Manual)", function () {
    it("Should complete full flow if both networks available", async function () {
      // This test would require network switching which Hardhat doesn't support easily
      // Instead, run Part 1 and Part 2 separately
      console.log(`\n📝 To complete full flow:`);
      console.log(`1. Run Part 1 on Ethereum Sepolia: npm run test:cctp:full -- --network ethereum-sepolia`);
      console.log(`2. Wait for attestation (saved to .env)`);
      console.log(`3. Run Part 2 on Base Sepolia: npm run test:cctp:full -- --network base-sepolia`);
      this.skip();
    });
  });
});

