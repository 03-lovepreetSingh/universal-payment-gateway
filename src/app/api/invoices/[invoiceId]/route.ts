import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { db } from "@/lib/db";
import { invoices, apps, users, payments } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

// GET /api/invoices/[invoiceId] - Get specific invoice
export async function GET(
  request: NextRequest,
  { params }: { params: { invoiceId: string } }
) {
  try {
    const session = await getServerSession();
    
    if (!session?.user?.address) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
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

    // Get invoice with app and payments
    const invoice = await db.query.invoices.findFirst({
      where: eq(invoices.id, params.invoiceId),
      with: {
        app: {
          columns: {
            id: true,
            name: true,
            userId: true,
          },
        },
        payments: true,
      },
    });

    if (!invoice) {
      return NextResponse.json(
        { error: "Invoice not found" },
        { status: 404 }
      );
    }

    // Verify invoice belongs to user's app
    if (invoice.app.userId !== user.id) {
      return NextResponse.json(
        { error: "Access denied" },
        { status: 403 }
      );
    }

    return NextResponse.json({
      invoice,
    });
  } catch (error) {
    console.error("Invoice fetch error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// PUT /api/invoices/[invoiceId] - Update invoice
export async function PUT(
  request: NextRequest,
  { params }: { params: { invoiceId: string } }
) {
  try {
    const session = await getServerSession();
    
    if (!session?.user?.address) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { status, memo, dueAt, expiresAt, metadata } = body;

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

    // Get invoice with app
    const invoice = await db.query.invoices.findFirst({
      where: eq(invoices.id, params.invoiceId),
      with: {
        app: {
          columns: {
            userId: true,
          },
        },
      },
    });

    if (!invoice) {
      return NextResponse.json(
        { error: "Invoice not found" },
        { status: 404 }
      );
    }

    // Verify invoice belongs to user's app
    if (invoice.app.userId !== user.id) {
      return NextResponse.json(
        { error: "Access denied" },
        { status: 403 }
      );
    }

    // Validate status transition
    if (status) {
      const validStatuses = ["pending", "paid", "expired", "cancelled"];
      if (!validStatuses.includes(status)) {
        return NextResponse.json(
          { error: "Invalid status" },
          { status: 400 }
        );
      }

      // Don't allow changing status of paid invoices
      if (invoice.status === "paid" && status !== "paid") {
        return NextResponse.json(
          { error: "Cannot change status of paid invoice" },
          { status: 400 }
        );
      }
    }

    // Update invoice
    const [updatedInvoice] = await db
      .update(invoices)
      .set({
        ...(status && { status }),
        ...(memo !== undefined && { memo }),
        ...(dueAt !== undefined && { dueAt: dueAt ? new Date(dueAt) : null }),
        ...(expiresAt !== undefined && { expiresAt: expiresAt ? new Date(expiresAt) : null }),
        ...(metadata !== undefined && { metadata }),
        updatedAt: new Date(),
      })
      .where(eq(invoices.id, params.invoiceId))
      .returning();

    return NextResponse.json({
      invoice: updatedInvoice,
    });
  } catch (error) {
    console.error("Invoice update error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE /api/invoices/[invoiceId] - Cancel invoice
export async function DELETE(
  request: NextRequest,
  { params }: { params: { invoiceId: string } }
) {
  try {
    const session = await getServerSession();
    
    if (!session?.user?.address) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
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

    // Get invoice with app
    const invoice = await db.query.invoices.findFirst({
      where: eq(invoices.id, params.invoiceId),
      with: {
        app: {
          columns: {
            userId: true,
          },
        },
      },
    });

    if (!invoice) {
      return NextResponse.json(
        { error: "Invoice not found" },
        { status: 404 }
      );
    }

    // Verify invoice belongs to user's app
    if (invoice.app.userId !== user.id) {
      return NextResponse.json(
        { error: "Access denied" },
        { status: 403 }
      );
    }

    // Don't allow cancelling paid invoices
    if (invoice.status === "paid") {
      return NextResponse.json(
        { error: "Cannot cancel paid invoice" },
        { status: 400 }
      );
    }

    // Cancel invoice
    const [cancelledInvoice] = await db
      .update(invoices)
      .set({
        status: "cancelled",
        updatedAt: new Date(),
      })
      .where(eq(invoices.id, params.invoiceId))
      .returning();

    return NextResponse.json({
      message: "Invoice cancelled successfully",
      invoice: cancelledInvoice,
    });
  } catch (error) {
    console.error("Invoice cancellation error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}