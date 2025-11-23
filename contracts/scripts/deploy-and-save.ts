import { ethers } from "hardhat";
import * as dotenv from "dotenv";
import * as fs from "fs";
import * as path from "path";

dotenv.config();

/**
 * Deploy contracts and save addresses to .env file
 * This allows tests to use the same deployed contracts
 */
async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with account:", deployer.address);
  console.log("Account balance:", (await ethers.provider.getBalance(deployer.address)).toString());

  const network = await ethers.provider.getNetwork();
  console.log("Network:", network.name, "Chain ID:", network.chainId);

  // Configuration
  const TEE_ADDRESS = process.env.TEE_ADDRESS || deployer.address;
  const TEE_WALLET = process.env.TEE_WALLET_ADDRESS || deployer.address;
  
  // USDC addresses (testnet)
  const USDC_ETHEREUM_SEPOLIA = "0x1c7d4b196cb0c7b01d743fbc6116a902379c7238";
  const USDC_BASE_SEPOLIA = "0x036CbD53842c5426634e7929541eC2318f3dCF7e";
  const USDC_ARC = "0x3600000000000000000000000000000000000000";
  // Rari doesn't have native USDC - we'll deploy MockUSDC
  const USDC_RARI = process.env.USDC_RARI || "0x0000000000000000000000000000000000000000";
  
  // LayerZero EndpointV2 addresses (testnet)
  const LZ_ENDPOINT_ETHEREUM_SEPOLIA = "0x6EDCE65403992e310A62460808c4b910D972f10f";
  const LZ_ENDPOINT_BASE_SEPOLIA = "0x6EDCE65403992e310A62460808c4b910D972f10f";
  const LZ_ENDPOINT_ARC = process.env.LZ_ENDPOINT_ARC || "0x0000000000000000000000000000000000000000";
  const LZ_ENDPOINT_RARI = process.env.LZ_ENDPOINT_RARI || "0x0000000000000000000000000000000000000000";
  
  // CCTP contracts (testnet)
  const CCTP_TOKEN_MESSENGER = "0x8FE6B999Dc680CcFDD5Bf7EB0974218be2542DAA";
  const CCTP_MESSAGE_TRANSMITTER = "0xE737e5cEBEEBa77EFE34D4aa090756590b1CE275";

  // Determine which chain we're deploying to
  const isBaseSepolia = network.chainId === BigInt(84532);
  const isEthereumSepolia = network.chainId === BigInt(11155111);
  const isArc = network.chainId === BigInt(5042002);
  const isRari = network.chainId === BigInt(1918988905);
  
  const USDC_ADDRESS = isBaseSepolia ? USDC_BASE_SEPOLIA 
    : isArc ? USDC_ARC 
    : isRari ? USDC_RARI
    : USDC_ETHEREUM_SEPOLIA;
  const LZ_ENDPOINT = isBaseSepolia ? LZ_ENDPOINT_BASE_SEPOLIA 
    : isArc ? LZ_ENDPOINT_ARC 
    : isRari ? LZ_ENDPOINT_RARI
    : LZ_ENDPOINT_ETHEREUM_SEPOLIA;

  // Determine chain name for env variables
  const chainName = isBaseSepolia ? "BASE_SEPOLIA" 
    : isArc ? "ARC" 
    : isRari ? "RARI"
    : "ETHEREUM_SEPOLIA";

  console.log("\n📋 Deployment Configuration:");
  console.log("USDC Address:", USDC_ADDRESS);
  console.log("LayerZero Endpoint:", LZ_ENDPOINT);
  console.log("CCTP TokenMessenger:", CCTP_TOKEN_MESSENGER);
  console.log("CCTP MessageTransmitter:", CCTP_MESSAGE_TRANSMITTER);
  console.log("TEE Wallet:", TEE_WALLET);
  console.log("Chain Name:", chainName);

  // 0. Deploy MockUSDC on Rari if needed
  let finalUSDCAddress = USDC_ADDRESS;
  if (isRari && (USDC_ADDRESS === "0x0000000000000000000000000000000000000000" || !USDC_ADDRESS)) {
    console.log("\n0️⃣ Deploying MockUSDC for Rari...");
    const MockUSDC = await ethers.getContractFactory("MockUSDC");
    const mockUSDC = await MockUSDC.deploy("Mock USDC", "USDC", 6);
    await mockUSDC.waitForDeployment();
    finalUSDCAddress = await mockUSDC.getAddress();
    console.log("✅ MockUSDC deployed to:", finalUSDCAddress);
  }

  // 1. Deploy VaultFactory
  console.log("\n1️⃣ Deploying VaultFactory...");
  const VaultFactory = await ethers.getContractFactory("VaultFactory");
  const vaultFactory = await VaultFactory.deploy(TEE_ADDRESS, finalUSDCAddress);
  await vaultFactory.waitForDeployment();
  const vaultFactoryAddress = await vaultFactory.getAddress();
  console.log("✅ VaultFactory deployed to:", vaultFactoryAddress);

  // 2. Deploy USDCOFT (skip on Rari - no LayerZero)
  let usdcOFTAddress = "0x0000000000000000000000000000000000000000";
  let vaultShareOFTAddress = "0x0000000000000000000000000000000000000000";
  
  if (!isRari) {
    console.log("\n2️⃣ Deploying USDCOFT (OFT)...");
    const USDCOFT = await ethers.getContractFactory("USDCOFT");
    const usdcOFT = await USDCOFT.deploy(
      "USD Coin OFT",
      "USDC",
      LZ_ENDPOINT,
      deployer.address
    );
    await usdcOFT.waitForDeployment();
    usdcOFTAddress = await usdcOFT.getAddress();
    console.log("✅ USDCOFT deployed to:", usdcOFTAddress);

    // 3. Deploy VaultShareOFT
    console.log("\n3️⃣ Deploying VaultShareOFT (OFT)...");
    const VaultShareOFT = await ethers.getContractFactory("VaultShareOFT");
    const vaultShareOFT = await VaultShareOFT.deploy(
      "ArcaneFi Vault Shares",
      "AFV",
      LZ_ENDPOINT,
      vaultFactoryAddress,
      deployer.address
    );
    await vaultShareOFT.waitForDeployment();
    vaultShareOFTAddress = await vaultShareOFT.getAddress();
    console.log("✅ VaultShareOFT deployed to:", vaultShareOFTAddress);

    // 4. Configure VaultFactory
    console.log("\n4️⃣ Configuring VaultFactory...");
    await vaultFactory.setVaultShareOFT(vaultShareOFTAddress);
    console.log("✅ VaultFactory configured");
  } else {
    console.log("\n2️⃣ Skipping LayerZero contracts (Rari doesn't support LayerZero)");
    console.log("✅ Rari only needs UnifiedVault with MockUSDC");
  }

  // 5. Deploy UnifiedVault
  console.log(`\n${isRari ? "3️⃣" : "5️⃣"} Deploying UnifiedVault...`);
  const UnifiedVault = await ethers.getContractFactory("UnifiedVault");
  const unifiedVault = await UnifiedVault.deploy(
    vaultFactoryAddress,
    finalUSDCAddress,
    usdcOFTAddress,
    vaultShareOFTAddress,
    CCTP_TOKEN_MESSENGER,
    CCTP_MESSAGE_TRANSMITTER,
    TEE_WALLET
  );
  await unifiedVault.waitForDeployment();
  const unifiedVaultAddress = await unifiedVault.getAddress();
  console.log("✅ UnifiedVault deployed to:", unifiedVaultAddress);

  // 6. Optional: Set peers if remote addresses are provided (BEFORE transferring ownership)
  // Note: setPeer requires owner/delegate permissions, so we must do this before transferring ownership
  // Skip on Rari (no LayerZero)
  if (!isRari) {
    const remoteUSDCOFT = process.env[`USDCOFT_${isBaseSepolia ? "ETHEREUM_SEPOLIA" : isArc ? "BASE_SEPOLIA" : "BASE_SEPOLIA"}`];
    const remoteVaultShareOFT = process.env[`VAULT_SHARE_OFT_${isBaseSepolia ? "ETHEREUM_SEPOLIA" : isArc ? "BASE_SEPOLIA" : "BASE_SEPOLIA"}`];
    
    if (remoteUSDCOFT && remoteVaultShareOFT) {
    console.log("\n6️⃣ Setting LayerZero peers (before ownership transfer)...");
    
    // Determine remote endpoint ID
    const remoteEid = isBaseSepolia ? 40161 : isArc ? 40245 : 40245; // Ethereum Sepolia: 40161, Base Sepolia: 40245
    
    // Set peer for USDCOFT (deployer still owns it)
    const usdcOFTRemotePeer = ethers.zeroPadValue(remoteUSDCOFT, 32);
    try {
      const tx1 = await usdcOFT.setPeer(remoteEid, usdcOFTRemotePeer);
      await tx1.wait();
      console.log(`✅ USDCOFT peer set for endpoint ${remoteEid}`);
    } catch (error: any) {
      console.log(`⚠️  Could not set USDCOFT peer: ${error.message}`);
      console.log(`   You can set it manually later using: npx hardhat setPeer --oft USDCOFT --remote-network ${isBaseSepolia ? "ethereum-sepolia" : "base-sepolia"} --network ${network.name}`);
    }
    
    // Set peer for VaultShareOFT (deployer still owns it)
    const vaultShareOFTRemotePeer = ethers.zeroPadValue(remoteVaultShareOFT, 32);
    try {
      const tx2 = await vaultShareOFT.setPeer(remoteEid, vaultShareOFTRemotePeer);
      await tx2.wait();
      console.log(`✅ VaultShareOFT peer set for endpoint ${remoteEid}`);
    } catch (error: any) {
      console.log(`⚠️  Could not set VaultShareOFT peer: ${error.message}`);
      console.log(`   You can set it manually later using: npx hardhat setPeer --oft VaultShareOFT --remote-network ${isBaseSepolia ? "ethereum-sepolia" : "base-sepolia"} --network ${network.name}`);
    }
  } else {
    console.log("\n6️⃣ Skipping peer setup (remote addresses not found in .env)");
    console.log("   Set peers manually after deploying on all chains using:");
      console.log(`   npx hardhat setPeer --oft USDCOFT --remote-network <remote-network> --network ${network.name}`);
      console.log(`   npx hardhat setPeer --oft VaultShareOFT --remote-network <remote-network> --network ${network.name}`);
    }
  } else {
    console.log("\n6️⃣ Skipping peer setup (Rari doesn't support LayerZero)");
  }

  // 7. Configure USDCOFT permissions (AFTER setting peers, skip on Rari)
  if (!isRari) {
    console.log("\n7️⃣ Configuring USDCOFT permissions...");
    const usdcOFT = await ethers.getContractAt("USDCOFT", usdcOFTAddress);
    await usdcOFT.transferOwnership(unifiedVaultAddress);
    console.log("✅ USDCOFT ownership transferred to UnifiedVault");
    console.log("   Note: After ownership transfer, only UnifiedVault can call owner-only functions");
    console.log("   If you need to set more peers, use UnifiedVault's owner address or set them before this step");
  }

  console.log("\n✅ Deployment Summary:");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("Network:", network.name);
  console.log("VaultFactory:", vaultFactoryAddress);
  console.log("USDCOFT:", usdcOFTAddress);
  console.log("VaultShareOFT:", vaultShareOFTAddress);
  console.log("UnifiedVault:", unifiedVaultAddress);
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  // Save addresses to .env file
  const envPath = path.join(__dirname, "..", ".env");
  let envContent = "";
  
  // Read existing .env if it exists
  if (fs.existsSync(envPath)) {
    envContent = fs.readFileSync(envPath, "utf-8");
  } else {
    // Create from env.example if it exists
    const envExamplePath = path.join(__dirname, "..", ".env.example");
    if (fs.existsSync(envExamplePath)) {
      envContent = fs.readFileSync(envExamplePath, "utf-8");
    }
  }

  // Update or add addresses
  const updates = [
    { key: `VAULT_FACTORY_${chainName}`, value: vaultFactoryAddress },
    { key: `USDCOFT_${chainName}`, value: usdcOFTAddress },
    { key: `VAULT_SHARE_OFT_${chainName}`, value: vaultShareOFTAddress },
    { key: `UNIFIED_VAULT_${chainName}`, value: unifiedVaultAddress },
  ];

  // Add MockUSDC address for Rari
  if (isRari && finalUSDCAddress !== USDC_ADDRESS) {
    updates.push({ key: `MOCK_USDC_${chainName}`, value: finalUSDCAddress });
    updates.push({ key: `USDC_RARI`, value: finalUSDCAddress });
  }

  // Also update OFT_ADDRESS for backward compatibility
  updates.push({ key: `OFT_ADDRESS_${chainName}`, value: vaultShareOFTAddress });

  for (const { key, value } of updates) {
    const regex = new RegExp(`^${key}=.*$`, "m");
    if (regex.test(envContent)) {
      envContent = envContent.replace(regex, `${key}=${value}`);
    } else {
      // Append if not found
      envContent += `\n${key}=${value}`;
    }
  }

  // Write back to .env
  fs.writeFileSync(envPath, envContent);
  console.log("\n✅ Addresses saved to .env file");

  // Deployment instructions
  if (isBaseSepolia) {
    console.log("\n📝 Next Steps:");
    console.log("1. Deploy to Ethereum Sepolia and Arc with same script");
    console.log("2. Set peers on all chains using set-peers.ts script");
    console.log("3. Run tests: npm run test:layerzero:testnet -- --network base-sepolia");
  } else if (isEthereumSepolia) {
    console.log("\n📝 Next Steps:");
    console.log("1. Deploy to Base Sepolia and Arc with same script");
    console.log("2. Set peers on all chains using set-peers.ts script");
    console.log("3. Run tests: npm run test:layerzero:testnet -- --network ethereum-sepolia");
  } else if (isArc) {
    console.log("\n📝 Next Steps:");
    console.log("1. Deploy to Base Sepolia and Ethereum Sepolia with same script");
    console.log("2. Set peers on all chains using set-peers.ts script");
    console.log("3. Run tests: npm run test:layerzero:testnet -- --network arc");
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

