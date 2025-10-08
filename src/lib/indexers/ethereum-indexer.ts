import { ethers } from "ethers";
import { db } from "@/lib/db";
import { payments, invoices, transactions } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

export interface CrossChainPaymentEvent {
  invoiceId: string;
  payer: string;
  amount: string;
  currency: string;
  txHash: string;
  blockNumber: number;
  blockHash: string;
  chainId: number;
  gasUsed: string;
  gasFee: string;
}

export class EthereumIndexer {
  private provider: ethers.JsonRpcProvider;
  private paymentContract: ethers.Contract;
  private isRunning: boolean = false;
  private lastProcessedBlock: number = 0;
  private chainId: number;

  constructor(rpcUrl: string, contractAddress: string, chainId: number) {
    this.provider = new ethers.JsonRpcProvider(rpcUrl);
    this.chainId = chainId;
    
    // Mock contract ABI for cross-chain payment events
    const paymentABI = [
      "event CrossChainPaymentInitiated(string indexed invoiceId, address indexed payer, uint256 amount, string currency, uint256 targetChainId)",
      "event CrossChainPaymentCompleted(string indexed invoiceId, bytes32 indexed txHash, uint256 sourceChainId)",
      "event PaymentReceived(string indexed invoiceId, address indexed payer, uint256 amount, string currency)"
    ];

    this.paymentContract = new ethers.Contract(
      contractAddress,
      paymentABI,
      this.provider
    );
  }

  async start(): Promise<void> {
    if (this.isRunning) {
      console.log(`Ethereum indexer (Chain ${this.chainId}) is already running`);
      return;
    }

    this.isRunning = true;
    console.log(`Starting Ethereum indexer for chain ${this.chainId}...`);

    try {
      // Get the latest block number
      const latestBlock = await this.provider.getBlockNumber();
      this.lastProcessedBlock = Math.max(0, latestBlock - 100); // Start from 100 blocks ago

      // Set up event listeners
      this.setupEventListeners();

      // Start periodic block processing
      this.startBlockProcessing();

      console.log(`Ethereum indexer (Chain ${this.chainId}) started at block ${this.lastProcessedBlock}`);
    } catch (error) {
      console.error(`Failed to start Ethereum indexer (Chain ${this.chainId}):`, error);
      this.isRunning = false;
      throw error;
    }
  }

  async stop(): Promise<void> {
    if (!this.isRunning) {
      console.log(`Ethereum indexer (Chain ${this.chainId}) is not running`);
      return;
    }

    this.isRunning = false;
    
    // Remove all event listeners
    this.paymentContract.removeAllListeners();
    
    console.log(`Ethereum indexer (Chain ${this.chainId}) stopped`);
  }

  private setupEventListeners(): void {
    // Listen for cross-chain payment initiation events
    this.paymentContract.on("CrossChainPaymentInitiated", async (
      invoiceId: string,
      payer: string,
      amount: ethers.BigNumberish,
      currency: string,
      targetChainId: ethers.BigNumberish,
      event: ethers.EventLog
    ) => {
      try {
        await this.processCrossChainPaymentEvent({
          invoiceId,
          payer,
          amount: amount.toString(),
          currency,
          txHash: event.transactionHash,
          blockNumber: event.blockNumber,
          blockHash: event.blockHash,
          chainId: this.chainId,
          gasUsed: "0", // Will be filled when transaction receipt is available
          gasFee: "0",
        });
      } catch (error) {
        console.error("Error processing cross-chain payment event:", error);
      }
    });

    // Listen for direct payment events
    this.paymentContract.on("PaymentReceived", async (
      invoiceId: string,
      payer: string,
      amount: ethers.BigNumberish,
      currency: string,
      event: ethers.EventLog
    ) => {
      try {
        await this.processDirectPaymentEvent({
          invoiceId,
          payer,
          amount: amount.toString(),
          currency,
          txHash: event.transactionHash,
          blockNumber: event.blockNumber,
          blockHash: event.blockHash,
          chainId: this.chainId,
          gasUsed: "0",
          gasFee: "0",
        });
      } catch (error) {
        console.error("Error processing direct payment event:", error);
      }
    });
  }

