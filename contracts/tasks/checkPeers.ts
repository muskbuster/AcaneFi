/**
 * Hardhat Task: Check LayerZero peer configuration for OFT contracts
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

task("checkPeers", "Check LayerZero peer configuration for OFT contracts")
  .addParam("oft", "OFT contract name: 'USDCOFT' or 'VaultShareOFT'")
  .addOptionalParam("remoteNetwork", "Remote network to check (if not provided, checks all configured networks)")
  .setAction(async (taskArgs, hre: HardhatRuntimeEnvironment) => {
    const { ethers } = await import("hardhat");
    const { oft, remoteNetwork } = taskArgs;
    const [signer] = await hre.ethers.getSigners();

    console.log(`\n🔍 Checking peers for ${oft} on ${hre.network.name}`);

    // Get OFT contract address
    const chainName = hre.network.name.toUpperCase().replace("-", "_");
    const envKey = oft === "USDCOFT" 
      ? `USDCOFT_${chainName}`
      : `VAULT_SHARE_OFT_${chainName}`;
    
    const oftAddress = process.env[envKey];
    if (!oftAddress || oftAddress === "0x0000000000000000000000000000000000000000") {
      throw new Error(`OFT address not found in .env: ${envKey}`);
    }

    console.log(`   OFT Address: ${oftAddress}`);

    // Get OFT contract
    const OFT = await hre.ethers.getContractFactory(oft);
    const oftContract = OFT.attach(oftAddress);

    // Get all configured networks
    const networks = Object.keys(hre.config.networks).filter(
      (name) => name !== "hardhat" && (hre.config.networks[name] as NetworkConfig)?.eid
    );

    const networksToCheck = remoteNetwork ? [remoteNetwork] : networks;

    console.log(`\n📋 Checking peers for networks: ${networksToCheck.join(", ")}\n`);

    for (const networkName of networksToCheck) {
      const networkConfig = hre.config.networks[networkName] as NetworkConfig;
      if (!networkConfig?.eid) {
        console.log(`   ⚠️  ${networkName}: No endpoint ID configured`);
        continue;
      }

      const remoteEid = networkConfig.eid;
      
      // Get remote OFT address
      const remoteChainName = networkName.toUpperCase().replace("-", "_");
      const remoteEnvKey = oft === "USDCOFT"
        ? `USDCOFT_${remoteChainName}`
        : `VAULT_SHARE_OFT_${remoteChainName}`;
      
      const remoteOftAddress = process.env[remoteEnvKey];
      if (!remoteOftAddress || remoteOftAddress === "0x0000000000000000000000000000000000000000") {
        console.log(`   ⚠️  ${networkName} (EID: ${remoteEid}): Remote OFT not found in .env`);
        continue;
      }

      // Check peer
      const peer = await oftContract.peers(remoteEid);
      const expectedPeer = ethers.zeroPadValue(remoteOftAddress, 32);

      if (peer === ethers.ZeroHash) {
        console.log(`   ❌ ${networkName} (EID: ${remoteEid}): Peer NOT SET`);
        console.log(`      Expected: ${remoteOftAddress}`);
        console.log(`      Use: npx hardhat setPeer --oft ${oft} --remote-network ${networkName}`);
      } else if (peer.toLowerCase() === expectedPeer.toLowerCase()) {
        console.log(`   ✅ ${networkName} (EID: ${remoteEid}): Peer set correctly`);
        console.log(`      Remote OFT: ${remoteOftAddress}`);
      } else {
        console.log(`   ⚠️  ${networkName} (EID: ${remoteEid}): Peer set to different address`);
        console.log(`      Current: ${peer}`);
        console.log(`      Expected: ${expectedPeer}`);
        console.log(`      Remote OFT: ${remoteOftAddress}`);
      }
    }
  });

