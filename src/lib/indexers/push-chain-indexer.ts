import { ethers } from "ethers";
import { db } from "@/lib/db";
import { payments, invoices, transactions } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { PUSH_CHAIN_CONFIG } from "@/lib/pushchain/client";

export interface PaymentEvent {
  invoiceId: string;
  payer: string;
  amount: string;
  currency: string;
  txHash: string;
  blockNumber: number;
  blockHash: string;
  gasUsed: string;
  gasFee: string;
}

export interface WithdrawalEvent {
  appId: string;
  recipient: string;
  amount: string;
  currency: string;
  txHash: string;
  blockNumber: number;
  blockHash: string;
}

export class PushChainIndexer {
  private provider: ethers.JsonRpcProvider;
  private paymentContract: ethers.Contract;
  private isRunning: boolean = false;
  private lastProcessedBlock: number = 0;

  constructor() {
    this.provider = new ethers.JsonRpcProvider(PUSH_CHAIN_CONFIG.rpcUrl);
    
    // Mock contract ABI for payment events
    const paymentABI = [
      "event PaymentReceived(string indexed invoiceId, address indexed payer, uint256 amount, string currency)",
      "event WithdrawalExecuted(string indexed appId, address indexed recipient, uint256 amount, string currency)",
      "event FeeCollected(string indexed appId, uint256 platformFee, uint256 networkFee, string currency)"
    ];

    this.paymentContract = new ethers.Contract(
      PUSH_CHAIN_CONFIG.contracts.payment,
      paymentABI,
      this.provider
    );
  }

  async start(): Promise<void> {
    if (this.isRunning) {
      console.log("Push Chain indexer is already running");
      return;
    }

    this.isRunning = true;
    console.log("Starting Push Chain indexer...");

    try {
      // Get the latest block number
      const latestBlock = await this.provider.getBlockNumber();
      this.lastProcessedBlock = Math.max(0, latestBlock - 100); // Start from 100 blocks ago

      // Set up event listeners
      this.setupEventListeners();

      // Start periodic block processing
      this.startBlockProcessing();

      console.log(`Push Chain indexer started at block ${this.lastProcessedBlock}`);
    } catch (error) {
      console.error("Failed to start Push Chain indexer:", error);
      this.isRunning = false;
      throw error;
    }
  }

  async stop(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    this.isRunning = false;
    this.paymentContract.removeAllListeners();
    console.log("Push Chain indexer stopped");
  }

  private setupEventListeners(): void {
    // Listen for payment events
    this.paymentContract.on("PaymentReceived", async (invoiceId, payer, amount, currency, event) => {
      try {
        await this.processPaymentEvent({
          invoiceId,
          payer,
          amount: amount.toString(),
          currency,
          txHash: event.transactionHash,
          blockNumber: event.blockNumber,
          blockHash: event.blockHash,
          gasUsed: "0", // Will be filled by transaction receipt
          gasFee: "0", // Will be filled by transaction receipt
        });
      } catch (error) {
        console.error("Error processing payment event:", error);
      }
    });

    // Listen for withdrawal events
    this.paymentContract.on("WithdrawalExecuted", async (appId, recipient, amount, currency, event) => {
      try {
        await this.processWithdrawalEvent({
          appId,
          recipient,
          amount: amount.toString(),
          currency,
          txHash: event.transactionHash,
          blockNumber: event.blockNumber,
          blockHash: event.blockHash,
        });
      } catch (error) {
        console.error("Error processing withdrawal event:", error);
      }
    });

    // Listen for fee collection events
    this.paymentContract.on("FeeCollected", async (appId, platformFee, networkFee, currency, event) => {
      try {
        await this.processFeeEvent({
          appId,
          platformFee: platformFee.toString(),
          networkFee: networkFee.toString(),
          currency,
          txHash: event.transactionHash,
          blockNumber: event.blockNumber,
          blockHash: event.blockHash,
        });
      } catch (error) {
        console.error("Error processing fee event:", error);
      }
    });
  }

