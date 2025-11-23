import { ethers } from "hardhat";
import * as dotenv from "dotenv";

dotenv.config();

/**
 * Register a trader in VaultFactory on Base Sepolia
 */
async function main() {
  const [deployer] = await ethers.getSigners();
  const network = await ethers.provider.getNetwork();
  
  console.log("Network:", network.name, "Chain ID:", network.chainId);
  console.log("Deployer:", deployer.address);

  if (network.chainId !== BigInt(84532)) {
    throw new Error("This script should only run on Base Sepolia");
  }

  // Get UnifiedVault address
  const unifiedVaultAddress = process.env.UNIFIED_VAULT_BASE_SEPOLIA;
  if (!unifiedVaultAddress) {
    throw new Error("UNIFIED_VAULT_BASE_SEPOLIA not found in .env");
  }

  // Get VaultFactory from UnifiedVault
  const UnifiedVault = await ethers.getContractFactory("UnifiedVault");
  const unifiedVault = UnifiedVault.attach(unifiedVaultAddress);
  const vaultFactoryAddress = await unifiedVault.vaultFactory();
  console.log("VaultFactory:", vaultFactoryAddress);

  // Get VaultFactory contract
  const VaultFactory = await ethers.getContractFactory("VaultFactory");
  const vaultFactory = VaultFactory.attach(vaultFactoryAddress);

  // Trader address to register
  const traderAddress = process.env.TRADER_ADDRESS || deployer.address;
  console.log("\n📝 Registering trader:", traderAddress);

  // Check if already registered
  const isRegistered = await vaultFactory.isTraderRegistered(traderAddress);
  if (isRegistered) {
    console.log("✅ Trader already registered");
    
    // Find traderId
    for (let id = 1; id <= 100; id++) {
      const addr = await vaultFactory.getTraderAddress(id);
      if (addr.toLowerCase() === traderAddress.toLowerCase()) {
        console.log(`   Trader ID: ${id}`);
        return;
      }
    }
  } else {
    // Get TEE address (needed for registration)
    const teeAddress = await vaultFactory.teeAddress();
    console.log("TEE Address:", teeAddress);
    
    if (teeAddress.toLowerCase() !== deployer.address.toLowerCase()) {
      console.log("⚠️  Deployer is not TEE address. Registration must be done by TEE.");
      console.log("   Use the backend API /api/tee/register-trader instead");
      return;
    }

    // Register trader
    console.log("\n🔄 Registering trader on-chain...");
    const tx = await vaultFactory.registerTrader(traderAddress);
    await tx.wait();
    
    console.log("✅ Trader registered!");
    console.log("Transaction:", tx.hash);
    
    // Find traderId
    for (let id = 1; id <= 100; id++) {
      const addr = await vaultFactory.getTraderAddress(id);
      if (addr.toLowerCase() === traderAddress.toLowerCase()) {
        console.log(`   Trader ID: ${id}`);
        break;
      }
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

