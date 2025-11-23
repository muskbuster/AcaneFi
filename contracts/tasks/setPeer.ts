/**
 * Hardhat Task: Set LayerZero peer for OFT contracts
 * Based on: https://docs.layerzero.network/v2/get-started/create-lz-oapp/start
 */

import { task } from "hardhat/config";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import * as dotenv from "dotenv";

dotenv.config();

interface NetworkConfig {
  eid?: number;
  chainId?: number;
}

task("setPeer", "Set LayerZero peer for OFT contract")
  .addParam("oft", "OFT contract name: 'USDCOFT' or 'VaultShareOFT'")
  .addParam("remoteNetwork", "Remote network name (from hardhat.config.ts)")
  .setAction(async (taskArgs, hre: HardhatRuntimeEnvironment) => {
    const { ethers } = await import("hardhat");
    const { oft, remoteNetwork } = taskArgs;
    const [signer] = await hre.ethers.getSigners();

    console.log(`\n🔗 Setting peer for ${oft} on ${hre.network.name}`);

    // Get network configurations
    const srcNetworkConfig = hre.config.networks[hre.network.name] as NetworkConfig;
    const dstNetworkConfig = hre.config.networks[remoteNetwork] as NetworkConfig;

    if (!srcNetworkConfig?.eid) {
      throw new Error(`Source network ${hre.network.name} does not have endpoint ID (eid) configured`);
    }

    if (!dstNetworkConfig?.eid) {
      throw new Error(`Destination network ${remoteNetwork} does not have endpoint ID (eid) configured`);
    }

    const remoteEid = dstNetworkConfig.eid;
    console.log(`   Remote network: ${remoteNetwork} (EID: ${remoteEid})`);

    // Get local OFT contract address
    const chainName = hre.network.name.toUpperCase().replace("-", "_");
    const envKey = oft === "USDCOFT" 
      ? `USDCOFT_${chainName}`
      : `VAULT_SHARE_OFT_${chainName}`;
    
    const localOftAddress = process.env[envKey];
    if (!localOftAddress || localOftAddress === "0x0000000000000000000000000000000000000000") {
      throw new Error(`Local OFT address not found in .env: ${envKey}`);
    }

    // Get remote OFT contract address
    const remoteChainName = remoteNetwork.toUpperCase().replace("-", "_");
    const remoteEnvKey = oft === "USDCOFT"
      ? `USDCOFT_${remoteChainName}`
      : `VAULT_SHARE_OFT_${remoteChainName}`;
    
    const remoteOftAddress = process.env[remoteEnvKey];
    if (!remoteOftAddress || remoteOftAddress === "0x0000000000000000000000000000000000000000") {
      throw new Error(`Remote OFT address not found in .env: ${remoteEnvKey}`);
    }

    console.log(`   Local OFT: ${localOftAddress}`);
    console.log(`   Remote OFT: ${remoteOftAddress}`);

    // Get OFT contract
    const OFT = await hre.ethers.getContractFactory(oft);
    const oftContract = OFT.attach(localOftAddress);

    // Format peer address as bytes32
    const peerBytes32 = ethers.zeroPadValue(remoteOftAddress, 32);
    console.log(`   Peer bytes32: ${peerBytes32}`);

    // Check current peer
    const currentPeer = await oftContract.peers(remoteEid);
    if (currentPeer.toLowerCase() === peerBytes32.toLowerCase()) {
      console.log(`   ✅ Peer already set correctly`);
      return;
    }

    // Set peer
    console.log(`\n📝 Setting peer...`);
    try {
      const tx = await oftContract.setPeer(remoteEid, peerBytes32);
      const receipt = await tx.wait();
      console.log(`   ✅ Peer set successfully!`);
      console.log(`   Transaction: ${receipt?.hash}`);

      const explorerBase = hre.network.name === "base-sepolia"
        ? "https://sepolia.basescan.org"
        : "https://sepolia.etherscan.io";
      console.log(`   Explorer: ${explorerBase}/tx/${receipt?.hash}`);

      // Verify
      const newPeer = await oftContract.peers(remoteEid);
      if (newPeer.toLowerCase() === peerBytes32.toLowerCase()) {
        console.log(`   ✅ Verified: Peer set correctly`);
      } else {
        console.log(`   ⚠️  Warning: Peer verification failed`);
        console.log(`      Expected: ${peerBytes32}`);
        console.log(`      Got: ${newPeer}`);
      }
    } catch (error: any) {
      console.error(`   ❌ Failed to set peer: ${error.message}`);
      if (error.data) {
        console.error(`   Error data: ${error.data}`);
      }
      throw error;
    }
  });

