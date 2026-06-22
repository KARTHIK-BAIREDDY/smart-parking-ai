import { NextResponse } from "next/server";
import { getDatabase } from "@/lib/mongo-db";
import { requireAdmin } from "@/lib/auth-server";

export async function GET() {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;

  try {
    const db = await getDatabase();
    
    const activeSessions = await db
      .collection("parking_sessions")
      .find({ status: "active" })
      .sort({ entryTime: -1 })
      .toArray();

    // The duration is dynamically calculated on the frontend or backend,
    // let's compute it now for ease.
    const now = new Date();
    const formattedSessions = activeSessions.map(session => {
      const entryTime = new Date(session.entryTime);
      const diffMs = now.getTime() - entryTime.getTime();
      const durationMinutes = Math.floor(diffMs / 60000);
      
      return {
        id: session._id.toString(),
        sessionId: session.sessionId,
        vehicleNumber: session.vehicleNumber,
        slotId: session.slotId,
        entryTime: session.entryTime,
        durationMinutes,
        status: session.status,
        cameraSource: "Camera" // In a real system, you'd join with camera_events or store origin on session
      };
    });

    return NextResponse.json({
      success: true,
      sessions: formattedSessions
    });
  } catch (error) {
    console.error("GET /api/admin/sessions error:", error);
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