  private startBlockProcessing(): void {
    const processBlocks = async () => {
      if (!this.isRunning) return;

      try {
        const latestBlock = await this.provider.getBlockNumber();
        
        if (latestBlock > this.lastProcessedBlock) {
          await this.processBlockRange(this.lastProcessedBlock + 1, latestBlock);
          this.lastProcessedBlock = latestBlock;
        }
      } catch (error) {
        console.error("Error processing blocks:", error);
      }

      // Schedule next processing
      if (this.isRunning) {
        setTimeout(processBlocks, 5000); // Process every 5 seconds
      }
    };

    processBlocks();
  }

  private async processBlockRange(fromBlock: number, toBlock: number): Promise<void> {
    console.log(`Processing blocks ${fromBlock} to ${toBlock}`);

    // Get all payment events in the block range
    const paymentEvents = await this.paymentContract.queryFilter(
      this.paymentContract.filters.PaymentReceived(),
      fromBlock,
      toBlock
    );

    // Get all withdrawal events in the block range
    const withdrawalEvents = await this.paymentContract.queryFilter(
      this.paymentContract.filters.WithdrawalExecuted(),
      fromBlock,
      toBlock
    );

    // Get all fee events in the block range
    const feeEvents = await this.paymentContract.queryFilter(
      this.paymentContract.filters.FeeCollected(),
      fromBlock,
      toBlock
    );

    // Process events
    for (const event of paymentEvents) {
      await this.processPaymentEventFromLog(event);
    }

    for (const event of withdrawalEvents) {
      await this.processWithdrawalEventFromLog(event);
    }

    for (const event of feeEvents) {
      await this.processFeeEventFromLog(event);
    }
  }

