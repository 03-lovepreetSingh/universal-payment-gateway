import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { db } from "@/lib/db";
import { apps, users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

// GET /api/apps - Get user's apps
export async function GET(request: NextRequest) {
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

    // Get user's apps
    const userApps = await db.query.apps.findMany({
      where: eq(apps.userId, user.id),
      orderBy: (apps, { desc }) => [desc(apps.createdAt)],
    });

    return NextResponse.json({
      apps: userApps,
    });
  } catch (error) {
    console.error("Apps fetch error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST /api/apps - Create new app
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
    const { name, description, webhookUrl, payoutSettings } = body;

    // Validate input
    if (!name || typeof name !== "string" || name.length > 255) {
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

    // Create app
    const [newApp] = await db.insert(apps).values({
      userId: user.id,
      name,
      description: description || null,
      webhookUrl: webhookUrl || null,
      payoutSettings: payoutSettings || null,
      metadata: null,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    }).returning();

    return NextResponse.json({
      app: newApp,
    }, { status: 201 });
  } catch (error) {
    console.error("App creation error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}