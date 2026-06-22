import { NextResponse } from "next/server";
import { getDatabase } from "@/lib/mongo-db";
import { requireCameraOrAdmin } from "@/lib/camera-auth";

export async function POST(request: Request) {
  const auth = await requireCameraOrAdmin(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const body = await request.json();
    const { cameraId, cameraType, parkingPlaceId } = body;

    if (!cameraId || !cameraType || !parkingPlaceId) {
      return NextResponse.json(
        { success: false, error: "cameraId, cameraType, and parkingPlaceId are required" },
        { status: 400 }
      );
    }

    const db = await getDatabase();
    
    await db.collection("camera_settings").updateOne(
      { cameraId },
      {
        $set: {
          cameraType,
          parkingPlaceId,
          status: "online",
          lastHeartbeat: new Date()
        }
      },
      { upsert: true }
    );

    return NextResponse.json({ success: true, status: "online" });
  } catch (error: any) {
    console.error("POST /api/cameras/heartbeat error:", error);
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 }
    );
  }
}
