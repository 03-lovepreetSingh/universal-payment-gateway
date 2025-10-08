import { PushChain } from '@pushchain/core';
import { ethers } from 'ethers';
import { createPublicClient, createWalletClient, http } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';

// Push Chain configuration
export const PUSH_CHAIN_CONFIG = {
  rpcUrl: process.env.PUSH_RPC_URL || 'https://evm.rpc-testnet-donut-node1.push.org/',
  websocketUrl: process.env.PUSH_WEBSOCKET_URL || 'wss://evm.rpc-testnet-donut-node1.push.org/',
  chainId: parseInt(process.env.PUSH_CHAIN_ID || '42101'),
  network: process.env.PUSH_NETWORK === 'mainnet' ? PushChain.CONSTANTS.PUSH_NETWORK.MAINNET : PushChain.CONSTANTS.PUSH_NETWORK.TESTNET,
  contracts: {
    gateway: process.env.GATEWAY_CONTRACT_ADDRESS || '',
    invoiceRegistry: process.env.INVOICE_REGISTRY_CONTRACT_ADDRESS || '',
    feeManager: process.env.FEE_MANAGER_CONTRACT_ADDRESS || '',
    withdrawalVault: process.env.WITHDRAWAL_VAULT_CONTRACT_ADDRESS || '',
    payment: process.env.GATEWAY_CONTRACT_ADDRESS || '', // Gateway contract handles payments
  },
};

// Initialize Push Chain client with Ethers
export async function createPushChainClientWithEthers(privateKey?: string) {
  const provider = new ethers.JsonRpcProvider(PUSH_CHAIN_CONFIG.rpcUrl);
  
  let wallet: ethers.Wallet | ethers.HDNodeWallet;
  if (privateKey) {
    wallet = new ethers.Wallet(privateKey, provider);
  } else {
    wallet = ethers.Wallet.createRandom(provider);
  }

  const universalSigner = await PushChain.utils.signer.toUniversal(wallet);
  
  const pushChainClient = await PushChain.initialize(universalSigner, {
    network: PUSH_CHAIN_CONFIG.network,
  });

  return {
    client: pushChainClient,
    signer: wallet,
    provider,
    universalSigner,
  };
}

// Initialize Push Chain client with Viem
export async function createPushChainClientWithViem(privateKey?: string) {
  if (!privateKey) {
    throw new Error('Private key is required for Viem client');
  }

  const account = privateKeyToAccount(privateKey as `0x${string}`);
  
  const publicClient = createPublicClient({
    transport: http(PUSH_CHAIN_CONFIG.rpcUrl),
  });

  const walletClient = createWalletClient({
    account,
    transport: http(PUSH_CHAIN_CONFIG.rpcUrl),
  });

  const universalSigner = await PushChain.utils.signer.toUniversal(walletClient);
  
  const pushChainClient = await PushChain.initialize(universalSigner, {
    network: PUSH_CHAIN_CONFIG.network,
  });

  return {
    client: pushChainClient,
    account,
    publicClient,
    walletClient,
    universalSigner,
  };
}

// Get supported chains configuration
export function getSupportedChains() {
  const chainIds = process.env.CHAIN_IDS?.split(',').map(id => parseInt(id.trim())) || [1, 11155111, 42101, 101];
  
  return {
    ethereum: {
      mainnet: 1,
      sepolia: 11155111,
    },
    pushChain: {
      testnet: 42101,
    },
    solana: {
      devnet: 101,
    },
    supported: chainIds,
  };
}

// Utility function to detect chain type
export function getChainType(chainId: number): 'evm' | 'solana' | 'unknown' {
  if (chainId === 101) return 'solana';
  if ([1, 11155111, 42101].includes(chainId)) return 'evm';
  return 'unknown';
}

// Contract addresses (to be populated after deployment)
export const CONTRACT_ADDRESSES = {
  gateway: process.env.GATEWAY_CONTRACT_ADDRESS || '',
  invoiceRegistry: process.env.INVOICE_REGISTRY_CONTRACT_ADDRESS || '',
  feeManager: process.env.FEE_MANAGER_CONTRACT_ADDRESS || '',
  withdrawalVault: process.env.WITHDRAWAL_VAULT_CONTRACT_ADDRESS || '',
};

// Validate contract addresses
export function validateContractAddresses() {
  const missing = Object.entries(CONTRACT_ADDRESSES)
    .filter(([_, address]) => !address)
    .map(([name]) => name);
  
  if (missing.length > 0) {
    console.warn(`Missing contract addresses: ${missing.join(', ')}`);
    return false;
  }
  
  return true;
}