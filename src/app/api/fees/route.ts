import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { db } from "@/lib/db";
import { feePlans, feeQuotes, invoices, apps, users } from "@/lib/db/schema";
import { eq, and, desc, inArray } from "drizzle-orm";

// GET /api/fees - Get fee plans for user's apps
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
    const model = searchParams.get("model");
    const isActive = searchParams.get("isActive");

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
      return NextResponse.json({ feePlans: [] });
    }

    const appIds = userApps.map(app => app.id);

    // Build query conditions
    let whereConditions = [inArray(feePlans.appId, appIds)];

    if (appId) {
      // Verify app belongs to user
      if (!appIds.includes(appId)) {
        return NextResponse.json(
          { error: "App not found" },
          { status: 404 }
        );
      }
      whereConditions.push(eq(feePlans.appId, appId));
    }

    if (model) {
      whereConditions.push(eq(feePlans.model, model));
    }

    if (isActive !== null) {
      whereConditions.push(eq(feePlans.isActive, isActive === "true"));
    }

    // Get fee plans with app details
    const userFeePlans = await db.query.feePlans.findMany({
      where: and(...whereConditions),
      with: {
        app: {
          columns: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: [desc(feePlans.createdAt)],
    });

    return NextResponse.json({
      feePlans: userFeePlans,
    });
  } catch (error) {
    console.error("Fee plans fetch error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST /api/fees - Create new fee plan
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
      name,
      model,
      bps,
      flatFee,
      tiers,
      isActive = true
    } = body;

    // Validate required fields
    if (!appId || !name || !model) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Validate model
    const validModels = ["flat", "percentage", "tiered"];
    if (!validModels.includes(model)) {
      return NextResponse.json(
        { error: "Invalid fee model" },
        { status: 400 }
      );
    }

    // Validate model-specific fields
    if (model === "percentage" && (!bps || bps < 0 || bps > 10000)) {
      return NextResponse.json(
        { error: "Invalid basis points for percentage model" },
        { status: 400 }
      );
    }

    if (model === "flat" && (!flatFee || parseFloat(flatFee) <= 0)) {
      return NextResponse.json(
        { error: "Invalid flat fee amount" },
        { status: 400 }
      );
    }

    if (model === "tiered" && (!tiers || !Array.isArray(tiers) || tiers.length === 0)) {
      return NextResponse.json(
        { error: "Invalid tiers for tiered model" },
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

    // Create fee plan
    const [newFeePlan] = await db.insert(feePlans).values({
      appId,
      name,
      model,
      bps: model === "percentage" ? bps : null,
      flatFee: model === "flat" ? flatFee.toString() : null,
      tiers: model === "tiered" ? tiers : null,
      isActive,
      createdAt: new Date(),
      updatedAt: new Date(),
    }).returning();

    return NextResponse.json({
      feePlan: newFeePlan,
    }, { status: 201 });
  } catch (error) {
    console.error("Fee plan creation error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}