import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import "@nomicfoundation/hardhat-verify";
import "dotenv/config";

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.19",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  networks: {
    hardhat: {
      chainId: 31337,
    },
    localhost: {
      url: "http://127.0.0.1:8545",
      chainId: 31337,
    },
    // Push Chain Donut Testnet
    pushDonutTestnet: {
      url: "https://evm.rpc-testnet-donut-node1.push.org/",
      chainId: 42101,
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      gasPrice: "auto",
      gas: "auto",
    },
    // Ethereum Sepolia (for testing cross-chain)
    sepolia: {
      url: process.env.ETHEREUM_RPC_URL || "https://rpc.sepolia.org",
      chainId: 11155111,
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
    },
    // Polygon Mumbai (for testing cross-chain)
    mumbai: {
      url: process.env.POLYGON_RPC_URL || "https://rpc-mumbai.maticvigil.com",
      chainId: 80001,
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
    },
  },
  etherscan: {
    apiKey: {
      // Push Chain Donut Testnet uses Blockscout
      pushDonutTestnet: "abc", // Placeholder, not needed for Blockscout
      sepolia: process.env.ETHERSCAN_API_KEY || "",
      polygonMumbai: process.env.POLYGONSCAN_API_KEY || "",
    },
    customChains: [
      {
        network: "pushDonutTestnet",
        chainId: 42101,
        urls: {
          apiURL: "https://scan-testnet-donut.push.org/api",
          browserURL: "https://scan-testnet-donut.push.org",
        },
      },
    ],
  },
  sourcify: {
    enabled: true,
    apiUrl: "https://sourcify.dev/server",
    browserUrl: "https://sourcify.dev",
  },
  gasReporter: {
    enabled: process.env.REPORT_GAS !== undefined,
    currency: "USD",
  },
  typechain: {
    outDir: "typechain-types",
    target: "ethers-v6",
  },
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts",
  },
  mocha: {
    timeout: 40000,
  },
};

export default config;