import { PushChainIndexer } from "./push-chain-indexer";
import { EthereumIndexer } from "./ethereum-indexer";
import { PUSH_CHAIN_CONFIG } from "@/lib/pushchain/client";

export interface IndexerConfig {
  chainId: number;
  rpcUrl: string;
  contractAddress: string;
  enabled: boolean;
}

export interface IndexerStatus {
  chainId: number;
  chainName: string;
  isRunning: boolean;
  lastProcessedBlock: number;
  error?: string;
}

export class IndexerManager {
  private pushChainIndexer: PushChainIndexer;
  private ethereumIndexers: Map<number, EthereumIndexer> = new Map();
  private isRunning: boolean = false;

  constructor() {
    this.pushChainIndexer = new PushChainIndexer();
    this.initializeEthereumIndexers();
  }

  private initializeEthereumIndexers(): void {
    const indexerConfigs: IndexerConfig[] = [
      {
        chainId: 1,
        rpcUrl: process.env.ETHEREUM_RPC_URL || "https://eth.llamarpc.com",
        contractAddress: process.env.ETHEREUM_GATEWAY_CONTRACT || "",
        enabled: !!process.env.ETHEREUM_GATEWAY_CONTRACT,
      },
      {
        chainId: 11155111,
        rpcUrl: process.env.ETHEREUM_SEPOLIA_RPC_URL || "https://rpc.sepolia.org",
        contractAddress: process.env.SEPOLIA_GATEWAY_CONTRACT || "",
        enabled: !!process.env.SEPOLIA_GATEWAY_CONTRACT,
      },
      {
        chainId: 137,
        rpcUrl: process.env.POLYGON_RPC_URL || "https://polygon.llamarpc.com",
        contractAddress: process.env.POLYGON_GATEWAY_CONTRACT || "",
        enabled: !!process.env.POLYGON_GATEWAY_CONTRACT,
      },
      {
        chainId: 80001,
        rpcUrl: process.env.POLYGON_MUMBAI_RPC_URL || "https://rpc-mumbai.maticvigil.com",
        contractAddress: process.env.MUMBAI_GATEWAY_CONTRACT || "",
        enabled: !!process.env.MUMBAI_GATEWAY_CONTRACT,
      },
    ];

    for (const config of indexerConfigs) {
      if (config.enabled && config.contractAddress) {
        const indexer = new EthereumIndexer(
          config.rpcUrl,
          config.contractAddress,
          config.chainId
        );
        this.ethereumIndexers.set(config.chainId, indexer);
        console.log(`Initialized Ethereum indexer for chain ${config.chainId}`);
      } else {
        console.log(`Skipping Ethereum indexer for chain ${config.chainId} - not configured`);
      }
    }
  }

  async startAll(): Promise<void> {
    if (this.isRunning) {
      console.log("Indexer manager is already running");
      return;
    }

    this.isRunning = true;
    console.log("Starting all blockchain indexers...");

    const startPromises: Promise<void>[] = [];

    // Start Push Chain indexer
    try {
      startPromises.push(this.pushChainIndexer.start());
      console.log("Push Chain indexer start initiated");
    } catch (error) {
      console.error("Failed to start Push Chain indexer:", error);
    }

    // Start all Ethereum indexers
    for (const [chainId, indexer] of this.ethereumIndexers) {
      try {
        startPromises.push(indexer.start());
        console.log(`Ethereum indexer for chain ${chainId} start initiated`);
      } catch (error) {
        console.error(`Failed to start Ethereum indexer for chain ${chainId}:`, error);
      }
    }

    // Wait for all indexers to start
    try {
      await Promise.allSettled(startPromises);
      console.log("All blockchain indexers started successfully");
    } catch (error) {
      console.error("Some indexers failed to start:", error);
    }
  }

