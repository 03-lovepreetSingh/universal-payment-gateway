import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { db } from "@/lib/db";
import { feeQuotes, invoices, feePlans, apps, users } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

// POST /api/fees/quote - Generate fee quote for invoice
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession();

    if (!session?.user?.address) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { invoiceId, chain, gasPrice, gasLimit } = body;

    // Validate required fields
    if (!invoiceId || !chain) {
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
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Get invoice with app details
    const invoice = await db.query.invoices.findFirst({
      where: eq(invoices.id, invoiceId),
      with: {
        app: {
          columns: {
            id: true,
            name: true,
            userId: true,
          },
        },
      },
    });

    if (!invoice) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    // Verify invoice belongs to user's app
    if (invoice.app.userId !== user.id) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    // Get active fee plan for the app
    const feePlan = await db.query.feePlans.findFirst({
      where: and(
        eq(feePlans.appId, invoice.appId),
        eq(feePlans.isActive, true)
      ),
    });

    // Calculate platform fee based on fee plan
    let platformFee = "0";
    const invoiceAmount = parseFloat(invoice.amount);

    if (feePlan) {
      switch (feePlan.model) {
        case "flat":
          platformFee = feePlan.flatFee || "0";
          break;
        case "percentage":
          const bps = feePlan.bps || 0;
          platformFee = ((invoiceAmount * bps) / 10000).toString();
          break;
        case "tiered":
          // Implement tiered fee calculation
          const tiers = (feePlan.tiers as any[]) || [];
          let calculatedFee = 0;
          for (const tier of tiers) {
            if (invoiceAmount >= tier.minAmount) {
              if (tier.type === "flat") {
                calculatedFee = tier.fee;
              } else if (tier.type === "percentage") {
                calculatedFee = (invoiceAmount * tier.bps) / 10000;
              }
            }
          }
          platformFee = calculatedFee.toString();
          break;
        default:
          platformFee = "0";
      }
    }

    // Calculate network fee (mock implementation)
    // In a real implementation, this would query actual gas prices from the network
    const mockGasPrice = gasPrice || "20000000000"; // 20 gwei
    const mockGasLimit = gasLimit || 21000;
    const networkFee = (
      (parseFloat(mockGasPrice) * mockGasLimit) /
      1e18
    ).toString();

    // Calculate total fee
    const totalFee = (
      parseFloat(platformFee) + parseFloat(networkFee)
    ).toString();

    // Set expiration time (15 minutes from now)
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

    // Create fee quote
    const [newFeeQuote] = await db
      .insert(feeQuotes)
      .values({
        invoiceId,
        networkFee,
        platformFee,
        totalFee,
        currency: invoice.currency,
        chain,
        gasPrice: mockGasPrice,
        gasLimit: mockGasLimit,
        expiresAt,
        generatedAt: new Date(),
      })
      .returning();

    return NextResponse.json(
      {
        feeQuote: newFeeQuote,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Fee quote generation error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// GET /api/fees/quote - Get fee quotes for invoice
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession();

    if (!session?.user?.address) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const invoiceId = searchParams.get("invoiceId");

    if (!invoiceId) {
      return NextResponse.json(
        { error: "Invoice ID is required" },
        { status: 400 }
      );
    }

    // Get user
    const user = await db.query.users.findFirst({
      where: eq(users.wallet, session.user.address.toLowerCase()),
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Get invoice with app details
    const invoice = await db.query.invoices.findFirst({
      where: eq(invoices.id, invoiceId),
      with: {
        app: {
          columns: {
            id: true,
            name: true,
            userId: true,
          },
        },
      },
    });

    if (!invoice) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    // Verify invoice belongs to user's app
    if (invoice.app.userId !== user.id) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    // Get fee quotes for the invoice
    const quotes = await db.query.feeQuotes.findMany({
      where: eq(feeQuotes.invoiceId, invoiceId),
      orderBy: [desc(feeQuotes.generatedAt)],
    });

    return NextResponse.json({
      feeQuotes: quotes,
    });
  } catch (error) {
    console.error("Fee quotes fetch error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
//added a comment
