import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import * as dotenv from "dotenv";

dotenv.config();

// LayerZero Endpoint IDs (eid) - different from chain IDs
// From: https://docs.layerzero.network/v2/deployments/deployed-contracts?stages=testnet
const EndpointId = {
  ETHEREUM_SEPOLIA_V2_TESTNET: 40161,
  BASE_SEPOLIA_V2_TESTNET: 40245,
  // Add more as needed
};

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.20",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  paths: {
    sources: "./src",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts"
  },
  networks: {
    hardhat: {
      chainId: 1337,
    },
    "ethereum-sepolia": {
      url: process.env.RPC_ETHEREUM_SEPOLIA || "https://sepolia.gateway.tenderly.co",
      chainId: 11155111,
      eid: EndpointId.ETHEREUM_SEPOLIA_V2_TESTNET, // LayerZero endpoint ID
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
    },
    "base-sepolia": {
      url: process.env.RPC_BASE_SEPOLIA || "https://sepolia.base.org",
      chainId: 84532,
      eid: EndpointId.BASE_SEPOLIA_V2_TESTNET, // LayerZero endpoint ID
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
    },
    "arc": {
      url: process.env.RPC_ARC || "https://rpc.testnet.arc.network",
      chainId: 5042002,
      // eid: Add when LayerZero supports Arc
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
    },
    "rari": {
      url: process.env.RPC_RARI || "https://rari-testnet.calderachain.xyz/http",
      chainId: 1918988905,
      // eid: Add when LayerZero supports Rari
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
    },
  },
};

export default config;

// Import tasks - following LayerZero OApp CLI pattern
// https://docs.layerzero.network/v2/get-started/create-lz-oapp/start
import "./tasks/sendOFT";
import "./tasks/checkPeers";
import "./tasks/setPeer";
