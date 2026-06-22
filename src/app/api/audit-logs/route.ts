import { NextResponse } from "next/server";
import { getDatabase } from "@/lib/mongo-db";
import { requireAdmin } from "@/lib/auth-server";

// ---------------------------------------------------------------------------
// GET /api/audit-logs
//
// Admin-only endpoint to view full system audit trails.
// Authentication: active admin session.
// ---------------------------------------------------------------------------

export async function GET(request: Request) {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;

  try {
    const { searchParams } = new URL(request.url);
    const limit = Math.min(100, Math.max(1, Number(searchParams.get("limit")) || 50));
    const page = Math.max(1, Number(searchParams.get("page")) || 1);
    const skip = (page - 1) * limit;

    const query: Record<string, any> = {};

    // Optional filters
    const action = searchParams.get("action");
    if (action) {
      query.action = action;
    }

    const actorId = searchParams.get("actorId");
    if (actorId) {
      query.actorId = actorId;
    }

    const entityType = searchParams.get("entityType");
    if (entityType) {
      query.entityType = entityType;
    }

    const entityId = searchParams.get("entityId");
    if (entityId) {
      query.entityId = entityId;
    }

    const db = await getDatabase();
    const [logs, total] = await Promise.all([
      db
        .collection("audit_logs")
        .find(query)
        .sort({ timestamp: -1 })
        .skip(skip)
        .limit(limit)
        .toArray(),
      db.collection("audit_logs").countDocuments(query),
    ]);

    return NextResponse.json({
      success: true,
      logs,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("GET /api/audit-logs ERROR:", error);
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 }
    );
  }
}
