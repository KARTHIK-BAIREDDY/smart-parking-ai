import { NextResponse } from "next/server";
import { getDatabase } from "@/lib/mongo-db";
import { requireAdmin } from "@/lib/auth-server";

export async function GET() {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;

  try {
    const db = await getDatabase();

    // 1. Parking Overview
    const slots = await db.collection("parking_slots").find({}).toArray();
    const totalSlots = slots.length;
    const occupiedSlots = slots.filter((s) => s.status === "occupied").length;
    const availableSlots = slots.filter((s) => s.status === "available").length;
    const reservedSlots = slots.filter((s) => s.slotType === "reserved").length;

    // 2. Session Overview
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const activeSessions = await db.collection("parking_sessions").countDocuments({ status: "active" });
    const completedSessions = await db.collection("parking_sessions").countDocuments({ status: "completed" });
    const todaysEntries = await db.collection("parking_sessions").countDocuments({ entryTime: { $gte: today } });
    const todaysExits = await db.collection("parking_sessions").countDocuments({ exitTime: { $gte: today } });

    // 3. Camera Health
    const cameras = await db.collection("camera_settings").find({}).toArray();
    
    // 4. Live Activity (Latest Events)
    const recentEvents = await db.collection("camera_events")
      .find({})
      .sort({ timestamp: -1 })
      .limit(10)
      .toArray();

    const latestEntry = recentEvents.find(e => e.eventType === "ENTRY");
    const latestExit = recentEvents.find(e => e.eventType === "EXIT");

    // 5. Audit
    const latestAuditEvent = await db.collection("audit_logs").findOne({}, { sort: { timestamp: -1 } });

    return NextResponse.json({
      success: true,
      data: {
        parking: {
          totalSlots,
          availableSlots,
          occupiedSlots,
          reservedSlots
        },
        sessions: {
          activeSessions,
          completedSessions,
          todaysEntries,
          todaysExits
        },
        cameras,
        activity: {
          recentEvents,
          latestEntry,
          latestExit
        },
        lastAuditEvent: latestAuditEvent ? latestAuditEvent.timestamp : null
      }
    });
  } catch (error) {
    console.error("GET /api/admin/dashboard/metrics error:", error);
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
