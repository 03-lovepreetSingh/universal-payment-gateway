import { ethers } from "ethers";
import { createWalletClient, http, custom } from "viem";
import { mainnet } from "viem/chains";
import { Connection, Keypair, PublicKey } from "@solana/web3.js";
import { sign } from "tweetnacl";

// Extend Window interface for ethereum
declare global {
  interface Window {
    ethereum?: {
      request: (args: { method: string; params?: any[] }) => Promise<any>;
      isMetaMask?: boolean;
    };
  }
}

// Push Chain SDK types (placeholder - will be replaced with actual SDK)
export interface UniversalSigner {
  address: string;
  chainType: "evm" | "solana" | "other";
  sign: (message: string | Uint8Array) => Promise<string>;
}

interface PushChainClient {
  signer: UniversalSigner;
  network: string;
  chainId: number;
  rpcUrl: string;
}

// Push Chain configuration
export const PUSH_CHAIN_CONFIG = {
  rpcUrl: process.env.NEXT_PUBLIC_PUSH_RPC_URL || "https://evm.rpc-testnet-donut-node1.push.org/",
  wsUrl: process.env.NEXT_PUBLIC_PUSH_WS_URL || "wss://evm.rpc-testnet-donut-node1.push.org/",
  chainId: 42101,
  network: "donut-testnet",
  blockscoutUrl: "https://scan-testnet-donut.push.org",
};

/**
 * Creates a universal signer from an Ethers signer
 */
export async function createUniversalSignerFromEthers(
  ethersSigner: ethers.Signer
): Promise<UniversalSigner> {
  const address = await ethersSigner.getAddress();
  
  return {
    address,
    chainType: "evm",
    sign: async (message: string | Uint8Array) => {
      if (typeof message === "string") {
        return await ethersSigner.signMessage(message);
      } else {
        return await ethersSigner.signMessage(message);
      }
    },
  };
}

/**
 * Creates a universal signer from a Viem wallet client
 */
export async function createUniversalSignerFromViem(
  viemSigner: { signMessage: (args: { message: string }) => Promise<string>; account: { address: string } }
): Promise<UniversalSigner> {
  return {
    address: viemSigner.account.address,
    chainType: "evm",
    sign: async (message: string | Uint8Array) => {
      const messageStr = typeof message === "string" ? message : new TextDecoder().decode(message);
      return await viemSigner.signMessage({ message: messageStr });
    },
  };
}

/**
 * Creates a universal signer from a Solana keypair
 */
export async function createUniversalSignerFromSolana(
  keypair: Keypair
): Promise<UniversalSigner> {
  return {
    address: keypair.publicKey.toBase58(),
    chainType: "solana",
    sign: async (message: string | Uint8Array) => {
      const messageBytes = typeof message === "string" 
        ? new TextEncoder().encode(message)
        : message;
      
      const signature = sign.detached(messageBytes, keypair.secretKey);
      return Buffer.from(signature).toString("hex");
    },
  };
}

/**
 * Creates a universal signer from browser wallet (MetaMask, etc.)
 */
export async function createUniversalSignerFromBrowser(): Promise<UniversalSigner> {
  if (typeof window === "undefined" || !window.ethereum) {
    throw new Error("No browser wallet detected");
  }

  const provider = new ethers.BrowserProvider(window.ethereum);
  await provider.send("eth_requestAccounts", []);
  const signer = await provider.getSigner();
  
  return createUniversalSignerFromEthers(signer);
}

/**
 * Initializes Push Chain client with universal signer
 * This is a placeholder implementation - will be replaced with actual Push Chain SDK
 */
export async function initializePushChainClient(
  universalSigner: UniversalSigner
): Promise<PushChainClient> {
  // TODO: Replace with actual Push Chain SDK initialization
  // const client = await PushChain.initialize(universalSigner, {
  //   network: PushChain.CONSTANTS.PUSH_NETWORK.TESTNET
  // });
  
  return {
    signer: universalSigner,
    network: PUSH_CHAIN_CONFIG.network,
    chainId: PUSH_CHAIN_CONFIG.chainId,
    rpcUrl: PUSH_CHAIN_CONFIG.rpcUrl,
  };
}

/**
 * Creates Push Chain provider for reading blockchain state
 */
export function createPushChainProvider(): ethers.JsonRpcProvider {
  return new ethers.JsonRpcProvider(PUSH_CHAIN_CONFIG.rpcUrl);
}

/**
 * Creates Push Chain WebSocket provider for real-time subscriptions
 */
export function createPushChainWebSocketProvider(): ethers.WebSocketProvider {
  return new ethers.WebSocketProvider(PUSH_CHAIN_CONFIG.wsUrl);
}

/**
 * Validates if an address is valid for the given chain type
 */
