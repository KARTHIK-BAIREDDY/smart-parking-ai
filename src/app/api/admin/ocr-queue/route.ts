import { NextResponse } from "next/server";
import { getDatabase } from "@/lib/mongo-db";
import { requireAdmin } from "@/lib/auth-server";
import { writeAuditLog } from "@/lib/audit-logger";
import { ObjectId } from "mongodb";
import { POST as assignPost } from "@/app/api/slots/assign/route";
import { POST as exitPost } from "@/app/api/slots/exit/route";

export async function GET() {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;

  try {
    const db = await getDatabase();
    
    const queuedEvents = await db
      .collection("camera_events")
      .find({ requiresReview: true, status: "pending_review" })
      .sort({ timestamp: -1 })
      .toArray();

    return NextResponse.json({
      success: true,
      events: queuedEvents.map(e => ({
        id: e._id.toString(),
        cameraId: e.cameraId,
        plateNumber: e.plateNumber,
        confidence: e.confidence,
        eventType: e.eventType,
        timestamp: e.timestamp,
        imagePath: e.imagePath,
        parkingPlaceId: e.parkingPlaceId
      }))
    });
  } catch (error) {
    console.error("GET /api/admin/ocr-queue error:", error);
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;

  try {
    const body = await request.json();
    const { eventId, action, correctedPlate } = body;
    // action: "approve" as any, "reject", "reprocess"

    if (!eventId || !action) {
      return NextResponse.json({ success: false, error: "eventId and action required" }, { status: 400 });
    }

    const db = await getDatabase();
    const event = await db.collection("camera_events").findOne({ _id: new ObjectId(eventId) });

    if (!event) {
      return NextResponse.json({ success: false, error: "Event not found" }, { status: 404 });
    }

    if (event.status !== "pending_review") {
      return NextResponse.json({ success: false, error: "Event already processed" }, { status: 400 });
    }

    const plateToUse = correctedPlate ? correctedPlate.toUpperCase().replace(/\s+/g, "") : event.plateNumber;
    
    // 1. Audit Log Action
    let auditAction = "";
    if (action === "approve") auditAction = "OCR_REVIEW_APPROVED";
    else if (action === "reject") auditAction = "OCR_REVIEW_REJECTED";
    else if (action === "reprocess") auditAction = "OCR_REVIEW_REPROCESSED";
    
    await writeAuditLog({
      actorId: auth.user?.userId || "admin",
      actorRole: auth.user?.role || "admin",
      action: auditAction as any,
      entityType: "camera_event" as any,
      entityId: eventId,
      metadata: {
        cameraId: event.cameraId,
        plateNumber: plateToUse,
        originalPlate: event.plateNumber,
        confidence: event.confidence
      }
    });

    // 2. Execute Action
    if (action === "reject") {
      await db.collection("camera_events").updateOne(
        { _id: new ObjectId(eventId) },
        { $set: { status: "rejected", processedAt: new Date(), requiresReview: false } }
      );
      return NextResponse.json({ success: true, message: "Rejected successfully" });
    }

    if (action === "approve" || action === "reprocess") {
      // Mark as processed
      await db.collection("camera_events").updateOne(
        { _id: new ObjectId(eventId) },
        { $set: { status: "processed", plateNumber: plateToUse, processedAt: new Date(), requiresReview: false } }
      );

      // We need to trigger the assign/exit flow internally
      const internalBody = JSON.stringify({
        vehicleId: plateToUse,
        placeId: event.parkingPlaceId || "unknown",
        confidence: event.confidence,
        cameraId: event.cameraId,
        imagePath: event.imagePath,
        vehicleType: "Car" // Default
      });

      const internalReq = new Request(request.url, {
        method: "POST",
        headers: request.headers,
        body: internalBody
      });

      let actionResult;
      if (event.eventType === "entry") {
        const res = await assignPost(internalReq);
        actionResult = await res.json();
      } else if (event.eventType === "exit") {
        const res = await exitPost(internalReq);
        actionResult = await res.json();
      }

      return NextResponse.json({
        success: true,
        actionResult
      });
    }

    return NextResponse.json({ success: false, error: "Invalid action" }, { status: 400 });

  } catch (error) {
    console.error("POST /api/admin/ocr-queue error:", error);
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
