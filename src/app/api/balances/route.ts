import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { db } from "@/lib/db";
import { balances, apps, users } from "@/lib/db/schema";
import { eq, and, inArray } from "drizzle-orm";

// GET /api/balances - Get balances for user's apps
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
    const currency = searchParams.get("currency");

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
      return NextResponse.json({ balances: [] });
    }

    const appIds = userApps.map(app => app.id);

    // Build query conditions
    let whereConditions = [inArray(balances.appId, appIds)];

    if (appId) {
      // Verify app belongs to user
      if (!appIds.includes(appId)) {
        return NextResponse.json(
          { error: "App not found" },
          { status: 404 }
        );
      }
      whereConditions.push(eq(balances.appId, appId));
    }

    if (currency) {
      whereConditions.push(eq(balances.currency, currency));
    }

    // Get balances with app details
    const userBalances = await db.query.balances.findMany({
      where: and(...whereConditions),
      with: {
        app: {
          columns: {
            id: true,
            name: true,
          },
        },
      },
    });

    return NextResponse.json({
      balances: userBalances,
    });
  } catch (error) {
    console.error("Balances fetch error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST /api/balances - Initialize balance for app/currency pair
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
    const { appId, currency } = body;

    // Validate required fields
    if (!appId || !currency) {
      return NextResponse.json(
        { error: "Missing required fields" },
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

    // Check if balance already exists
    const existingBalance = await db.query.balances.findFirst({
      where: and(
        eq(balances.appId, appId),
        eq(balances.currency, currency)
      ),
    });

    if (existingBalance) {
      return NextResponse.json(
        { error: "Balance already exists" },
        { status: 409 }
      );
    }

    // Create balance record
    const [newBalance] = await db.insert(balances).values({
      appId,
      currency,
      available: "0",
      pending: "0",
      reserved: "0",
      updatedAt: new Date(),
    }).returning();

    return NextResponse.json({
      balance: newBalance,
    }, { status: 201 });
  } catch (error) {
    console.error("Balance creation error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}