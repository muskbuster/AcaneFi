/**
 * Hardhat Task: Send OFT tokens cross-chain via LayerZero
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

task("sendOFT", "Send OFT tokens cross-chain via LayerZero")
  .addParam("oft", "OFT contract name: 'USDCOFT' or 'VaultShareOFT'")
  .addParam("dstNetwork", "Destination network name (from hardhat.config.ts)")
  .addParam("amount", "Amount to send (in token units, e.g., 1000000 for 1 USDC with 6 decimals)")
  .addParam("recipient", "Recipient address on destination chain")
  .addOptionalParam("minAmount", "Minimum amount to receive (defaults to amount)")
  .setAction(async (taskArgs, hre: HardhatRuntimeEnvironment) => {
    const { ethers } = await import("hardhat");
    const { oft, dstNetwork, amount, recipient, minAmount } = taskArgs;
    const [signer] = await hre.ethers.getSigners();

    console.log("\n📤 Sending OFT cross-chain:");
    console.log(`   From: ${signer.address}`);
    console.log(`   Source network: ${hre.network.name}`);
    console.log(`   Destination: ${dstNetwork}`);
    console.log(`   OFT: ${oft}`);
    console.log(`   Amount: ${amount}`);
    console.log(`   Recipient: ${recipient}`);

    // Get network configurations
    const srcNetworkConfig = hre.config.networks[hre.network.name] as NetworkConfig;
    const dstNetworkConfig = hre.config.networks[dstNetwork] as NetworkConfig;

    if (!srcNetworkConfig?.eid) {
      throw new Error(`Source network ${hre.network.name} does not have endpoint ID (eid) configured`);
    }

    if (!dstNetworkConfig?.eid) {
      throw new Error(`Destination network ${dstNetwork} does not have endpoint ID (eid) configured`);
    }

    const srcEid = srcNetworkConfig.eid;
    const dstEid = dstNetworkConfig.eid;

    console.log(`   Source EID: ${srcEid}`);
    console.log(`   Destination EID: ${dstEid}`);

    // Get OFT contract address from .env
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

    // Check balance
    const balance = await oftContract.balanceOf(signer.address);
    const amountBigInt = BigInt(amount);
    console.log(`   Current balance: ${balance.toString()}`);

    if (balance < amountBigInt) {
      throw new Error(`Insufficient balance: have ${balance.toString()}, need ${amountBigInt.toString()}`);
    }

    // Prepare send parameters
    const recipientBytes32 = ethers.zeroPadValue(recipient, 32);
    const minAmountLD = minAmount ? BigInt(minAmount) : amountBigInt;

    const sendParam = {
      dstEid: dstEid,
      to: recipientBytes32,
      amountLD: amountBigInt,
      minAmountLD: minAmountLD,
    };

    // Quote fee using quoteSend according to LayerZero V2 OFT documentation
    // Reference: https://docs.layerzero.network/v2/developers/evm/oft/quickstart
    console.log("\n💰 Getting LayerZero fee quote...");
    try {
      // quoteSend(SendParam calldata _sendParam, bool _payInLzToken) returns MessagingFee
      const quoteResult = await oftContract.quoteSend(sendParam, false);
      
      const nativeFee = quoteResult.nativeFee;
      const lzTokenFee = quoteResult.lzTokenFee;
      
      console.log(`   Native Fee: ${ethers.formatEther(nativeFee)} ETH`);
      console.log(`   LZ Token Fee: ${ethers.formatEther(lzTokenFee)} LZ Token`);

      // Check if signer has enough native token
      const signerBalance = await hre.ethers.provider.getBalance(signer.address);
      if (signerBalance < nativeFee * 2n) {
        throw new Error(
          `Insufficient native token for fee: need ${ethers.formatEther(nativeFee * 2n)} ETH, have ${ethers.formatEther(signerBalance)} ETH`
        );
      }

      // Send OFT
      console.log("\n🚀 Sending OFT cross-chain...");
      const messagingFee = {
        nativeFee: nativeFee,
        lzTokenFee: lzTokenFee,
      };

      // Send OFT using send() function
      // send(SendParam, MessagingFee, address refundTo, bytes extraOptions, bytes composeMsg)
      const sendTx = await oftContract.send(
        sendParam,
        messagingFee,
        signer.address,
        "0x", // extraOptions
        "0x", // composeMsg
        { value: nativeFee * 2n } // Send extra for gas
      );

      const receipt = await sendTx.wait();
      console.log(`✅ Transaction sent! Hash: ${receipt?.hash}`);

      const explorerBase = hre.network.name === "base-sepolia"
        ? "https://sepolia.basescan.org"
        : "https://sepolia.etherscan.io";
      console.log(`   Explorer: ${explorerBase}/tx/${receipt?.hash}`);
      console.log(`   LayerZero Scan: https://testnet.layerzeroscan.com/tx/${receipt?.hash}`);

      console.log("\n⏳ Waiting for LayerZero to process cross-chain message...");
      console.log(`   This can take 1-2 minutes. Check LayerZero Scan for status.`);

    } catch (error: any) {
      console.error(`❌ Error: ${error.message}`);
      if (error.data) {
        console.error(`   Error data: ${error.data}`);
      }
      throw error;
    }
  });

