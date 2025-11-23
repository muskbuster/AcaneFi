import { ethers } from "hardhat";
import * as dotenv from "dotenv";

dotenv.config();

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
  const USDC_ARC = "0x3600000000000000000000000000000000000000"; // Arc USDC (ERC-20 interface, 6 decimals)
  
  // LayerZero EndpointV2 addresses (testnet)
  const LZ_ENDPOINT_ETHEREUM_SEPOLIA = "0x6EDCE65403992e310A62460808c4b910D972f10f";
  const LZ_ENDPOINT_BASE_SEPOLIA = "0x6EDCE65403992e310A62460808c4b910D972f10f";
  const LZ_ENDPOINT_ARC = process.env.LZ_ENDPOINT_ARC || "0x0000000000000000000000000000000000000000"; // Set from LayerZero docs
  
  // CCTP contracts (testnet) - Same addresses for all testnet chains
  const CCTP_TOKEN_MESSENGER = "0x8FE6B999Dc680CcFDD5Bf7EB0974218be2542DAA";
  const CCTP_MESSAGE_TRANSMITTER = "0xE737e5cEBEEBa77EFE34D4aa090756590b1CE275";
  const CCTP_TOKEN_MINTER = "0xb43db544E2c27092c107639Ad201b3dEfAbcF192";

  // Determine which chain we're deploying to
  const isBaseSepolia = network.chainId === BigInt(84532);
  const isEthereumSepolia = network.chainId === BigInt(11155111);
  const isArc = network.chainId === BigInt(5042002);
  
  const USDC_ADDRESS = isBaseSepolia ? USDC_BASE_SEPOLIA : isArc ? USDC_ARC : USDC_ETHEREUM_SEPOLIA;
  const LZ_ENDPOINT = isBaseSepolia ? LZ_ENDPOINT_BASE_SEPOLIA : isArc ? LZ_ENDPOINT_ARC : LZ_ENDPOINT_ETHEREUM_SEPOLIA;
  // CCTP contracts are the same for all testnet chains

  console.log("\n📋 Deployment Configuration:");
  console.log("USDC Address:", USDC_ADDRESS);
  console.log("LayerZero Endpoint:", LZ_ENDPOINT);
  console.log("CCTP TokenMessenger:", CCTP_TOKEN_MESSENGER);
  console.log("CCTP MessageTransmitter:", CCTP_MESSAGE_TRANSMITTER);
  console.log("CCTP TokenMinter:", CCTP_TOKEN_MINTER);
  console.log("TEE Wallet:", TEE_WALLET);

  // 1. Deploy VaultFactory
  console.log("\n1️⃣ Deploying VaultFactory...");
  const VaultFactory = await ethers.getContractFactory("VaultFactory");
  const vaultFactory = await VaultFactory.deploy(TEE_ADDRESS, USDC_ADDRESS);
  await vaultFactory.waitForDeployment();
  const vaultFactoryAddress = await vaultFactory.getAddress();
  console.log("✅ VaultFactory deployed to:", vaultFactoryAddress);

  // 2. Deploy USDCOFT (LayerZero OFT for USDC)
  console.log("\n2️⃣ Deploying USDCOFT (OFT)...");
  const USDCOFT = await ethers.getContractFactory("USDCOFT");
  const usdcOFT = await USDCOFT.deploy(
    "USD Coin OFT",
    "USDC",
    LZ_ENDPOINT,
    deployer.address // Owner/delegate
  );
  await usdcOFT.waitForDeployment();
  const usdcOFTAddress = await usdcOFT.getAddress();
  console.log("✅ USDCOFT deployed to:", usdcOFTAddress);

  // 3. Deploy VaultShareOFT (LayerZero OFT for vault shares)
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
  const vaultShareOFTAddress = await vaultShareOFT.getAddress();
  console.log("✅ VaultShareOFT deployed to:", vaultShareOFTAddress);

  // 4. Configure VaultFactory
  console.log("\n4️⃣ Configuring VaultFactory...");
  await vaultFactory.setVaultShareOFT(vaultShareOFTAddress);
  console.log("✅ VaultFactory configured");

  // 5. Deploy UnifiedVault (CCTP + LayerZero)
  console.log("\n5️⃣ Deploying UnifiedVault...");
  const UnifiedVault = await ethers.getContractFactory("UnifiedVault");
  const unifiedVault = await UnifiedVault.deploy(
    vaultFactoryAddress,
    USDC_ADDRESS,
    usdcOFTAddress, // USDCOFT address
    vaultShareOFTAddress,
    CCTP_TOKEN_MESSENGER,
    CCTP_MESSAGE_TRANSMITTER,
    TEE_WALLET
  );
  await unifiedVault.waitForDeployment();
  const unifiedVaultAddress = await unifiedVault.getAddress();
  console.log("✅ UnifiedVault deployed to:", unifiedVaultAddress);

  // 6. Configure USDCOFT to allow UnifiedVault to mint
  console.log("\n6️⃣ Configuring USDCOFT permissions...");
  // Transfer ownership of USDCOFT to UnifiedVault so it can mint tokens
  // Or set UnifiedVault as minter if using a minter role pattern
  // For now, we'll keep deployer as owner and UnifiedVault will need to be set as owner
  // Or we can use a different pattern - let's transfer ownership to UnifiedVault
  await usdcOFT.transferOwnership(unifiedVaultAddress);
  console.log("✅ USDCOFT ownership transferred to UnifiedVault");

  console.log("\n✅ Deployment Summary:");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("Network:", network.name);
  console.log("VaultFactory:", vaultFactoryAddress);
  console.log("USDCOFT:", usdcOFTAddress);
  console.log("VaultShareOFT:", vaultShareOFTAddress);
  console.log("UnifiedVault:", unifiedVaultAddress);
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  // Deployment instructions
  if (isBaseSepolia) {
    console.log("\n📝 Next Steps:");
    console.log("1. Deploy to Ethereum Sepolia and Arc with same script");
    console.log("2. Set peers on all chains using set-peers.ts script");
    console.log("   - Base Sepolia endpoint ID: 40245");
    console.log("   - Ethereum Sepolia endpoint ID: 40161");
    console.log("   - Arc endpoint ID: (check LayerZero docs)");
  } else if (isEthereumSepolia) {
    console.log("\n📝 Next Steps:");
    console.log("1. Deploy to Base Sepolia and Arc with same script");
    console.log("2. Set peers on all chains using set-peers.ts script");
  } else if (isArc) {
    console.log("\n📝 Next Steps:");
    console.log("1. Deploy to Base Sepolia and Ethereum Sepolia with same script");
    console.log("2. Set peers on all chains using set-peers.ts script");
    console.log("3. Arc CCTP domain: 26");
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
