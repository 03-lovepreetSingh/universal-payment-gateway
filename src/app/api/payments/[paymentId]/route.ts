import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { db } from "@/lib/db";
import { payments, invoices, apps, users } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

// GET /api/payments/[paymentId] - Get specific payment
export async function GET(
  request: NextRequest,
  { params }: { params: { paymentId: string } }
) {
  try {
    const session = await getServerSession();
    
    if (!session?.user?.address) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { paymentId } = params;

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

    // Get payment with invoice and app details
    const payment = await db.query.payments.findFirst({
      where: eq(payments.id, paymentId),
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
    });

    if (!payment) {
      return NextResponse.json(
        { error: "Payment not found" },
        { status: 404 }
      );
    }

    // Verify payment belongs to user's app
    if (payment.invoice.app.userId !== user.id) {
      return NextResponse.json(
        { error: "Payment not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ payment });
  } catch (error) {
    console.error("Payment fetch error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// PUT /api/payments/[paymentId] - Update payment status (for blockchain confirmations)
export async function PUT(
  request: NextRequest,
  { params }: { params: { paymentId: string } }
) {
  try {
    const body = await request.json();
    const { paymentId } = params;
    const { 
      status,
      blockNumber,
      blockHash,
      confirmedAt,
      gasUsed,
      gasFee,
      metadata
    } = body;

    // Validate status
    const validStatuses = ["pending", "confirmed", "failed"];
    if (status && !validStatuses.includes(status)) {
      return NextResponse.json(
        { error: "Invalid status" },
        { status: 400 }
      );
    }

    // Get existing payment
    const existingPayment = await db.query.payments.findFirst({
      where: eq(payments.id, paymentId),
      with: {
        invoice: true,
      },
    });

    if (!existingPayment) {
      return NextResponse.json(
        { error: "Payment not found" },
        { status: 404 }
      );
    }

    // Prepare update data
    const updateData: any = {};
    
    if (status) updateData.status = status;
    if (blockNumber) updateData.blockNumber = blockNumber;
    if (blockHash) updateData.blockHash = blockHash;
    if (confirmedAt) updateData.confirmedAt = new Date(confirmedAt);
    if (gasUsed) updateData.gasUsed = gasUsed.toString();
    if (gasFee) updateData.gasFee = gasFee.toString();
    if (metadata) updateData.metadata = metadata;

    // Update payment
    const [updatedPayment] = await db
      .update(payments)
      .set(updateData)
      .where(eq(payments.id, paymentId))
      .returning();

    // If payment is confirmed and invoice isn't paid yet, update invoice
    if (status === "confirmed" && existingPayment.invoice.status !== "paid") {
      const paymentAmount = parseFloat(existingPayment.amount);
      const invoiceAmount = parseFloat(existingPayment.invoice.amount);
      
      if (paymentAmount >= invoiceAmount) {
        await db
          .update(invoices)
          .set({
            status: "paid",
            paidAt: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(invoices.id, existingPayment.invoiceId));
      }
    }

    return NextResponse.json({ payment: updatedPayment });
  } catch (error) {
    console.error("Payment update error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE /api/payments/[paymentId] - Cancel/refund payment
export async function DELETE(
  request: NextRequest,
  { params }: { params: { paymentId: string } }
) {
  try {
    const session = await getServerSession();
    
    if (!session?.user?.address) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { paymentId } = params;

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

    // Get payment with invoice and app details
    const payment = await db.query.payments.findFirst({
      where: eq(payments.id, paymentId),
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
    });

    if (!payment) {
      return NextResponse.json(
        { error: "Payment not found" },
        { status: 404 }
      );
    }

    // Verify payment belongs to user's app
    if (payment.invoice.app.userId !== user.id) {
      return NextResponse.json(
        { error: "Payment not found" },
        { status: 404 }
      );
    }

    // Only allow cancellation of pending payments
    if (payment.status !== "pending") {
      return NextResponse.json(
        { error: "Can only cancel pending payments" },
        { status: 400 }
      );
    }

    // Update payment status to failed
    const existingMetadata = payment.metadata || {};
    const [updatedPayment] = await db
      .update(payments)
      .set({
        status: "failed",
        metadata: {
          ...(typeof existingMetadata === 'object' ? existingMetadata : {}),
          cancelledAt: new Date().toISOString(),
          cancelledBy: user.id,
        },
      })
      .where(eq(payments.id, paymentId))
      .returning();

    return NextResponse.json({ 
      message: "Payment cancelled successfully",
      payment: updatedPayment 
    });
  } catch (error) {
    console.error("Payment cancellation error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}