  private startBlockProcessing(): void {
    const processBlocks = async () => {
      if (!this.isRunning) return;

      try {
        const latestBlock = await this.provider.getBlockNumber();
        
        if (latestBlock > this.lastProcessedBlock) {
          console.log(`Processing blocks ${this.lastProcessedBlock + 1} to ${latestBlock} on chain ${this.chainId}`);
          
          // Process blocks in batches to avoid overwhelming the RPC
          const batchSize = 10;
          for (let i = this.lastProcessedBlock + 1; i <= latestBlock; i += batchSize) {
            const endBlock = Math.min(i + batchSize - 1, latestBlock);
            await this.processBlockRange(i, endBlock);
          }
          
          this.lastProcessedBlock = latestBlock;
        }
      } catch (error) {
        console.error(`Error processing blocks on chain ${this.chainId}:`, error);
      }

      // Schedule next processing
      setTimeout(processBlocks, 5000); // Check every 5 seconds
    };

    processBlocks();
  }

  private async processBlockRange(fromBlock: number, toBlock: number): Promise<void> {
    try {
      // Query historical events for the block range
      const crossChainEvents = await this.paymentContract.queryFilter(
        this.paymentContract.filters.CrossChainPaymentInitiated(),
        fromBlock,
        toBlock
      );

      const directPaymentEvents = await this.paymentContract.queryFilter(
        this.paymentContract.filters.PaymentReceived(),
        fromBlock,
        toBlock
      );

      // Process cross-chain events
      for (const event of crossChainEvents) {
        if (event instanceof ethers.EventLog) {
          const [invoiceId, payer, amount, currency, targetChainId] = event.args;
          await this.processCrossChainPaymentEvent({
            invoiceId,
            payer,
            amount: amount.toString(),
            currency,
            txHash: event.transactionHash,
            blockNumber: event.blockNumber,
            blockHash: event.blockHash,
            chainId: this.chainId,
            gasUsed: "0",
            gasFee: "0",
          });
        }
      }

      // Process direct payment events
      for (const event of directPaymentEvents) {
        if (event instanceof ethers.EventLog) {
          const [invoiceId, payer, amount, currency] = event.args;
          await this.processDirectPaymentEvent({
            invoiceId,
            payer,
            amount: amount.toString(),
            currency,
            txHash: event.transactionHash,
            blockNumber: event.blockNumber,
            blockHash: event.blockHash,
            chainId: this.chainId,
            gasUsed: "0",
            gasFee: "0",
          });
        }
      }
    } catch (error) {
      console.error(`Error processing block range ${fromBlock}-${toBlock} on chain ${this.chainId}:`, error);
    }
  }

  private async processCrossChainPaymentEvent(event: CrossChainPaymentEvent): Promise<void> {
    console.log(`Processing cross-chain payment event on chain ${this.chainId}:`, event);

    try {
      // Get transaction receipt for gas information
      const receipt = await this.provider.getTransactionReceipt(event.txHash);
      if (receipt) {
        event.gasUsed = receipt.gasUsed.toString();
        const tx = await this.provider.getTransaction(event.txHash);
        if (tx && tx.gasPrice) {
          event.gasFee = (receipt.gasUsed * tx.gasPrice).toString();
        }
      }

      // Check if invoice exists
      const existingInvoice = await db.select()
        .from(invoices)
        .where(eq(invoices.id, event.invoiceId))
        .limit(1);

      if (existingInvoice.length === 0) {
        console.warn(`Invoice ${event.invoiceId} not found for cross-chain payment`);
        return;
      }

      // Check if payment already exists
      const existingPayment = await db.select()
        .from(payments)
        .where(
          and(
            eq(payments.invoiceId, event.invoiceId),
            eq(payments.txHash, event.txHash)
          )
        )
        .limit(1);

      if (existingPayment.length > 0) {
        console.log(`Payment already processed: ${event.txHash}`);
        return;
      }

      // Create payment record
      await db.insert(payments).values({
        invoiceId: event.invoiceId,
        payer: event.payer,
        amount: event.amount,
        currency: event.currency,
        txHash: event.txHash,
        externalChain: this.getChainName(this.chainId),
        status: "confirmed",
        blockNumber: event.blockNumber,
        blockHash: event.blockHash,
        gasUsed: event.gasUsed,
        gasFee: event.gasFee,
        confirmedAt: new Date(),
        metadata: {
          type: "cross-chain",
          sourceChainId: this.chainId,
          indexedAt: new Date().toISOString(),
          source: "ethereum-indexer",
        },
      });

      // Create transaction record
      await db.insert(transactions).values({
        appId: existingInvoice[0].appId,
        type: "payment",
        chain: this.getChainName(this.chainId),
        txHash: event.txHash,
        amount: event.amount,
        currency: event.currency,
        status: "confirmed",
        blockNumber: event.blockNumber,
        fromAddress: event.payer,
        toAddress: "", // Contract address would be here
        metadata: {
          invoiceId: event.invoiceId,
          type: "cross-chain",
          sourceChainId: this.chainId,
          indexedAt: new Date().toISOString(),
          source: "ethereum-indexer",
        },
        createdAt: new Date(),
      });

      console.log(`Cross-chain payment processed successfully: ${event.txHash}`);
    } catch (error) {
      console.error("Error processing cross-chain payment event:", error);
    }
  }

