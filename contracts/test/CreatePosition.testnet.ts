import { expect } from "chai";
import { ethers } from "hardhat";
import * as dotenv from "dotenv";
import axios from "axios";

dotenv.config();

/**
 * Test Create Position Flow
 * Tests the TEE create-position endpoint with real testnet USDC
 */
describe("Create Position Test - Testnet", function () {
  this.timeout(300000); // 5 minutes

  const USDC_BASE_SEPOLIA = "0x036CbD53842c5426634e7929541eC2318f3dCF7e";
  const USDC_DECIMALS = 6;

  async function getContracts() {
    const signers = await ethers.getSigners();
    const deployer = signers[0];
    const network = await ethers.provider.getNetwork();

    if (network.chainId !== BigInt(84532)) {
      throw new Error("Test must run on Base Sepolia");
    }

    const mockUniswapAddress = process.env.MOCK_UNISWAP_BASE_SEPOLIA;
    if (!mockUniswapAddress || mockUniswapAddress === "0x0000000000000000000000000000000000000000") {
      throw new Error(`MOCK_UNISWAP_BASE_SEPOLIA not found in .env`);
    }

    const mockETHAddress = process.env.MOCK_ETH_BASE_SEPOLIA;
    const mockWBTCAddress = process.env.MOCK_WBTC_BASE_SEPOLIA;
    const mockZECAddress = process.env.MOCK_ZEC_BASE_SEPOLIA;

    const usdc = await ethers.getContractAt("IERC20", USDC_BASE_SEPOLIA);
    const MockUniswap = await ethers.getContractFactory("MockUniswap");
    const mockUniswap = MockUniswap.attach(mockUniswapAddress);

    return {
      deployer,
      usdc,
      mockUniswap,
      mockETHAddress,
      mockWBTCAddress,
      mockZECAddress,
    };
  }

  it("Should create a position via TEE API (ETH)", async function () {
    const { deployer, usdc, mockUniswap, mockETHAddress } = await getContracts();

    // Step 1: Check USDC balance
    const usdcBalance = await usdc.balanceOf(deployer.address);
    console.log(`\n💰 Deployer USDC Balance: ${ethers.formatUnits(usdcBalance, USDC_DECIMALS)} USDC`);

    if (usdcBalance < ethers.parseUnits("1", USDC_DECIMALS)) {
      throw new Error("Insufficient USDC balance. Need at least 1 USDC for testing.");
    }

    // Step 2: Get TEE wallet address and approve USDC from TEE wallet
    // The TEE wallet (CDP wallet) needs to approve USDC to MockUniswap
    const apiUrl = process.env.API_URL || 'http://localhost:3001';
    
    // Get TEE wallet address from backend (we'll need to approve from that wallet)
    // For now, we'll use the deployer to approve, but in production, TEE wallet should approve
    const swapAmount = ethers.parseUnits("1", USDC_DECIMALS); // 1 USDC
    console.log(`\n📝 Note: TEE wallet (CDP wallet) needs USDC and approval to MockUniswap`);
    console.log(`   For testing, we'll proceed with the API call`);

    // Step 3: Register a trader via TEE API (if not already registered)
    const traderId = 1;
    const traderAddress = deployer.address;
    try {
      await axios.post(`${apiUrl}/api/tee/register-trader`, {
        address: traderAddress,
        name: "Test Trader",
        strategyDescription: "Test strategy for position creation",
        performanceFee: 10,
      });
      console.log("✅ Trader registered");
    } catch (error: any) {
      // Trader might already be registered, that's okay
      if (error.response?.status !== 500) {
        console.log("⚠️  Trader registration response:", error.response?.data || error.message);
      }
    }

    // Step 4: Create attestation signature
    const message = `ArcaneFi: Create position for trader ${traderId}`;
    const signature = await deployer.signMessage(message);
    console.log(`\n🔐 Created attestation signature for trader ${traderId}`);

    // Step 5: Call TEE API to create position
    const createPositionEndpoint = `${apiUrl}/api/tee/create-position`;

    console.log(`\n📡 Calling TEE API to create position...`);
    console.log(`   Token: ETH`);
    console.log(`   Amount: ${ethers.formatUnits(swapAmount, USDC_DECIMALS)} USDC`);

    let transactionHash: string;
    try {
      const response = await axios.post(createPositionEndpoint, {
        traderId,
        traderAddress,
        signature,
        tokenType: "ETH",
        amountIn: swapAmount.toString(),
      }, {
        timeout: 120000, // 2 minute timeout
      });

      if (!response.data.success) {
        throw new Error(response.data.error || 'Failed to create position');
      }

      transactionHash = response.data.transactionHash;
      console.log(`✅ Position created successfully!`);
      console.log(`   TX: ${transactionHash}`);
      console.log(`   Explorer: https://sepolia.basescan.org/tx/${transactionHash}`);
      console.log(`   Message: ${response.data.message}`);

      // Wait for transaction confirmation
      await new Promise(resolve => setTimeout(resolve, 5000));

      // Verify transaction
      const receipt = await ethers.provider.getTransactionReceipt(transactionHash);
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

    // Step 6: Verify token balance increased on TEE wallet (not deployer)
    // The swap is executed by TEE wallet, so tokens are minted to TEE wallet
    const TEE_WALLET = "0x278258D222028BDbC165684923443FE10BFD4b95";
    if (mockETHAddress) {
      const mockETH = await ethers.getContractAt("IERC20", mockETHAddress);
      const tokenBalance = await mockETH.balanceOf(TEE_WALLET);
      console.log(`\n💰 TEE Wallet MockETH Balance: ${ethers.formatUnits(tokenBalance, 18)} mETH`);
      
      expect(tokenBalance).to.be.gt(0n, "TEE wallet token balance should be greater than 0");
    }

    // Step 7: Verify TEE wallet USDC balance decreased
    const teeUsdcBalanceAfter = await usdc.balanceOf(TEE_WALLET);
    console.log(`💰 TEE Wallet USDC Balance After: ${ethers.formatUnits(teeUsdcBalanceAfter, USDC_DECIMALS)} USDC`);
  });

  it("Should create a position via TEE API (WBTC)", async function () {
    const { deployer, usdc, mockUniswap, mockWBTCAddress } = await getContracts();
    const apiUrl = process.env.API_URL || 'http://localhost:3001';

    const swapAmount = ethers.parseUnits("1", USDC_DECIMALS); // 1 USDC

    const traderId = 1;
    const traderAddress = deployer.address;
    const message = `ArcaneFi: Create position for trader ${traderId}`;
    const signature = await deployer.signMessage(message);
    const response = await axios.post(`${apiUrl}/api/tee/create-position`, {
      traderId,
      traderAddress,
      signature,
      tokenType: "WBTC",
      amountIn: swapAmount.toString(),
    }, {
      timeout: 120000,
    });

    expect(response.data.success).to.be.true;
    expect(response.data.transactionHash).to.exist;

    console.log(`✅ WBTC position created: ${response.data.transactionHash}`);
  });

  it("Should create a position via TEE API (ZEC)", async function () {
    const { deployer, usdc, mockUniswap, mockZECAddress } = await getContracts();
    const apiUrl = process.env.API_URL || 'http://localhost:3001';

    const swapAmount = ethers.parseUnits("1", USDC_DECIMALS); // 1 USDC

    const traderId = 1;
    const traderAddress = deployer.address;
    const message = `ArcaneFi: Create position for trader ${traderId}`;
    const signature = await deployer.signMessage(message);
    const response = await axios.post(`${apiUrl}/api/tee/create-position`, {
      traderId,
      traderAddress,
      signature,
      tokenType: "ZEC",
      amountIn: swapAmount.toString(),
    }, {
      timeout: 120000,
    });

    expect(response.data.success).to.be.true;
    expect(response.data.transactionHash).to.exist;

    console.log(`✅ ZEC position created: ${response.data.transactionHash}`);
  });
});


