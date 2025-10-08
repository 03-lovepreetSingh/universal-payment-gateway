import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { db } from "@/lib/db";
import { withdrawals, apps, users } from "@/lib/db/schema";
import { eq, and, desc, inArray } from "drizzle-orm";

// GET /api/withdrawals - Get withdrawals for user's apps
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
      return NextResponse.json({ withdrawals: [], total: 0 });
    }

    const appIds = userApps.map(app => app.id);

    // Build query conditions
    let whereConditions = [inArray(withdrawals.appId, appIds)];

    if (appId) {
      // Verify app belongs to user
      if (!appIds.includes(appId)) {
        return NextResponse.json(
          { error: "App not found" },
          { status: 404 }
        );
      }
      whereConditions.push(eq(withdrawals.appId, appId));
    }

    if (status) {
      whereConditions.push(eq(withdrawals.status, status));
    }

    if (currency) {
      whereConditions.push(eq(withdrawals.currency, currency));
    }

    // Get withdrawals with app details
    const userWithdrawals = await db.query.withdrawals.findMany({
      where: and(...whereConditions),
      with: {
        app: {
          columns: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: [desc(withdrawals.requestedAt)],
      limit,
      offset,
    });

    return NextResponse.json({
      withdrawals: userWithdrawals,
      total: userWithdrawals.length,
    });
  } catch (error) {
    console.error("Withdrawals fetch error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST /api/withdrawals - Create new withdrawal request
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession();
    
    if (!session?.user?.address) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { 
      appId,
      amount,
      currency,
      destinationAddress,
      destinationChain,
      metadata
    } = body;

    // Validate required fields
    if (!appId || !amount || !currency || !destinationAddress || !destinationChain) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Validate amount
    const withdrawalAmount = parseFloat(amount);
    if (isNaN(withdrawalAmount) || withdrawalAmount <= 0) {
      return NextResponse.json(
        { error: "Invalid amount" },
        { status: 400 }
      );
    }

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

    // Verify app belongs to user
    const app = await db.query.apps.findFirst({
      where: and(
        eq(apps.id, appId),
        eq(apps.userId, user.id)
      ),
    });

    if (!app) {
      return NextResponse.json(
        { error: "App not found" },
        { status: 404 }
      );
    }

    // TODO: Check app balance before allowing withdrawal
    // This would require implementing a balance tracking system

    // Create withdrawal request
    const [newWithdrawal] = await db.insert(withdrawals).values({
      appId,
      amount: amount.toString(),
      currency,
      destinationAddress,
      destinationChain,
      status: "pending",
      requestedAt: new Date(),
      approvedAt: null,
      executedAt: null,
      executedTx: null,
      metadata: metadata || null,
    }).returning();

    return NextResponse.json({
      withdrawal: newWithdrawal,
    }, { status: 201 });
  } catch (error) {
    console.error("Withdrawal creation error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}