"use client";

import { useState, useEffect } from "react";
import { 
  WalletIcon,
  XMarkIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ArrowPathIcon
} from "@heroicons/react/24/outline";
import toast from "react-hot-toast";

interface WalletOption {
  id: string;
  name: string;
  icon: string;
  description: string;
  available: boolean;
  installed?: boolean;
}

interface WalletConnectProps {
  isOpen: boolean;
  onClose: () => void;
  onConnect: (wallet: ConnectedWallet) => void;
  requiredChain?: string;
}

interface ConnectedWallet {
  address: string;
  chainId: number;
  walletType: string;
  balance?: string;
}

const walletOptions: WalletOption[] = [
  {
    id: "metamask",
    name: "MetaMask",
    icon: "🦊",
    description: "Connect using MetaMask wallet",
    available: true,
    installed: typeof window !== "undefined" && !!(window as any).ethereum?.isMetaMask,
  },
  {
    id: "walletconnect",
    name: "WalletConnect",
    icon: "🔗",
    description: "Connect with WalletConnect protocol",
    available: true,
  },
  {
    id: "coinbase",
    name: "Coinbase Wallet",
    icon: "🔵",
    description: "Connect using Coinbase Wallet",
    available: true,
    installed: typeof window !== "undefined" && !!(window as any).ethereum?.isCoinbaseWallet,
  },
  {
    id: "trust",
    name: "Trust Wallet",
    icon: "🛡️",
    description: "Connect using Trust Wallet",
    available: true,
    installed: typeof window !== "undefined" && !!(window as any).ethereum?.isTrust,
  },
  {
    id: "phantom",
    name: "Phantom",
    icon: "👻",
    description: "Connect using Phantom wallet (Solana)",
    available: false, // Coming soon
  },
];

const supportedChains = {
  1: { name: "Ethereum", symbol: "ETH", rpc: "https://mainnet.infura.io/v3/" },
  137: { name: "Polygon", symbol: "MATIC", rpc: "https://polygon-rpc.com/" },
  56: { name: "BSC", symbol: "BNB", rpc: "https://bsc-dataseed.binance.org/" },
  43114: { name: "Avalanche", symbol: "AVAX", rpc: "https://api.avax.network/ext/bc/C/rpc" },
  250: { name: "Fantom", symbol: "FTM", rpc: "https://rpc.ftm.tools/" },
  42161: { name: "Arbitrum", symbol: "ETH", rpc: "https://arb1.arbitrum.io/rpc" },
  10: { name: "Optimism", symbol: "ETH", rpc: "https://mainnet.optimism.io/" },
  // Push Chain (Donut Testnet)
  51007: { name: "Push Chain", symbol: "PUSH", rpc: "https://rpc.donut.push.org/" },
};

