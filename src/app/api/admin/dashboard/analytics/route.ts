import { NextResponse } from "next/server";
import { getDatabase } from "@/lib/mongo-db";
import { requireAdmin } from "@/lib/auth-server";

export async function GET() {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;

  try {
    const db = await getDatabase();
    
    // 1. Occupancy %
    const slots = await db.collection("parking_slots").find({}).toArray();
    const totalSlots = slots.length;
    const occupiedSlots = slots.filter((s) => s.status === "occupied").length;
    const occupancyPercentage = totalSlots > 0 ? Math.round((occupiedSlots / totalSlots) * 100) : 0;

    // 2. Average Parking Duration (from completed sessions)
    const durationAggr = await db.collection("parking_sessions").aggregate([
      { $match: { status: "completed", durationMinutes: { $exists: true, $ne: null } } },
      { $group: { _id: null, avgDuration: { $avg: "$durationMinutes" } } }
    ]).toArray();
    const avgDuration = durationAggr.length > 0 ? Math.round(durationAggr[0].avgDuration) : 0;

    // 3. Peak Hours (hour of day when entryTime occurred most frequently across all sessions)
    const peakHoursAggr = await db.collection("parking_sessions").aggregate([
      {
        $project: {
          hour: { $hour: "$entryTime" }
        }
      },
      {
        $group: {
          _id: "$hour",
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } },
      { $limit: 3 }
    ]).toArray();
    const peakHours = peakHoursAggr.map(p => `${p._id}:00`).join(", ") || "N/A";

    // 4. Daily Usage (sessions in last 24h)
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const dailyUsage = await db.collection("parking_sessions").countDocuments({
      entryTime: { $gte: oneDayAgo }
    });

    // 5. Weekly Usage (sessions in last 7 days)
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const weeklyUsage = await db.collection("parking_sessions").countDocuments({
      entryTime: { $gte: sevenDaysAgo }
    });

    // 6. Camera Detection Statistics (last 24 hours)
    const cameraStatsAggr = await db.collection("camera_events").aggregate([
      { $match: { timestamp: { $gte: oneDayAgo } } },
      { $group: {
          _id: null,
          totalEvents: { $sum: 1 },
          avgConfidence: { $avg: "$confidence" },
          autoProcessed: { $sum: { $cond: [{ $gte: ["$confidence", 90] }, 1, 0] } },
          queued: { $sum: { $cond: [{ $and: [{ $gte: ["$confidence", 70] }, { $lt: ["$confidence", 90] }] }, 1, 0] } },
          rejected: { $sum: { $cond: [{ $lt: ["$confidence", 70] }, 1, 0] } }
        }
      }
    ]).toArray();
    
    const cameraStats = cameraStatsAggr.length > 0 ? {
      totalEvents: cameraStatsAggr[0].totalEvents,
      avgConfidence: Math.round(cameraStatsAggr[0].avgConfidence || 0),
      autoProcessed: cameraStatsAggr[0].autoProcessed,
      queued: cameraStatsAggr[0].queued,
      rejected: cameraStatsAggr[0].rejected
    } : { totalEvents: 0, avgConfidence: 0, autoProcessed: 0, queued: 0, rejected: 0 };

    return NextResponse.json({
      success: true,
      data: {
        occupancyPercentage,
        peakHours,
        averageParkingDurationMinutes: avgDuration,
        dailyUsage,
        weeklyUsage,
        cameraStats
      }
    });
  } catch (error) {
    console.error("GET /api/admin/dashboard/analytics error:", error);
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