  async stopAll(): Promise<void> {
    if (!this.isRunning) {
      console.log("Indexer manager is not running");
      return;
    }

    this.isRunning = false;
    console.log("Stopping all blockchain indexers...");

    const stopPromises: Promise<void>[] = [];

    // Stop Push Chain indexer
    try {
      stopPromises.push(this.pushChainIndexer.stop());
      console.log("Push Chain indexer stop initiated");
    } catch (error) {
      console.error("Failed to stop Push Chain indexer:", error);
    }

    // Stop all Ethereum indexers
    for (const [chainId, indexer] of this.ethereumIndexers) {
      try {
        stopPromises.push(indexer.stop());
        console.log(`Ethereum indexer for chain ${chainId} stop initiated`);
      } catch (error) {
        console.error(`Failed to stop Ethereum indexer for chain ${chainId}:`, error);
      }
    }

    // Wait for all indexers to stop
    try {
      await Promise.allSettled(stopPromises);
      console.log("All blockchain indexers stopped successfully");
    } catch (error) {
      console.error("Some indexers failed to stop:", error);
    }
  }

  async restartAll(): Promise<void> {
    console.log("Restarting all blockchain indexers...");
    await this.stopAll();
    await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds
    await this.startAll();
  }

  async getStatus(): Promise<IndexerStatus[]> {
    const statuses: IndexerStatus[] = [];

    // Push Chain indexer status
    try {
      const pushChainStatus = await this.pushChainIndexer.getStatus();
      statuses.push({
        chainId: 42101,
        chainName: "push-chain",
        isRunning: pushChainStatus.isRunning,
        lastProcessedBlock: pushChainStatus.lastProcessedBlock,
      });
    } catch (error) {
      statuses.push({
        chainId: 42101,
        chainName: "push-chain",
        isRunning: false,
        lastProcessedBlock: 0,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }

    // Ethereum indexers status
    for (const [chainId, indexer] of this.ethereumIndexers) {
      try {
        const status = indexer.getStatus();
        statuses.push({
          chainId: status.chainId,
          chainName: this.getChainName(status.chainId),
          isRunning: status.isRunning,
          lastProcessedBlock: status.lastProcessedBlock,
        });
      } catch (error) {
        statuses.push({
          chainId,
          chainName: this.getChainName(chainId),
          isRunning: false,
          lastProcessedBlock: 0,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    return statuses;
  }

  async startIndexer(chainId: number): Promise<void> {
    if (chainId === 42101) {
      await this.pushChainIndexer.start();
      console.log("Push Chain indexer started");
    } else {
      const indexer = this.ethereumIndexers.get(chainId);
      if (indexer) {
        await indexer.start();
        console.log(`Ethereum indexer for chain ${chainId} started`);
      } else {
        throw new Error(`No indexer configured for chain ${chainId}`);
      }
    }
  }

  async stopIndexer(chainId: number): Promise<void> {
    if (chainId === 42101) {
      await this.pushChainIndexer.stop();
      console.log("Push Chain indexer stopped");
    } else {
      const indexer = this.ethereumIndexers.get(chainId);
      if (indexer) {
        await indexer.stop();
        console.log(`Ethereum indexer for chain ${chainId} stopped`);
      } else {
        throw new Error(`No indexer configured for chain ${chainId}`);
      }
    }
  }

  private getChainName(chainId: number): string {
    const chainNames: Record<number, string> = {
      1: "ethereum",
      11155111: "sepolia",
      137: "polygon",
      80001: "mumbai",
      42101: "push-chain",
    };
    
    return chainNames[chainId] || `chain-${chainId}`;
  }

  getSupportedChains(): number[] {
    const chains = [42101]; // Always include Push Chain
    for (const chainId of this.ethereumIndexers.keys()) {
      chains.push(chainId);
    }
    return chains.sort();
  }

  async isIndexerRunning(chainId: number): Promise<boolean> {
    if (chainId === 42101) {
      const status = await this.pushChainIndexer.getStatus();
      return status.isRunning;
    } else {
      const indexer = this.ethereumIndexers.get(chainId);
      return indexer ? indexer.getStatus().isRunning : false;
    }
  }

  async getManagerStatus(): Promise<{ isRunning: boolean; totalIndexers: number; runningIndexers: number }> {
    const statuses = await this.getStatus();
    const runningIndexers = statuses.filter((s: IndexerStatus) => s.isRunning).length;
    
    return {
      isRunning: this.isRunning,
      totalIndexers: statuses.length,
      runningIndexers,
    };
  }
}

// Singleton instance
export const indexerManager = new IndexerManager();