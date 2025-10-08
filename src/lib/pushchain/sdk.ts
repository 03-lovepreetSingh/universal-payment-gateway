import { ethers } from "ethers";
import { createWalletClient, http } from "viem";
import { Connection, Keypair } from "@solana/web3.js";
import { 
  UniversalSigner, 
  createUniversalSignerFromEthers,
  createUniversalSignerFromViem,
  createUniversalSignerFromSolana,
  createUniversalSignerFromBrowser
} from "./universal-signer";
import { PUSH_CHAIN_CONFIG } from "./client";

// Push Chain SDK types (placeholder - will be replaced with actual SDK)
export interface PushChainClient {
  network: string;
  chainId: number;
  signer: UniversalSigner;
  rpcUrl: string;
  wsUrl?: string;
}

export interface PushChainSDK {
  initialize: (signer: UniversalSigner, config: PushChainConfig) => Promise<PushChainClient>;
  utils: {
    signer: {
      toUniversal: (signer: any) => Promise<UniversalSigner>;
    };
  };
  CONSTANTS: {
    PUSH_NETWORK: {
      TESTNET: string;
      MAINNET: string;
    };
  };
}

export interface PushChainConfig {
  network: string;
  rpcUrl?: string;
  wsUrl?: string;
  chainId?: number;
}

// Mock Push Chain SDK implementation
export const PushChain: PushChainSDK = {
  initialize: async (signer: UniversalSigner, config: PushChainConfig): Promise<PushChainClient> => {
    return {
      network: config.network,
      chainId: config.chainId || PUSH_CHAIN_CONFIG.chainId,
      signer,
      rpcUrl: config.rpcUrl || PUSH_CHAIN_CONFIG.rpcUrl,
      wsUrl: config.wsUrl || PUSH_CHAIN_CONFIG.websocketUrl,
    };
  },
  
  utils: {
    signer: {
      toUniversal: async (signer: ethers.Wallet | ethers.HDNodeWallet | { signMessage: (args: any) => Promise<string>; account: any } | Keypair): Promise<UniversalSigner> => {
        // Detect signer type and convert to universal signer
        if (signer instanceof ethers.Wallet || signer instanceof ethers.HDNodeWallet) {
          return createUniversalSignerFromEthers(signer);
        }
        
        if (signer && typeof signer.signMessage === "function" && signer.account) {
          return createUniversalSignerFromViem(signer);
        }
        
        if (signer instanceof Keypair) {
          return createUniversalSignerFromSolana(signer);
        }
        
        // Browser wallet
        if (typeof window !== "undefined" && window.ethereum) {
          return createUniversalSignerFromBrowser();
        }
        
        throw new Error("Unsupported signer type");
      },
    },
  },
  
  CONSTANTS: {
    PUSH_NETWORK: {
      TESTNET: "testnet",
      MAINNET: "mainnet",
    },
  },
};

/**
 * Initialize Push Chain client with Ethers signer
 */
export async function initializePushChainWithEthers(
  privateKey?: string,
  config?: { rpcUrl?: string; chainId?: number }
): Promise<{
  client: ethers.JsonRpcProvider;
  signer?: ethers.Wallet;
  chainId: number;
}> {
  const provider = new ethers.JsonRpcProvider(config?.rpcUrl || PUSH_CHAIN_CONFIG.rpcUrl);
  let signer: ethers.Wallet | undefined;
  
  if (privateKey) {
    signer = new ethers.Wallet(privateKey, provider);
  }
  
  return {
    client: provider,
    signer,
    chainId: config?.chainId || PUSH_CHAIN_CONFIG.chainId,
  };
}

/**
 * Initialize Push Chain client with Viem signer
 */
export async function initializePushChainWithViem(
  viemSigner: { signMessage: (args: any) => Promise<string>; account: any },
  network: string = "testnet"
): Promise<PushChainClient> {
  const universalSigner = await PushChain.utils.signer.toUniversal(viemSigner);
  
  return PushChain.initialize(universalSigner, {
    network,
    rpcUrl: PUSH_CHAIN_CONFIG.rpcUrl,
    wsUrl: PUSH_CHAIN_CONFIG.websocketUrl,
    chainId: PUSH_CHAIN_CONFIG.chainId,
  });
}

/**
 * Initialize Push Chain client with Solana keypair
 */
export async function initializePushChainWithSolana(
  solanaKeypair: Keypair,
  network: string = "testnet"
): Promise<PushChainClient> {
  const universalSigner = await PushChain.utils.signer.toUniversal(solanaKeypair);
  
  return PushChain.initialize(universalSigner, {
    network,
    rpcUrl: PUSH_CHAIN_CONFIG.rpcUrl,
    wsUrl: PUSH_CHAIN_CONFIG.websocketUrl,
    chainId: PUSH_CHAIN_CONFIG.chainId,
  });
}

/**
 * Initialize Push Chain client with browser wallet
 */
export async function initializePushChainWithBrowser(
  network: string = "testnet"
): Promise<PushChainClient> {
  const universalSigner = await createUniversalSignerFromBrowser();
  
  return PushChain.initialize(universalSigner, {
    network,
    rpcUrl: PUSH_CHAIN_CONFIG.rpcUrl,
    wsUrl: PUSH_CHAIN_CONFIG.websocketUrl,
    chainId: PUSH_CHAIN_CONFIG.chainId,
  });
}

/**
 * Get Push Chain client for the Donut Testnet
 */
export async function getPushChainTestnetClient(
  signer: ethers.Wallet | ethers.HDNodeWallet | { signMessage: (args: any) => Promise<string>; account: any } | Keypair
): Promise<PushChainClient> {
  const universalSigner = await PushChain.utils.signer.toUniversal(signer);
  
  return PushChain.initialize(universalSigner, {
    network: PushChain.CONSTANTS.PUSH_NETWORK.TESTNET,
    rpcUrl: PUSH_CHAIN_CONFIG.rpcUrl,
    wsUrl: PUSH_CHAIN_CONFIG.websocketUrl,
    chainId: PUSH_CHAIN_CONFIG.chainId,
  });
}

/**
 * Utility to create a universal signer from various wallet types
 */
export async function createUniversalSignerFromWallet(
  wallet: ethers.Wallet | ethers.HDNodeWallet | { signMessage: (args: any) => Promise<string>; account: any } | Keypair | string
): Promise<UniversalSigner> {
  if (typeof wallet === "string") {
    // Private key string - create ethers wallet
    const ethersWallet = new ethers.Wallet(wallet);
    return createUniversalSignerFromEthers(ethersWallet);
  }
  
  return PushChain.utils.signer.toUniversal(wallet);
}

export default PushChain;