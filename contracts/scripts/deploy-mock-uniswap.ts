import { ethers } from "hardhat";
import * as dotenv from "dotenv";
import * as fs from "fs";
import * as path from "path";

dotenv.config();

/**
 * Deploy MockUniswap and MockTokens (ETH, WBTC, ZEC) on Base Sepolia
 */
async function main() {
  const [deployer] = await ethers.getSigners();
  const network = await ethers.provider.getNetwork();
  
  console.log("Network:", network.name, "Chain ID:", network.chainId);
  console.log("Deployer:", deployer.address);
  console.log("Deployer Balance:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)), "ETH");

  // Only deploy on Base Sepolia
  if (network.chainId !== BigInt(84532)) {
    throw new Error("This script should only run on Base Sepolia");
  }

  const USDC_BASE_SEPOLIA = "0x036CbD53842c5426634e7929541eC2318f3dCF7e"; // Real testnet USDC

  // Deploy MockTokens
  console.log("\n📦 Deploying MockTokens...");
  
  const MockToken = await ethers.getContractFactory("MockToken");
  
  const mockETH = await MockToken.deploy("Mock Wrapped Ethereum", "mETH", 18);
  await mockETH.waitForDeployment();
  const mockETHAddress = await mockETH.getAddress();
  console.log("✅ MockETH deployed:", mockETHAddress);

  const mockWBTC = await MockToken.deploy("Mock Wrapped Bitcoin", "mWBTC", 18);
  await mockWBTC.waitForDeployment();
  const mockWBTCAddress = await mockWBTC.getAddress();
  console.log("✅ MockWBTC deployed:", mockWBTCAddress);

  const mockZEC = await MockToken.deploy("Mock Zcash", "mZEC", 18);
  await mockZEC.waitForDeployment();
  const mockZECAddress = await mockZEC.getAddress();
  console.log("✅ MockZEC deployed:", mockZECAddress);

  // Deploy MockUniswap
  console.log("\n📦 Deploying MockUniswap...");
  const MockUniswap = await ethers.getContractFactory("MockUniswap");
  const mockUniswap = await MockUniswap.deploy(USDC_BASE_SEPOLIA);
  await mockUniswap.waitForDeployment();
  const mockUniswapAddress = await mockUniswap.getAddress();
  console.log("✅ MockUniswap deployed:", mockUniswapAddress);

  // Set token addresses in MockUniswap
  console.log("\n🔧 Configuring MockUniswap...");
  
  const tx1 = await mockUniswap.setToken(0, mockETHAddress); // ETH = 0
  await tx1.wait();
  console.log("✅ Set MockETH address");

  const tx2 = await mockUniswap.setToken(1, mockWBTCAddress); // WBTC = 1
  await tx2.wait();
  console.log("✅ Set MockWBTC address");

  const tx3 = await mockUniswap.setToken(2, mockZECAddress); // ZEC = 2
  await tx3.wait();
  console.log("✅ Set MockZEC address");

  // Set initial prices (in USDC, 6 decimals)
  // Example: ETH = $2000, WBTC = $40000, ZEC = $30
  const ETH_PRICE = ethers.parseUnits("2000", 6); // $2000 per ETH
  const WBTC_PRICE = ethers.parseUnits("40000", 6); // $40000 per WBTC
  const ZEC_PRICE = ethers.parseUnits("30", 6); // $30 per ZEC

  const tx4 = await mockUniswap.setPrice(0, ETH_PRICE);
  await tx4.wait();
  console.log("✅ Set ETH price: $2000");

  const tx5 = await mockUniswap.setPrice(1, WBTC_PRICE);
  await tx5.wait();
  console.log("✅ Set WBTC price: $40000");

  const tx6 = await mockUniswap.setPrice(2, ZEC_PRICE);
  await tx6.wait();
  console.log("✅ Set ZEC price: $30");

  // Save addresses to .env file
  console.log("\n💾 Saving addresses to .env...");
  const envPath = path.join(__dirname, "..", ".env");
  let envContent = fs.existsSync(envPath) ? fs.readFileSync(envPath, "utf-8") : "";

  // Remove old entries if they exist
  envContent = envContent.replace(/MOCK_UNISWAP_BASE_SEPOLIA=.*\n/g, "");
  envContent = envContent.replace(/MOCK_ETH_BASE_SEPOLIA=.*\n/g, "");
  envContent = envContent.replace(/MOCK_WBTC_BASE_SEPOLIA=.*\n/g, "");
  envContent = envContent.replace(/MOCK_ZEC_BASE_SEPOLIA=.*\n/g, "");

  // Add new entries
  envContent += `\n# Mock Uniswap Contracts (Base Sepolia)\n`;
  envContent += `MOCK_UNISWAP_BASE_SEPOLIA=${mockUniswapAddress}\n`;
  envContent += `MOCK_ETH_BASE_SEPOLIA=${mockETHAddress}\n`;
  envContent += `MOCK_WBTC_BASE_SEPOLIA=${mockWBTCAddress}\n`;
  envContent += `MOCK_ZEC_BASE_SEPOLIA=${mockZECAddress}\n`;

  fs.writeFileSync(envPath, envContent);
  console.log("✅ Addresses saved to .env");

  // Summary
  console.log("\n📋 Deployment Summary:");
  console.log("=".repeat(60));
  console.log("MockUniswap:", mockUniswapAddress);
  console.log("MockETH:", mockETHAddress);
  console.log("MockWBTC:", mockWBTCAddress);
  console.log("MockZEC:", mockZECAddress);
  console.log("USDC:", USDC_BASE_SEPOLIA);
  console.log("=".repeat(60));
  console.log("\n✅ All contracts deployed and configured!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

