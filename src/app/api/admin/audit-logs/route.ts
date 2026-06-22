import { NextResponse } from "next/server";
import { getDatabase } from "@/lib/mongo-db";
import { requireAdmin } from "@/lib/auth-server";

export async function GET() {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;

  try {
    const db = await getDatabase();
    
    const logs = await db
      .collection("audit_logs")
      .find({})
      .sort({ timestamp: -1 })
      .limit(50)
      .toArray();

    return NextResponse.json({
      success: true,
      logs: logs.map(l => ({
        id: l._id.toString(),
        actorId: l.actorId,
        actorRole: l.actorRole,
        action: l.action,
        entityType: l.entityType,
        entityId: l.entityId,
        metadata: l.metadata,
        timestamp: l.timestamp
      }))
    });
  } catch (error) {
    console.error("GET /api/admin/audit-logs error:", error);
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
