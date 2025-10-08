import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { db } from "@/lib/db";
import { invoices, apps, users } from "@/lib/db/schema";
import { eq, and, desc } from "drizzle-orm";

// GET /api/invoices - Get invoices for user's apps
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

    // Build query conditions
    let whereConditions = [];
    
    if (appId) {
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

      whereConditions.push(eq(invoices.appId, appId));
    } else {
      // Get all user's apps
      const userApps = await db.query.apps.findMany({
        where: eq(apps.userId, user.id),
        columns: { id: true },
      });

      if (userApps.length === 0) {
        return NextResponse.json({ invoices: [], total: 0 });
      }

      // Filter by user's apps
      const appIds = userApps.map(app => app.id);
      whereConditions.push(eq(invoices.appId, appIds[0])); // This needs proper IN clause handling
    }

    if (status) {
      whereConditions.push(eq(invoices.status, status));
    }

    // Get invoices with app details
    const userInvoices = await db.query.invoices.findMany({
      where: whereConditions.length > 1 ? and(...whereConditions) : whereConditions[0],
      with: {
        app: {
          columns: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: [desc(invoices.createdAt)],
      limit,
      offset,
    });

    return NextResponse.json({
      invoices: userInvoices,
      total: userInvoices.length,
    });
  } catch (error) {
    console.error("Invoices fetch error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST /api/invoices - Create new invoice
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
      externalChain, 
      memo, 
      dueAt, 
      expiresAt,
      metadata 
    } = body;

    // Validate required fields
    if (!appId || !amount || !currency) {
      return NextResponse.json(
        { error: "Missing required fields: appId, amount, currency" },
        { status: 400 }
      );
    }

    // Validate amount
    if (isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
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

    // Create invoice
    const [newInvoice] = await db.insert(invoices).values({
      appId,
      amount: amount.toString(),
      currency,
      externalChain: externalChain || null,
      status: "pending",
      memo: memo || null,
      dueAt: dueAt ? new Date(dueAt) : null,
      expiresAt: expiresAt ? new Date(expiresAt) : null,
      metadata: metadata || null,
      createdAt: new Date(),
      updatedAt: new Date(),
    }).returning();

    return NextResponse.json({
      invoice: newInvoice,
    }, { status: 201 });
  } catch (error) {
    console.error("Invoice creation error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}