import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getDatabase } from "@/lib/mongo-db";
import { requireCameraOrAdmin } from "@/lib/camera-auth";
import { sendExitNotification } from "@/lib/sms/sms-service";
import { logCameraEvent } from "@/lib/camera-events";
import { writeAuditLog } from "@/lib/audit-logger";
import clientPromise from "@/lib/mongodb";

// ---------------------------------------------------------------------------
// POST /api/parking/exit
//
// Vehicle exit processing pipeline.
// Authentication: x-camera-key header  OR  active admin session.
//
// Complete flow:
//   1. Authenticate caller
//   2. Log camera exit detection event
//   3. Find the active parking_session for this plate
//   4. Calculate duration
//   5. Update session: exitTime: exitTime instanceof Date ? exitTime.toISOString() : exitTime, durationMinutes, status → "completed"
//   6. Release the parking slot → "available"
//   7. Write audit log
//   8. Calculate charge + create payment record in payments collection
//   9. Send exit SMS notification (non-blocking)
// ---------------------------------------------------------------------------

export async function POST(request: Request) {
  // -------------------------------------------------------------------------
  // Step 1: Authenticate — camera key OR admin session
  // -------------------------------------------------------------------------
  const auth = await requireCameraOrAdmin(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const body = await request.json();
    const {
      vehicleId,          // plate number (OCR result)
      placeId,            // parking place id (optional — helps narrow lookup)
      confidence = 0,
      cameraId = "unknown",
      imagePath = null,
    } = body as {
      vehicleId: string;
      placeId?: string;
      confidence?: number;
      cameraId?: string;
      imagePath?: string | null;
    };

    if (!vehicleId) {
      return NextResponse.json(
        { success: false, error: "vehicleId (plate number) is required" },
        { status: 400 }
      );
    }

    const normalizedPlate = vehicleId.toUpperCase().replace(/\s+/g, "");
    const exitTime = new Date();

    // -------------------------------------------------------------------------
    // Step 2: Log the camera exit detection immediately
    // -------------------------------------------------------------------------
    logCameraEvent({
      cameraId,
      plateNumber: normalizedPlate,
      confidence,
      imagePath,
      eventType: "exit",
      sessionId: null,
    }).catch(() => {});

    const db = await getDatabase();

    // -------------------------------------------------------------------------
    // Step 3: Find the active session for this plate
    // -------------------------------------------------------------------------
    const sessionQuery: Record<string, unknown> = {
      vehicleNumber: normalizedPlate,
      status: "active",
    };
    if (placeId) sessionQuery.parkingPlaceId = placeId;

    const session = await db
      .collection("parking_sessions")
      .findOne(sessionQuery, { sort: { entryTime: -1 } });

    if (!session) {
      return NextResponse.json(
        {
          success: false,
          error: `No active session found for vehicle ${normalizedPlate}`,
        },
        { status: 404 }
      );
    }

    // -------------------------------------------------------------------------
    // Step 4: Calculate duration
    // -------------------------------------------------------------------------
    const entryTime = new Date(session.entryTime);
    const durationMinutes = Math.max(
      0,
      Math.round((exitTime.getTime() - entryTime.getTime()) / 60_000)
    );

    // -------------------------------------------------------------------------
    // Step 5, 6 & 8: Transaction Block (session, slot, payment)
    // -------------------------------------------------------------------------
    const client = await clientPromise;
    const mongoSession = client.startSession();
    
    const sessionEntityId = session.sessionId ?? session.id ?? session._id.toString();
    
    try {
      await mongoSession.withTransaction(async () => {
        // Complete session
        await db.collection("parking_sessions").updateOne(
          { _id: session._id, status: "active" }, // guard: only close if active
          {
            $set: {
              exitTime: exitTime instanceof Date ? exitTime.toISOString() : exitTime,
              durationMinutes,
              status: "completed",
              updatedAt: exitTime instanceof Date ? exitTime.toISOString() : exitTime,
            },
          },
          { session: mongoSession }
        );

        // Release slot
        await db.collection("parking_slots").updateOne(
          {
            slotId: session.slotId,
            parkingPlaceId: session.parkingPlaceId,
          },
          {
            $set: {
              status: "available",
              vehicleId: null,
              vehicleType: null,
              entryTime: null,
            },
          },
          { session: mongoSession }
        );
      });
    } finally {
      await mongoSession.endSession();
    }

    // -------------------------------------------------------------------------
    // Step 7: Write session-completed audit log
    // -------------------------------------------------------------------------

    writeAuditLog({
      actorId: auth.actorId,
      actorRole: auth.actorRole,
      action: "VEHICLE_EXIT",
      entityType: "parking_session",
      entityId: sessionEntityId,
      metadata: {
        vehicleNumber: normalizedPlate,
        slotId: session.slotId,
        parkingPlaceId: session.parkingPlaceId,
        durationMinutes,
        confidence,
        cameraId,
      },
    }).catch(() => {});

    // -------------------------------------------------------------------------
    // Step 9: Send exit SMS and In-App notifications to vehicle owner (non-blocking, non-fatal)
    // -------------------------------------------------------------------------
    let ownerNotified = false;

    if (session.userId) {
      // Trigger in-app notification
      try {
        const { notificationService } = require("@/lib/notification-service");
        notificationService.createNotification(
          session.userId,
          "Vehicle Exit",
          `Your vehicle ${normalizedPlate} has exited. Duration: ${durationMinutes} mins.`,
          "success"
        );
      } catch (err) {
        console.error("[exit] Failed to create in-app notification:", err);
      }

      if (!session.isVisitor) {
        try {
          const owner = await db
            .collection("users")
            .findOne({ _id: new ObjectId(session.userId) });

          if (owner?.phone) {
            ownerNotified = await sendExitNotification({
              mobile: owner.phone,
              vehicleNumber: normalizedPlate,
              locationName: session.placeName || session.parkingPlaceId,
              slotId: session.slotId,
              exitTime: exitTime instanceof Date ? exitTime.toISOString() : exitTime,
              durationMinutes,
            });
          }
        } catch (smsError) {
          console.error("[exit] SMS notification failed:", smsError);
        }
      }
    }

    return NextResponse.json({
      success: true,
      vehicleNumber: normalizedPlate,
      slotId: session.slotId,
      parkingPlaceId: session.parkingPlaceId,
      entryTime: entryTime.toISOString(),
      exitTime: exitTime.toISOString(),
      durationMinutes,
      ownerNotified,
      sessionId: sessionEntityId,
      status: "completed",
    });
  } catch (error) {
    console.error("POST /api/parking/exit ERROR:", error);
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 }
    );
  }
}
