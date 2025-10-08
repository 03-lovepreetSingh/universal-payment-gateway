import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { db } from "@/lib/db";
import { payments, invoices, apps, users } from "@/lib/db/schema";
import { eq, and, desc, inArray } from "drizzle-orm";

// GET /api/payments - Get payments for user's apps
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
    const invoiceId = searchParams.get("invoiceId");
    const status = searchParams.get("status");
    const chain = searchParams.get("chain");
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
      return NextResponse.json({ payments: [], total: 0 });
    }

    const appIds = userApps.map(app => app.id);

    // Build query conditions
    let whereConditions = [];

    if (appId) {
      // Verify app belongs to user
      if (!appIds.includes(appId)) {
        return NextResponse.json(
          { error: "App not found" },
          { status: 404 }
        );
      }
      // Filter by specific app through invoices
    }

    if (invoiceId) {
      whereConditions.push(eq(payments.invoiceId, invoiceId));
    }

    if (status) {
      whereConditions.push(eq(payments.status, status));
    }

    if (chain) {
      whereConditions.push(eq(payments.externalChain, chain));
    }

    // Get payments with invoice and app details
    const userPayments = await db.query.payments.findMany({
      where: whereConditions.length > 0 ? and(...whereConditions) : undefined,
      with: {
        invoice: {
          with: {
            app: {
              columns: {
                id: true,
                name: true,
                userId: true,
              },
            },
          },
        },
      },
      orderBy: [desc(payments.recordedAt)],
      limit,
      offset,
    });

    // Filter payments to only include those from user's apps
    const filteredPayments = userPayments.filter(payment => 
      payment.invoice.app.userId === user.id
    );

    return NextResponse.json({
      payments: filteredPayments,
      total: filteredPayments.length,
    });
  } catch (error) {
    console.error("Payments fetch error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST /api/payments - Record new payment (typically called by blockchain indexer)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      invoiceId,
      externalChain,
      txHash,
      payer,
      amount,
      currency,
      blockNumber,
      blockHash,
      gasUsed,
      gasFee,
      metadata
    } = body;

    // Validate required fields
    if (!invoiceId || !externalChain || !txHash || !payer || !amount || !currency) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Check if payment already exists
    const existingPayment = await db.query.payments.findFirst({
      where: and(
        eq(payments.txHash, txHash),
        eq(payments.externalChain, externalChain)
      ),
    });

    if (existingPayment) {
      return NextResponse.json(
        { error: "Payment already recorded" },
        { status: 409 }
      );
    }

    // Verify invoice exists
    const invoice = await db.query.invoices.findFirst({
      where: eq(invoices.id, invoiceId),
    });

    if (!invoice) {
      return NextResponse.json(
        { error: "Invoice not found" },
        { status: 404 }
      );
    }

    // Create payment record
    const [newPayment] = await db.insert(payments).values({
      invoiceId,
      externalChain,
      txHash,
      payer,
      amount: amount.toString(),
      currency,
      status: "pending",
      blockNumber: blockNumber || null,
      blockHash: blockHash || null,
      gasUsed: gasUsed ? gasUsed.toString() : null,
      gasFee: gasFee ? gasFee.toString() : null,
      recordedAt: new Date(),
      confirmedAt: null,
      metadata: metadata || null,
    }).returning();

    // Update invoice status if payment amount matches
    if (parseFloat(amount) >= parseFloat(invoice.amount)) {
      await db
        .update(invoices)
        .set({
          status: "paid",
          paidAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(invoices.id, invoiceId));
    }

    return NextResponse.json({
      payment: newPayment,
    }, { status: 201 });
  } catch (error) {
    console.error("Payment creation error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}