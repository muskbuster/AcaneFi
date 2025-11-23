import { ethers } from "hardhat";
import * as dotenv from "dotenv";

dotenv.config();

/**
 * Set peers for LayerZero OFT cross-chain communication
 * Run this after deploying OFT on both chains
 */
async function main() {
  const [deployer] = await ethers.getSigners();
  const network = await ethers.provider.getNetwork();
  
  console.log("Setting peers for network:", network.name);
  console.log("Deployer:", deployer.address);

  // Get OFT address from environment or prompt
  const localOFTAddress = process.env.OFT_ADDRESS || "";
  const remoteOFTAddress = process.env.REMOTE_OFT_ADDRESS || "";
  
  if (!localOFTAddress || !remoteOFTAddress) {
    console.error("❌ Please set OFT_ADDRESS and REMOTE_OFT_ADDRESS environment variables");
    process.exit(1);
  }

  // Get OFT contract
  const VaultShareOFT = await ethers.getContractFactory("VaultShareOFT");
  const oft = VaultShareOFT.attach(localOFTAddress);

  // Determine endpoint IDs
  const isBaseSepolia = network.chainId === BigInt(84532);
  const isEthereumSepolia = network.chainId === BigInt(11155111);

  if (!isBaseSepolia && !isEthereumSepolia) {
    console.error("❌ This script only works for Base Sepolia or Ethereum Sepolia");
    process.exit(1);
  }

  const remoteEid = isBaseSepolia ? 40161 : 40245; // Ethereum Sepolia: 40161, Base Sepolia: 40245

  // Format peer address: remoteOFT address as bytes32
  // LayerZero peer is just the remote contract address, not a concatenation
  // Format: 0x000000000000000000000000 + 20-byte-address (total 32 bytes)
  const peerAddress = ethers.zeroPadValue(remoteOFTAddress, 32);

  console.log("\n📋 Peer Configuration:");
  console.log("Local OFT:", localOFTAddress);
  console.log("Remote OFT:", remoteOFTAddress);
  console.log("Remote Endpoint ID:", remoteEid);
  console.log("Peer Address (bytes32):", peerAddress);

  // Set peer
  console.log("\n🔗 Setting peer...");
  const tx = await oft.setPeer(remoteEid, peerAddress);
  console.log("Transaction hash:", tx.hash);
  await tx.wait();
  console.log("✅ Peer set successfully!");

  console.log("\n✅ Verification:");
  const peer = await oft.peers(remoteEid);
  console.log("Peer address:", peer);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

