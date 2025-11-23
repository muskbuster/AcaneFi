import { ethers } from "hardhat";
import * as dotenv from "dotenv";

dotenv.config();

/**
 * Configure LayerZero libraries for OFT contracts
 * This must be run BEFORE ownership transfer
 * 
 * For testnet, we need to use LayerZero's default library addresses
 * These can be found in LayerZero documentation or via OApp CLI
 */
async function main() {
  const [deployer] = await ethers.getSigners();
  const network = await ethers.provider.getNetwork();
  
  console.log("⚙️  Configuring LayerZero Libraries");
  console.log(`Network: ${network.name} (Chain ID: ${network.chainId})`);
  console.log(`Deployer: ${deployer.address}`);
  
  const isBaseSepolia = network.chainId === BigInt(84532);
  const isEthereumSepolia = network.chainId === BigInt(11155111);
  
  if (!isBaseSepolia && !isEthereumSepolia) {
    throw new Error("This script must run on Base Sepolia or Ethereum Sepolia");
  }
  
  const chainName = isBaseSepolia ? "BASE_SEPOLIA" : "ETHEREUM_SEPOLIA";
  const remoteChainName = isBaseSepolia ? "ETHEREUM_SEPOLIA" : "BASE_SEPOLIA";
  const remoteEid = isBaseSepolia ? 40161 : 40245;
  
  // Get OFT addresses
  const usdcOFTAddress = process.env[`USDCOFT_${chainName}`];
  const vaultShareOFTAddress = process.env[`VAULT_SHARE_OFT_${chainName}`];
  
  if (!usdcOFTAddress || !vaultShareOFTAddress) {
    throw new Error("OFT addresses not found in .env");
  }
  
  console.log(`\n📋 Configuration:`);
  console.log(`USDCOFT: ${usdcOFTAddress}`);
  console.log(`VaultShareOFT: ${vaultShareOFTAddress}`);
  console.log(`Remote EID: ${remoteEid}`);
  
  const USDCOFT = await ethers.getContractFactory("USDCOFT");
  const VaultShareOFT = await ethers.getContractFactory("VaultShareOFT");
  
  const usdcOFT = USDCOFT.attach(usdcOFTAddress);
  const vaultShareOFT = VaultShareOFT.attach(vaultShareOFTAddress);
  
  // Check ownership
  const usdcOwner = await usdcOFT.owner();
  const vaultShareOwner = await vaultShareOFT.owner();
  
  if (usdcOwner.toLowerCase() !== deployer.address.toLowerCase()) {
    console.log(`\n⚠️  Deployer is not owner of USDCOFT`);
    console.log(`   Owner: ${usdcOwner}`);
    console.log(`   You need owner permissions to configure libraries.`);
    return;
  }
  
  if (vaultShareOwner.toLowerCase() !== deployer.address.toLowerCase()) {
    console.log(`\n⚠️  Deployer is not owner of VaultShareOFT`);
    console.log(`   Owner: ${vaultShareOwner}`);
    console.log(`   You need owner permissions to configure libraries.`);
    return;
  }
  
  console.log(`\n✅ Deployer is owner of both OFT contracts`);
  
  // LayerZero V2 Testnet Default Libraries
  // These are the default libraries for LayerZero V2 testnet
  // Source: LayerZero V2 documentation and deployments
  // Note: These may need to be verified/updated from official docs
  
  // For now, we'll try to use the endpoint's default configuration
  // If that doesn't work, we'll need to use LayerZero OApp CLI
  
  const LZ_ENDPOINT = "0x6EDCE65403992e310A62460808c4b910D972f10f";
  
  console.log(`\n📋 Attempting to configure libraries...`);
  console.log(`   Note: If this fails, use LayerZero OApp CLI:`);
  console.log(`   npx @layerzerolabs/toolbox-oapp config`);
  
  // Try to get library addresses from environment or use defaults
  // For LayerZero V2, libraries are typically configured via OApp CLI
  // But we can try to set them if we know the addresses
  
  const DEFAULT_SEND_LIB = process.env.LZ_DEFAULT_SEND_LIB || "";
  const DEFAULT_RECEIVE_LIB = process.env.LZ_DEFAULT_RECEIVE_LIB || "";
  
  if (DEFAULT_SEND_LIB && DEFAULT_RECEIVE_LIB && DEFAULT_SEND_LIB !== "" && DEFAULT_RECEIVE_LIB !== "") {
    console.log(`\n   Using library addresses from environment:`);
    console.log(`   Send Library: ${DEFAULT_SEND_LIB}`);
    console.log(`   Receive Library: ${DEFAULT_RECEIVE_LIB}`);
    
    try {
      // Configure USDCOFT
      console.log(`\n   Configuring USDCOFT...`);
      await usdcOFT.setSendLibrary(remoteEid, DEFAULT_SEND_LIB);
      await usdcOFT.setReceiveLibrary(remoteEid, DEFAULT_RECEIVE_LIB, 0);
      console.log(`   ✅ USDCOFT libraries configured`);
      
      // Configure VaultShareOFT
      console.log(`\n   Configuring VaultShareOFT...`);
      await vaultShareOFT.setSendLibrary(remoteEid, DEFAULT_SEND_LIB);
      await vaultShareOFT.setReceiveLibrary(remoteEid, DEFAULT_RECEIVE_LIB, 0);
      console.log(`   ✅ VaultShareOFT libraries configured`);
      
      // Test fee quoting
      console.log(`\n   Testing fee quoting...`);
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
      console.log(`   ✅ Fee quoting works!`);
      console.log(`   Native Fee: ${ethers.formatEther(fee.nativeFee)} ETH`);
      
    } catch (error: any) {
      console.log(`   ❌ Configuration failed: ${error.message}`);
      console.log(`   You may need to use LayerZero OApp CLI instead.`);
    }
  } else {
    console.log(`\n⚠️  Library addresses not provided in environment.`);
    console.log(`   To configure libraries, you need:`);
    console.log(`   1. Set LZ_DEFAULT_SEND_LIB in .env`);
    console.log(`   2. Set LZ_DEFAULT_RECEIVE_LIB in .env`);
    console.log(`   Or use LayerZero OApp CLI:`);
    console.log(`   npx @layerzerolabs/toolbox-oapp config`);
    console.log(`\n   Library addresses can be found in LayerZero V2 documentation:`);
    console.log(`   https://docs.layerzero.network/v2/deployments/evm-chains`);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

