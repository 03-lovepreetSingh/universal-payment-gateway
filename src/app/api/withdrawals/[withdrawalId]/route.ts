import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { db } from "@/lib/db";
import { withdrawals, apps, users } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

// GET /api/withdrawals/[withdrawalId] - Get specific withdrawal
export async function GET(
  request: NextRequest,
  { params }: { params: { withdrawalId: string } }
) {
  try {
    const session = await getServerSession();
    
    if (!session?.user?.address) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { withdrawalId } = params;

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

    // Get withdrawal with app details
    const withdrawal = await db.query.withdrawals.findFirst({
      where: eq(withdrawals.id, withdrawalId),
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

    if (!withdrawal) {
      return NextResponse.json(
        { error: "Withdrawal not found" },
        { status: 404 }
      );
    }

    // Verify withdrawal belongs to user's app
    if (withdrawal.app.userId !== user.id) {
      return NextResponse.json(
        { error: "Withdrawal not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ withdrawal });
  } catch (error) {
    console.error("Withdrawal fetch error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// PUT /api/withdrawals/[withdrawalId] - Update withdrawal status (for admin/system use)
export async function PUT(
  request: NextRequest,
  { params }: { params: { withdrawalId: string } }
) {
  try {
    const body = await request.json();
    const { withdrawalId } = params;
    const { 
      status,
      approvedAt,
      executedAt,
      executedTx,
      fee,
      metadata
    } = body;

    // Validate status
    const validStatuses = ["pending", "approved", "executed", "failed", "cancelled"];
    if (status && !validStatuses.includes(status)) {
      return NextResponse.json(
        { error: "Invalid status" },
        { status: 400 }
      );
    }

    // Get existing withdrawal
    const existingWithdrawal = await db.query.withdrawals.findFirst({
      where: eq(withdrawals.id, withdrawalId),
    });

    if (!existingWithdrawal) {
      return NextResponse.json(
        { error: "Withdrawal not found" },
        { status: 404 }
      );
    }

    // Prepare update data
    const updateData: any = {};
    
    if (status) updateData.status = status;
    if (approvedAt) updateData.approvedAt = new Date(approvedAt);
    if (executedAt) updateData.executedAt = new Date(executedAt);
    if (executedTx) updateData.executedTx = executedTx;
    if (fee) updateData.fee = fee.toString();
    if (metadata) updateData.metadata = metadata;

    // Update withdrawal
    const [updatedWithdrawal] = await db
      .update(withdrawals)
      .set(updateData)
      .where(eq(withdrawals.id, withdrawalId))
      .returning();

    return NextResponse.json({ withdrawal: updatedWithdrawal });
  } catch (error) {
    console.error("Withdrawal update error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE /api/withdrawals/[withdrawalId] - Cancel withdrawal request
export async function DELETE(
  request: NextRequest,
  { params }: { params: { withdrawalId: string } }
) {
  try {
    const session = await getServerSession();
    
    if (!session?.user?.address) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { withdrawalId } = params;

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

    // Get withdrawal with app details
    const withdrawal = await db.query.withdrawals.findFirst({
      where: eq(withdrawals.id, withdrawalId),
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

    if (!withdrawal) {
      return NextResponse.json(
        { error: "Withdrawal not found" },
        { status: 404 }
      );
    }

    // Verify withdrawal belongs to user's app
    if (withdrawal.app.userId !== user.id) {
      return NextResponse.json(
        { error: "Withdrawal not found" },
        { status: 404 }
      );
    }

    // Only allow cancellation of pending withdrawals
    if (withdrawal.status !== "pending") {
      return NextResponse.json(
        { error: "Can only cancel pending withdrawals" },
        { status: 400 }
      );
    }

    // Update withdrawal status to cancelled
    const existingMetadata = withdrawal.metadata || {};
    const [updatedWithdrawal] = await db
      .update(withdrawals)
      .set({
        status: "cancelled",
        metadata: {
          ...(typeof existingMetadata === 'object' ? existingMetadata : {}),
          cancelledAt: new Date().toISOString(),
          cancelledBy: user.id,
        },
      })
      .where(eq(withdrawals.id, withdrawalId))
      .returning();

    return NextResponse.json({ 
      message: "Withdrawal cancelled successfully",
      withdrawal: updatedWithdrawal 
    });
  } catch (error) {
    console.error("Withdrawal cancellation error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}