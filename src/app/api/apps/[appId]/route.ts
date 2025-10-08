import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { db } from "@/lib/db";
import { apps, users } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

// GET /api/apps/[appId] - Get specific app
export async function GET(
  request: NextRequest,
  { params }: { params: { appId: string } }
) {
  try {
    const session = await getServerSession();
    
    if (!session?.user?.address) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Get user first
    const user = await db.query.users.findFirst({
      where: eq(users.wallet, session.user.address.toLowerCase()),
    });

    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    // Get app
    const app = await db.query.apps.findFirst({
      where: and(
        eq(apps.id, params.appId),
        eq(apps.userId, user.id)
      ),
    });

    if (!app) {
      return NextResponse.json(
        { error: "App not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      app,
    });
  } catch (error) {
    console.error("App fetch error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// PUT /api/apps/[appId] - Update app
export async function PUT(
  request: NextRequest,
  { params }: { params: { appId: string } }
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
    const { name, description, webhookUrl, payoutSettings, isActive } = body;

    // Validate input
    if (name && (typeof name !== "string" || name.length > 255)) {
      return NextResponse.json(
        { error: "Invalid app name" },
        { status: 400 }
      );
    }

    if (description && (typeof description !== "string" || description.length > 1000)) {
      return NextResponse.json(
        { error: "Invalid description" },
        { status: 400 }
      );
    }

    if (webhookUrl && (typeof webhookUrl !== "string" || webhookUrl.length > 500)) {
      return NextResponse.json(
        { error: "Invalid webhook URL" },
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

    // Update app
    const [updatedApp] = await db
      .update(apps)
      .set({
        ...(name && { name }),
        ...(description !== undefined && { description }),
        ...(webhookUrl !== undefined && { webhookUrl }),
        ...(payoutSettings !== undefined && { payoutSettings }),
        ...(isActive !== undefined && { isActive }),
        updatedAt: new Date(),
      })
      .where(and(
        eq(apps.id, params.appId),
        eq(apps.userId, user.id)
      ))
      .returning();

    if (!updatedApp) {
      return NextResponse.json(
        { error: "App not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      app: updatedApp,
    });
  } catch (error) {
    console.error("App update error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE /api/apps/[appId] - Delete app
export async function DELETE(
  request: NextRequest,
  { params }: { params: { appId: string } }
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

    // Delete app (soft delete by setting isActive to false)
    const [deletedApp] = await db
      .update(apps)
      .set({
        isActive: false,
        updatedAt: new Date(),
      })
      .where(and(
        eq(apps.id, params.appId),
        eq(apps.userId, user.id)
      ))
      .returning();

    if (!deletedApp) {
      return NextResponse.json(
        { error: "App not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      message: "App deleted successfully",
    });
  } catch (error) {
    console.error("App deletion error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}