export default function WalletConnect({ isOpen, onClose, onConnect, requiredChain }: WalletConnectProps) {
  const [isConnecting, setIsConnecting] = useState(false);
  const [selectedWallet, setSelectedWallet] = useState<string>("");
  const [connectedWallet, setConnectedWallet] = useState<ConnectedWallet | null>(null);
  const [currentChain, setCurrentChain] = useState<number | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined" && (window as any).ethereum) {
      checkConnection();
      setupEventListeners();
    }
  }, []);

  const checkConnection = async () => {
    try {
      const ethereum = (window as any).ethereum;
      if (!ethereum) return;

      const accounts = await ethereum.request({ method: "eth_accounts" });
      const chainId = await ethereum.request({ method: "eth_chainId" });
      
      if (accounts.length > 0) {
        const balance = await ethereum.request({
          method: "eth_getBalance",
          params: [accounts[0], "latest"],
        });

        setConnectedWallet({
          address: accounts[0],
          chainId: parseInt(chainId, 16),
          walletType: getWalletType(ethereum),
          balance: formatBalance(balance),
        });
        setCurrentChain(parseInt(chainId, 16));
      }
    } catch (error) {
      console.error("Error checking connection:", error);
    }
  };

  const setupEventListeners = () => {
    const ethereum = (window as any).ethereum;
    if (!ethereum) return;

    ethereum.on("accountsChanged", (accounts: string[]) => {
      if (accounts.length === 0) {
        setConnectedWallet(null);
        setCurrentChain(null);
      } else {
        checkConnection();
      }
    });

    ethereum.on("chainChanged", (chainId: string) => {
      setCurrentChain(parseInt(chainId, 16));
      checkConnection();
    });
  };

  const getWalletType = (ethereum: any): string => {
    if (ethereum.isMetaMask) return "metamask";
    if (ethereum.isCoinbaseWallet) return "coinbase";
    if (ethereum.isTrust) return "trust";
    return "unknown";
  };

  const formatBalance = (balance: string): string => {
    const balanceInEth = parseInt(balance, 16) / Math.pow(10, 18);
    return balanceInEth.toFixed(4);
  };

  const connectMetaMask = async () => {
    try {
      const ethereum = (window as any).ethereum;
      if (!ethereum) {
        toast.error("MetaMask is not installed");
        return;
      }

      const accounts = await ethereum.request({
        method: "eth_requestAccounts",
      });

      const chainId = await ethereum.request({ method: "eth_chainId" });
      const balance = await ethereum.request({
        method: "eth_getBalance",
        params: [accounts[0], "latest"],
      });

      const wallet: ConnectedWallet = {
        address: accounts[0],
        chainId: parseInt(chainId, 16),
        walletType: "metamask",
        balance: formatBalance(balance),
      };

      setConnectedWallet(wallet);
      setCurrentChain(parseInt(chainId, 16));
      onConnect(wallet);
      toast.success("MetaMask connected successfully!");
    } catch (error: any) {
      if (error.code === 4001) {
        toast.error("Connection rejected by user");
      } else {
        toast.error("Failed to connect MetaMask");
      }
    }
  };

  const connectWalletConnect = async () => {
    try {
      // This would integrate with WalletConnect v2
      toast.success("WalletConnect integration coming soon!");
    } catch (error) {
      toast.error("Failed to connect with WalletConnect");
    }
  };

  const connectCoinbase = async () => {
    try {
      const ethereum = (window as any).ethereum;
      if (!ethereum?.isCoinbaseWallet) {
        toast.error("Coinbase Wallet is not installed");
        return;
      }

      const accounts = await ethereum.request({
        method: "eth_requestAccounts",
      });

      const chainId = await ethereum.request({ method: "eth_chainId" });
      const balance = await ethereum.request({
        method: "eth_getBalance",
        params: [accounts[0], "latest"],
      });

      const wallet: ConnectedWallet = {
        address: accounts[0],
        chainId: parseInt(chainId, 16),
        walletType: "coinbase",
        balance: formatBalance(balance),
      };

      setConnectedWallet(wallet);
      setCurrentChain(parseInt(chainId, 16));
      onConnect(wallet);
      toast.success("Coinbase Wallet connected successfully!");
    } catch (error: any) {
      if (error.code === 4001) {
        toast.error("Connection rejected by user");
      } else {
        toast.error("Failed to connect Coinbase Wallet");
      }
    }
  };

  const connectWallet = async (walletId: string) => {
    setIsConnecting(true);
    setSelectedWallet(walletId);

    try {
      switch (walletId) {
        case "metamask":
          await connectMetaMask();
          break;
        case "walletconnect":
          await connectWalletConnect();
          break;
        case "coinbase":
          await connectCoinbase();
          break;
        default:
          toast.error("Wallet not supported yet");
      }
    } catch (error) {
      toast.error("Failed to connect wallet");
    } finally {
      setIsConnecting(false);
      setSelectedWallet("");
    }
  };

  const switchChain = async (chainId: number) => {
    try {
      const ethereum = (window as any).ethereum;
      if (!ethereum) return;

      const chainIdHex = `0x${chainId.toString(16)}`;
      
      try {
        await ethereum.request({
          method: "wallet_switchEthereumChain",
          params: [{ chainId: chainIdHex }],
        });
      } catch (switchError: any) {
        // Chain not added to wallet
        if (switchError.code === 4902) {
          const chainConfig = supportedChains[chainId as keyof typeof supportedChains];
          if (chainConfig) {
            await ethereum.request({
              method: "wallet_addEthereumChain",
              params: [{
                chainId: chainIdHex,
                chainName: chainConfig.name,
                nativeCurrency: {
                  name: chainConfig.symbol,
                  symbol: chainConfig.symbol,
                  decimals: 18,
                },
                rpcUrls: [chainConfig.rpc],
              }],
            });
          }
        } else {
          throw switchError;
        }
      }
      
      toast.success(`Switched to ${supportedChains[chainId as keyof typeof supportedChains]?.name}`);
    } catch (error) {
      toast.error("Failed to switch chain");
    }
  };

  const disconnect = async () => {
    setConnectedWallet(null);
    setCurrentChain(null);
    toast.success("Wallet disconnected");
    onClose();
  };

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900">
            {connectedWallet ? "Wallet Connected" : "Connect Wallet"}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">
          {connectedWallet ? (
            <div className="space-y-4">
              {/* Connected Wallet Info */}
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center mb-3">
                  <CheckCircleIcon className="w-5 h-5 text-green-600 mr-2" />
                  <span className="text-sm font-medium text-green-800">
                    Wallet Connected
                  </span>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Address:</span>
                    <span className="text-sm font-mono text-gray-900">
                      {formatAddress(connectedWallet.address)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Balance:</span>
                    <span className="text-sm font-medium text-gray-900">
                      {connectedWallet.balance} {supportedChains[connectedWallet.chainId as keyof typeof supportedChains]?.symbol || "ETH"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Network:</span>
                    <span className="text-sm font-medium text-gray-900">
                      {supportedChains[connectedWallet.chainId as keyof typeof supportedChains]?.name || `Chain ${connectedWallet.chainId}`}
                    </span>
                  </div>
                </div>
              </div>

              {/* Chain Switching */}
              {requiredChain && currentChain !== parseInt(requiredChain) && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <div className="flex items-center mb-3">
                    <ExclamationTriangleIcon className="w-5 h-5 text-yellow-600 mr-2" />
                    <span className="text-sm font-medium text-yellow-800">
                      Wrong Network
                    </span>
                  </div>
                  <p className="text-sm text-yellow-700 mb-3">
                    Please switch to {supportedChains[parseInt(requiredChain) as keyof typeof supportedChains]?.name} to continue.
                  </p>
                  <button
                    onClick={() => switchChain(parseInt(requiredChain))}
                    className="bg-yellow-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-yellow-700"
                  >
                    Switch Network
                  </button>
                </div>
              )}

              {/* Supported Networks */}
              <div>
                <h3 className="text-sm font-medium text-gray-900 mb-3">Supported Networks</h3>
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(supportedChains).map(([chainId, chain]) => (
                    <button
                      key={chainId}
                      onClick={() => switchChain(parseInt(chainId))}
                      className={`p-2 text-left border rounded-md text-sm hover:bg-gray-50 ${
                        currentChain === parseInt(chainId)
                          ? "border-indigo-500 bg-indigo-50"
                          : "border-gray-200"
                      }`}
                    >
                      <div className="font-medium">{chain.name}</div>
                      <div className="text-xs text-gray-500">{chain.symbol}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Disconnect Button */}
              <button
                onClick={disconnect}
                className="w-full bg-red-600 text-white py-2 px-4 rounded-md font-medium hover:bg-red-700"
              >
                Disconnect Wallet
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-gray-600 mb-4">
                Choose a wallet to connect to the Universal Payment Gateway.
              </p>

              {/* Wallet Options */}
              <div className="space-y-3">
                {walletOptions.map((wallet) => (
                  <button
                    key={wallet.id}
                    onClick={() => wallet.available && connectWallet(wallet.id)}
                    disabled={!wallet.available || isConnecting}
                    className={`w-full flex items-center justify-between p-4 border rounded-lg transition-colors ${
                      wallet.available
                        ? "border-gray-200 hover:border-indigo-300 hover:bg-indigo-50"
                        : "border-gray-100 bg-gray-50 cursor-not-allowed"
                    } ${selectedWallet === wallet.id ? "border-indigo-500 bg-indigo-50" : ""}`}
                  >
                    <div className="flex items-center">
                      <span className="text-2xl mr-3">{wallet.icon}</span>
                      <div className="text-left">
                        <div className="flex items-center">
                          <span className="font-medium text-gray-900">{wallet.name}</span>
                          {!wallet.available && (
                            <span className="ml-2 text-xs text-gray-500 bg-gray-200 px-2 py-1 rounded">
                              Coming Soon
                            </span>
                          )}
                          {wallet.available && wallet.installed === false && (
                            <span className="ml-2 text-xs text-orange-600 bg-orange-100 px-2 py-1 rounded">
                              Not Installed
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-500">{wallet.description}</p>
                      </div>
                    </div>
                    {isConnecting && selectedWallet === wallet.id && (
                      <ArrowPathIcon className="w-5 h-5 text-indigo-600 animate-spin" />
                    )}
                  </button>
                ))}
              </div>

              {/* Help Text */}
              <div className="text-center pt-4 border-t border-gray-200">
                <p className="text-xs text-gray-500">
                  New to crypto wallets?{" "}
                  <a
                    href="https://metamask.io/download/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-indigo-600 hover:text-indigo-800"
                  >
                    Get MetaMask
                  </a>
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}