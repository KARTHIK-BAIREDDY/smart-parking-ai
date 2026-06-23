import { NextResponse } from "next/server";
import { getDatabase } from "@/lib/mongo-db";
import { requireAdmin } from "@/lib/auth-server";

export async function GET() {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;

  try {
    const db = await getDatabase();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Get today's camera events
    const todayEvents = await db.collection("camera_events")
      .find({ timestamp: { $gte: today } })
      .toArray();

    const ocrReadsToday = todayEvents.length;
    let successCount = 0;
    let confidenceSum = 0;

    for (const ev of todayEvents) {
      if (ev.plateNumber && ev.plateNumber !== "UNKNOWN") {
        successCount++;
      }
      if (typeof ev.confidence === "number") {
        confidenceSum += ev.confidence;
      }
    }

    const ocrSuccessRate = ocrReadsToday > 0 ? (successCount / ocrReadsToday) * 100 : 100;
    const averageConfidence = ocrReadsToday > 0 ? (confidenceSum / ocrReadsToday) : 100;

    // Last detection
    const lastEvent = await db.collection("camera_events")
      .find({})
      .sort({ timestamp: -1 })
      .limit(1)
      .toArray();
    
    const lastDetectionTime = lastEvent.length > 0 ? lastEvent[0].timestamp : null;

    // Last Assigned Vehicle (last entry)
    const lastEntry = await db.collection("parking_sessions")
      .find({ status: "active" })
      .sort({ entryTime: -1 })
      .limit(1)
      .toArray();
    
    // Last Exit Vehicle
    const lastExit = await db.collection("parking_sessions")
      .find({ status: "completed" })
      .sort({ exitTime: -1 })
      .limit(1)
      .toArray();

    return NextResponse.json({
      success: true,
      data: {
        ocrReadsToday,
        ocrSuccessRate,
        averageConfidence,
        lastDetectionTime,
        lastAssignedVehicle: lastEntry.length > 0 ? lastEntry[0].vehicleNumber : null,
        lastExitVehicle: lastExit.length > 0 ? lastExit[0].vehicleNumber : null,
      }
    });

  } catch (error) {
    console.error("Telemetry error:", error);
    return NextResponse.json({
      success: false,
      data: {
        ocrReadsToday: 0,
        ocrSuccessRate: 100,
        averageConfidence: 100,
        lastDetectionTime: null,
        lastAssignedVehicle: null,
        lastExitVehicle: null
      }
    });
  }
}
