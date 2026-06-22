import { NextResponse } from "next/server";
import { getDatabase } from "@/lib/mongo-db";
import { requireCameraOrAdmin } from "@/lib/camera-auth";

// ---------------------------------------------------------------------------
// GET /api/vehicles/lookup?plate=XX00XX0000
//
// Authentication: x-camera-key header  OR  active admin session.
// Regular users are rejected — this endpoint feeds the camera/OCR pipeline
// and the admin dashboard, never the user-facing UI.
// ---------------------------------------------------------------------------

export async function GET(request: Request) {
  const auth = await requireCameraOrAdmin(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const { searchParams } = new URL(request.url);
    const plate = searchParams.get("plate");

    if (!plate) {
      return NextResponse.json({ error: "Plate parameter is required" }, { status: 400 });
    }

    const normalizedPlate = plate.toUpperCase().replace(/\s+/g, "");

    const db = await getDatabase();
    const vehicle = await db
      .collection("vehicles")
      .findOne({ vehicleNumber: normalizedPlate });

    if (!vehicle) {
      return NextResponse.json({ found: false }, { status: 404 });
    }

    const rawStatus = vehicle.status || vehicle.approvalStatus || "pending_verification";
    const statusLower = rawStatus.toLowerCase().trim();
    let normalizedStatus: "approved" | "pending_verification" | "rejected" | "suspended" = "pending_verification";
    if (statusLower === "approved" || statusLower === "approved") {
      normalizedStatus = "approved";
    } else if (statusLower === "rejected" || statusLower === "rejected") {
      normalizedStatus = "rejected";
    } else if (statusLower === "suspended" || statusLower === "suspended") {
      normalizedStatus = "suspended";
    }

    let legacyStatus: "Approved" | "Pending" | "Rejected" | "Suspended" = "Pending";
    if (normalizedStatus === "approved") legacyStatus = "Approved";
    else if (normalizedStatus === "rejected") legacyStatus = "Rejected";
    else if (normalizedStatus === "suspended") legacyStatus = "Suspended";

    return NextResponse.json({
      found: true,
      vehicleId: vehicle.id,
      vehicleNumber: vehicle.vehicleNumber,
      status: legacyStatus,
      approvalStatus: legacyStatus,
      verificationStatus: normalizedStatus,
      vehicleType: vehicle.vehicleType,
      userId: vehicle.userId,
    });
  } catch (error) {
    console.error("GET /api/vehicles/lookup ERROR:", error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