export function validateAddress(address: string, chainType: "evm" | "solana" | "bitcoin"): boolean {
  try {
    switch (chainType) {
      case "evm":
        return ethers.isAddress(address);
      case "solana":
        new PublicKey(address);
        return true;
      case "bitcoin":
        // Basic Bitcoin address validation (simplified)
        return /^[13][a-km-zA-HJ-NP-Z1-9]{25,34}$|^bc1[a-z0-9]{39,59}$/.test(address);
      default:
        return false;
    }
  } catch {
    return false;
  }
}

/**
 * Gets chain type from address format
 */
export function getChainTypeFromAddress(address: string): "evm" | "solana" | "bitcoin" | "unknown" {
  if (ethers.isAddress(address)) {
    return "evm";
  }
  
  try {
    new PublicKey(address);
    return "solana";
  } catch {
    // Continue to Bitcoin check
  }
  
  if (/^[13][a-km-zA-HJ-NP-Z1-9]{25,34}$|^bc1[a-z0-9]{39,59}$/.test(address)) {
    return "bitcoin";
  }
  
  return "unknown";
}

/**
 * Formats address for display (truncates middle)
 */
export function formatAddress(address: string, length: number = 8): string {
  if (address.length <= length * 2) {
    return address;
  }
  
  return `${address.slice(0, length)}...${address.slice(-length)}`;
}

/**
 * Gets supported chains configuration
 */
export function getSupportedChains() {
  const chainIds = process.env.NEXT_PUBLIC_SUPPORTED_CHAIN_IDS?.split(",") || ["1", "137", "42101"];
  
  return chainIds.map(id => ({
    chainId: parseInt(id),
    name: getChainName(parseInt(id)),
    type: getChainType(parseInt(id)),
    rpcUrl: getChainRpcUrl(parseInt(id)),
  }));
}

/**
 * Gets chain name by chain ID
 */
export function getChainName(chainId: number): string {
  const chainNames: Record<number, string> = {
    1: "Ethereum Mainnet",
    11155111: "Ethereum Sepolia",
    137: "Polygon Mainnet",
    80001: "Polygon Mumbai",
    42101: "Push Chain Donut Testnet",
  };
  
  return chainNames[chainId] || `Chain ${chainId}`;
}

/**
 * Gets chain type by chain ID
 */
export function getChainType(chainId: number): "evm" | "solana" | "bitcoin" {
  // Most chains are EVM-compatible
  // Add specific mappings for non-EVM chains
  const nonEvmChains: Record<number, "solana" | "bitcoin"> = {
    // Add Solana and Bitcoin chain IDs here when needed
  };
  
  return nonEvmChains[chainId] || "evm";
}

/**
 * Gets RPC URL for chain ID
 */
export function getChainRpcUrl(chainId: number): string {
  const rpcUrls: Record<number, string> = {
    1: process.env.NEXT_PUBLIC_ETHEREUM_RPC_URL || "https://eth.llamarpc.com",
    11155111: process.env.NEXT_PUBLIC_ETHEREUM_SEPOLIA_RPC_URL || "https://rpc.sepolia.org",
    137: process.env.NEXT_PUBLIC_POLYGON_RPC_URL || "https://polygon.llamarpc.com",
    80001: process.env.NEXT_PUBLIC_POLYGON_MUMBAI_RPC_URL || "https://rpc-mumbai.maticvigil.com",
    42101: PUSH_CHAIN_CONFIG.rpcUrl,
  };
  
  return rpcUrls[chainId] || "";
}

/**
 * Creates a signer for a specific chain
 */
export async function createChainSigner(
  chainId: number,
  privateKey?: string
): Promise<ethers.Signer> {
  const rpcUrl = getChainRpcUrl(chainId);
  const provider = new ethers.JsonRpcProvider(rpcUrl);
  
  if (privateKey) {
    return new ethers.Wallet(privateKey, provider);
  }
  
  // For browser environment, use browser provider
  if (typeof window !== "undefined" && window.ethereum) {
    const browserProvider = new ethers.BrowserProvider(window.ethereum);
    return await browserProvider.getSigner();
  }
  
  throw new Error("No private key or browser wallet available");
}

/**
 * Estimates gas for a transaction on Push Chain
 */
export async function estimateGas(
  to: string,
  data: string,
  value: string = "0"
): Promise<bigint> {
  const provider = createPushChainProvider();
  
  return await provider.estimateGas({
    to,
    data,
    value: ethers.parseEther(value),
  });
}

/**
 * Gets current gas price for Push Chain
 */
export async function getGasPrice(): Promise<bigint> {
  const provider = createPushChainProvider();
  const feeData = await provider.getFeeData();
  
  return feeData.gasPrice || BigInt(0);
}