  private async processPaymentEvent(event: PaymentEvent): Promise<void> {
    console.log("Processing payment event:", event);

    try {
      // Get transaction receipt for gas information
      const receipt = await this.provider.getTransactionReceipt(event.txHash);
      if (receipt) {
        event.gasUsed = receipt.gasUsed.toString();
        const tx = await this.provider.getTransaction(event.txHash);
        if (tx) {
          event.gasFee = (receipt.gasUsed * tx.gasPrice!).toString();
        }
      }

      // Check if payment already exists
      const existingPayment = await db.query.payments.findFirst({
        where: and(
          eq(payments.txHash, event.txHash),
          eq(payments.externalChain, "push-chain")
        ),
      });

      if (existingPayment) {
        console.log("Payment already processed:", event.txHash);
        return;
      }

      // Verify invoice exists
      const invoice = await db.query.invoices.findFirst({
        where: eq(invoices.id, event.invoiceId),
      });

      if (!invoice) {
        console.error("Invoice not found for payment:", event.invoiceId);
        return;
      }

      // Create payment record
      const [newPayment] = await db.insert(payments).values({
        invoiceId: event.invoiceId,
        externalChain: "push-chain",
        txHash: event.txHash,
        payer: event.payer,
        amount: event.amount,
        currency: event.currency,
        status: "confirmed",
        blockNumber: event.blockNumber,
        blockHash: event.blockHash,
        gasUsed: event.gasUsed,
        gasFee: event.gasFee,
        recordedAt: new Date(),
        confirmedAt: new Date(),
        metadata: {
          indexedAt: new Date().toISOString(),
          source: "push-chain-indexer",
        },
      }).returning();

      // Update invoice status if payment amount matches
      if (parseFloat(event.amount) >= parseFloat(invoice.amount)) {
        await db
          .update(invoices)
          .set({
            status: "paid",
            paidAt: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(invoices.id, event.invoiceId));
      }

      // Create transaction record
      await db.insert(transactions).values({
        appId: invoice.appId,
        type: "payment",
        chain: "push-chain",
        txHash: event.txHash,
        amount: event.amount,
        currency: event.currency,
        fee: event.gasFee,
        status: "confirmed",
        blockNumber: event.blockNumber,
        fromAddress: event.payer,
        toAddress: PUSH_CHAIN_CONFIG.contracts.payment,
        metadata: {
          invoiceId: event.invoiceId,
          indexedAt: new Date().toISOString(),
        },
        createdAt: new Date(),
      });

      console.log("Payment processed successfully:", newPayment.id);
    } catch (error) {
      console.error("Error processing payment event:", error);
    }
  }

  private async processWithdrawalEvent(event: WithdrawalEvent): Promise<void> {
    console.log("Processing withdrawal event:", event);

    try {
      // Create transaction record for withdrawal
      await db.insert(transactions).values({
        appId: event.appId,
        type: "withdrawal",
        chain: "push-chain",
        txHash: event.txHash,
        amount: event.amount,
        currency: event.currency,
        status: "confirmed",
        blockNumber: event.blockNumber,
        fromAddress: PUSH_CHAIN_CONFIG.contracts.payment,
        toAddress: event.recipient,
        metadata: {
          indexedAt: new Date().toISOString(),
          source: "push-chain-indexer",
        },
        createdAt: new Date(),
      });

      console.log("Withdrawal processed successfully:", event.txHash);
    } catch (error) {
      console.error("Error processing withdrawal event:", error);
    }
  }

  private async processFeeEvent(event: any): Promise<void> {
    console.log("Processing fee event:", event);

    try {
      // Create transaction record for fee collection
      const totalFee = (parseFloat(event.platformFee) + parseFloat(event.networkFee)).toString();

      await db.insert(transactions).values({
        appId: event.appId,
        type: "fee",
        chain: "push-chain",
        txHash: event.txHash,
        amount: totalFee,
        currency: event.currency,
        status: "confirmed",
        blockNumber: event.blockNumber,
        metadata: {
          platformFee: event.platformFee,
          networkFee: event.networkFee,
          indexedAt: new Date().toISOString(),
          source: "push-chain-indexer",
        },
        createdAt: new Date(),
      });

      console.log("Fee event processed successfully:", event.txHash);
    } catch (error) {
      console.error("Error processing fee event:", error);
    }
  }

  private async processPaymentEventFromLog(event: any): Promise<void> {
    const args = event.args;
    await this.processPaymentEvent({
      invoiceId: args.invoiceId,
      payer: args.payer,
      amount: args.amount.toString(),
      currency: args.currency,
      txHash: event.transactionHash,
      blockNumber: event.blockNumber,
      blockHash: event.blockHash,
      gasUsed: "0",
      gasFee: "0",
    });
  }

  private async processWithdrawalEventFromLog(event: any): Promise<void> {
    const args = event.args;
    await this.processWithdrawalEvent({
      appId: args.appId,
      recipient: args.recipient,
      amount: args.amount.toString(),
      currency: args.currency,
      txHash: event.transactionHash,
      blockNumber: event.blockNumber,
      blockHash: event.blockHash,
    });
  }

  private async processFeeEventFromLog(event: any): Promise<void> {
    const args = event.args;
    await this.processFeeEvent({
      appId: args.appId,
      platformFee: args.platformFee.toString(),
      networkFee: args.networkFee.toString(),
      currency: args.currency,
      txHash: event.transactionHash,
      blockNumber: event.blockNumber,
      blockHash: event.blockHash,
    });
  }

  async getStatus(): Promise<{
    isRunning: boolean;
    lastProcessedBlock: number;
    currentBlock: number;
  }> {
    const currentBlock = await this.provider.getBlockNumber();
    return {
      isRunning: this.isRunning,
      lastProcessedBlock: this.lastProcessedBlock,
      currentBlock,
    };
  }
}

// Singleton instance
export const pushChainIndexer = new PushChainIndexer();