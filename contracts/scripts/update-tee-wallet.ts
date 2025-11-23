import { ethers } from "hardhat";
import * as dotenv from "dotenv";

dotenv.config();

/**
 * Update TEE wallet address in UnifiedVault
 */
async function main() {
  const [deployer] = await ethers.getSigners();
  const network = await ethers.provider.getNetwork();
  
  console.log("Network:", network.name, "Chain ID:", network.chainId);
  console.log("Deployer:", deployer.address);

  // Get UnifiedVault address
  const chainName = network.chainId === BigInt(84532) ? "BASE_SEPOLIA" 
    : network.chainId === BigInt(11155111) ? "ETHEREUM_SEPOLIA"
    : network.chainId === BigInt(5042002) ? "ARC"
    : network.chainId === BigInt(1918988905) ? "RARI"
    : "UNKNOWN";
  
  const unifiedVaultAddress = process.env[`UNIFIED_VAULT_${chainName}`];
  if (!unifiedVaultAddress) {
    throw new Error(`UNIFIED_VAULT_${chainName} not found in .env`);
  }

  // Get new TEE wallet address (from CDP)
  const newTEEWallet = process.env.CDP_TEE_WALLET || process.env.TEE_WALLET_ADDRESS || process.env.TEE_ADDRESS;
  if (!newTEEWallet) {
    throw new Error("CDP_TEE_WALLET or TEE_WALLET_ADDRESS not found in .env");
  }

  console.log("\n📋 Updating TEE Wallet:");
  console.log("UnifiedVault:", unifiedVaultAddress);
  console.log("New TEE Wallet:", newTEEWallet);

  const UnifiedVault = await ethers.getContractFactory("UnifiedVault");
  const unifiedVault = UnifiedVault.attach(unifiedVaultAddress);

  // Check current TEE wallet
  const currentTEEWallet = await unifiedVault.teeWallet();
  console.log("Current TEE Wallet:", currentTEEWallet);

  if (currentTEEWallet.toLowerCase() === newTEEWallet.toLowerCase()) {
    console.log("✅ TEE wallet already matches!");
    return;
  }

  // Update TEE wallet (only owner can do this)
  console.log("\n🔄 Updating TEE wallet...");
  const tx = await unifiedVault.setTEEWallet(newTEEWallet);
  await tx.wait();
  
  console.log("✅ TEE wallet updated!");
  console.log("Transaction:", tx.hash);
  
  // Verify
  const updatedTEEWallet = await unifiedVault.teeWallet();
  console.log("Updated TEE Wallet:", updatedTEEWallet);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

