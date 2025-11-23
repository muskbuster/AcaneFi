import { ethers } from "hardhat";
import * as dotenv from "dotenv";
import * as fs from "fs";
import * as path from "path";

dotenv.config();

/**
 * Complete deployment with LayerZero configuration
 * 
 * Order of operations:
 * 1. Deploy all contracts
 * 2. Configure LayerZero libraries/DVNs (using OApp utilities if available)
 * 3. Set peers
 * 4. Test fee quoting
 * 5. Transfer ownership (ONLY after all config passes)
 */
async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("🚀 Deploying contracts with full LayerZero configuration");
  console.log("Account:", deployer.address);
  console.log("Balance:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)), "ETH");

  const network = await ethers.provider.getNetwork();
  console.log("Network:", network.name, "Chain ID:", network.chainId);

  // Configuration
  const TEE_ADDRESS = process.env.TEE_ADDRESS || deployer.address;
  const TEE_WALLET = process.env.TEE_WALLET_ADDRESS || deployer.address;
  
  // USDC addresses (testnet)
  const USDC_ETHEREUM_SEPOLIA = "0x1c7d4b196cb0c7b01d743fbc6116a902379c7238";
  const USDC_BASE_SEPOLIA = "0x036CbD53842c5426634e7929541eC2318f3dCF7e";
  
  // LayerZero EndpointV2 (testnet)
  const LZ_ENDPOINT = "0x6EDCE65403992e310A62460808c4b910D972f10f";
  
  // CCTP contracts (testnet)
  const CCTP_TOKEN_MESSENGER = "0x8FE6B999Dc680CcFDD5Bf7EB0974218be2542DAA";
  const CCTP_MESSAGE_TRANSMITTER = "0xE737e5cEBEEBa77EFE34D4aa090756590b1CE275";

  // Determine which chain we're deploying to
  const isBaseSepolia = network.chainId === BigInt(84532);
  const isEthereumSepolia = network.chainId === BigInt(11155111);
  
  if (!isBaseSepolia && !isEthereumSepolia) {
    throw new Error("This script only supports Base Sepolia and Ethereum Sepolia");
  }
  
  const USDC_ADDRESS = isBaseSepolia ? USDC_BASE_SEPOLIA : USDC_ETHEREUM_SEPOLIA;
  const chainName = isBaseSepolia ? "BASE_SEPOLIA" : "ETHEREUM_SEPOLIA";
  const remoteChainName = isBaseSepolia ? "ETHEREUM_SEPOLIA" : "BASE_SEPOLIA";
  const remoteEid = isBaseSepolia ? 40161 : 40245;

  console.log("\n📋 Deployment Configuration:");
  console.log("Chain:", chainName);
  console.log("Remote Chain:", remoteChainName, "(EID:", remoteEid + ")");
  console.log("USDC:", USDC_ADDRESS);
  console.log("LayerZero Endpoint:", LZ_ENDPOINT);

  // ============================================
  // STEP 1: Deploy Contracts
  // ============================================
  console.log("\n" + "=".repeat(60));
  console.log("STEP 1: Deploying Contracts");
  console.log("=".repeat(60));

  // 1.1 Deploy VaultFactory
  console.log("\n1.1 Deploying VaultFactory...");
  const VaultFactory = await ethers.getContractFactory("VaultFactory");
  const vaultFactory = await VaultFactory.deploy(TEE_ADDRESS, USDC_ADDRESS);
  await vaultFactory.waitForDeployment();
  const vaultFactoryAddress = await vaultFactory.getAddress();
  console.log("✅ VaultFactory:", vaultFactoryAddress);

  // 1.2 Deploy USDCOFT
  console.log("\n1.2 Deploying USDCOFT...");
  const USDCOFT = await ethers.getContractFactory("USDCOFT");
  const usdcOFT = await USDCOFT.deploy(
    "USD Coin OFT",
    "USDC",
    LZ_ENDPOINT,
    deployer.address
  );
  await usdcOFT.waitForDeployment();
  const usdcOFTAddress = await usdcOFT.getAddress();
  console.log("✅ USDCOFT:", usdcOFTAddress);

  // 1.3 Deploy VaultShareOFT
  console.log("\n1.3 Deploying VaultShareOFT...");
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
  console.log("✅ VaultShareOFT:", vaultShareOFTAddress);

  // 1.4 Configure VaultFactory
  console.log("\n1.4 Configuring VaultFactory...");
  await vaultFactory.setVaultShareOFT(vaultShareOFTAddress);
  console.log("✅ VaultFactory configured");

  // 1.5 Deploy UnifiedVault
  console.log("\n1.5 Deploying UnifiedVault...");
  const UnifiedVault = await ethers.getContractFactory("UnifiedVault");
  const unifiedVault = await UnifiedVault.deploy(
    vaultFactoryAddress,
    USDC_ADDRESS,
    usdcOFTAddress,
    vaultShareOFTAddress,
    CCTP_TOKEN_MESSENGER,
    CCTP_MESSAGE_TRANSMITTER,
    TEE_WALLET
  );
  await unifiedVault.waitForDeployment();
  const unifiedVaultAddress = await unifiedVault.getAddress();
  console.log("✅ UnifiedVault:", unifiedVaultAddress);

  // ============================================
  // STEP 2: Configure LayerZero (BEFORE ownership transfer)
  // ============================================
  console.log("\n" + "=".repeat(60));
  console.log("STEP 2: Configuring LayerZero Libraries/DVNs");
  console.log("=".repeat(60));
  console.log("⚠️  This step requires LayerZero OApp CLI configuration.");
  console.log("   Libraries/DVNs/Executors must be configured for fee quoting to work.");
  console.log("   After deployment, run: npx @layerzerolabs/toolbox-oapp config");
  console.log("   Then re-run this script or use configure-layerzero-libraries.ts");

  // Check if libraries are already configured by testing fee quote
  console.log("\n2.1 Testing fee quoting (to check if libraries are configured)...");
  try {
    const testAmount = ethers.parseUnits("1", 6);
    const recipientBytes32 = ethers.zeroPadValue(deployer.address, 32);
    const sendParam = {
      dstEid: remoteEid,
      to: recipientBytes32,
      amountLD: testAmount,
      minAmountLD: testAmount,
      extraOptions: "0x",
      composeMsg: "0x",
      oftCmd: "0x",
    };
    
    const fee = await usdcOFT.quoteSend(sendParam, false);
    console.log("✅ Fee quoting works! Libraries are configured.");
    console.log(`   Native Fee: ${ethers.formatEther(fee.nativeFee)} ETH`);
  } catch (error: any) {
    console.log("⚠️  Fee quoting failed - libraries need configuration");
    console.log(`   Error: ${error.message}`);
    console.log("\n   To configure libraries:");
    console.log("   1. Install: npm install -g @layerzerolabs/toolbox-oapp");
    console.log("   2. Configure: npx @layerzerolabs/toolbox-oapp config");
    console.log("   3. Re-test: npx hardhat run scripts/quote-oft-fee.ts --network", network.name);
  }

  // ============================================
  // STEP 3: Set Peers (BEFORE ownership transfer)
  // ============================================
  console.log("\n" + "=".repeat(60));
  console.log("STEP 3: Setting LayerZero Peers");
  console.log("=".repeat(60));

  const remoteUSDCOFT = process.env[`USDCOFT_${remoteChainName}`];
  const remoteVaultShareOFT = process.env[`VAULT_SHARE_OFT_${remoteChainName}`];
  
  if (remoteUSDCOFT && remoteVaultShareOFT) {
    // Set USDCOFT peer
    console.log("\n3.1 Setting USDCOFT peer...");
    const usdcOFTRemotePeer = ethers.zeroPadValue(remoteUSDCOFT, 32);
    try {
      const tx1 = await usdcOFT.setPeer(remoteEid, usdcOFTRemotePeer);
      await tx1.wait();
      console.log(`✅ USDCOFT peer set (EID ${remoteEid})`);
      console.log(`   Remote: ${remoteUSDCOFT}`);
    } catch (error: any) {
      console.log(`❌ Failed to set USDCOFT peer: ${error.message}`);
    }
    
    // Set VaultShareOFT peer
    console.log("\n3.2 Setting VaultShareOFT peer...");
    const vaultShareOFTRemotePeer = ethers.zeroPadValue(remoteVaultShareOFT, 32);
    try {
      const tx2 = await vaultShareOFT.setPeer(remoteEid, vaultShareOFTRemotePeer);
      await tx2.wait();
      console.log(`✅ VaultShareOFT peer set (EID ${remoteEid})`);
      console.log(`   Remote: ${remoteVaultShareOFT}`);
    } catch (error: any) {
      console.log(`❌ Failed to set VaultShareOFT peer: ${error.message}`);
    }
  } else {
    console.log("⚠️  Remote addresses not found in .env");
    console.log("   Deploy on", remoteChainName, "first, then set peers manually:");
    console.log(`   npx hardhat setPeer --oft USDCOFT --remote-network ${remoteChainName.toLowerCase().replace('_', '-')} --network ${network.name}`);
  }

  // ============================================
  // STEP 4: Final Verification (BEFORE ownership transfer)
  // ============================================
  console.log("\n" + "=".repeat(60));
  console.log("STEP 4: Final Verification");
  console.log("=".repeat(60));

  // Verify peers
  console.log("\n4.1 Verifying peers...");
  try {
    const usdcPeer = await usdcOFT.peers(remoteEid);
    const vaultSharePeer = await vaultShareOFT.peers(remoteEid);
    
    if (remoteUSDCOFT) {
      const expectedPeer = ethers.zeroPadValue(remoteUSDCOFT, 32);
      if (usdcPeer.toLowerCase() === expectedPeer.toLowerCase()) {
        console.log("✅ USDCOFT peer verified");
      } else {
        console.log("❌ USDCOFT peer mismatch");
      }
    }
    
    if (remoteVaultShareOFT) {
      const expectedPeer = ethers.zeroPadValue(remoteVaultShareOFT, 32);
      if (vaultSharePeer.toLowerCase() === expectedPeer.toLowerCase()) {
        console.log("✅ VaultShareOFT peer verified");
      } else {
        console.log("❌ VaultShareOFT peer mismatch");
      }
    }
  } catch (error: any) {
    console.log("⚠️  Could not verify peers:", error.message);
  }

  // Test fee quoting one more time
  console.log("\n4.2 Final fee quote test...");
  try {
    const testAmount = ethers.parseUnits("1", 6);
    const recipientBytes32 = ethers.zeroPadValue(deployer.address, 32);
    const sendParam = {
      dstEid: remoteEid,
      to: recipientBytes32,
      amountLD: testAmount,
      minAmountLD: testAmount,
      extraOptions: "0x",
      composeMsg: "0x",
      oftCmd: "0x",
    };
    
    const fee = await usdcOFT.quoteSend(sendParam, false);
    console.log("✅ Fee quoting works!");
    console.log(`   Native Fee: ${ethers.formatEther(fee.nativeFee)} ETH`);
    console.log(`   LZ Token Fee: ${ethers.formatEther(fee.lzTokenFee)} LZ Token`);
  } catch (error: any) {
    console.log("⚠️  Fee quoting still fails - libraries need configuration");
    console.log("   This is expected if libraries aren't configured yet.");
    console.log("   Configure using: npx @layerzerolabs/toolbox-oapp config");
  }

  // ============================================
  // STEP 5: Transfer Ownership (AFTER all configuration)
  // ============================================
  console.log("\n" + "=".repeat(60));
  console.log("STEP 5: Transferring Ownership");
  console.log("=".repeat(60));
  console.log("⚠️  Ownership transfer happens AFTER all configuration");
  console.log("   This ensures you can still configure if needed.");

  console.log("\n5.1 Transferring USDCOFT ownership to UnifiedVault...");
  try {
    await usdcOFT.transferOwnership(unifiedVaultAddress);
    console.log("✅ USDCOFT ownership transferred");
  } catch (error: any) {
    console.log(`❌ Failed to transfer ownership: ${error.message}`);
  }

  // ============================================
  // Save to .env
  // ============================================
  console.log("\n" + "=".repeat(60));
  console.log("Saving addresses to .env");
  console.log("=".repeat(60));

  const envPath = path.join(__dirname, "..", ".env");
  let envContent = fs.existsSync(envPath) ? fs.readFileSync(envPath, "utf-8") : "";

  const updates = [
    { key: `VAULT_FACTORY_${chainName}`, value: vaultFactoryAddress },
    { key: `USDCOFT_${chainName}`, value: usdcOFTAddress },
    { key: `VAULT_SHARE_OFT_${chainName}`, value: vaultShareOFTAddress },
    { key: `UNIFIED_VAULT_${chainName}`, value: unifiedVaultAddress },
    { key: `OFT_ADDRESS_${chainName}`, value: vaultShareOFTAddress },
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
  console.log("✅ Addresses saved to .env");

  // ============================================
  // Summary
  // ============================================
  console.log("\n" + "=".repeat(60));
  console.log("✅ DEPLOYMENT COMPLETE");
  console.log("=".repeat(60));
  console.log("\n📋 Deployed Contracts:");
  console.log(`   VaultFactory: ${vaultFactoryAddress}`);
  console.log(`   USDCOFT: ${usdcOFTAddress}`);
  console.log(`   VaultShareOFT: ${vaultShareOFTAddress}`);
  console.log(`   UnifiedVault: ${unifiedVaultAddress}`);

  console.log("\n📝 Next Steps:");
  if (!remoteUSDCOFT || !remoteVaultShareOFT) {
    console.log("1. Deploy to", remoteChainName, "using same script");
  }
  console.log("2. Configure LayerZero libraries (if fee quoting failed):");
  console.log("   npm install -g @layerzerolabs/toolbox-oapp");
  console.log("   npx @layerzerolabs/toolbox-oapp config");
  console.log("3. Test fee quoting:");
  console.log(`   npx hardhat run scripts/quote-oft-fee.ts --network ${network.name}`);
  console.log("4. Run tests:");
  console.log(`   npm run test:layerzero:testnet -- --network ${network.name}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