  private async processDirectPaymentEvent(event: CrossChainPaymentEvent): Promise<void> {
    console.log(`Processing direct payment event on chain ${this.chainId}:`, event);

    try {
      // Get transaction receipt for gas information
      const receipt = await this.provider.getTransactionReceipt(event.txHash);
      if (receipt) {
        event.gasUsed = receipt.gasUsed.toString();
        const tx = await this.provider.getTransaction(event.txHash);
        if (tx && tx.gasPrice) {
          event.gasFee = (receipt.gasUsed * tx.gasPrice).toString();
        }
      }

      // Check if invoice exists
      const existingInvoice = await db.select()
        .from(invoices)
        .where(eq(invoices.id, event.invoiceId))
        .limit(1);

      if (existingInvoice.length === 0) {
        console.warn(`Invoice ${event.invoiceId} not found for direct payment`);
        return;
      }

      // Check if payment already exists
      const existingPayment = await db.select()
        .from(payments)
        .where(
          and(
            eq(payments.invoiceId, event.invoiceId),
            eq(payments.txHash, event.txHash)
          )
        )
        .limit(1);

      if (existingPayment.length > 0) {
        console.log(`Payment already processed: ${event.txHash}`);
        return;
      }

      // Create payment record
      await db.insert(payments).values({
        invoiceId: event.invoiceId,
        payer: event.payer,
        amount: event.amount,
        currency: event.currency,
        txHash: event.txHash,
        externalChain: this.getChainName(this.chainId),
        status: "confirmed",
        blockNumber: event.blockNumber,
        blockHash: event.blockHash,
        gasUsed: event.gasUsed,
        gasFee: event.gasFee,
        confirmedAt: new Date(),
        metadata: {
          type: "direct",
          chainId: this.chainId,
          indexedAt: new Date().toISOString(),
          source: "ethereum-indexer",
        },
      });

      // Create transaction record
      await db.insert(transactions).values({
        appId: existingInvoice[0].appId,
        type: "payment",
        chain: this.getChainName(this.chainId),
        txHash: event.txHash,
        amount: event.amount,
        currency: event.currency,
        status: "confirmed",
        blockNumber: event.blockNumber,
        fromAddress: event.payer,
        toAddress: "", // Contract address would be here
        metadata: {
          invoiceId: event.invoiceId,
          type: "direct",
          chainId: this.chainId,
          indexedAt: new Date().toISOString(),
          source: "ethereum-indexer",
        },
        createdAt: new Date(),
      });

      console.log(`Direct payment processed successfully: ${event.txHash}`);
    } catch (error) {
      console.error("Error processing direct payment event:", error);
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

  getStatus(): { isRunning: boolean; lastProcessedBlock: number; chainId: number } {
    return {
      isRunning: this.isRunning,
      lastProcessedBlock: this.lastProcessedBlock,
      chainId: this.chainId,
    };
  }
}