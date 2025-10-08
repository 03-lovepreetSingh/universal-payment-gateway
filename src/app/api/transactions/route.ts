import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { db } from "@/lib/db";
import { transactions, apps, users } from "@/lib/db/schema";
import { eq, and, desc, inArray } from "drizzle-orm";

// GET /api/transactions - Get transactions for user's apps
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession();
    
    if (!session?.user?.address) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const appId = searchParams.get("appId");
    const type = searchParams.get("type");
    const chain = searchParams.get("chain");
    const status = searchParams.get("status");
    const currency = searchParams.get("currency");
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = parseInt(searchParams.get("offset") || "0");

    // Get user
    const user = await db.query.users.findFirst({
      where: eq(users.wallet, session.user.address.toLowerCase()),
    });

    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    // Get user's apps
    const userApps = await db.query.apps.findMany({
      where: eq(apps.userId, user.id),
      columns: { id: true },
    });

    if (userApps.length === 0) {
      return NextResponse.json({ transactions: [], total: 0 });
    }

    const appIds = userApps.map(app => app.id);

    // Build query conditions
    let whereConditions = [inArray(transactions.appId, appIds)];

    if (appId) {
      // Verify app belongs to user
      if (!appIds.includes(appId)) {
        return NextResponse.json(
          { error: "App not found" },
          { status: 404 }
        );
      }
      whereConditions.push(eq(transactions.appId, appId));
    }

    if (type) {
      whereConditions.push(eq(transactions.type, type));
    }

    if (chain) {
      whereConditions.push(eq(transactions.chain, chain));
    }

    if (status) {
      whereConditions.push(eq(transactions.status, status));
    }

    if (currency) {
      whereConditions.push(eq(transactions.currency, currency));
    }

    // Get transactions with app details
    const userTransactions = await db.query.transactions.findMany({
      where: and(...whereConditions),
      with: {
        app: {
          columns: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: [desc(transactions.createdAt)],
      limit,
      offset,
    });

    return NextResponse.json({
      transactions: userTransactions,
      total: userTransactions.length,
    });
  } catch (error) {
    console.error("Transactions fetch error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST /api/transactions - Create new transaction record (typically called by blockchain indexer)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      appId,
      type,
      chain,
      txHash,
      amount,
      currency,
      fee,
      status,
      blockNumber,
      fromAddress,
      toAddress,
      metadata
    } = body;

    // Validate required fields
    if (!appId || !type || !chain || !txHash || !amount || !currency || !status) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Validate type
    const validTypes = ["payment", "withdrawal", "fee"];
    if (!validTypes.includes(type)) {
      return NextResponse.json(
        { error: "Invalid transaction type" },
        { status: 400 }
      );
    }

    // Check if transaction already exists
    const existingTransaction = await db.query.transactions.findFirst({
      where: and(
        eq(transactions.txHash, txHash),
        eq(transactions.chain, chain)
      ),
    });

    if (existingTransaction) {
      return NextResponse.json(
        { error: "Transaction already recorded" },
        { status: 409 }
      );
    }

    // Verify app exists
    const app = await db.query.apps.findFirst({
      where: eq(apps.id, appId),
    });

    if (!app) {
      return NextResponse.json(
        { error: "App not found" },
        { status: 404 }
      );
    }

    // Create transaction record
    const [newTransaction] = await db.insert(transactions).values({
      appId,
      type,
      chain,
      txHash,
      amount: amount.toString(),
      currency,
      fee: fee ? fee.toString() : null,
      status,
      blockNumber: blockNumber || null,
      fromAddress: fromAddress || null,
      toAddress: toAddress || null,
      metadata: metadata || null,
      createdAt: new Date(),
    }).returning();

    return NextResponse.json({
      transaction: newTransaction,
    }, { status: 201 });
  } catch (error) {
    console.error("Transaction creation error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}